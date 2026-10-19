import { AlertTriangle, CalendarDays, CalendarPlus, Download, Loader2, Lock, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DAYS, type Day } from '../../types';
import { useStore } from '../../store';
import { formatTime, relativeTime, todayName } from '../../lib/metrics';
import {
  downloadIcs,
  findConflicts,
  meetingsFor,
  pickTimetable,
  sectionOptions,
  subjectsOf,
  termLabel,
  termOptions,
  totalUnitsOf,
  weekHours,
  type ScheduleEntry,
  type TimetableItem,
} from '../../lib/schedule';
import { CampusPanel } from '../schedule/CampusPanel';
import { CoursesTable } from '../schedule/CoursesTable';
import { ScheduleSummary } from '../schedule/ScheduleSummary';
import { TimetableGrid } from '../schedule/TimetableGrid';

/**
 * Class Schedule — the registrar's published timetable, rendered for one section.
 *
 * The page owns no academic data of its own. It reads the published documents,
 * lets the student pick which section and term to look at, and reports honestly
 * when nothing has been published (or when the API could not be reached).
 */

type ViewMode = 'weekly' | 'daily' | 'list';

const selectClass = 'rounded-xl border border-line bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 outline-none transition focus:border-brand-soft focus:ring-4 focus:ring-brand/10';

const lock = (value: string): string => (value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');

const ListByDay = ({ entries, today }: { entries: ScheduleEntry[]; today: Day | null }) => (
  <div className="space-y-4 p-5">
    {DAYS.map((day) => {
      const rows = meetingsFor(entries, day);
      if (!rows.length) return null;
      return (
        <div key={day}>
          <div className="flex items-center gap-2">
            <h3 className={`text-[12px] font-bold uppercase tracking-wide ${day === today ? 'text-[#00236f]' : 'text-slate-500'}`}>
              {day}
            </h3>
            {day === today && <span className="chip bg-[#00236f] text-white">Today</span>}
            <span className="text-[11px] font-semibold text-slate-400">{rows.length} class{rows.length === 1 ? '' : 'es'}</span>
          </div>
          <div className="mt-2 space-y-2">
            {rows.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-[#fbfcfe] p-3">
                <div className="w-28 shrink-0">
                  <p className="text-[12px] font-bold text-slate-800">{formatTime(entry.start)}</p>
                  <p className="text-[11px] font-medium text-slate-400">{formatTime(entry.end)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-800">
                    {entry.code || entry.title}
                    {entry.code && entry.title ? <span className="font-medium text-slate-500"> • {entry.title}</span> : null}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400">
                    {entry.room || 'Room to be announced'} • {entry.instructor || 'Instructor to be announced'}
                  </p>
                </div>
                {entry.kind && <span className="chip border border-line bg-white text-slate-500">{entry.kind}</span>}
              </div>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

export const ScheduleView = () => {
  const store = useStore();
  const { timetables, period, profile, timetableLoading, timetableError, myTimetable, loadIsSelfEnrolled } = store;

  const [sectionChoice, setSectionChoice] = useState('');
  const [termChoice, setTermChoice] = useState('');
  const [mode, setMode] = useState('all');
  const [view, setView] = useState<ViewMode>('weekly');

  /**
   * A student who enrolled in courses through the portal holds their own load —
   * those courses, with the meetings they run — so that is the record here. The
   * registrar's published timetable for a section is the alternative for a
   * student who was enrolled by the office instead.
   */
  const ownLoad = loadIsSelfEnrolled ? myTimetable : null;

  const terms = useMemo(() => {
    const published = termOptions(timetables);
    if (!ownLoad) return published;
    const already = published.some(
      (term) => lock(term.schoolYear) === lock(ownLoad.schoolYear) && lock(term.semester) === lock(ownLoad.semester),
    );
    return already
      ? published
      : [{ schoolYear: ownLoad.schoolYear, semester: ownLoad.semester, label: termLabel(ownLoad) }, ...published];
  }, [timetables, ownLoad]);

  /* The live academic period wins unless the student picked another term. */
  const activeTerm = useMemo(() => {
    if (termChoice) {
      const key = termChoice;
      const chosen = terms.find((term) => `${lock(term.schoolYear)}|${lock(term.semester)}` === key);
      if (chosen) return chosen;
    }
    if (period) {
      const current = terms.find(
        (term) => lock(term.schoolYear) === lock(period.schoolYear) && lock(term.semester) === lock(period.semester),
      );
      if (current) return current;
    }
    return terms[0] ?? null;
  }, [termChoice, terms, period]);

  const sections = useMemo(
    () =>
      ownLoad
        ? [{ section: ownLoad.section, program: ownLoad.program, entries: ownLoad.entries.length }]
        : sectionOptions(timetables, activeTerm),
    [timetables, activeTerm, ownLoad],
  );

  /** Default to the student's own section; the picker covers a blank profile. */
  const activeSection = useMemo(() => {
    if (sectionChoice) return sectionChoice;
    const mine = profile.section ? lock(profile.section) : '';
    const match = sections.find((section) => lock(section.section) === mine);
    return match?.section ?? '';
  }, [sectionChoice, sections, profile.section]);

  const record: TimetableItem | null = useMemo(
    () => ownLoad ?? pickTimetable(timetables, activeTerm, activeSection),
    [ownLoad, timetables, activeTerm, activeSection],
  );

  const modes = useMemo(
    () => [...new Set((record?.entries ?? []).map((entry) => entry.kind).filter(Boolean))].sort(),
    [record],
  );

  /** What the delivery filter actually applies — never a stale selection. */
  const activeMode = mode === 'all' || modes.includes(mode) ? mode : 'all';

  const entries = useMemo(
    () => (record ? record.entries.filter((entry) => activeMode === 'all' || entry.kind === activeMode) : []),
    [record, activeMode],
  );

  const hours = useMemo(() => weekHours(entries), [entries]);
  const conflicts = useMemo(() => findConflicts(entries), [entries]);
  const units = useMemo(() => totalUnitsOf(entries), [entries]);
  const subjects = useMemo(() => subjectsOf(entries), [entries]);

  const today = (DAYS as readonly string[]).includes(todayName()) ? (todayName() as Day) : null;
  const todayEntries = today ? meetingsFor(entries, today) : [];
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const syncedAt = record?.updatedAt ?? record?.publishedAt ?? '';

  const showTimetable = !!record && entries.length > 0;

  return (
    <div className="space-y-5">
      {/* Registrar governance strip */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-card">
        <p className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-500">
          <span className="icon-chip h-7 w-7 bg-[#eaedff] text-[#00236f]">
            <Lock className="h-3.5 w-3.5" />
          </span>
          Official schedules are locked and verified by the University Registrar. Modifications require Add/Drop
          clearance.
        </p>
        <p className="text-[11px] font-semibold text-slate-400">
          {syncedAt ? `Last synchronized: ${relativeTime(syncedAt)}` : 'Waiting for the first publication'}
        </p>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0058be]">
              Academic planner &amp; enrolled schedule
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Class Schedule &amp; Weekly Timetable
            </h1>
            <p className="mt-1.5 text-[13px] font-medium text-slate-500">
              {record
                ? loadIsSelfEnrolled
                  ? `Your own enrolled load for ${termLabel(record)} • ${record.entries.length} meeting${
                      record.entries.length === 1 ? '' : 's'
                    } a week`
                  : `Published timetable for ${termLabel(record)} • Section ${record.section}`
                : 'Your timetable is published by the registrar — nothing has been published for you yet.'}
            </p>
            {store.user?.schoolId && (
              <p className="mt-2 text-[11px] font-semibold text-slate-400">SID: {store.user.schoolId}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="rounded-2xl bg-[#eaedff] px-3.5 py-2 text-right">
              <span className="block text-lg font-bold leading-none text-[#00236f]">
                {units.missing && !units.known ? '—' : units.units.toFixed(1)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#0058be]">
                {units.missing ? 'Units published' : 'Enrolled units'}
              </span>
            </span>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                type="button"
                className="btn-soft"
                disabled={!record || !record.entries.length}
                onClick={() => {
                  if (!record) return;
                  const ok = downloadIcs(record);
                  store.notify(
                    ok ? 'Calendar file downloaded — open it to add your classes' : 'Could not build the calendar file',
                    ok ? 'success' : 'error',
                  );
                }}
              >
                <CalendarPlus className="h-4 w-4" /> Sync to Calendar
              </button>
              <button type="button" className="btn-primary" disabled={!showTimetable} onClick={() => window.print()}>
                <Download className="h-4 w-4" /> Download Timetable (PDF)
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4 print:hidden">
          <select className={selectClass} value={activeTerm ? `${lock(activeTerm.schoolYear)}|${lock(activeTerm.semester)}` : ''} onChange={(e) => setTermChoice(e.target.value)} aria-label="Term">
            {!terms.length && <option value="">No term published</option>}
            {terms.map((term) => (
              <option key={`${term.schoolYear}-${term.semester}`} value={`${lock(term.schoolYear)}|${lock(term.semester)}`}>
                {term.label}
              </option>
            ))}
          </select>

          <select className={selectClass} value={activeSection} onChange={(e) => setSectionChoice(e.target.value)} aria-label="Section">
            <option value="">Select your section</option>
            {sections.map((section) => (
              <option key={section.section} value={section.section}>
                {section.section}
                {section.program ? ` — ${section.program}` : ''} ({section.entries})
              </option>
            ))}
          </select>

          <select className={selectClass} value={activeMode} onChange={(e) => setMode(e.target.value)} aria-label="Delivery mode">
            <option value="all">All delivery modes</option>
            {modes.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <div className="ml-auto inline-flex rounded-xl border border-line bg-white p-1">
            {(
              [
                ['weekly', 'Weekly Calendar'],
                ['daily', 'Daily View'],
                ['list', 'List View'],
              ] as [ViewMode, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                  view === key ? 'bg-[#00236f] text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn-soft px-3 py-2"
            onClick={() => void store.refreshTimetables()}
            aria-label="Reload the published timetable"
          >
            <RefreshCw className={`h-4 w-4 ${timetableLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </section>

      {timetableLoading && (
        <section className="card p-8">
          <div className="flex items-center justify-center gap-3 text-sm font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading the registrar&apos;s published timetables…
          </div>
        </section>
      )}

      {!timetableLoading && timetableError && (
        <section className="card p-6">
          <div className="dashed-empty">
            <span className="icon-chip bg-rose-50 text-rose-500">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <p className="max-w-md text-sm leading-relaxed text-slate-500">{timetableError}</p>
            <button type="button" className="btn-primary" onClick={() => void store.refreshTimetables()}>
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        </section>
      )}

      {!timetableLoading && !timetableError && !showTimetable && (
        <section className="card p-6">
          <div className="dashed-empty">
            <span className="icon-chip bg-[#EFF6FF] text-[#2563EB]">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div className="max-w-md text-center">
              <p className="text-sm font-semibold text-slate-700">
                {timetables.length
                  ? activeSection
                    ? `Nothing is published for ${activeSection} in this term yet.`
                    : 'Pick your section to see its published timetable.'
                  : 'The registrar has not published any class timetable yet.'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {timetables.length
                  ? sections.length
                    ? `Sections published so far: ${sections.map((section) => section.section).join(', ')}. Keep your program, year and section up to date in Settings.`
                    : 'No section has a published timetable in this term.'
                  : 'As soon as the registrar publishes a section timetable it appears here — with the rooms, instructors and units exactly as recorded.'}
              </p>
            </div>
          </div>
        </section>
      )}

      {showTimetable && record && (
        <>
          <ScheduleSummary
            entries={entries}
            hours={hours}
            todayEntries={todayEntries}
            conflicts={conflicts}
            todayLabel={todayLabel}
          />

          {view === 'list' ? (
            <section className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
                <div>
                  <h2 className="card-title">Published Class List</h2>
                  <p className="card-sub">
                    {record.section} • every meeting in {termLabel(record)}
                  </p>
                </div>
                <span className="pill bg-slate-100 text-slate-600">{entries.length} classes</span>
              </div>
              <ListByDay entries={entries} today={today} />
            </section>
          ) : (
            <TimetableGrid item={record} entries={entries} view={view} today={today} />
          )}

          <CoursesTable item={record} entries={entries} />
          <CampusPanel
            entries={entries}
            todayEntries={todayEntries}
            attendance={store.officialAttendance.length ? store.officialAttendance : store.attendance}
          />

          {record.note && (
            <section className="card p-4 text-[12px] font-medium text-slate-500">
              <strong className="font-bold text-slate-700">Registrar note: </strong>
              {record.note}
            </section>
          )}

          <p className="text-[11px] font-medium text-slate-400">
            {subjects.length} subject{subjects.length === 1 ? '' : 's'} on file • published by{' '}
            {record.publishedByName || 'the registrar'} • {record.entries.length} meeting
            {record.entries.length === 1 ? '' : 's'} in the term
          </p>
        </>
      )}
    </div>
  );
};
