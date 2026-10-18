import { useCallback, useMemo, useState } from 'react';
import { CalendarDays, Download, LayoutGrid, RefreshCw, Rows3, Trash2, TriangleAlert, Undo2 } from 'lucide-react';
import { describeApiError } from '../../../services/api';
import { DAY_NAMES, findConflicts, unpublishTimetable, usePublishedTimetables, type ScheduleEntry, type TimetableRecord } from '../../../services/schedule';
import { Badge, ConsolePage, EmptyState, ErrorNote, Kpi, Loading, Notes, PageHeader, Panel, Table, Toolbar } from './kit';
import { downloadCsv, humanise, matches, unique } from './registry';

/** `"09:30"` -> `"09:30 AM"`, the way the design's time column reads. */
const clock = (value: string): string => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value || '—';
  const hour = Number(match[1]);
  const suffix = hour < 12 ? 'AM' : 'PM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(display).padStart(2, '0')}:${match[2]} ${suffix}`;
};

/** `Monday` -> `MONDAY`; used for the grid's column strip. */
const dayLabel = (day: string): string => day.toUpperCase();

const meetingLabel = (entry: ScheduleEntry): string => [entry.code, entry.title].filter(Boolean).join(': ') || 'Class meeting';

/**
 * The master timetable.
 *
 * Each published section is one document the registrar released to the portals,
 * so this screen reads exactly what students and faculty are looking at. The
 * week grid is drawn from those documents, and the conflict count is computed
 * from them — the design's "conflict audit engine" has nothing to approve here
 * beyond the overlaps that are really present.
 */
export const ClassSchedulePage = ({ onNotify, onNavigate }: { onNotify: (message: string) => void; onNavigate: (label: string) => void }) => {
  const { rows, loading, error, refresh } = usePublishedTimetables();
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [term, setTerm] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const sections = useMemo(() => rows.map((row) => row.section), [rows]);
  const active: TimetableRecord | null = useMemo(() => {
    if (!rows.length) return null;
    return rows.find((row) => row.section === selected) ?? rows[0];
  }, [rows, selected]);

  const startingHours = useMemo(() => {
    const hours = unique((active?.entries ?? []).map((entry) => entry.start.slice(0, 2)));
    return hours.sort();
  }, [active]);

  const meetingsOf = (day: string, hour: string): ScheduleEntry[] =>
    (active?.entries ?? []).filter((entry) => entry.day === day && entry.start.slice(0, 2) === hour);

  const conflicts = useMemo(() => (active ? findConflicts(active.entries) : []), [active]);
  const totalMeetings = rows.reduce((total, row) => total + row.entries.length, 0);
  const rooms = unique(rows.flatMap((row) => row.entries.map((entry) => entry.room)));
  const instructors = unique(rows.flatMap((row) => row.entries.map((entry) => entry.instructor)));
  const allConflicts = rows.reduce((total, row) => total + findConflicts(row.entries).length, 0);

  const shownSections = useMemo(
    () => rows.filter((row) => matches(term, row.section, row.program, row.publishedByName, ...row.entries.map((entry) => entry.instructor))),
    [rows, term],
  );

  const withdraw = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await unpublishTimetable(active.itemId);
      onNotify(`${active.section} withdrawn — students no longer see that timetable`);
      setConfirming(false);
      refresh();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Withdrawing the timetable'));
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    downloadCsv(
      `cec-master-timetable-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Section', 'Program', 'School year', 'Semester', 'Subject code', 'Subject', 'Delivery', 'Units', 'Day', 'Start', 'End', 'Room', 'Instructor', 'Published by', 'Published at'],
      rows.flatMap((row) =>
        row.entries.map((entry) => [
          row.section,
          row.program,
          row.schoolYear,
          row.semester,
          entry.code,
          entry.title,
          entry.kind,
          entry.units,
          entry.day,
          entry.start,
          entry.end,
          entry.room,
          entry.instructor,
          row.publishedByName,
          row.publishedAt,
        ]),
      ),
    );
    onNotify(`Exported the master timetable (${rows.length} section${rows.length === 1 ? '' : 's'})`);
  };

  const reload = useCallback(() => refresh(), [refresh]);

  return (
    <ConsolePage>
      <PageHeader
        crumb={['Registrar console', 'Academics']}
        title="Class Schedule"
        subtitle="Every timetable the registrar has published, exactly as the student and faculty portals are reading it right now."
        actions={
          <>
            <button type="button" className="ac-btn" onClick={() => onNavigate('Study Load Builder')}>
              <CalendarDays aria-hidden="true" />
              Open the study load builder
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={exportCsv} disabled={!rows.length}>
              <Download aria-hidden="true" />
              Export master timetable
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
        <Kpi label="Published sections" value={loading ? '—' : rows.length.toLocaleString()} hint="live on the portals" tone={!loading && rows.length === 0 ? 'empty' : 'default'} />
        <Kpi label="Class meetings" value={loading ? '—' : totalMeetings.toLocaleString()} hint="weekly meetings scheduled" tone={totalMeetings ? 'default' : 'empty'} />
        <Kpi label="Rooms in use" value={loading ? '—' : rooms.length.toLocaleString()} hint="distinct venues named" tone="default" />
        <Kpi label="Faculty assigned" value={loading ? '—' : instructors.length.toLocaleString()} hint="named instructors" tone="default" />
        <Kpi
          label="Conflicts detected"
          value={loading ? '—' : allConflicts.toLocaleString()}
          hint={allConflicts ? 'room or instructor overlap' : 'no overlap found'}
          tone={allConflicts ? 'attention' : 'empty'}
        />
      </div>

      {loading ? (
        <Panel>
          <Loading label="Reading the published timetables…" />
        </Panel>
      ) : rows.length === 0 ? (
        <Panel title="Master timetable" subtitle="Nothing has been published for the active term.">
          <EmptyState
            title="No timetable published yet"
            message="The student and faculty portals are showing the same empty state. Build a section's week in the study load builder and publish it — it appears here and on the portals at once."
          />
        </Panel>
      ) : (
        <>
          <Panel title="Master timetable" subtitle={`Showing ${shownSections.length} of ${rows.length} published sections.`} flush>
            <Toolbar>
              <div className="ac-tabs">
                {rows.map((row) => (
                  <button
                    type="button"
                    key={row.itemId}
                    className={`ac-tab${active?.itemId === row.itemId ? ' is-active' : ''}`}
                    onClick={() => {
                      setSelected(row.section);
                      setConfirming(false);
                    }}
                    aria-pressed={active?.itemId === row.itemId}
                  >
                    {row.section}
                  </button>
                ))}
              </div>
              <label className="ac-field ac-search">
                <span className="ac-muted">Search</span>
                <input
                  className="ac-input"
                  placeholder="Section, program, faculty"
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  aria-label="Search published sections"
                />
              </label>
              <div className="ac-tabs" style={{ marginLeft: 'auto' }}>
                <button type="button" className={`ac-tab${view === 'grid' ? ' is-active' : ''}`} onClick={() => setView('grid')} aria-pressed={view === 'grid'}>
                  <LayoutGrid aria-hidden="true" style={{ width: 12, height: 12, verticalAlign: '-1px' }} /> Week grid
                </button>
                <button type="button" className={`ac-tab${view === 'table' ? ' is-active' : ''}`} onClick={() => setView('table')} aria-pressed={view === 'table'}>
                  <Rows3 aria-hidden="true" style={{ width: 12, height: 12, verticalAlign: '-1px' }} /> Meeting table
                </button>
              </div>
            </Toolbar>

            {active ? (
              <div style={{ padding: '16px 20px 20px', display: 'grid', gap: 14 }}>
                <div className="ac-actions" style={{ justifyContent: 'space-between' }}>
                  <span className="ac-cell-stack">
                    <span className="ac-strong" style={{ fontSize: 15 }}>
                      {active.section}
                      {active.program ? ` • ${active.program}` : ''}
                    </span>
                    <span className="ac-muted">
                      {active.schoolYear} • {active.semester} • {active.entries.length} weekly meeting{active.entries.length === 1 ? '' : 's'} • published by{' '}
                      {active.publishedByName || active.publishedBy || '—'}
                      {active.updatedByName ? ` • last edited by ${active.updatedByName}` : ''}
                    </span>
                  </span>
                  <span className="ac-actions">
                    {confirming ? (
                      <>
                        <span className="ac-muted">Withdrawing removes it from both portals; the audit trail keeps the deletion.</span>
                        <button type="button" className="ac-btn ac-btn--danger" disabled={busy} onClick={() => void withdraw()}>
                          <Trash2 aria-hidden="true" />
                          {busy ? 'Withdrawing…' : 'Confirm withdraw'}
                        </button>
                        <button type="button" className="ac-btn ac-btn--ghost" onClick={() => setConfirming(false)}>
                          <Undo2 aria-hidden="true" />
                          Keep published
                        </button>
                      </>
                    ) : (
                      <button type="button" className="ac-btn ac-btn--danger" onClick={() => setConfirming(true)}>
                        <Trash2 aria-hidden="true" />
                        Withdraw from portals
                      </button>
                    )}
                  </span>
                </div>

                {active.note ? <div className="ac-note">{active.note}</div> : null}

                {conflicts.length ? (
                  <div className="ac-note ac-note--warn">
                    <TriangleAlert aria-hidden="true" />
                    <div>
                      <strong>{conflicts.length} conflict{conflicts.length === 1 ? '' : 's'} in this section.</strong>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                        {conflicts.map((problem) => (
                          <li key={problem}>{problem}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}

                {active.entries.length === 0 ? (
                  <EmptyState title="This section has no meetings" message="The document was published without any class meetings." />
                ) : view === 'grid' ? (
                  <div className="ac-table-wrap">
                    <table className="ac-table">
                      <thead>
                        <tr>
                          <th scope="col">Time slot</th>
                          {DAY_NAMES.map((day) => (
                            <th key={day} scope="col">
                              {dayLabel(day)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {startingHours.map((hour) => (
                          <tr key={hour}>
                            <td className="ac-mono ac-strong" style={{ whiteSpace: 'nowrap' }}>
                              {clock(`${hour}:00`)}
                            </td>
                            {DAY_NAMES.map((day) => {
                              const cell = meetingsOf(day, hour);
                              return (
                                <td key={`${day}-${hour}`} style={{ minWidth: 150 }}>
                                  {cell.length === 0 ? (
                                    <span className="ac-muted">—</span>
                                  ) : (
                                    <div style={{ display: 'grid', gap: 8 }}>
                                      {cell.map((entry) => (
                                        <span key={entry.id} style={{ display: 'grid', gap: 2 }}>
                                          {entry.kind ? <Badge tone="muted">{entry.kind}</Badge> : null}
                                          <span className="ac-strong">{meetingLabel(entry)}</span>
                                          <span className="ac-muted">
                                            {clock(entry.start)}–{clock(entry.end)}
                                            {entry.room ? ` • ${entry.room}` : ''}
                                          </span>
                                          <span className="ac-muted">
                                            {entry.instructor || 'Instructor not named'}
                                            {entry.units !== null ? ` • ${entry.units} units` : ''}
                                          </span>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Table head={['Subject code', 'Subject', 'Delivery', 'Units', 'Day', 'Time', 'Room', 'Instructor']}>
                    {active.entries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="ac-mono ac-strong">{entry.code || '—'}</td>
                        <td>{entry.title || '—'}</td>
                        <td>{humanise(entry.kind) === '—' ? '—' : entry.kind}</td>
                        <td>{entry.units ?? '—'}</td>
                        <td>{entry.day}</td>
                        <td className="ac-mono">
                          {clock(entry.start)}–{clock(entry.end)}
                        </td>
                        <td>{entry.room || '—'}</td>
                        <td>{entry.instructor || '—'}</td>
                      </tr>
                    ))}
                  </Table>
                )}
              </div>
            ) : null}
          </Panel>
        </>
      )}

      <Notes>
        <strong>Where the grid comes from.</strong> One published document per section and term, written by the study load builder and read by
        all three portals — so this grid is what students see, not a second copy. Withdrawing is the only edit offered here; building and
        publishing a week stays in the builder, which owns that form.
      </Notes>
    </ConsolePage>
  );
};
