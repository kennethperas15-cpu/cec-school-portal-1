import { useCallback, useMemo, useState } from 'react';
import { CalendarCheck, Download, RefreshCw, Search, TriangleAlert } from 'lucide-react';
import { useAcademicRecords, type AcademicRecord, type AttendanceRow, type AttendanceStatus } from '../../../services/records';
import { Badge, ConsolePage, EmptyState, ErrorNote, Kpi, Loading, Notes, PageHeader, Panel, Table, Toolbar, type Tone } from './kit';
import { downloadCsv, matches, unique } from './registry';

/** The attendance requirement the school enforces, stated the way CEC states it. */
const REQUIRED_PERCENT = 80;

const STATUS_TONE: Record<AttendanceStatus, Tone> = {
  Present: 'ok',
  Late: 'warn',
  Excused: 'muted',
  Absent: 'danger',
};

/** Present, late and excused all count towards the requirement; an absence does not. */
const countsAsAttended = (status: AttendanceStatus): boolean => status !== 'Absent';

const STATUSES: AttendanceStatus[] = ['Present', 'Late', 'Excused', 'Absent'];

type SessionRow = {
  key: string;
  record: AcademicRecord<AttendanceRow>;
  entry: AttendanceRow;
};

/**
 * The attendance register.
 *
 * Every row is a session a faculty member recorded for a student — the same
 * documents the student sees on their own attendance page. The design's terminal
 * telemetry (turnstile latency, RFID taps, node topology) describes hardware this
 * portal does not talk to, so the screen keeps to what was actually recorded, and
 * measures each student against the school's 80% requirement.
 */
export const AttendancePage = ({ onNotify }: { onNotify: (message: string) => void }) => {
  const { records, loading, error, refresh } = useAcademicRecords<AttendanceRow>('attendance');
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('');
  const [section, setSection] = useState('');

  const sections = useMemo(() => unique(records.map((record) => record.section)), [records]);

  const sessions = useMemo<SessionRow[]>(
    () =>
      records
        .flatMap((record) => record.entries.map((entry, index) => ({ key: `${record.itemId}-${index}`, record, entry })))
        .sort((a, b) => b.entry.date.localeCompare(a.entry.date)),
    [records],
  );

  const shown = useMemo(
    () =>
      sessions.filter(
        (row) =>
          matches(term, row.record.studentName, row.record.studentId, row.entry.course, row.record.section, row.entry.date, row.record.postedByName) &&
          (status ? row.entry.status === status : true) &&
          (section ? row.record.section === section : true),
      ),
    [sessions, term, status, section],
  );

  /** Attendance percentage per student, over the sessions actually recorded. */
  const standing = useMemo(
    () =>
      records
        .map((record) => {
          const total = record.entries.length;
          const attended = record.entries.filter((entry) => countsAsAttended(entry.status)).length;
          return {
            record,
            total,
            attended,
            percent: total ? Math.round((attended / total) * 1000) / 10 : 0,
          };
        })
        .filter((row) => row.total > 0)
        .sort((a, b) => a.percent - b.percent),
    [records],
  );

  const below = standing.filter((row) => row.percent < REQUIRED_PERCENT);
  const attending = sessions.filter((row) => countsAsAttended(row.entry.status)).length;

  const exportCsv = () => {
    downloadCsv(
      `cec-attendance-register-${new Date().toISOString().slice(0, 10)}.csv`,
      ['School ID', 'Student', 'Section', 'Course', 'Date', 'Status', 'Recorded by'],
      shown.map((row) => [row.record.studentId, row.record.studentName, row.record.section, row.entry.course, row.entry.date, row.entry.status, row.record.postedByName]),
    );
    onNotify(`Exported ${shown.length} attendance session${shown.length === 1 ? '' : 's'}`);
  };

  const reload = useCallback(() => {
    void refresh();
  }, [refresh]);

  return (
    <ConsolePage>
      <PageHeader
        crumb={['Registrar console', 'Campus operations']}
        title="Attendance Management"
        subtitle={`Every session recorded by faculty, and each student measured against the school's ${REQUIRED_PERCENT}% attendance requirement.`}
        actions={
          <>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={exportCsv} disabled={!shown.length}>
              <Download aria-hidden="true" />
              Export register
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={reload} disabled={loading}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </button>
          </>
        }
      />

      {error ? <ErrorNote message={error} onRetry={reload} /> : null}

      <div className="ac-kpis">
        <Kpi label="Attendance records posted" value={loading ? '—' : records.length.toLocaleString()} hint="student × term documents" tone={!loading && records.length === 0 ? 'empty' : 'default'} />
        <Kpi label="Sessions recorded" value={loading ? '—' : sessions.length.toLocaleString()} hint="dated sessions on file" tone={sessions.length ? 'default' : 'empty'} />
        <Kpi label="Students covered" value={loading ? '—' : unique(records.map((record) => record.studentId)).length.toLocaleString()} hint="school numbers with sessions" tone="default" />
        <Kpi
          label="Attendance rate"
          value={loading ? '—' : sessions.length ? `${Math.round((attending / sessions.length) * 1000) / 10}%` : '—'}
          hint={sessions.length ? `${attending} of ${sessions.length} sessions attended` : 'no sessions recorded yet'}
          tone={sessions.length ? 'default' : 'empty'}
        />
        <Kpi
          label={`Below ${REQUIRED_PERCENT}%`}
          value={loading ? '—' : below.length.toLocaleString()}
          hint={below.length ? 'at risk of dropping the subject' : 'every posted record meets the requirement'}
          tone={below.length ? 'attention' : 'empty'}
        />
      </div>

      <Panel
        title={`Students below the ${REQUIRED_PERCENT}% attendance requirement`}
        subtitle="Computed from the sessions faculty recorded — not from a separate attendance table."
      >
        {loading ? (
          <Loading label="Working out the attendance standing…" />
        ) : standing.length === 0 ? (
          <EmptyState
            title="Nothing to measure yet"
            message="No attendance has been recorded, so no student can be measured against the requirement."
          />
        ) : below.length === 0 ? (
          <Notes>
            <strong>All clear.</strong> Every one of the {standing.length} {standing.length === 1 ? 'student' : 'students'} with recorded sessions
            is at or above {REQUIRED_PERCENT}%. The requirement is enforced when a student falls below it, not before.
          </Notes>
        ) : (
          <Table head={['Student', 'Section', 'Attended', 'Sessions', 'Attendance']}>
            {below.map((row) => (
              <tr key={row.record.itemId}>
                <td>
                  <span className="ac-cell-stack">
                    <span className="ac-strong">{row.record.studentName || 'Unnamed student'}</span>
                    <span className="ac-mono">{row.record.studentId}</span>
                  </span>
                </td>
                <td>{row.record.section || '—'}</td>
                <td>{row.attended}</td>
                <td>{row.total}</td>
                <td>
                  <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className="ac-mono ac-strong">{row.percent}%</span>
                    <span className="ac-bar" style={{ minWidth: 90 }}>
                      <span style={{ width: `${row.percent}%`, background: '#BA1A1A' }} />
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Panel title="Session register" subtitle={`Showing ${shown.length} of ${sessions.length} recorded sessions.`} flush>
        <Toolbar>
          <label className="ac-field ac-search">
            <span className="ac-muted">
              <Search aria-hidden="true" style={{ width: 12, height: 12, verticalAlign: '-1px' }} /> Search
            </span>
            <input
              className="ac-input"
              placeholder="School ID, learner name, subject or date"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              aria-label="Search attendance sessions"
            />
          </label>
          <label className="ac-field">
            <span>Status</span>
            <select className="ac-select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by attendance status">
              <option value="">All statuses</option>
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="ac-field">
            <span>Section</span>
            <select className="ac-select" value={section} onChange={(event) => setSection(event.target.value)} aria-label="Filter by section">
              <option value="">All sections</option>
              {sections.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <span className="ac-muted" style={{ marginLeft: 'auto' }}>
            <CalendarCheck aria-hidden="true" style={{ width: 13, height: 13, verticalAlign: '-2px' }} /> Recorded by faculty, term by term
          </span>
        </Toolbar>

        {loading ? (
          <Loading label="Reading the attendance register…" />
        ) : shown.length === 0 ? (
          <EmptyState
            title={sessions.length === 0 ? 'No attendance recorded yet' : 'No sessions match these filters'}
            message={
              sessions.length === 0
                ? 'The register is empty. Sessions appear here as faculty record them for their classes, and the student sees the same rows on their own attendance page.'
                : 'Adjust the search, status or section to widen the result set.'
            }
          />
        ) : (
          <Table head={['Student', 'Course & section', 'Recorded by', 'Session date', 'Status', 'Document']}>
            {shown.slice(0, 300).map((row) => (
              <tr key={row.key}>
                <td>
                  <span className="ac-cell-stack">
                    <span className="ac-strong">{row.record.studentName || 'Unnamed student'}</span>
                    <span className="ac-mono">{row.record.studentId}</span>
                  </span>
                </td>
                <td>
                  <span className="ac-cell-stack">
                    <span>{row.entry.course || '—'}</span>
                    <span className="ac-muted">{row.record.section || '—'}</span>
                  </span>
                </td>
                <td>{row.record.postedByName || row.record.postedBy || '—'}</td>
                <td className="ac-mono">{row.entry.date}</td>
                <td>
                  <Badge tone={STATUS_TONE[row.entry.status]}>{row.entry.status}</Badge>
                </td>
                <td className="ac-muted">
                  {row.record.schoolYear} • {row.record.semester}
                </td>
              </tr>
            ))}
          </Table>
        )}
        {shown.length > 300 ? (
          <div className="ac-note" style={{ margin: '0 20px 20px' }}>
            <TriangleAlert aria-hidden="true" />
            <span>Showing the 300 most recent sessions. Export the register for the full list.</span>
          </div>
        ) : null}
      </Panel>

      <Notes>
        <strong>On the design's terminals.</strong> The design monitors RFID readers, biometric scanners and network nodes. This portal receives
        attendance only from faculty records, so the session register above is the complete picture — there is no second source to
        cross-check it against.
      </Notes>
    </ConsolePage>
  );
};
