import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Download, RefreshCw, Search, Undo2, UserPlus, X } from 'lucide-react';
import api, { describeApiError } from '../../../services/api';
import { semesterNo, useAcademicConfig } from '../../../services/academicConfig';
import { portalApi, type PortalEnrollment } from '../../../services/portal';
import { Badge, ConsolePage, EmptyState, ErrorNote, Kpi, Loading, Notes, PageHeader, Panel, Table, Toolbar } from './kit';
import { downloadCsv, matches, unique } from './registry';

type Status = 'pending' | 'approved' | 'rejected';
type Tab = 'all' | Status;

const STATUSES: Status[] = ['pending', 'approved', 'rejected'];

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All requests' },
  { value: 'pending', label: 'Pending review' },
  { value: 'approved', label: 'Approved & enrolled' },
  { value: 'rejected', label: 'Rejected / held' },
];

const STATUS_TONE: Record<Status, 'warn' | 'ok' | 'danger'> = { pending: 'warn', approved: 'ok', rejected: 'danger' };

type AuditRow = { id: number; action: string; entity_id: string | null; created_at: string; metadata: Record<string, unknown> | null };

type Issued = { name: string; schoolEmail?: string; schoolId?: string; emailSent?: boolean; deliveryNote?: string; temporaryPassword?: string };

/** `10 mins ago` — the register reads as a queue, so times are relative. */
const relTime = (value: string | undefined): string => {
  if (!value) return '—';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '—';
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const initialsOf = (row: PortalEnrollment): string =>
  `${row.first_name?.[0] ?? ''}${row.last_name?.[0] ?? ''}`.toUpperCase() || '·';

/** `PENDING_VERIFICATION` -> `Pending verification` — stored enums read as prose. */
const label = (value: string | null | undefined): string => {
  if (!value) return '—';
  const words = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
};

/**
 * The applications register, laid out as the institutional design lays it out:
 * the gateway strip, the five figures, the status tabs with their filters, the
 * register itself with a workflow action per row, and the matriculation log.
 *
 * Every cell is a field the applicant actually submitted. The design asks for the
 * requested course list, the section allocation and the prerequisite clearance per
 * application; those live in curriculum and section tables this portal has no
 * records for, so those columns carry the payment, term and account facts instead
 * — and the foot of the screen says which checks are not modelled.
 */
export const EnrollmentPage = ({ onNotify, onNavigate }: { onNotify: (message: string) => void; onNavigate: (label: string) => void }) => {
  const academic = useAcademicConfig();
  const [byStatus, setByStatus] = useState<Record<Status, PortalEnrollment[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [term, setTerm] = useState('');
  const [program, setProgram] = useState('');
  const [level, setLevel] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [gateway, setGateway] = useState<boolean | null>(null);
  const [log, setLog] = useState<AuditRow[] | null>(null);
  const [readAt, setReadAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [pending, approved, rejected, health, audit] = await Promise.allSettled([
      portalApi.enrollByStatus('pending'),
      portalApi.enrollByStatus('approved'),
      portalApi.enrollByStatus('rejected'),
      portalApi.dbHealth(),
      api.get('/audit-logs', { params: { limit: 200 } }),
    ]);

    const next: Record<Status, PortalEnrollment[]> = { pending: [], approved: [], rejected: [] };
    const results = [pending, approved, rejected];
    let failure: string | null = null;
    results.forEach((result, index) => {
      const key = STATUSES[index];
      if (result.status === 'fulfilled') next[key] = result.value;
      else failure = describeApiError(result.reason, 'Reading the applications register');
    });
    setByStatus(results.some((result) => result.status === 'fulfilled') ? next : null);
    setError(failure);
    setGateway(health.status === 'fulfilled' ? health.value : false);
    setLog(
      audit.status === 'fulfilled'
        ? ((audit.value.data?.data ?? []) as AuditRow[]).filter((row) => /^enrollment (approved|rejected)/i.test(row.action)).slice(0, 5)
        : null,
    );
    setReadAt(new Date().toISOString());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const everything = useMemo(() => Object.values(byStatus ?? {}).flat(), [byStatus]);
  const programs = useMemo(() => unique(everything.map((row) => row.program)), [everything]);
  const levels = useMemo(() => unique(everything.map((row) => (row.year_level ? `Year ${row.year_level}` : null))).sort(), [everything]);

  const rows = useMemo(() => {
    const list = tab === 'all' ? everything : (byStatus?.[tab] ?? []);
    return list
      .filter(
        (row) =>
          matches(term, `${row.first_name} ${row.last_name}`, row.email, row.assigned_school_id, row.payment_reference_no, row.program) &&
          (program ? row.program === program : true) &&
          (level ? `Year ${row.year_level}` === level : true),
      )
      .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
  }, [tab, everything, byStatus, term, program, level]);

  const countOf = (status: Status): number => (byStatus?.[status] ?? []).length;
  const paymentsPending = everything.filter((row) => row.payment_status && !/verified/i.test(row.payment_status)).length;

  /** The record opened by "Review record". Computed from what is on screen, so a
   *  filter that hides it closes the expansion rather than leaving an empty row. */
  const expandedRow = useMemo(() => (expanded ? rows.find((row) => row.id === expanded) ?? null : null), [expanded, rows]);

  const decide = async (application: PortalEnrollment, decision: 'approved' | 'rejected') => {
    const who = `${application.first_name} ${application.last_name}`.trim() || application.email;
    setBusy(application.id);
    try {
      const result = await portalApi.enrollDecide(application.id, decision);
      if (decision === 'approved') {
        // The applicant is emailed their account; when delivery is not possible the
        // registrar is handed the password to pass on instead.
        setIssued({
          name: who,
          schoolEmail: result.schoolEmail,
          schoolId: result.schoolId,
          emailSent: result.emailSent,
          deliveryNote: result.deliveryNote,
          temporaryPassword: result.temporaryPassword,
        });
      }
      onNotify(`${who} — application ${decision}`);
      setConfirming(null);
      setExpanded(null);
      await load();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Recording the decision'));
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = () => {
    downloadCsv(
      `cec-enrollment-matrix-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Application', 'Last name', 'First name', 'Email', 'Program', 'Year level', 'Payment reference', 'Payment status', 'Applicant status', 'Assigned school ID', 'School year', 'Semester', 'Status', 'Submitted'],
      rows.map((row) => [
        row.id,
        row.last_name,
        row.first_name,
        row.email,
        row.program,
        row.year_level,
        row.payment_reference_no,
        row.payment_status,
        row.student_status,
        row.assigned_school_id,
        row.school_year,
        row.semester,
        row.status,
        row.created_at,
      ]),
    );
    onNotify(`Exported ${rows.length} application${rows.length === 1 ? '' : 's'}`);
  };

  return (
    <ConsolePage>
      <PageHeader
        crumb={['Registrar console', 'Admissions']}
        title="Enrollment Management"
        subtitle="Applications submitted through the public enrollment form. A decision here is the decision the applicant sees when they track their application, and approval issues the account."
        actions={
          <>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={exportCsv} disabled={!rows.length}>
              <Download aria-hidden="true" />
              Export enrollment matrix
            </button>
            <button type="button" className="ac-btn" onClick={() => onNavigate('Student Management')}>
              <UserPlus aria-hidden="true" />
              Register student
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => void load()} disabled={loading}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </button>
          </>
        }
      />

      <div className="ac-actions">
        <Badge tone={gateway === null ? 'muted' : gateway ? 'ok' : 'danger'}>
          {gateway === null ? 'Checking gateway…' : gateway ? 'Live gateway • database reachable' : 'Database unreachable'}
        </Badge>
        <Badge>
          {academic.semester} • AY {academic.schoolYear}
        </Badge>
        <span className="ac-muted">Register read {readAt ? relTime(readAt) : '—'} — the register and the portals read the same records.</span>
      </div>

      {error ? <ErrorNote message={error} onRetry={() => void load()} /> : null}

      {issued ? (
        <Notes>
          <strong>{issued.name}'s account is issued.</strong>{' '}
          {issued.emailSent ? (
            <>
              Credentials were emailed to the applicant — school email <span className="ac-mono">{issued.schoolEmail}</span>
              {issued.schoolId ? (
                <>
                  , student ID <span className="ac-mono">{issued.schoolId}</span>
                </>
              ) : null}
              .
            </>
          ) : (
            <>
              {issued.deliveryNote ?? 'Email delivery was not possible.'} School email <span className="ac-mono">{issued.schoolEmail}</span>
              {issued.schoolId ? (
                <>
                  , student ID <span className="ac-mono">{issued.schoolId}</span>
                </>
              ) : null}
              {issued.temporaryPassword ? (
                <>
                  , temporary password <span className="ac-mono">{issued.temporaryPassword}</span>
                </>
              ) : null}
              .
            </>
          )}
        </Notes>
      ) : null}

      <div className="ac-kpis">
        <Kpi label="Total applications" value={byStatus === null ? '—' : everything.length.toLocaleString()} hint="all statuses on file" tone={byStatus && everything.length === 0 ? 'empty' : 'default'} />
        <Kpi
          label="Pending review"
          value={byStatus === null ? '—' : countOf('pending').toLocaleString()}
          hint={countOf('pending') ? 'registrar action required' : 'nothing waiting'}
          tone={byStatus && countOf('pending') ? 'attention' : 'empty'}
        />
        <Kpi label="Approved & enrolled" value={byStatus === null ? '—' : countOf('approved').toLocaleString()} hint="accounts issued" tone="default" />
        <Kpi label="Rejected / held" value={byStatus === null ? '—' : countOf('rejected').toLocaleString()} hint="applications closed" tone="default" />
        <Kpi
          label="Payments to verify"
          value={byStatus === null ? '—' : paymentsPending.toLocaleString()}
          hint="reference not yet verified"
          tone={paymentsPending ? 'attention' : 'empty'}
        />
      </div>

      <Panel title="Applications register" subtitle={`Showing ${rows.length} of ${everything.length} applications.`} flush>
        <Toolbar>
          <div className="ac-tabs">
            {TABS.map((entry) => (
              <button
                type="button"
                key={entry.value}
                className={`ac-tab${tab === entry.value ? ' is-active' : ''}`}
                onClick={() => {
                  setTab(entry.value);
                  setExpanded(null);
                  setConfirming(null);
                }}
                aria-pressed={tab === entry.value}
              >
                {entry.label} {byStatus === null ? '' : `(${entry.value === 'all' ? everything.length : countOf(entry.value)})`}
              </button>
            ))}
          </div>
          <label className="ac-field ac-search">
            <span className="ac-muted">
              <Search aria-hidden="true" style={{ width: 12, height: 12, verticalAlign: '-1px' }} /> Search
            </span>
            <input
              className="ac-input"
              placeholder="Name, school ID, email or reference"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              aria-label="Search applications"
            />
          </label>
          <label className="ac-field">
            <span>Program</span>
            <select className="ac-select" value={program} onChange={(event) => setProgram(event.target.value)} aria-label="Filter by program">
              <option value="">All programs</option>
              {programs.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="ac-field">
            <span>Year level</span>
            <select className="ac-select" value={level} onChange={(event) => setLevel(event.target.value)} aria-label="Filter by year level">
              <option value="">All year levels</option>
              {levels.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </Toolbar>

        {loading && byStatus === null ? (
          <Loading label="Reading the applications register…" />
        ) : byStatus === null ? (
          <EmptyState title="Register unreadable" message="The applications register could not be read just now. Try again — nothing has been changed." />
        ) : rows.length === 0 ? (
          <EmptyState
            title={everything.length === 0 ? 'No applications yet' : tab === 'all' ? 'No applications match these filters' : `No ${tab} applications`}
            message={
              everything.length === 0
                ? 'Nothing is waiting on the registrar. Applications submitted through the public enrollment form appear here the moment they arrive.'
                : 'Adjust the search, program or year level to widen the result set.'
            }
          />
        ) : (
          <Table head={['Application & timestamp', 'Student identity', 'Program & year', 'Payment & term', 'Account', 'Status', 'Workflow actions']}>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="ac-cell-stack">
                    <span className="ac-mono ac-strong">#ENR-{String(row.id).slice(0, 8).toUpperCase()}</span>
                    <span className="ac-muted" title={row.created_at ? new Date(row.created_at).toLocaleString() : ''}>
                      {relTime(row.created_at)}
                    </span>
                  </span>
                </td>
                <td>
                  <span className="ac-identity">
                    <span className="ac-avatar" aria-hidden="true">
                      {initialsOf(row)}
                    </span>
                    <span className="ac-cell-stack">
                      <span className="ac-strong">{`${row.first_name} ${row.last_name}`.trim() || 'Unnamed applicant'}</span>
                      <span className="ac-muted">{row.assigned_school_id ? `ID: ${row.assigned_school_id}` : row.email}</span>
                    </span>
                  </span>
                </td>
                <td>
                  <span className="ac-cell-stack">
                    <span>{row.program}</span>
                    <span className="ac-muted">Year {row.year_level}</span>
                  </span>
                </td>
                <td>
                  <span className="ac-cell-stack">
                    <span className="ac-mono">{row.payment_reference_no ?? 'No reference filed'}</span>
                    <span className="ac-muted">
                      {row.semester ? `Sem ${row.semester}` : academic.semester} · {row.school_year ?? academic.schoolYear} ·{' '}
                      {label(row.payment_status ?? 'unrecorded')}
                    </span>
                  </span>
                </td>
                <td>
                  <span className="ac-cell-stack">
                    <span className="ac-mono">{row.assigned_school_id ?? 'Not issued'}</span>
                    <span className="ac-muted">{label(row.student_status ?? row.status)}</span>
                  </span>
                </td>
                <td>
                  <Badge tone={STATUS_TONE[row.status as Status] ?? 'muted'}>{label(row.status)}</Badge>
                </td>
                <td>
                  <div className="ac-actions">
                    {row.status === 'pending' ? (
                      <>
                        <button type="button" className="ac-btn" disabled={busy === row.id} onClick={() => void decide(row, 'approved')}>
                          <BadgeCheck aria-hidden="true" />
                          Approve
                        </button>
                        {confirming === row.id ? (
                          <>
                            <button type="button" className="ac-btn ac-btn--danger" disabled={busy === row.id} onClick={() => void decide(row, 'rejected')}>
                              <X aria-hidden="true" />
                              Confirm reject
                            </button>
                            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => setConfirming(null)} disabled={busy === row.id}>
                              <Undo2 aria-hidden="true" />
                              Keep
                            </button>
                          </>
                        ) : (
                          <button type="button" className="ac-btn ac-btn--danger" onClick={() => setConfirming(row.id)}>
                            <X aria-hidden="true" />
                            Reject
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        className="ac-btn ac-btn--ghost"
                        onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                        aria-expanded={expanded === row.id}
                      >
                        {expanded === row.id ? <Undo2 aria-hidden="true" /> : <BadgeCheck aria-hidden="true" />}
                        {expanded === row.id ? 'Close record' : 'Review record'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {expandedRow ? (
              <tr>
                <td colSpan={7} style={{ background: '#fbfdff' }}>
                  <div className="ac-cell-stack" style={{ marginBottom: 10 }}>
                    <span className="ac-strong">Application record — {expandedRow.email}</span>
                    <span className="ac-muted">
                      Exactly what the applicant filed. Nothing here is inferred: an empty field means the form left it blank.
                    </span>
                  </div>
                  <dl className="ac-dl">
                    <dt>Application</dt>
                    <dd className="ac-mono">{expandedRow.id}</dd>
                    <dt>Applicant</dt>
                    <dd>{`${expandedRow.first_name} ${expandedRow.last_name}`.trim() || 'Unnamed applicant'}</dd>
                    <dt>Institutional email</dt>
                    <dd>{expandedRow.email}</dd>
                    <dt>Contact number</dt>
                    <dd>{expandedRow.phone ?? 'Not recorded'}</dd>
                    <dt>Program & year</dt>
                    <dd>
                      {expandedRow.program} • Year {expandedRow.year_level}
                    </dd>
                    <dt>Requested access</dt>
                    <dd>{label(expandedRow.requested_role ?? 'student')}</dd>
                    <dt>Payment reference</dt>
                    <dd className="ac-mono">{expandedRow.payment_reference_no ?? '—'}</dd>
                    <dt>Payment status</dt>
                    <dd>{label(expandedRow.payment_status ?? 'unrecorded')}</dd>
                    <dt>Applicant status</dt>
                    <dd>{label(expandedRow.student_status ?? expandedRow.status)}</dd>
                    <dt>Assigned school ID</dt>
                    <dd className="ac-mono">{expandedRow.assigned_school_id ?? 'Not issued'}</dd>
                    <dt>Term applied for</dt>
                    <dd>
                      {expandedRow.school_year ?? academic.schoolYear} •{' '}
                      {expandedRow.semester ? `Semester ${expandedRow.semester}` : academic.semester}
                      {expandedRow.semester && expandedRow.semester !== semesterNo(academic.semester) ? ' (not the active term)' : ''}
                    </dd>
                    <dt>Submitted</dt>
                    <dd>{expandedRow.created_at ? new Date(expandedRow.created_at).toLocaleString() : '—'}</dd>
                  </dl>
                </td>
              </tr>
            ) : null}
          </Table>
        )}
      </Panel>

      <div className="ac-grid-2">
        <Panel title="Matriculation log" subtitle="Every approval and rejection, as the audit trail recorded it.">
          {log === null ? (
            <ErrorNote message="The matriculation log could not be read." onRetry={() => void load()} />
          ) : log.length === 0 ? (
            <EmptyState title="No decisions yet" message="Approving or rejecting an application is written here with its time and target." />
          ) : (
            <div className="ac-cell-stack">
              {log.map((row) => (
                <div key={row.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 10 }}>
                  <span className="ac-cell-stack">
                    <span className="ac-strong">{row.action}</span>
                    <span className="ac-muted ac-mono">{row.entity_id ? row.entity_id.slice(0, 12) : '—'}</span>
                  </span>
                  <span className="ac-muted" title={new Date(row.created_at).toLocaleString()}>
                    {relTime(row.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="What this register does not check" subtitle="The design's clearance column, stated honestly.">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8, fontSize: 13, lineHeight: 1.6 }}>
            <li>
              <strong>Requested courses and units</strong> — an application carries a program and a year level; the subject list is built when the
              student is enrolled in courses, and no such records exist yet.
            </li>
            <li>
              <strong>Section allocation and capacity</strong> — sections are not on file, so a seat cap cannot be enforced here.
            </li>
            <li>
              <strong>Prerequisite and overload clearance</strong> — the curriculum tables are empty, so nothing is asserted about prerequisites.
            </li>
            <li>
              <strong>Dropped or withdrawn</strong> — the register has three states (pending, approved, rejected); a withdrawal is a registrar
              decision recorded elsewhere, not a fourth state invented here.
            </li>
          </ul>
        </Panel>
      </div>

      <Notes>
        <strong>Decisions are registrar actions.</strong> The design offers batch auto-processing of validated applications; the register does
        not, because an approval issues a real school account and a school number, and that stays a deliberate, attributed act. Every decision is
        written to the audit trail with the actor and the target.
      </Notes>
    </ConsolePage>
  );
};
