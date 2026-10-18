import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, CheckCheck, RefreshCw, ScrollText, Users, UserPlus, X } from 'lucide-react';
import api, { describeApiError } from '../../../services/api';
import { adminApi, formatStamp, fullName, type AdminConfigEntry, type AdminOverview } from '../../../services/admin';
import { useAcademicConfig } from '../../../services/academicConfig';
import { portalApi, type PortalEnrollment } from '../../../services/portal';
import { useAcademicRecords, type AttendanceRow, type GradeEntryRow } from '../../../services/records';
import { Badge, ConsolePage, EmptyState, ErrorNote, Kpi, Loading, Notes, PageHeader, Panel, Table } from './kit';

type AuditRow = {
  id: number;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

type Props = { firstName?: string; onNotify: (message: string) => void; onNavigate: (label: string) => void };

/** `2,845` — the registry reads in thousands, so group the digits. */
const num = (value: number | undefined | null): string => (typeof value === 'number' ? value.toLocaleString() : '—');

/** `12 mins ago` — how the design's activity feed reads. */
const relTime = (value: string): string => {
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

/** The registrar's queue, described by how much is actually waiting. */
const queueLoad = (pending: number): string => (pending === 0 ? 'Clear' : pending <= 5 ? 'Steady' : 'Backlogged');

/**
 * The administration landing screen, laid out as the institutional design lays it
 * out: the term strip, the registrar's immediate actions, the six registry
 * figures, the enrollment queue, grade submission progress, the stored term
 * parameters and the live audit feed. Every figure is read from the database or
 * computed from published records — a panel with nothing in it says so.
 */
export const DashboardPage = ({ firstName, onNotify, onNavigate }: Props) => {
  const academic = useAcademicConfig();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pending, setPending] = useState<PortalEnrollment[] | null>(null);
  const [activity, setActivity] = useState<AuditRow[] | null>(null);
  const [config, setConfig] = useState<AdminConfigEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);

  const grades = useAcademicRecords<GradeEntryRow>('grades');
  const attendance = useAcademicRecords<AttendanceRow>('attendance');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [registry, requests, log, settings] = await Promise.allSettled([
      adminApi.overview(),
      portalApi.enrollPending(),
      api.get('/audit-logs', { params: { limit: 6 } }),
      adminApi.config(),
    ]);

    if (registry.status === 'fulfilled') {
      setOverview(registry.value.data);
      setWarnings(registry.value.warnings);
    } else {
      setOverview(null);
      setError(describeApiError(registry.reason, 'Loading the institutional registry'));
    }
    setPending(requests.status === 'fulfilled' ? requests.value : null);
    setActivity(log.status === 'fulfilled' ? ((log.value.data?.data ?? []) as AuditRow[]) : null);
    setConfig(settings.status === 'fulfilled' ? settings.value.slice(0, 6) : null);
    setAsOf(new Date().toISOString());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (application: PortalEnrollment, decision: 'approved' | 'rejected') => {
    const who = fullName(application);
    setBusyId(application.id);
    try {
      const result = await portalApi.enrollDecide(application.id, decision);
      onNotify(
        decision === 'approved'
          ? `${who} approved — ${result?.deliveryNote ?? (result?.emailSent ? 'credentials emailed' : 'account issued')}`
          : `${who} — application rejected`,
      );
      await load();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Recording the decision'));
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = overview?.applicationsPending ?? 0;

  /** Grade submission progress per program, from the records faculty published. */
  const submissions = useMemo(() => {
    const byProgram = new Map<string, { posted: number; students: Set<string> }>();
    for (const record of grades.records) {
      const key = record.program || 'Program not recorded';
      const entry = byProgram.get(key) ?? { posted: 0, students: new Set<string>() };
      entry.posted += record.entries.length;
      entry.students.add(record.studentId);
      byProgram.set(key, entry);
    }
    const rows = [...byProgram.entries()].map(([program, value]) => ({ program, posted: value.posted, students: value.students.size }));
    const most = rows.reduce((top, row) => Math.max(top, row.posted), 0);
    return rows.sort((a, b) => b.posted - a.posted).map((row) => ({ ...row, share: most ? Math.round((row.posted / most) * 100) : 0 }));
  }, [grades.records]);

  const sessions = attendance.records.reduce((total, record) => total + record.entries.length, 0);
  const attended = attendance.records.reduce((total, record) => total + record.entries.filter((entry) => entry.status !== 'Absent').length, 0);

  return (
    <ConsolePage>
      <PageHeader
        crumb={['Registrar console', 'Institutional registry']}
        title={`Welcome back${firstName ? `, ${firstName}` : ''}`}
        subtitle={`Institutional registry & administration workspace • Academic Year ${academic.schoolYear}, ${academic.semester}`}
        actions={
          <button type="button" className="ac-btn ac-btn--ghost" onClick={() => void load()} disabled={loading}>
            <RefreshCw aria-hidden="true" />
            Refresh
          </button>
        }
      />

      <div className="ac-actions">
        <Badge>
          Active term • {academic.semester}, AY {academic.schoolYear}
        </Badge>
        <Badge tone={pendingCount ? 'warn' : 'ok'}>Queue load • {queueLoad(pendingCount)}</Badge>
        <Badge tone="muted">Registry • {num(overview?.accounts)} accounts</Badge>
        <span className="ac-muted">Read {asOf ? relTime(asOf) : '—'}</span>
      </div>

      {error ? <ErrorNote message={error} onRetry={() => void load()} /> : null}

      <Panel title="Immediate actions" subtitle="The registry shortcuts an administrator reaches for first.">
        <div className="ac-actions">
          <button type="button" className="ac-btn ac-btn--ghost" onClick={() => onNavigate('Student Management')}>
            <UserPlus aria-hidden="true" />
            Add Student
          </button>
          <button type="button" className="ac-btn ac-btn--ghost" onClick={() => onNavigate('Teacher Management')}>
            <Users aria-hidden="true" />
            Add Teacher
          </button>
          <button type="button" className="ac-btn ac-btn--ghost" onClick={() => onNavigate('Course Management')}>
            <BookOpen aria-hidden="true" />
            Create Course
          </button>
          <button type="button" className="ac-btn ac-btn--ghost" onClick={() => onNavigate('Class Schedule')}>
            <CalendarDays aria-hidden="true" />
            Assign Schedule
          </button>
          <button type="button" className="ac-btn" onClick={() => onNavigate('Enrollment Management')}>
            <CheckCheck aria-hidden="true" />
            Process Enrollments{pendingCount ? ` • ${pendingCount} pending` : ''}
          </button>
        </div>
      </Panel>

      {loading && !overview ? (
        <Panel>
          <Loading label="Reading the institutional registry…" />
        </Panel>
      ) : (
        <div className="ac-kpis">
          <Kpi label="Total students" value={num(overview?.students)} hint="active matriculated" tone={overview && overview.students === 0 ? 'empty' : 'default'} />
          <Kpi label="Faculty members" value={num(overview?.teachers)} hint="teaching accounts on record" tone={overview && overview.teachers === 0 ? 'empty' : 'default'} />
          <Kpi
            label="Course catalog"
            value={num(overview?.subjects)}
            hint={`${num(overview?.courses)} open offerings this term`}
            tone={overview && overview.subjects === 0 ? 'empty' : 'default'}
          />
          <Kpi
            label="Enrollments"
            value={num(overview?.applicationsApproved)}
            hint="approved registrations"
            tone={overview && overview.applicationsApproved === 0 ? 'empty' : 'default'}
          />
          <Kpi label="Active classes" value={num(overview?.sections)} hint={`${num(overview?.schedules)} scheduled meetings`} tone={overview && overview.sections === 0 ? 'empty' : 'default'} />
          <Kpi
            label="Attendance rate"
            value={sessions ? `${Math.round((attended / sessions) * 1000) / 10}%` : '—'}
            hint={sessions ? `from ${sessions} posted sessions` : 'no sessions posted yet'}
            tone={sessions ? 'default' : 'empty'}
          />
        </div>
      )}

      {warnings.length ? (
        <Notes tone="warn">
          <strong>Some registry counts could not be read.</strong> {warnings.slice(0, 2).join(' • ')}
        </Notes>
      ) : null}

      <Panel
        title="Pending enrollment requests"
        subtitle="Submitted from the public enrollment form. Approving issues the applicant's school account."
        actions={
          <button type="button" className="ac-btn ac-btn--ghost" onClick={() => onNavigate('Enrollment Management')}>
            <ScrollText aria-hidden="true" />
            View all requests
          </button>
        }
        flush
      >
        {pending === null ? (
          <ErrorNote message="The applications register could not be read." onRetry={() => void load()} />
        ) : pending.length === 0 ? (
          <EmptyState
            title="No applications waiting"
            message="Every application submitted through the public form has been decided. New submissions appear here the moment they arrive."
          />
        ) : (
          <Table head={['Student profile', 'Program & year', 'Submitted', 'Payment reference', 'Status', 'Action']}>
            {pending.map((application) => (
              <tr key={application.id}>
                <td>
                  <span className="ac-cell-stack">
                    <span className="ac-strong">{fullName(application)}</span>
                    <span className="ac-muted">{application.email}</span>
                  </span>
                </td>
                <td>
                  <span className="ac-cell-stack">
                    <span>{application.program}</span>
                    <span className="ac-muted">Year {application.year_level}</span>
                  </span>
                </td>
                <td className="ac-muted">{formatStamp(application.created_at)}</td>
                <td className="ac-mono">{application.payment_reference_no ?? '—'}</td>
                <td>
                  <Badge tone="warn">{application.status}</Badge>
                </td>
                <td>
                  <div className="ac-actions">
                    <button type="button" className="ac-btn" disabled={busyId === application.id} onClick={() => void decide(application, 'approved')}>
                      <CheckCheck aria-hidden="true" />
                      Approve
                    </button>
                    <button type="button" className="ac-btn ac-btn--danger" disabled={busyId === application.id} onClick={() => void decide(application, 'rejected')}>
                      <X aria-hidden="true" />
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <div className="ac-grid-2">
        <Panel title="Grade submission status" subtitle="Posted by program, from the records faculty published.">
          {grades.loading ? (
            <Loading label="Reading the posted grade records…" />
          ) : grades.error ? (
            <ErrorNote message={grades.error} onRetry={grades.refresh} />
          ) : submissions.length === 0 ? (
            <EmptyState
              title="Nothing posted yet"
              message="No faculty member has published marks for the active term, so there is no submission progress to report."
            />
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {submissions.map((row) => (
                <div key={row.program} style={{ display: 'grid', gap: 6 }}>
                  <span className="ac-actions" style={{ justifyContent: 'space-between' }}>
                    <span className="ac-strong">{row.program}</span>
                    <span className="ac-muted">
                      {row.posted} entries • {row.students} student{row.students === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="ac-bar" style={{ minWidth: 0 }}>
                    <span style={{ width: `${row.share}%` }} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Term parameters"
          subtitle="The stored configuration every portal reads for the active term."
          actions={
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => onNavigate('Settings')}>
              Open settings
            </button>
          }
        >
          {config === null ? (
            <ErrorNote message="Configuration could not be read." onRetry={() => void load()} />
          ) : config.length === 0 ? (
            <EmptyState title="No configuration stored" message="The system configuration table is empty, so the portal is running on its built-in defaults." />
          ) : (
            <dl className="ac-dl">
              {config.map((entry) => (
                <span key={entry.config_key} style={{ display: 'contents' }}>
                  <dt className="ac-mono">{entry.config_key}</dt>
                  <dd>
                    {entry.config_value ?? '—'} <span className="ac-muted">{entry.is_public ? 'public' : 'internal'}</span>
                  </dd>
                </span>
              ))}
            </dl>
          )}
        </Panel>
      </div>

      <Panel
        title="Live activity audit"
        subtitle="Every decision and publication is written to the audit trail."
        actions={
          <button type="button" className="ac-btn ac-btn--ghost" onClick={() => onNavigate('Activity Logs')}>
            Full log
          </button>
        }
      >
        {activity === null ? (
          <ErrorNote message="The audit trail could not be read." onRetry={() => void load()} />
        ) : activity.length === 0 ? (
          <EmptyState title="Nothing recorded yet" message="The audit trail fills as administrators, registrars and faculty act in the portal." />
        ) : (
          <div className="ac-cell-stack">
            {activity.map((row) => (
              <div key={row.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 10 }}>
                <span className="ac-cell-stack">
                  <span className="ac-strong">{row.action}</span>
                  <span className="ac-muted">
                    {row.entity_type ?? 'record'}
                    {row.entity_id ? ` • ${row.entity_id.slice(0, 18)}` : ''}
                  </span>
                </span>
                <span className="ac-muted" title={formatStamp(row.created_at)}>
                  {relTime(row.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Notes>
        <strong>Registrar note.</strong> This console reads the live institutional database. A panel that shows nothing is not a failure —
        the table behind it is genuinely empty, and it fills the moment the academic office records something.
      </Notes>
    </ConsolePage>
  );
};
