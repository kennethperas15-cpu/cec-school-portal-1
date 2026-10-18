import { BookOpenCheck, Building2, CalendarRange, GraduationCap, Layers, Loader2, Printer, RefreshCw, Search, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '../../store';
import { relativeTime } from '../../lib/metrics';
import { key, courseAttendance, courseMarks, type CourseAttendance, type CourseMarks } from '../../lib/records';
import { weekHours, termLabel } from '../../lib/schedule';

/**
 * Enrolled Courses & Academic Curriculum.
 *
 * The matriculation record is the registrar's published load for this student's
 * section — the same document the Class Schedule page renders. Each subject then
 * carries the faculty member's posted marks and attendance where they exist, and
 * says so plainly when they do not. Nothing is pre-seeded.
 */

const CARD_KINDS = ['Lecture', 'Laboratory', 'Studio', 'Seminar', 'Online'];

const tokensOf = (kind: string): string[] => (kind ?? '').split(/&|,|\//).map((part) => part.trim()).filter(Boolean);

export const CoursesView = ({ onAdd }: { onAdd: () => void }) => {
  const store = useStore();
  const { publishedCourses, gradeRecords, attendanceDocs, timetableLoading, recordsLoading, myTimetable } = store;

  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');

  const published = publishedCourses.length > 0;
  const courses = published ? publishedCourses : store.courses;

  const marks = useMemo(() => courseMarks(gradeRecords, courses), [gradeRecords, courses]);
  const attendance = useMemo(() => courseAttendance(attendanceDocs, courses), [attendanceDocs, courses]);
  const marksByCode = useMemo(() => new Map(marks.map((row) => [key(row.code), row])), [marks]);
  const attendanceByCode = useMemo(() => new Map(attendance.map((row) => [key(row.code), row])), [attendance]);

  const kinds = useMemo(() => {
    const found = new Set<string>();
    for (const course of courses) {
      for (const token of tokensOf(course.kind)) if (CARD_KINDS.includes(token)) found.add(token);
    }
    return [...found].sort();
  }, [courses]);

  const needle = query.trim().toLowerCase();
  const visible = courses.filter((course) => {
    const matchesKind = kind === 'all' || tokensOf(course.kind).includes(kind);
    const matchesQuery =
      !needle ||
      [course.code, course.title, course.instructor, course.room, course.section]
        .some((value) => (value ?? '').toLowerCase().includes(needle));
    return matchesKind && matchesQuery;
  });

  const units = courses.reduce((sum, course) => sum + (Number.isFinite(course.units) ? course.units : 0), 0);
  const missingUnits = courses.filter((course) => !course.units).length;
  const hours = useMemo(() => weekHours(myTimetable?.entries ?? []), [myTimetable]);
  const posted = marks.filter((row) => row.average !== null).length;

  const syncedAt = myTimetable?.updatedAt ?? myTimetable?.publishedAt ?? '';

  if (!published && !courses.length) {
    return (
      <div className="space-y-5">
        <Header published={false} />
        <section className="card p-6">
          <div className="dashed-empty">
            <span className="icon-chip bg-[#eaedff] text-[#00236f]">
              <BookOpenCheck className="h-5 w-5" />
            </span>
            <div className="max-w-md text-center">
              <p className="text-sm font-semibold text-slate-700">
                {store.profile.section
                  ? `Nothing is published for ${store.profile.section} yet.`
                  : 'Your enrolled subjects appear here once the registrar publishes your load.'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                The registrar's office publishes each section's official matriculation record. Keep your program, year and
                section up to date in Settings, or record a course locally while you wait.
              </p>
            </div>
            <button type="button" className="btn-soft" onClick={onAdd}>
              Record a course locally
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Header published={published} />

      {/* Active enrollment strip */}
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="chip bg-[#eaedff] text-[#00236f]">Active enrollment</span>
            <h2 className="mt-2 font-serif text-xl font-semibold tracking-tight text-slate-900">
              {courses.length} subject{courses.length === 1 ? '' : 's'} • {units.toFixed(1)} academic unit
              {units === 1 ? '' : 's'}
            </h2>
            <p className="mt-1 text-[12px] font-medium text-slate-500">
              {hours.lecture.toFixed(1)} lecture hrs • {hours.lab.toFixed(1)} lab hrs per week
              {missingUnits ? ` • ${missingUnits} subject${missingUnits === 1 ? '' : 's'} without published units` : ''}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <span className="text-[12px] font-semibold text-slate-600">
              {store.profile.program || myTimetable?.program || 'Program not set'}
              {store.profile.section || myTimetable?.section ? ` • ${myTimetable?.section || store.profile.section}` : ''}
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {syncedAt ? `Last synchronized ${relativeTime(syncedAt)}` : 'Awaiting the registrar’s publication'}
            </span>
            {store.user?.schoolId && <span className="text-[11px] font-semibold text-slate-400">SID: {store.user.schoolId}</span>}
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <section className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search courses by code, title, or instructor..."
              className="field pl-9"
              aria-label="Search enrolled courses"
            />
          </label>
          <span className="pill bg-[#f7f9fc] text-slate-600">
            <CalendarRange className="h-3.5 w-3.5" />
            {myTimetable ? termLabel(myTimetable) : store.periodLabel || 'Academic period loading'}
          </span>
          <button
            type="button"
            className="btn-soft px-3 py-2"
            onClick={() => void store.refreshTimetables()}
            aria-label="Reload the published load"
          >
            <RefreshCw className={`h-4 w-4 ${timetableLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setKind('all')}
            className={`chip border ${kind === 'all' ? 'border-[#00236f] bg-[#00236f] text-white' : 'border-line bg-white text-slate-500'}`}
          >
            All ({courses.length})
          </button>
          {kinds.map((option) => {
            const count = courses.filter((course) => tokensOf(course.kind).includes(option)).length;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setKind(option)}
                className={`chip border ${kind === option ? 'border-[#00236f] bg-[#00236f] text-white' : 'border-line bg-white text-slate-500'}`}
              >
                {option} ({count})
              </button>
            );
          })}
          <span className="ml-auto text-[11px] font-semibold text-slate-400">
            {posted
              ? `${posted} subject${posted === 1 ? '' : 's'} with posted marks`
              : recordsLoading
                ? 'Reading posted marks…'
                : 'No marks posted by your instructors yet'}
          </span>
        </div>
      </section>

      {/* Course cards */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {visible.map((course) => {
          const mark = marksByCode.get(key(course.code));
          const log = attendanceByCode.get(key(course.code));
          return (
            <article key={course.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-xl font-bold tracking-tight text-slate-900">{course.code || '—'}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {course.kind && <span className="chip border border-line bg-[#f7f9fc] text-slate-500">{course.kind}</span>}
                    <span className="chip border border-line bg-white text-slate-500">
                      {course.units ? `${course.units.toFixed(1)} units` : 'Units not published'}
                    </span>
                  </div>
                </div>
                <span className="icon-chip h-9 w-9 bg-[#eaedff] text-[#00236f]">
                  <GraduationCap className="h-4 w-4" />
                </span>
              </div>

              <h3 className="mt-3 text-[15px] font-bold leading-snug text-slate-800">{course.title || course.code}</h3>

              <dl className="mt-3 space-y-1.5 text-[12px] font-medium text-slate-500">
                <div className="flex items-center gap-2">
                  <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{course.instructor || 'Instructor to be announced'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{course.schedule || 'Schedule to be announced'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>
                    {course.room || 'Room to be announced'}
                    {course.section ? ` • Sec ${course.section}` : ''}
                  </span>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3">
                <Standing label="Grade standing" mark={mark} />
                <AttendanceStanding label="Attendance" log={log} />
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-[11px] font-medium leading-relaxed text-slate-400">
        {published
          ? `Course enrollment reflects the registrar's published load for ${myTimetable?.section ?? 'your section'}${
              myTimetable ? ` (${termLabel(myTimetable)})` : ''
            }. Grades and attendance are posted by your instructors; raise any discrepancy with the registrar's office.`
          : 'These courses are recorded locally in this browser. The registrar has not published an official load for your section yet.'}
      </p>
    </div>
  );
};

/* ------------------------------- sub-pieces ------------------------------- */

const Header = ({ published }: { published: boolean }) => (
  <section className="card p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0058be]">Academic curriculum</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Enrolled Courses &amp; Academic Curriculum
        </h1>
        <p className="mt-1.5 text-[13px] font-medium text-slate-500">
          {published
            ? 'Official matriculation record • published by the registrar’s office'
            : 'Your own record in this browser • the registrar has not published your load yet'}
        </p>
      </div>
      <button type="button" className="btn-soft" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Print list
      </button>
    </div>
  </section>
);

const Standing = ({ label, mark }: { label: string; mark?: CourseMarks }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    {mark && mark.average !== null ? (
      <p className="mt-0.5 text-[15px] font-bold text-slate-900">
        {mark.average.toFixed(1)}% <span className="text-[12px] font-semibold text-[#00236f]">({mark.letter})</span>
      </p>
    ) : (
      <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-400">
        {mark ? <Loader2 className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
        Not posted yet
      </p>
    )}
  </div>
);

const AttendanceStanding = ({ label, log }: { label: string; log?: CourseAttendance }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    {log && log.total ? (
      <p className="mt-0.5 text-[15px] font-bold text-slate-900">
        {log.rate.toFixed(0)}%{' '}
        <span className="text-[12px] font-semibold text-slate-500">
          ({log.present}/{log.total})
        </span>
      </p>
    ) : (
      <p className="mt-0.5 text-[12px] font-semibold text-slate-400">Not posted yet</p>
    )}
  </div>
);
