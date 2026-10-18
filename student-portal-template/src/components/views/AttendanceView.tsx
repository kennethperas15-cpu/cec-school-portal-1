import { AlertTriangle, CalendarCheck, CheckCircle2, Loader2, Printer, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AttendanceStatus } from '../../types';
import { useStore } from '../../store';
import { formatLongDate, relativeTime } from '../../lib/metrics';
import { courseAttendance, inTerm, matchCourse, summarizeAttendance, termOptions } from '../../lib/records';

/**
 * Attendance Records & Verification.
 *
 * Every session on this page was recorded by the instructor who teaches the
 * subject — there is no biometric terminal and no scan time to show, so the page
 * prints exactly what the faculty logged: the date, the subject, the status and
 * who posted it. The 80% line is the institutional requirement the school's own
 * handbook states, and the standing is computed from these records alone.
 */

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  Present: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Late: 'border-amber-200 bg-amber-50 text-amber-700',
  Excused: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  Absent: 'border-rose-200 bg-rose-50 text-rose-600',
};

const STATUS_REMARK: Record<AttendanceStatus, string> = {
  Present: 'Attended the session',
  Late: 'Marked late by the instructor',
  Excused: 'Excused absence',
  Absent: 'Marked absent',
};

const PAGE_SIZE = 10;

type LogRow = {
  date: string;
  status: AttendanceStatus;
  code: string;
  title: string;
  instructor: string;
  schedule: string;
  postedByName: string;
};

export const AttendanceView = () => {
  const store = useStore();
  const { publishedCourses, attendanceDocs, recordsLoading, recordsError } = store;

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [termChoice, setTermChoice] = useState('');

  const courses = publishedCourses.length ? publishedCourses : store.courses;
  const terms = useMemo(() => termOptions(attendanceDocs), [attendanceDocs]);
  const activeTerm = useMemo(() => {
    if (termChoice) {
      const chosen = terms.find((term) => `${term.schoolYear}|${term.semester}` === termChoice);
      if (chosen) return chosen;
    }
    return terms[0] ?? null;
  }, [termChoice, terms]);

  const docs = useMemo(() => inTerm(attendanceDocs, activeTerm), [attendanceDocs, activeTerm]);
  const perCourse = useMemo(() => courseAttendance(docs, courses), [docs, courses]);
  const summary = useMemo(() => summarizeAttendance(perCourse), [perCourse]);

  const log: LogRow[] = useMemo(
    () =>
      docs
        .flatMap((doc) =>
          doc.entries.map((entry) => {
            const course = matchCourse(courses, entry.course);
            return {
              date: entry.date,
              status: entry.status,
              code: course?.code || entry.course || 'Unassigned',
              title: course?.title || entry.course || '',
              instructor: course?.instructor || '',
              schedule: course?.schedule || '',
              postedByName: doc.updatedByName || doc.postedByName || '',
            };
          }),
        )
        .sort((a, b) => b.date.localeCompare(a.date) || a.code.localeCompare(b.code)),
    [docs, courses],
  );

  const courseOptions = useMemo(() => [...new Set(log.map((row) => row.code))].sort(), [log]);
  const needle = query.trim().toLowerCase();
  const filtered = log.filter((row) => {
    const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
    const matchesCourse = courseFilter === 'all' || row.code === courseFilter;
    const matchesQuery =
      !needle || [row.code, row.title, row.instructor, row.date].some((value) => (value ?? '').toLowerCase().includes(needle));
    return matchesStatus && matchesCourse && matchesQuery;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visibleRows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const latest = [...attendanceDocs].sort((a, b) => (b.updatedAt ?? b.postedAt).localeCompare(a.updatedAt ?? a.postedAt))[0];

  /* Group the visible page by date, the way the log reads in the design. */
  const byDate = useMemo(() => {
    const groups = new Map<string, LogRow[]>();
    for (const row of visibleRows) groups.set(row.date, [...(groups.get(row.date) ?? []), row]);
    return [...groups.entries()];
  }, [visibleRows]);

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  if (!attendanceDocs.length && !recordsLoading) {
    return (
      <div className="space-y-5">
        <Header onRefresh={() => void store.refreshRecords()} loading={recordsLoading} latest="" syncedAt="" />
        <section className="card p-6">
          <div className="dashed-empty">
            <span className="icon-chip bg-[#eaedff] text-[#00236f]">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <div className="max-w-md text-center">
              <p className="text-sm font-semibold text-slate-700">No sessions have been recorded for you yet.</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Your instructors record attendance for each meeting. The moment they post it for your school ID it appears
                here, joined to the subjects the registrar published for your section.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Header
        onRefresh={() => void store.refreshRecords()}
        loading={recordsLoading}
        latest={latest ? `${latest.updatedByName || latest.postedByName || 'your instructor'} • ${relativeTime(latest.updatedAt ?? latest.postedAt)}` : ''}
        syncedAt={latest?.updatedAt ?? latest?.postedAt ?? ''}
      />

      {recordsError && (
        <section className="card border-rose-100 bg-rose-50/60 p-4 text-[12px] font-semibold text-rose-600">{recordsError}</section>
      )}

      {/* Today's headline: totals across every posted session */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Tile label="Sessions held" value={summary.total} sub={`${perCourse.length} course${perCourse.length === 1 ? '' : 's'}`} />
        <Tile label="Present" value={summary.present} sub={summary.total ? `${Math.round((summary.present / summary.total) * 100)}% of sessions` : '—'} tone="good" />
        <Tile label="Late / tardy" value={summary.late} sub={summary.late ? 'Marked after the session started' : 'None recorded'} tone={summary.late ? 'warn' : 'muted'} />
        <Tile label="Excused" value={summary.excused} sub={summary.excused ? 'Excused by your instructor' : 'None recorded'} />
        <Tile label="Unexcused" value={summary.absent} sub={summary.absent ? 'Below the attendance requirement' : 'None recorded'} tone={summary.absent ? 'bad' : 'muted'} />
        <Tile
          label="Overall rate"
          value={summary.rate}
          percent
          sub={summary.total ? (summary.meetsRequirement ? 'Meets the 80% requirement' : 'Below the 80% requirement') : 'No sessions yet'}
          tone={summary.total ? (summary.meetsRequirement ? 'good' : 'bad') : 'muted'}
        />
      </div>

      {/* Requirement banner */}
      <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="inline-flex items-start gap-2 text-[12px] font-medium leading-relaxed text-slate-500">
          <span className="icon-chip h-7 w-7 shrink-0 bg-[#e8f7f4] text-[#0f766e]">
            <ShieldCheck className="h-3.5 w-3.5" />
          </span>
          <span>
            Institutional requirement: at least <strong className="font-bold text-slate-700">80% attendance</strong> in
            lectures and laboratory sessions to qualify for final term evaluations.
          </span>
        </p>
        <p className="text-[12px] font-semibold text-slate-500">
          {summary.courses
            ? summary.atRisk
              ? `${summary.cleared} of ${summary.courses} course${summary.courses === 1 ? '' : 's'} cleared • ${summary.atRisk} below 80%`
              : `All ${summary.courses} course${summary.courses === 1 ? '' : 's'} in good standing`
            : 'Waiting for the first record'}
        </p>
      </section>

      {/* Per-course standing */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {perCourse.map((row, index) => (
          <article key={`${row.code}-${index}`} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-serif text-lg font-bold tracking-tight text-slate-900">{row.code}</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">{row.title || 'No published title'}</p>
              </div>
              <span
                className={`chip border ${row.meetsRequirement ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}
              >
                {row.meetsRequirement ? 'Cleared' : 'Below 80%'}
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold leading-none text-slate-900">
              {row.rate.toFixed(1)}%
              <span className="ml-1.5 text-[12px] font-semibold text-slate-400">
                ({row.present}/{row.total})
              </span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${row.meetsRequirement ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(row.rate, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-400">
              {row.late} late • {row.excused} excused • {row.absent} unexcused
            </p>
          </article>
        ))}
      </section>

      {/* Log */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <h2 className="card-title">Attendance log</h2>
            <p className="card-sub">
              {activeTerm
                ? `${activeTerm.semester} AY ${activeTerm.schoolYear} • every session your instructors recorded`
                : 'Every session your instructors recorded'}
            </p>
          </div>
          <span className="pill bg-[#f7f9fc] text-slate-600">
            {latest
              ? `Posted by ${latest.updatedByName || latest.postedByName || 'your instructor'} • ${relativeTime(latest.updatedAt ?? latest.postedAt)}`
              : 'No records yet'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-[#fbfcfe] px-5 py-3">
          {terms.length > 1 && (
            <select
              className="rounded-xl border border-line bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 outline-none"
              value={activeTerm ? `${activeTerm.schoolYear}|${activeTerm.semester}` : ''}
              onChange={(event) => resetPage(setTermChoice)(event.target.value)}
              aria-label="Filter by term"
            >
              {terms.map((term) => (
                <option key={`${term.schoolYear}|${term.semester}`} value={`${term.schoolYear}|${term.semester}`}>
                  {term.label}
                </option>
              ))}
            </select>
          )}
          <select
            className="rounded-xl border border-line bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 outline-none"
            value={courseFilter}
            onChange={(event) => resetPage(setCourseFilter)(event.target.value)}
            aria-label="Filter by course"
          >
            <option value="all">All enrolled courses</option>
            {courseOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-line bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 outline-none"
            value={statusFilter}
            onChange={(event) => resetPage(setStatusFilter)(event.target.value as 'all' | AttendanceStatus)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {(['Present', 'Late', 'Excused', 'Absent'] as AttendanceStatus[]).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <label className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => resetPage(setQuery)(event.target.value)}
              placeholder="Search by date, course or instructor..."
              className="field pl-9"
              aria-label="Search attendance records"
            />
          </label>
        </div>

        {recordsLoading && !log.length ? (
          <div className="flex items-center justify-center gap-3 p-8 text-sm font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading your recorded sessions…
          </div>
        ) : visibleRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-white text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-3 py-3">Course code &amp; title</th>
                  <th className="px-3 py-3">Instructor</th>
                  <th className="px-3 py-3">Meeting schedule</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {byDate.flatMap(([date, rows]) =>
                  rows.map((row, index) => (
                    <tr key={`${date}-${row.code}-${index}`} className="border-b border-line/70 last:border-0">
                      <td className="px-5 py-3 text-[12px] font-semibold text-slate-700">
                        {index === 0 ? formatDay(date) : <span className="text-slate-300">“</span>}
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-[13px] font-bold text-slate-800">{row.code}</p>
                        <p className="text-[11px] font-medium text-slate-500">{row.title}</p>
                      </td>
                      <td className="px-3 py-3 text-[12px] font-medium text-slate-500">{row.instructor || '—'}</td>
                      <td className="px-3 py-3 text-[12px] font-medium text-slate-500">{row.schedule || '—'}</td>
                      <td className="px-3 py-3">
                        <span className={`chip border ${STATUS_STYLE[row.status]}`}>{row.status}</span>
                      </td>
                      <td className="px-5 py-3 text-[11px] font-medium text-slate-400">
                        {STATUS_REMARK[row.status]}
                        {row.postedByName ? ` • ${row.postedByName}` : ''}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <div className="dashed-empty">
              <span className="icon-chip bg-[#eff6ff] text-[#2563eb]">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <p className="max-w-md text-sm font-semibold text-slate-700">
                No session matches these filters.
              </p>
            </div>
          </div>
        )}

        {filtered.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-[#fbfcfe] px-5 py-3">
            <p className="text-[11px] font-semibold text-slate-500">
              {(current - 1) * PAGE_SIZE + 1} to {Math.min(current * PAGE_SIZE, filtered.length)} of {filtered.length} records
            </p>
            <div className="flex items-center gap-1">
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  className={`h-8 w-8 rounded-lg text-[12px] font-semibold transition ${
                    number === current ? 'bg-[#00236f] text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {number}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card p-4 text-[12px] font-medium leading-relaxed text-slate-500">
        <strong className="font-bold text-slate-700">How this is recorded. </strong>
        Sessions are marked by the instructor teaching the subject, joined here to the registrar&apos;s published
        timetable. Every correction is made at the source — raise a query with your instructor, and the full policy
        (including Add / Drop deadlines for the term) is in the CEC Student Handbook.
      </section>
    </div>
  );
};

/* ------------------------------- sub-pieces ------------------------------- */

const formatDay = (value: string): string => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : value;
};

const Header = ({
  onRefresh,
  loading,
  latest,
  syncedAt,
}: {
  onRefresh: () => void;
  loading: boolean;
  latest: string;
  syncedAt: string;
}) => (
  <section className="card p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0058be]">Official log</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Attendance Records &amp; Verification
        </h1>
        <p className="mt-1.5 text-[13px] font-medium text-slate-500">
          {formatLongDate()} • the sessions your instructors recorded for you
        </p>
        {latest && <p className="mt-2 text-[11px] font-semibold text-slate-400">{latest}</p>}
        {!latest && syncedAt && <p className="mt-2 text-[11px] font-semibold text-slate-400">Last updated {relativeTime(syncedAt)}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-soft px-3 py-2" onClick={onRefresh} aria-label="Reload the attendance records">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print record
        </button>
      </div>
    </div>
  </section>
);

const TONE: Record<string, string> = {
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-rose-600',
  muted: 'text-slate-400',
  none: 'text-slate-900',
};

const Tile = ({
  label,
  value,
  sub,
  tone = 'none',
  percent,
}: {
  label: string;
  value: number;
  sub: string;
  tone?: keyof typeof TONE;
  percent?: boolean;
}) => (
  <div className="card p-4">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className={`mt-2 text-2xl font-bold leading-none tracking-tight ${TONE[tone]}`}>
      {value}
      {percent ? '%' : ''}
    </p>
    <p className="mt-2 flex items-start gap-1 text-[11px] font-medium text-slate-400">
      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-slate-300" />
      {sub}
    </p>
  </div>
);
