import { BadgeCheck, BookOpen, GraduationCap, Loader2, Medal, Printer, RefreshCw, Search, Sparkles, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Course } from '../../types';
import { useStore } from '../../store';
import { relativeTime } from '../../lib/metrics';
import {
  GRADING_SCALE,
  courseMarks,
  inTerm,
  key,
  letterOf,
  summarizeGrades,
  termOptions,
  type CourseMarks,
} from '../../lib/records';

/**
 * Official Grade Evaluation Record.
 *
 * Every mark on this page was written by the instructor who teaches the subject
 * — the registrar publishes the load, the faculty post the marks. The page reads
 * them with the student's own token, joins them to the published subjects and
 * reports honestly when a mark has not been posted yet. No GPA is invented and
 * no standing is asserted beyond the percentage bands the portal itself uses.
 */

type Row = { course: Course | null; mark: CourseMarks | null };

export const GradesView = () => {
  const store = useStore();
  const { publishedCourses, gradeRecords, recordsLoading, recordsError } = store;
  const [query, setQuery] = useState('');
  const [termChoice, setTermChoice] = useState('');

  const terms = useMemo(() => termOptions(gradeRecords), [gradeRecords]);
  const activeTerm = useMemo(() => {
    if (termChoice) {
      const chosen = terms.find((term) => `${term.schoolYear}|${term.semester}` === termChoice);
      if (chosen) return chosen;
    }
    return terms[0] ?? null;
  }, [termChoice, terms]);

  const records = useMemo(() => inTerm(gradeRecords, activeTerm), [gradeRecords, activeTerm]);
  const courses = store.selfCourses.length
    ? store.selfCourses
    : publishedCourses.length
      ? publishedCourses
      : store.courses;
  const marks = useMemo(() => courseMarks(records, courses), [records, courses]);
  const marksByCode = useMemo(() => new Map(marks.map((row) => [key(row.code), row])), [marks]);

  const needle = query.trim().toLowerCase();
  const rows: Row[] = useMemo(() => {
    const enrolled: Row[] = courses.map((course) => ({ course, mark: marksByCode.get(key(course.code)) ?? null }));
    const orphans: Row[] = marks.filter((row) => !row.course).map((row) => ({ course: null, mark: row }));
    const all = [...enrolled, ...orphans];
    if (!needle) return all;
    return all.filter((row) =>
      [row.course?.code, row.course?.title, row.course?.instructor, row.mark?.code, row.mark?.title]
        .some((value) => (value ?? '').toLowerCase().includes(needle)),
    );
  }, [courses, marks, marksByCode, needle]);

  const scored = marks.filter((row) => row.average !== null);
  const summary = summarizeGrades(marks, courses);
  const { average, unitsEvaluated } = summary;
  const unitsEnrolled = courses.reduce((sum, course) => sum + (course.units ?? 0), 0);
  const top = summary.top;
  const band = summary.band;
  const letter = (score: number | null) => (score === null ? '—' : letterOf(score));
  const openUnits = courses.reduce((sum, course) => sum + (course.units ?? 0), 0) - unitsEvaluated;

  const latest = [...gradeRecords].sort((a, b) => (b.updatedAt ?? b.postedAt).localeCompare(a.updatedAt ?? a.postedAt))[0];
  const complete = scored.filter((row) => row.status === 'Complete').length;

  /* Composition of the evaluated load, by the letter the marks earn. */
  const composition = useMemo(() => {
    const buckets = new Map<string, { units: number; subjects: number }>();
    for (const row of scored) {
      const bucket = buckets.get(row.letter) ?? { units: 0, subjects: 0 };
      buckets.set(row.letter, { units: bucket.units + (row.units ?? 0), subjects: bucket.subjects + 1 });
    }
    const total = [...buckets.values()].reduce((sum, bucket) => sum + bucket.units, 0) || 1;
    return [...buckets.entries()]
      .map(([band, bucket]) => ({ band, ...bucket, share: Math.round((bucket.units / total) * 100) }))
      .sort((a, b) => b.units - a.units);
  }, [scored]);

  const hasAnything = records.length > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0058be]">Official grade evaluation record</p>
            <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Grades</h1>
            <p className="mt-1.5 text-[13px] font-medium text-slate-500">
              Student ID: {store.user?.schoolId ?? '—'}
              {store.profile.program ? ` • ${store.profile.program}` : ''}
              {store.profile.section ? ` • ${store.profile.section}` : ''}
            </p>
            <p className="mt-2 text-[11px] font-semibold text-slate-400">
              {latest
                ? `Posted by ${latest.updatedByName || latest.postedByName || 'your instructor'} • ${relativeTime(latest.updatedAt ?? latest.postedAt)}`
                : recordsLoading
                  ? 'Reading your posted marks…'
                  : 'No marks have been posted for you yet'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-soft px-3 py-2"
              onClick={() => void store.refreshRecords()}
              aria-label="Reload the posted marks"
            >
              <RefreshCw className={`h-4 w-4 ${recordsLoading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" className="btn-primary" disabled={!hasAnything} onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print record
            </button>
          </div>
        </div>
      </section>

      {recordsError && (
        <section className="card border-rose-100 bg-rose-50/60 p-4 text-[12px] font-semibold text-rose-600">{recordsError}</section>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Medal}
          label="Term average"
          value={average === null ? '—' : `${average.toFixed(1)}%`}
          suffix={average === null ? '' : letter(average)}
          sub={scored.length ? `Across ${scored.length} subject${scored.length === 1 ? '' : 's'} with posted marks` : 'No marks posted yet'}
        />
        <Stat
          icon={BookOpen}
          label="Units evaluated"
          value={unitsEvaluated ? unitsEvaluated.toFixed(1) : '—'}
          sub={
            unitsEnrolled
              ? `${unitsEnrolled.toFixed(1)} published units${
                  openUnits > 0.01 ? ` • ${openUnits.toFixed(1)} awaiting marks` : complete ? ` • ${complete} complete` : ''
                }`
              : 'Units are set by the registrar'
          }
        />
        <Stat
          icon={Sparkles}
          label="Top course mark"
          value={top && top.average !== null ? `${top.average.toFixed(1)}%` : '—'}
          suffix={top ? letter(top.average) : ''}
          sub={top ? `${top.code}${top.title && top.title !== top.code ? ` • ${top.title}` : ''}` : 'Nothing posted yet'}
        />
        <Stat
          icon={GraduationCap}
          label="Academic standing"
          value={band || '—'}
          small
          sub={band ? 'From your posted marks' : 'Appears once marks are posted'}
        />
      </div>

      {/* Toolbar */}
      <section className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Evaluation term</span>
          <select
            className="rounded-xl border border-line bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 outline-none transition focus:border-brand-soft focus:ring-4 focus:ring-brand/10"
            value={activeTerm ? `${activeTerm.schoolYear}|${activeTerm.semester}` : ''}
            onChange={(event) => setTermChoice(event.target.value)}
            aria-label="Evaluation term"
          >
            {!terms.length && <option value="">No term posted</option>}
            {terms.map((term) => (
              <option key={`${term.schoolYear}|${term.semester}`} value={`${term.schoolYear}|${term.semester}`}>
                {term.label}
              </option>
            ))}
          </select>
          <label className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by course, code or instructor..."
              className="field pl-9"
              aria-label="Search graded courses"
            />
          </label>
          <span className="pill bg-[#f7f9fc] text-slate-600">
            <BadgeCheck className="h-3.5 w-3.5 text-[#0058be]" />
            {scored.length ? `${scored.length} evaluated of ${courses.length} enrolled` : 'Awaiting marks'}
          </span>
        </div>
      </section>

      {/* Grade table */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <h2 className="card-title">All enrolled courses ({courses.length})</h2>
            <p className="card-sub">
              {activeTerm
                ? `${activeTerm.semester} AY ${activeTerm.schoolYear} • every mark your instructors have posted`
                : 'Published by the registrar • marks posted by your instructors'}
            </p>
          </div>
          <span className="pill bg-slate-100 text-slate-600">
            {complete ? `${complete} complete` : 'No complete subject yet'}
          </span>
        </div>

        {recordsLoading && !records.length ? (
          <div className="flex items-center justify-center gap-3 p-8 text-sm font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading your posted marks…
          </div>
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-[#fbfcfe] text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Course title</th>
                  <th className="px-3 py-3">Units</th>
                  <th className="px-3 py-3">Instructor</th>
                  <th className="px-3 py-3">Prelim</th>
                  <th className="px-3 py-3">Midterm</th>
                  <th className="px-3 py-3">Final</th>
                  <th className="px-3 py-3">Overall</th>
                  <th className="px-5 py-3">Status / remarks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const mark = row.mark;
                  const first = mark?.rows[0];
                  return (
                    <tr key={`${row.course?.code ?? mark?.code ?? 'row'}-${index}`} className="border-b border-line/70 last:border-0">
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-bold text-slate-800">{row.course?.code || mark?.code || '—'}</p>
                        <p className="text-[11px] font-medium text-slate-500">
                          {row.course?.title || mark?.title || 'Not in the registrar’s published load'}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-[13px] font-semibold text-slate-700">
                        {row.course?.units ? row.course.units.toFixed(1) : mark?.units ? mark.units.toFixed(1) : '—'}
                      </td>
                      <td className="px-3 py-3 text-[12px] font-medium text-slate-500">
                        {row.course?.instructor || mark?.instructor || '—'}
                      </td>
                      <MarkCell value={first?.prelim} />
                      <MarkCell value={first?.midterm} />
                      <MarkCell value={first?.final} />
                      <td className="px-3 py-3">
                        {mark?.average !== null && mark?.average !== undefined ? (
                          <span className="text-[13px] font-bold text-slate-900">
                            {mark.average.toFixed(1)}% <span className="text-[11px] font-semibold text-[#00236f]">({mark.letter})</span>
                          </span>
                        ) : (
                          <span className="text-[12px] font-semibold text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {mark ? (
                          <span
                            className={`chip border ${
                              mark.status === 'Complete'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-line bg-[#f7f9fc] text-slate-500'
                            }`}
                          >
                            {mark.status}
                          </span>
                        ) : (
                          <span className="chip border border-line bg-white text-slate-400">No marks posted yet</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <div className="dashed-empty">
              <span className="icon-chip bg-[#eaedff] text-[#00236f]">
                <Medal className="h-5 w-5" />
              </span>
              <div className="max-w-md text-center">
                <p className="text-sm font-semibold text-slate-700">Nothing to evaluate yet.</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {courses.length
                    ? 'Your subjects come from the registrar’s published load; marks appear here as each instructor posts them.'
                    : 'Once the registrar publishes your load and your instructors post marks, this record fills in.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-[#fbfcfe] px-5 py-3 text-[12px] font-semibold text-slate-500">
            <span>
              {unitsEvaluated.toFixed(1)} units evaluated • {scored.length} evaluated course{scored.length === 1 ? '' : 's'}
            </span>
            <span className="text-slate-700">
              Term average: {average === null ? '—' : `${average.toFixed(1)}% (${letter(average)})`}
            </span>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Composition */}
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <span className="icon-chip h-8 w-8 bg-[#eaedff] text-[#00236f]">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <h2 className="card-title">Grade composition</h2>
              <p className="card-sub">
                {composition.length
                  ? `Breakdown by letter across ${unitsEvaluated.toFixed(1)} evaluated units`
                  : 'Appears once marks are posted'}
              </p>
            </div>
          </div>
          {composition.length ? (
            <ul className="mt-4 space-y-3">
              {composition.map((bucket) => (
                <li key={bucket.band}>
                  <div className="flex items-center justify-between text-[12px] font-semibold text-slate-600">
                    <span>
                      {bucket.band} <span className="font-medium text-slate-400">• {bucket.subjects} subject{bucket.subjects === 1 ? '' : 's'}</span>
                    </span>
                    <span>
                      {bucket.share}% ({bucket.units.toFixed(1)}u)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#00236f]" style={{ width: `${Math.max(bucket.share, 3)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[12px] font-medium text-slate-400">
              No posted marks to break down yet.
            </p>
          )}
        </section>

        {/* Scale reference */}
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <span className="icon-chip h-8 w-8 bg-[#e8f7f4] text-[#0f766e]">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <h2 className="card-title">Grading scale reference</h2>
              <p className="card-sub">The percentage-to-letter bands this portal uses everywhere</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
            {GRADING_SCALE.map((entry) => (
              <div key={entry.band} className="flex items-center justify-between rounded-lg border border-line bg-[#fbfcfe] px-3 py-1.5">
                <span className="font-bold text-slate-700">{entry.band}</span>
                <span className="font-medium text-slate-500">{entry.range}%</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] font-medium text-slate-400">
            The full policy is in the CEC Student Handbook.
          </p>
        </section>
      </div>

      <section className="card p-4 text-[12px] font-medium leading-relaxed text-slate-500">
        <strong className="font-bold text-slate-700">Read-only record. </strong>
        {hasAnything
          ? 'Marks are posted by the instructor teaching each subject. If something looks wrong, raise it with your instructor or the registrar’s office — nothing here can be edited by a student.'
          : 'Nothing has been posted for you yet. Marks appear the moment an instructor publishes them for your school ID.'}
      </section>
    </div>
  );
};

const MarkCell = ({ value }: { value?: string }) => {
  const score = value ? Number.parseFloat(value) : Number.NaN;
  const numeric = Number.isFinite(score) ? score : null;
  return (
    <td className="px-3 py-3 text-[13px] font-semibold text-slate-700">
      {numeric === null ? <span className="text-slate-400">—</span> : `${numeric.toFixed(1)}%`}
    </td>
  );
};

const Stat = ({
  icon: Icon,
  label,
  value,
  suffix,
  sub,
  small,
}: {
  icon: typeof Medal;
  label: string;
  value: string;
  suffix?: string;
  sub: string;
  small?: boolean;
}) => (
  <div className="card p-5">
    <div className="flex items-start justify-between gap-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <p className={`mt-3 font-bold leading-none tracking-tight text-slate-900 ${small ? 'text-lg' : 'text-3xl'}`}>
      {value}
      {suffix && <span className="ml-1.5 text-sm font-semibold text-[#00236f]">{suffix}</span>}
    </p>
    <p className="mt-2 text-[11px] font-medium text-slate-400">{sub}</p>
  </div>
);
