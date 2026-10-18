import { useCallback, useEffect, useState } from 'react';
import { BookOpen, CalendarDays, CheckCheck, RefreshCw, ScrollText, Users, UserPlus, X } from 'lucide-react';
import api, { describeApiError } from '../../../services/api';
import { adminApi, formatStamp, fullName, type AdminConfigEntry, type AdminOverview } from '../../../services/admin';
import { fetchAnnouncements, type LiveAnnouncement } from '../../../services/announcements';
import { portalApi, type PortalEnrollment } from '../../../services/portal';
import { useAcademicConfig } from '../../../services/academicConfig';
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

/**
 * The administration landing screen: what the registry holds, what is waiting on
 * the registrar, and what the portal has actually published. Every number is read
 * from the database or from a published portal record — nothing here is inferred
 * from the design's sample data, and a genuinely empty registry says so.
 */
export const DashboardPage = ({ firstName, onNotify, onNavigate }: Props) => {
  const academic = useAcademicConfig();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pending, setPending] = useState<PortalEnrollment[] | null>(null);
  const [bulletins, setBulletins] = useState<LiveAnnouncement[] | null>(null);
  const [activity, setActivity] = useState<AuditRow[] | null>(null);
  const [config, setConfig] = useState<AdminConfigEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [registry, requests, notices, log, settings] = await Promise.allSettled([
      adminApi.overview(),
      portalApi.enrollPending(),
      fetchAnnouncements('all'),
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
    setBulletins(notices.status === 'fulfilled' ? notices.value.slice(0, 4) : null);
    setActivity(log.status === 'fulfilled' ? ((log.value.data?.data ?? []) as AuditRow[]) : null);
    setConfig(settings.status === 'fulfilled' ? settings.value.slice(0, 6) : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (application: PortalEnrollment, decision: 'approved' | 'rejected') => {
    const who = fullName(application);
    setBusyId(application.id);
    try {
      await portalApi.enrollDecide(application.id, decision);
      onNotify(`${who} — application ${decision}`);
      await load();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Recording the decision'));
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = overview?.applicationsPending ?? 0;

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

      {error ? <ErrorNote message={error} onRetry={() => void load()} /> : null}

      <Panel title="Immediate actions" subtitle="The registry shortcuts an administrator reaches for first.">
        <div className="ac-actions">
          <button type="button" className="ac-btn ac-btn--ghost" onClick={() => onNavigate('Student Management')}>
            <UserPlus aria-hidden="true" />
            Student registry
          </button>
          <button type="button" className="ac-btn ac-btn--ghost" onClick={() => onNavigate('Teacher Management')}>
            <Users aria-hidden="true" />
            Faculty roster
          </button>
          <button type="button" className="ac-btn ac-btn--ghost" onClick={() => onNavigate('Course Management')}>
            <BookOpen aria-hidden="true" />
            Course catalog
          </button>
          <button type="button" className="ac-btn ac-btn--ghost" onClick={() => onNavigate('Class Schedule')}>
            <CalendarDays aria-hidden="true" />
            Published timetables
          </button>
          <button type="button" className="ac-btn" onClick={() => onNavigate('Enrollment Management')}>
            <CheckCheck aria-hidden="true" />
            Process enrollments{pendingCount ? ` • ${pendingCount} pending` : ''}
          </button>
        </div>
      </Panel>

      {loading && !overview ? (
        <Panel>
          <Loading label="Reading the institutional registry…" />
        </Panel>
      ) : (
        <div className="ac-kpis">
          <Kpi
            label="Students"
            value={num(overview?.students)}
            hint="active matriculation records"
            tone={overview && overview.students === 0 ? 'empty' : 'default'}
          />
          <Kpi label="Faculty" value={num(overview?.teachers)} hint="active teaching staff" tone={overview && overview.teachers === 0 ? 'empty' : 'default'} />
          <Kpi
            label="Course catalog"
            value={num(overview?.subjects)}
            hint={`${num(overview?.courses)} open offerings this term`}
            tone={overview && overview.subjects === 0 ? 'empty' : 'default'}
          />
          <Kpi label="Class sections" value={num(overview?.sections)} hint={`${num(overview?.rooms)} rooms on file`} tone={overview && overview.sections === 0 ? 'empty' : 'default'} />
          <Kpi
            label="Enrollment applications"
            value={num(overview?.applicationsTotal)}
            hint={`${num(overview?.applicationsApproved)} approved • ${num(overview?.applicationsRejected)} rejected`}
            tone={overview && overview.applicationsTotal === 0 ? 'empty' : 'default'}
          />
          <Kpi
            label="Awaiting decision"
            value={num(overview?.applicationsPending)}
            hint={pendingCount ? 'registrar action required' : 'nothing in the queue'}
            tone={pendingCount ? 'attention' : 'empty'}
          />
        </div>
      )}

      {warnings.length ? (
        <Notes tone="warn">
          <strong>Some registry counts could not be read.</strong> {warnings.slice(0, 2).join(' • ')}
        </Notes>
      ) : null}

      <Panel
        title="Enrollment requests awaiting a decision"
        subtitle="Submitted from the public enrollment form. Approving issues the applicant's school account."
        actions={
          <button type="button" className="ac-btn ac-btn--ghost" onClick={() => onNavigate('Enrollment Management')}>
            <ScrollText aria-hidden="true" />
            Full applications register
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
          <Table head={['Applicant', 'Program & year', 'Submitted', 'Payment reference', 'Status', 'Decision']}>
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
                  <Badge tone={application.status === 'pending' ? 'warn' : application.status === 'approved' ? 'ok' : 'muted'}>
                    {application.status}
                  </Badge>
                </td>
                <td>
                  <div className="ac-actions">
                    <button
                      type="button"
                      className="ac-btn"
                      disabled={busyId === application.id}
                      onClick={() => void decide(application, 'approved')}
                    >
                      <CheckCheck aria-hidden="true" />
                      Approve
                    </button>
                    <button
                      type="button"
                      className="ac-btn ac-btn--danger"
                      disabled={busyId === application.id}
                      onClick={() => void decide(application, 'rejected')}
                    >
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
        <Panel title="Published to the portals" subtitle="Records the registrar and faculty have actually released to students.">
          <dl className="ac-dl">
            <dt>Published timetables</dt>
            <dd>{num(overview?.publishedTimetables)}</dd>
            <dt>Grade records posted</dt>
            <dd>{num(overview?.postedGrades)}</dd>
            <dt>Attendance records posted</dt>
            <dd>{num(overview?.postedAttendance)}</dd>
            <dt>Tuition receipts raised</dt>
            <dd>{num(overview?.receipts)}</dd>
            <dt>Accounts on file</dt>
            <dd>
              {num(overview?.accounts)} <span className="ac-muted">({num(overview?.accountsInactive)} deactivated)</span>
            </dd>
            <dt>Audit events recorded</dt>
            <dd>{num(overview?.auditEvents)}</dd>
          </dl>
        </Panel>

        <Panel
          title="Institutional configuration"
          subtitle="Term parameters the whole portal reads from."
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

      <div className="ac-grid-2">
        <Panel
          title="Campus bulletins"
          subtitle="Published announcements, newest first."
          actions={
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => onNavigate('Announcements')}>
              Manage bulletins
            </button>
          }
        >
          {bulletins === null ? (
            <ErrorNote message="Announcements could not be read." onRetry={() => void load()} />
          ) : bulletins.length === 0 ? (
            <EmptyState title="No bulletins published" message="Nothing has been announced yet. Published bulletins appear here and on every portal immediately." />
          ) : (
            <div className="ac-cell-stack">
              {bulletins.map((bulletin) => (
                <div key={bulletin.id} style={{ display: 'grid', gap: 4, paddingBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="ac-strong">{bulletin.title}</span>
                    <Badge tone="muted">{bulletin.audience}</Badge>
                  </div>
                  <span className="ac-muted">{formatStamp(bulletin.published_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Recent administrative activity"
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
                      {row.entity_type ?? 'record'} {row.entity_id ? `• ${row.entity_id.slice(0, 18)}` : ''}
                    </span>
                  </span>
                  <span className="ac-muted">{formatStamp(row.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Notes>
        <strong>Registrar note.</strong> This console reads the live institutional database. A panel that shows nothing is not a
        failure — the table behind it is genuinely empty, and it fills the moment the academic office records something.
      </Notes>
    </ConsolePage>
  );
};
