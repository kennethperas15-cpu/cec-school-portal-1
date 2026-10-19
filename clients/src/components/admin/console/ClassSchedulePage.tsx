import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  Download,
  Flame,
  Grid3x3,
  LayoutGrid,
  MapPin,
  Plus,
  RefreshCw,
  Rows3,
  Search,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Undo2,
  Users,
} from 'lucide-react';
import { describeApiError } from '../../../services/api';
import { useAcademicConfig } from '../../../services/academicConfig';
import {
  DAY_NAMES,
  findConflicts,
  findInstitutionalConflicts,
  unpublishTimetable,
  usePublishedTimetables,
  type ScheduleEntry,
  type TimetableRecord,
} from '../../../services/schedule';
import { Badge, ConsolePage, EmptyState, ErrorNote, Kpi, Loading, Notes, PageHeader, Panel, Table, Toolbar } from './kit';
import { downloadCsv, matches, unique } from './registry';

/**
 * Class Schedule Management — the registrar's master timetable.
 *
 * Laid out as the institutional design lays it out: the live conflict sentinel
 * above the title, the command bar, the metric strip, the mode switcher and its
 * filters, the week grid with its colour legend, and the collision detector at
 * the foot. Every figure is read from the published timetables — the exact
 * documents the student and teacher portals are showing — or computed from them.
 * Nothing on this screen is a placeholder: a grid with no published section is
 * the honest answer that nothing is live, and the collision counts are derived
 * by comparing the meetings against each other.
 */

type Props = { onNotify: (message: string) => void; onNavigate: (label: string) => void };

type ViewMode = 'matrix' | 'directory' | 'heatmap';

/** The delivery tone used for the grid cards and the legend. */
type SlotTone = 'lecture' | 'lab' | 'mixed' | 'seminar' | 'practicum' | 'online' | 'plain';

const TONE_LABEL: Record<SlotTone, string> = {
  lecture: 'Core lecture',
  lab: 'Hands-on laboratory',
  mixed: 'Lecture & laboratory',
  seminar: 'Seminar / colloquium',
  practicum: 'Practicum',
  online: 'Online',
  plain: 'Class meeting',
};

/** `"09:30"` -> `"09:30 AM"`, the way the design's time column reads. */
const clock = (value: string): string => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value || '—';
  const hour = Number(match[1]);
  const suffix = hour < 12 ? 'AM' : 'PM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(display).padStart(2, '0')}:${match[2]} ${suffix}`;
};

/** The design's columns read `MONDAY`, so uppercase the day name. */
const dayLabel = (day: string): string => day.toUpperCase();

const meetingLabel = (entry: ScheduleEntry): string => [entry.code, entry.title].filter(Boolean).join(': ') || 'Class meeting';

/** Which colour a meeting takes, from whatever the registrar typed as delivery. */
const toneOf = (kind: string): SlotTone => {
  const value = (kind ?? '').toLowerCase();
  if (value.includes('lab') && value.includes('lecture')) return 'mixed';
  if (value.includes('lab')) return 'lab';
  if (value.includes('seminar') || value.includes('colloqui')) return 'seminar';
  if (value.includes('practic') || value.includes('intern')) return 'practicum';
  if (value.includes('online') || value.includes('virtual')) return 'online';
  if (value.includes('lecture')) return 'lecture';
  return 'plain';
};

const termLabel = (row: TimetableRecord): string => `${row.schoolYear} • ${row.semester}`;

/** One distinct (start, end) pair of the week, in clock order. */
type Slot = { start: string; end: string };

const slotsOf = (entries: ScheduleEntry[]): Slot[] => {
  const map = new Map<string, Slot>();
  for (const entry of entries) {
    if (!/^\d{2}:\d{2}$/.test(entry.start) || !/^\d{2}:\d{2}$/.test(entry.end)) continue;
    map.set(`${entry.start}|${entry.end}`, { start: entry.start, end: entry.end });
  }
  return [...map.values()].sort((a, b) => (a.start === b.start ? a.end.localeCompare(b.end) : a.start.localeCompare(b.start)));
};

/** The colour legend of one section: the delivery modes its meetings actually use. */
const legendOf = (entries: ScheduleEntry[]): { tone: SlotTone; label: string }[] => {
  const tones = unique(entries.map((entry) => entry.kind).filter(Boolean)).map((kind) => ({
    tone: toneOf(kind),
    label: kind,
  }));
  const seen = new Map<SlotTone, string>();
  for (const item of tones) if (!seen.has(item.tone)) seen.set(item.tone, item.label);
  return [...seen.entries()].map(([tone, label]) => ({ tone, label }));
};

export const ClassSchedulePage = ({ onNotify, onNavigate }: Props) => {
  const academic = useAcademicConfig();
  const { rows, loading, error, refresh } = usePublishedTimetables();

  const [view, setView] = useState<ViewMode>('matrix');
  const [selected, setSelected] = useState<string | null>(null);
  const [term, setTerm] = useState<string | null>(null);
  const [program, setProgram] = useState('');
  const [faculty, setFaculty] = useState('');
  const [venue, setVenue] = useState('');
  const [search, setSearch] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  const activeTerm = `${academic.schoolYear} • ${academic.semester}`;

  // Scope to the live term once the documents arrive; the registrar can widen it.
  useEffect(() => {
    if (term !== null || !rows.length) return;
    const labels = unique(rows.map(termLabel));
    setTerm(labels.includes(activeTerm) ? activeTerm : '');
  }, [rows, term, activeTerm]);

  const termOptions = useMemo(() => unique(rows.map(termLabel)), [rows]);
  const programOptions = useMemo(() => unique(rows.map((row) => row.program)), [rows]);
  const facultyOptions = useMemo(() => unique(rows.flatMap((row) => row.entries.map((entry) => entry.instructor))), [rows]);
  const venueOptions = useMemo(() => unique(rows.flatMap((row) => row.entries.map((entry) => entry.room))), [rows]);

  const chosenTerm = term ?? '';

  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!chosenTerm || termLabel(row) === chosenTerm) &&
          matches(program, row.program) &&
          matches(faculty, ...row.entries.map((entry) => entry.instructor)) &&
          matches(venue, ...row.entries.map((entry) => entry.room)) &&
          matches(search, row.section, row.program, row.publishedByName, ...row.entries.flatMap((entry) => [entry.code, entry.title, entry.instructor, entry.room])),
      ),
    [rows, chosenTerm, program, faculty, venue, search],
  );

  const active: TimetableRecord | null = useMemo(() => {
    if (!filtered.length) return null;
    return filtered.find((row) => row.itemId === selected) ?? filtered[0];
  }, [filtered, selected]);

  /** Cross-section audit: the same room, or the same teacher, twice at once. */
  const findings = useMemo(() => findInstitutionalConflicts(filtered), [filtered, scannedAt]);
  const roomClashes = useMemo(() => findings.filter((finding) => finding.kind === 'room'), [findings]);
  const facultyClashes = useMemo(() => findings.filter((finding) => finding.kind === 'faculty'), [findings]);
  const ownConflicts = useMemo(() => (active ? findConflicts(active.entries) : []), [active]);

  const totalMeetings = filtered.reduce((total, row) => total + row.entries.length, 0);
  const venuesUsed = unique(filtered.flatMap((row) => row.entries.map((entry) => entry.room)));
  const instructorsNamed = unique(filtered.flatMap((row) => row.entries.map((entry) => entry.instructor)));

  /** The newest publish/update across what is on screen. */
  const latestPublish = useMemo(() => {
    const stamps = filtered
      .map((row) => row.updatedAt || row.publishedAt || row.rowCreatedAt || '')
      .filter(Boolean)
      .sort();
    return stamps.length ? stamps[stamps.length - 1] : null;
  }, [filtered]);

  const matrixSlots = useMemo(() => slotsOf(active?.entries ?? []), [active]);

  /** The week for the heat map spans every filtered section, not just one. */
  const heatSlots = useMemo(() => slotsOf(filtered.flatMap((row) => row.entries)), [filtered]);
  const heatGrid = useMemo(() => {
    const grid = new Map<string, ScheduleEntry[]>();
    for (const row of filtered) {
      for (const entry of row.entries) {
        const key = `${entry.day}|${entry.start}|${entry.end}`;
        grid.set(key, [...(grid.get(key) ?? []), entry]);
      }
    }
    return grid;
  }, [filtered]);
  const heatPeak = useMemo(() => {
    let peak = 0;
    for (const key of heatGrid.keys()) peak = Math.max(peak, heatGrid.get(key)?.length ?? 0);
    return peak;
  }, [heatGrid]);

  const clearFilters = () => {
    setTerm('');
    setProgram('');
    setFaculty('');
    setVenue('');
    setSearch('');
  };

  const filtersOn = Boolean(chosenTerm || program || faculty || venue || search);

  const rescan = useCallback(() => {
    setScannedAt(new Date().toISOString());
    refresh();
    onNotify('Audit recomputed against every published meeting');
  }, [refresh, onNotify]);

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
      filtered.flatMap((row) =>
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
    onNotify(`Exported the master timetable (${filtered.length} section${filtered.length === 1 ? '' : 's'})`);
  };

  const activeLegend = active ? legendOf(active.entries) : [];
  const conflictTotal = findings.length;

  return (
    <ConsolePage>
      {/* Context bar: breadcrumbs, the live conflict sentinel, the term. */}
      <div className="ac-contextbar">
        <nav className="ac-crumb" aria-label="Breadcrumb">
          <span>Academics</span>
          <span aria-hidden="true"> / </span>
          <span>Schedule Orchestration</span>
          <span aria-hidden="true"> / </span>
          <span>Master Timetable</span>
        </nav>
        <div className="ac-contextbar-right">
          <label className="ac-contextbar-search">
            <Search aria-hidden="true" />
            <input
              className="ac-input"
              placeholder="Search section, program, faculty, room…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search the master timetable"
            />
          </label>
          <span className={`ac-badge ${conflictTotal ? 'ac-badge--warn' : 'ac-badge--ok'}`}>
            <ShieldCheck aria-hidden="true" />
            Conflict audit engine: {conflictTotal} overlap{conflictTotal === 1 ? '' : 's'} detected
          </span>
          <span className="ac-badge ac-badge--muted">
            <CalendarDays aria-hidden="true" />
            {activeTerm}
          </span>
        </div>
      </div>

      <PageHeader
        crumb={['Registrar console', 'Class Schedule']}
        title="Class Schedule Management"
        subtitle="Coordinate lecture rooms, faculty assignments and section blocks across the school, and resolve room collisions before they reach the portals."
        actions={
          <>
            <button type="button" className="ac-btn" onClick={() => onNavigate('Study Load Builder')}>
              <Plus aria-hidden="true" />
              Create schedule entry
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={exportCsv} disabled={!filtered.length}>
              <Download aria-hidden="true" />
              Export master timetable
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => refresh()} disabled={loading}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </button>
          </>
        }
      />

      {error ? <ErrorNote message={error} onRetry={() => refresh()} /> : null}

      <div className="ac-kpis">
        <Kpi
          label="Total class sections"
          value={loading ? '—' : filtered.length.toLocaleString()}
          hint={chosenTerm || 'live on the student & teacher portals'}
          tone={!loading && filtered.length === 0 ? 'empty' : 'default'}
        />
        <Kpi
          label="Weekly class meetings"
          value={loading ? '—' : totalMeetings.toLocaleString()}
          hint={totalMeetings ? 'across the sections above' : 'none scheduled'}
          tone={totalMeetings ? 'default' : 'empty'}
        />
        <Kpi
          label="Venue utilization"
          value={loading ? '—' : venuesUsed.length.toLocaleString()}
          hint={venuesUsed.length ? 'distinct rooms named' : 'no room named yet'}
          tone="default"
        />
        <Kpi
          label="Faculty schedule clashes"
          value={loading ? '—' : facultyClashes.length.toLocaleString()}
          hint={facultyClashes.length ? 'automated cross-roster detection' : 'no clash found'}
          tone={facultyClashes.length ? 'attention' : 'empty'}
        />
      </div>

      {/* Mode switcher and fine filters. */}
      <div className="ac-panel">
        <Toolbar>
          <div className="ac-tabs" role="tablist" aria-label="Timetable view">
            <button
              type="button"
              role="tab"
              className={`ac-tab${view === 'matrix' ? ' is-active' : ''}`}
              aria-selected={view === 'matrix'}
              onClick={() => setView('matrix')}
            >
              <LayoutGrid aria-hidden="true" /> Calendar grid matrix view
            </button>
            <button
              type="button"
              role="tab"
              className={`ac-tab${view === 'directory' ? ' is-active' : ''}`}
              aria-selected={view === 'directory'}
              onClick={() => setView('directory')}
            >
              <Rows3 aria-hidden="true" /> Master table directory
            </button>
            <button
              type="button"
              role="tab"
              className={`ac-tab${view === 'heatmap' ? ' is-active' : ''}`}
              aria-selected={view === 'heatmap'}
              onClick={() => setView('heatmap')}
            >
              <Grid3x3 aria-hidden="true" /> Room utilization heat map
            </button>
          </div>

          <div className="ac-filters">
            <label className="ac-field">
              <span>Term</span>
              <select className="ac-select" value={chosenTerm} onChange={(event) => setTerm(event.target.value)} aria-label="Filter by term">
                <option value="">All terms</option>
                {termOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="ac-field">
              <span>Program</span>
              <select className="ac-select" value={program} onChange={(event) => setProgram(event.target.value)} aria-label="Filter by program">
                <option value="">All programs</option>
                {programOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="ac-field">
              <span>Faculty member</span>
              <select className="ac-select" value={faculty} onChange={(event) => setFaculty(event.target.value)} aria-label="Filter by faculty member">
                <option value="">All faculty</option>
                {facultyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="ac-field">
              <span>Room</span>
              <select className="ac-select" value={venue} onChange={(event) => setVenue(event.target.value)} aria-label="Filter by room">
                <option value="">All rooms</option>
                {venueOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={clearFilters} disabled={!filtersOn}>
              <Undo2 aria-hidden="true" />
              Reset filters
            </button>
          </div>
        </Toolbar>
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
        <Panel flush>
          {/* Section quick switch + colour legend. */}
          <Toolbar>
            <div className="ac-tabs">
              {filtered.length === 0 ? (
                <span className="ac-muted">No section matches these filters.</span>
              ) : (
                filtered.map((row) => (
                  <button
                    type="button"
                    key={row.itemId}
                    className={`ac-tab${active?.itemId === row.itemId ? ' is-active' : ''}`}
                    onClick={() => {
                      setSelected(row.itemId);
                      setConfirming(false);
                    }}
                    aria-pressed={active?.itemId === row.itemId}
                  >
                    {row.section}
                  </button>
                ))
              )}
            </div>
            {view === 'matrix' && activeLegend.length ? (
              <div className="ac-legend" aria-label="Delivery legend">
                {activeLegend.map((item) => (
                  <span className="ac-legend-item" key={item.tone}>
                    <span className={`ac-dot ac-dot--${item.tone}`} aria-hidden="true" />
                    {item.label}
                  </span>
                ))}
                <span className="ac-legend-item">
                  <span className="ac-dot ac-dot--open" aria-hidden="true" />
                  Open slot
                </span>
              </div>
            ) : null}
          </Toolbar>

          {active ? (
            <div className="ac-sched-body">
              <div className="ac-sectionbar">
                <div>
                  <span className="ac-strong" style={{ fontSize: 15 }}>
                    Master timetable: {active.section}
                    {active.program ? ` (${active.program})` : ''}
                  </span>
                  <div className="ac-muted">
                    {active.schoolYear} • {active.semester} • {active.entries.length} weekly meeting{active.entries.length === 1 ? '' : 's'} •
                    published by {active.publishedByName || active.publishedBy || '—'}
                    {active.updatedByName ? ` • last edited by ${active.updatedByName}` : ''}
                  </div>
                </div>
                <div className="ac-actions">
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
                </div>
              </div>

              {active.note ? <div className="ac-note">{active.note}</div> : null}

              {ownConflicts.length ? (
                <div className="ac-note ac-note--warn">
                  <TriangleAlert aria-hidden="true" />
                  <div>
                    <strong>
                      {ownConflicts.length} conflict{ownConflicts.length === 1 ? '' : 's'} inside this section.
                    </strong>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                      {ownConflicts.map((problem) => (
                        <li key={problem}>{problem}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              {active.entries.length === 0 ? (
                <EmptyState title="This section has no meetings" message="The document was published without any class meetings." />
              ) : view === 'matrix' ? (
                <div className="ac-table-wrap">
                  <table className="ac-table ac-matrix">
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
                      {matrixSlots.map((slot, index) => {
                        const previous = matrixSlots[index - 1];
                        const recess = previous && previous.end <= '12:00' && slot.start >= '13:00';
                        const cardsFor = (day: string) =>
                          (active.entries ?? []).filter((entry) => entry.day === day && entry.start === slot.start && entry.end === slot.end);
                        return (
                          <Fragment key={`${slot.start}-${slot.end}`}>
                            {recess ? (
                              <tr className="ac-recess">
                                <td colSpan={DAY_NAMES.length + 1}>
                                  Institutional recess &amp; midday venue turnover window
                                </td>
                              </tr>
                            ) : null}
                            <tr>
                              <td className="ac-slot-time">
                                <Clock aria-hidden="true" />
                                <span className="ac-mono ac-strong">
                                  {clock(slot.start)} – {clock(slot.end)}
                                </span>
                              </td>
                              {DAY_NAMES.map((day) => {
                                const cards = cardsFor(day);
                                return (
                                  <td key={`${day}-${slot.start}`}>
                                    {cards.length === 0 ? (
                                      <div className="ac-slot-open">Open slot</div>
                                    ) : (
                                      <div className="ac-slot-stack">
                                        {cards.map((entry) => (
                                          <article key={entry.id} className={`ac-slot ac-slot--${toneOf(entry.kind)}`}>
                                            {entry.kind ? <span className="ac-slot-kind">{entry.kind}</span> : null}
                                            <span className="ac-slot-title">{meetingLabel(entry)}</span>
                                            <span className="ac-slot-meta">
                                              <Users aria-hidden="true" />
                                              {entry.instructor || 'Instructor not named'}
                                            </span>
                                            <span className="ac-slot-meta">
                                              <MapPin aria-hidden="true" />
                                              {entry.room || 'Room not named'}
                                              {entry.units !== null ? ` • ${entry.units} units` : ''}
                                            </span>
                                          </article>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : view === 'heatmap' ? (
                <div className="ac-table-wrap">
                  <table className="ac-table ac-matrix">
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
                      {heatSlots.map((slot) => (
                        <tr key={`${slot.start}-${slot.end}`}>
                          <td className="ac-slot-time">
                            <Flame aria-hidden="true" />
                            <span className="ac-mono ac-strong">
                              {clock(slot.start)} – {clock(slot.end)}
                            </span>
                          </td>
                          {DAY_NAMES.map((day) => {
                            const meetings = heatGrid.get(`${day}|${slot.start}|${slot.end}`) ?? [];
                            const rooms = unique(meetings.map((entry) => entry.room));
                            const intensity = heatPeak ? meetings.length / heatPeak : 0;
                            return (
                              <td key={`${day}-${slot.start}`}>
                                <div
                                  className={`ac-heat${meetings.length ? '' : ' ac-heat--empty'}`}
                                  style={
                                    meetings.length
                                      ? { background: `rgba(0, 88, 190, ${(0.1 + 0.55 * intensity).toFixed(3)})` }
                                      : undefined
                                  }
                                  title={meetings.length ? rooms.map((room) => room || 'Room not named').join(', ') : 'No class booked'}
                                >
                                  <strong>{meetings.length || '·'}</strong>
                                  <span>{meetings.length === 1 ? 'class' : 'classes'}</span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="ac-directory">
                <Table head={['Section', 'Term', 'Subject code', 'Subject', 'Delivery', 'Units', 'Day', 'Time', 'Room', 'Instructor', 'Published by']}>
                  {filtered.flatMap((row) => {
                    const termCell = (
                      <td className="ac-muted">
                        <span className="ac-cell-stack">
                          <span>{row.schoolYear}</span>
                          <span>{row.semester}</span>
                        </span>
                      </td>
                    );
                    return row.entries.length
                      ? row.entries.map((entry) => (
                          <tr key={`${row.itemId}-${entry.id}`}>
                            <td className="ac-strong">{row.section}</td>
                            {termCell}
                            <td className="ac-mono ac-strong">{entry.code || '—'}</td>
                            <td>{entry.title || '—'}</td>
                            <td>{entry.kind ? <Badge tone="muted">{entry.kind}</Badge> : '—'}</td>
                            <td>{entry.units ?? '—'}</td>
                            <td>{entry.day}</td>
                            <td className="ac-mono">
                              {clock(entry.start)}–{clock(entry.end)}
                            </td>
                            <td>{entry.room || '—'}</td>
                            <td>{entry.instructor || '—'}</td>
                            <td className="ac-muted">{row.publishedByName || row.publishedBy || '—'}</td>
                          </tr>
                        ))
                      : [
                          <tr key={`${row.itemId}-empty`}>
                            <td className="ac-strong">{row.section}</td>
                            {termCell}
                            <td colSpan={9} className="ac-muted">
                              Published without any class meetings.
                            </td>
                          </tr>,
                        ];
                  })}
                </Table>
                </div>
              )}
            </div>
          ) : (
            <div className="ac-sched-body">
              <EmptyState title="No section matches these filters" message="Widen the term, program, faculty or room filter — or reset them — to see the published sections again." />
            </div>
          )}
        </Panel>
      )}

      {/* Collision detector. */}
      <Panel
        title="Room conflict & collision detector"
        subtitle="Every published meeting compared against every other, across sections."
        actions={
          <>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => onNavigate('Course Management')}>
              <MapPin aria-hidden="true" />
              Reassign rooms in Course Management
            </button>
            <button type="button" className="ac-btn" onClick={rescan} disabled={loading}>
              <RefreshCw aria-hidden="true" />
              Run on-demand conflict scan
            </button>
          </>
        }
      >
        <div className={`ac-detector ${conflictTotal ? 'ac-detector--warn' : ''}`}>
          <div className="ac-detector-status">
            <span className={`ac-detector-pulse${conflictTotal ? ' is-warn' : ''}`} aria-hidden="true" />
            <div>
              <strong>{conflictTotal ? 'Collisions require attention' : 'Zero institutional collision state'}</strong>
              <span className="ac-muted">
                {conflictTotal
                  ? `${conflictTotal} overlap${conflictTotal === 1 ? '' : 's'} between published meetings.`
                  : 'Active & harmonized — no room or faculty is booked twice at the same hour.'}
              </span>
            </div>
          </div>

          <div className="ac-detector-stats">
            <div className="ac-detector-stat">
              <span>Room clashes</span>
              <strong>{loading ? '—' : roomClashes.length}</strong>
            </div>
            <div className="ac-detector-stat">
              <span>Faculty clashes</span>
              <strong>{loading ? '—' : facultyClashes.length}</strong>
            </div>
            <div className="ac-detector-stat">
              <span>Rooms in use</span>
              <strong>{loading ? '—' : venuesUsed.length}</strong>
            </div>
            <div className="ac-detector-stat">
              <span>Faculty assigned</span>
              <strong>{loading ? '—' : instructorsNamed.length}</strong>
            </div>
            <div className="ac-detector-stat">
              <span>Latest publish</span>
              <strong className="ac-detector-stamp">{latestPublish ? new Date(latestPublish).toLocaleString() : '—'}</strong>
            </div>
            <div className="ac-detector-stat">
              <span>Last audit pass</span>
              <strong className="ac-detector-stamp">{scannedAt ? new Date(scannedAt).toLocaleTimeString() : 'On load'}</strong>
            </div>
          </div>

          {conflictTotal ? (
            <ul className="ac-detector-list">
              {findings.slice(0, 8).map((finding, index) => (
                <li key={`${finding.kind}-${finding.left}-${finding.right}-${index}`}>
                  <Badge tone="warn">{finding.kind === 'room' ? 'Room clash' : 'Faculty clash'}</Badge>
                  <span>
                    {finding.left} and {finding.right} both use <strong>{finding.shared}</strong> on {finding.day} at {clock(finding.start)}.
                  </span>
                </li>
              ))}
              {findings.length > 8 ? <li className="ac-muted">+{findings.length - 8} more overlaps — export the timetable to work through them.</li> : null}
            </ul>
          ) : null}
        </div>
      </Panel>

      <Notes>
        <strong>Where the grid comes from.</strong> One published document per section and term, written by the study load builder and read by all
        three portals — so this grid is what students see, not a second copy. Building and publishing a week stays in the builder; here the registrar
        reads the live picture, audits it for collisions, and withdraws a document that should no longer be shown. The heat map counts the meetings
        booked into each slot across the sections on screen.
      </Notes>
    </ConsolePage>
  );
};
