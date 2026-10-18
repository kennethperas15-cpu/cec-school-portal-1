import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Download, RefreshCw, Search, Undo2, X } from 'lucide-react';
import { describeApiError } from '../../../services/api';
import { portalApi, type PortalEnrollment } from '../../../services/portal';
import { useAcademicConfig, semesterNo } from '../../../services/academicConfig';
import { Badge, ConsolePage, EmptyState, ErrorNote, Kpi, Loading, Notes, PageHeader, Panel, Table, Toolbar } from './kit';
import { downloadCsv, humanise, matches, unique } from './registry';

type Status = 'pending' | 'approved' | 'rejected';

const STATUSES: Status[] = ['pending', 'approved', 'rejected'];

const STATUS_TONE: Record<Status, 'warn' | 'ok' | 'danger'> = { pending: 'warn', approved: 'ok', rejected: 'danger' };

/**
 * The applications register.
 *
 * Every row is a real submission from the public enrollment form. Approving or
 * rejecting writes the decision the applicant sees when they track their
 * application, and the approval issues the school account. Prerequisite checks
 * and credit-load validation from the design are not modelled in the database,
 * so those columns are absent rather than filled with a guess.
 */
export const EnrollmentPage = ({ onNotify }: { onNotify: (message: string) => void }) => {
  const academic = useAcademicConfig();
  const [status, setStatus] = useState<Status>('pending');
  const [byStatus, setByStatus] = useState<Record<Status, PortalEnrollment[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('');
  const [program, setProgram] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ name: string; schoolEmail?: string; schoolId?: string; emailSent?: boolean; deliveryNote?: string; temporaryPassword?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled(STATUSES.map((value) => portalApi.enrollByStatus(value)));
    const next: Record<Status, PortalEnrollment[]> = { pending: [], approved: [], rejected: [] };
    let failure: string | null = null;
    results.forEach((result, index) => {
      const key = STATUSES[index];
      if (result.status === 'fulfilled') next[key] = result.value;
      else failure = describeApiError(result.reason, 'Reading the applications register');
    });
    setByStatus(results.some((result) => result.status === 'fulfilled') ? next : null);
    setError(failure);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = byStatus?.[status] ?? [];
  const everything = useMemo(() => Object.values(byStatus ?? {}).flat(), [byStatus]);
  const programs = useMemo(() => unique(everything.map((row) => row.program)), [everything]);

  const shown = useMemo(
    () =>
      rows.filter(
        (row) =>
          matches(term, `${row.first_name} ${row.last_name}`, row.email, row.assigned_school_id, row.payment_reference_no, row.program) &&
          (program ? row.program === program : true),
      ),
    [rows, term, program],
  );

  const decide = async (application: PortalEnrollment, decision: 'approved' | 'rejected') => {
    const who = `${application.first_name} ${application.last_name}`.trim() || application.email;
    setBusy(application.id);
    try {
      const result = await portalApi.enrollDecide(application.id, decision);
      if (decision === 'approved') {
        // The applicant is emailed their account; when delivery is not possible
        // the registrar is handed the password to pass on instead.
        setIssued({ name: who, ...result });
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
      `cec-enrollment-${status}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Application', 'Last name', 'First name', 'Email', 'Program', 'Year level', 'Payment reference', 'Payment status', 'Applicant status', 'Assigned school ID', 'School year', 'Semester', 'Status', 'Submitted'],
      shown.map((row) => [
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
    onNotify(`Exported ${shown.length} ${status} application${shown.length === 1 ? '' : 's'}`);
  };

  return (
    <ConsolePage>
      <PageHeader
        crumb={['Registrar console', 'Admissions']}
        title="Enrollment Management"
        subtitle="Applications submitted through the public form. A decision here is the decision the applicant sees when they track their application."
        actions={
          <>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={exportCsv} disabled={!shown.length}>
              <Download aria-hidden="true" />
              Export enrollment matrix
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => void load()} disabled={loading}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </button>
          </>
        }
      />

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
        <Kpi label="Applications received" value={byStatus === null ? '—' : everything.length.toLocaleString()} hint="all statuses on file" tone={byStatus && everything.length === 0 ? 'empty' : 'default'} />
        <Kpi label="Awaiting decision" value={byStatus === null ? '—' : (byStatus.pending.length).toLocaleString()} hint="registrar action required" tone={byStatus && byStatus.pending.length ? 'attention' : 'empty'} />
        <Kpi label="Approved" value={byStatus === null ? '—' : byStatus.approved.length.toLocaleString()} hint="issued a school account" tone="default" />
        <Kpi label="Rejected" value={byStatus === null ? '—' : byStatus.rejected.length.toLocaleString()} hint="closed applications" tone="default" />
        <Kpi
          label="Payments referenced"
          value={byStatus === null ? '—' : everything.filter((row) => row.payment_reference_no).length.toLocaleString()}
          hint="applicants who filed a reference"
          tone="default"
        />
      </div>

      <Panel title="Applications register" subtitle={`Showing ${shown.length} ${status} application${shown.length === 1 ? '' : 's'}.`} flush>
        <Toolbar>
          <div className="ac-tabs">
            {STATUSES.map((value) => (
              <button
                type="button"
                key={value}
                className={`ac-tab${status === value ? ' is-active' : ''}`}
                onClick={() => {
                  setStatus(value);
                  setExpanded(null);
                  setConfirming(null);
                }}
                aria-pressed={status === value}
              >
                {humanise(value)} {byStatus ? `(${byStatus[value].length})` : ''}
              </button>
            ))}
          </div>
          <label className="ac-field ac-search">
            <span className="ac-muted">
              <Search aria-hidden="true" style={{ width: 12, height: 12, verticalAlign: '-1px' }} /> Search
            </span>
            <input
              className="ac-input"
              placeholder="Name, email, school ID or payment reference"
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
        </Toolbar>

        {loading && byStatus === null ? (
          <Loading label="Reading the applications register…" />
        ) : byStatus === null ? (
          <EmptyState title="Register unreadable" message="The applications register could not be read just now. Try again — nothing has been changed." />
        ) : shown.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? `No ${status} applications` : 'No applications match these filters'}
            message={
              rows.length === 0
                ? status === 'pending'
                  ? 'Nothing is waiting on the registrar. Applications submitted through the public form appear here the moment they arrive.'
                  : `No application has been ${status} yet.`
                : 'Adjust the search or program filter to widen the result set.'
            }
          />
        ) : (
          <Table head={['Applicant', 'Program & year', 'Payment', 'School ID', 'Submitted', 'Status', 'Decision']}>
            {shown.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="ac-cell-stack">
                    <span className="ac-strong">{`${row.first_name} ${row.last_name}`.trim() || 'Unnamed applicant'}</span>
                    <span className="ac-muted">{row.email}</span>
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
                    <span className="ac-mono">{row.payment_reference_no ?? '—'}</span>
                    <span className="ac-muted">{humanise(row.payment_status ?? 'unrecorded')}</span>
                  </span>
                </td>
                <td className="ac-mono">{row.assigned_school_id ?? '—'}</td>
                <td className="ac-muted">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                <td>
                  <Badge tone={STATUS_TONE[row.status as Status] ?? 'muted'}>{humanise(row.status)}</Badge>
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
                            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => setConfirming(null)}>
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
                      <button type="button" className="ac-btn ac-btn--ghost" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                        {expanded === row.id ? 'Close' : 'Record'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {expanded ? (
              <tr>
                <td colSpan={7} style={{ background: '#fbfdff' }}>
                  {(() => {
                    const row = rows.find((candidate) => candidate.id === expanded);
                    if (!row) return null;
                    return (
                      <dl className="ac-dl">
                        <dt>Application</dt>
                        <dd className="ac-mono">{row.id}</dd>
                        <dt>Applicant</dt>
                        <dd>{`${row.first_name} ${row.last_name}`.trim() || 'Unnamed applicant'}</dd>
                        <dt>Institutional email</dt>
                        <dd>{row.email}</dd>
                        <dt>Contact number</dt>
                        <dd>{row.phone ?? 'Not recorded'}</dd>
                        <dt>Program & year</dt>
                        <dd>
                          {row.program} • Year {row.year_level}
                        </dd>
                        <dt>Requested access</dt>
                        <dd>{humanise(row.requested_role ?? 'student')}</dd>
                        <dt>Payment reference</dt>
                        <dd className="ac-mono">{row.payment_reference_no ?? '—'}</dd>
                        <dt>Payment status</dt>
                        <dd>{humanise(row.payment_status ?? 'unrecorded')}</dd>
                        <dt>Applicant status</dt>
                        <dd>{humanise(row.student_status ?? row.status)}</dd>
                        <dt>Assigned school ID</dt>
                        <dd className="ac-mono">{row.assigned_school_id ?? 'Not issued'}</dd>
                        <dt>Term applied for</dt>
                        <dd>
                          {row.school_year ?? academic.schoolYear} • {row.semester ? `Semester ${row.semester}` : academic.semester}
                          {row.semester && row.semester !== semesterNo(academic.semester) ? ' (different from the active term)' : ''}
                        </dd>
                        <dt>Submitted</dt>
                        <dd>{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</dd>
                      </dl>
                    );
                  })()}
                </td>
              </tr>
            ) : null}
          </Table>
        )}
      </Panel>

      <Notes>
        <strong>On the design's clearance columns.</strong> The design checks prerequisites, credit load and section capacity per
        application. Those checks live in curriculum and section tables this portal has no records for yet, so the register shows what
        was actually submitted — applicant, program, payment reference, decision — and nothing it cannot verify.
      </Notes>
    </ConsolePage>
  );
};
