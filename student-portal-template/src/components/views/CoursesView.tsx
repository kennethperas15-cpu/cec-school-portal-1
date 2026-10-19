import { BookOpenCheck, Building2, CalendarPlus, CalendarRange, GraduationCap, Layers, Loader2, Printer, RefreshCw, Search, Trash2, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '../../store';
import { relativeTime } from '../../lib/metrics';
import { key, courseAttendance, courseMarks, type CourseAttendance, type CourseMarks } from '../../lib/records';
import { meetingText, weekHours, termLabel } from '../../lib/schedule';
import type { CatalogCourse } from '../../lib/api';
import type { Day } from '../../types';

/**
 * Enrolled Courses & Academic Curriculum.
 *
 * Two halves, both real. The first is what the school has opened for the live
 * term — the registrar's offerings, each with the weekly meetings it runs — and
 * a student takes one by clicking it, which records an enrollment on the server.
 * The second is the load that follows: the student's own enrolled subjects, each
 * carrying the faculty member's posted marks and attendance where they exist, and
 * saying so plainly when they do not. A student who enrolled through the
 * registrar instead still sees the published load for their section, and nothing
 * is pre-seeded either way.
 */

const CARD_KINDS = ['Lecture', 'Laboratory', 'Studio', 'Seminar', 'Online'];

const tokensOf = (kind: string): string[] => (kind ?? '').split(/&|,|\//).map((part) => part.trim()).filter(Boolean);

/** "Mon / Wed • 08:00 AM – 09:00 AM • Ground Floor 204" for one offering. */
const slotsOf = (course: CatalogCourse): string => {
  if (!course.meetings.length) return 'Schedule to be announced';
  const times = meetingText(course.meetings.map((meeting) => ({ ...meeting, day: meeting.day as Day })));
  const rooms = [...new Set(course.meetings.map((meeting) => meeting.room).filter(Boolean))].join(', ');
  return rooms ? `${times} • ${rooms}` : times;
};

export const CoursesView = ({ onAdd }: { onAdd: () => void }) => {
  const store = useStore();
  const {
    publishedCourses,
    gradeRecords,
    attendanceDocs,
    timetableLoading,
    recordsLoading,
    myTimetable,
    selfCourses,
    availableCourses,
    catalogTerm,
    catalogLoading,
    catalogError,
    enrollingId,
    loadIsSelfEnrolled,
  } = store;

  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');

  const published = publishedCourses.length > 0;
  // The student's own enrollment wins; the registrar's published load is the fallback.
  const courses = selfCourses.length ? selfCourses : published ? publishedCourses : store.courses;
  const offered = useMemo(() => new Map(store.catalog.map((course) => [key(course.code), course])), [store.catalog]);

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

  if (!courses.length) {
    return (
      <div className="space-y-5">
        <Header published={false} self={loadIsSelfEnrolled} />
        <Available
          courses={availableCourses}
          term={catalogTerm?.label}
          loading={catalogLoading}
          error={catalogError}
          busyId={enrollingId}
          onEnroll={(id) => void store.enrollCourse(id)}
          onRefresh={() => void store.refreshCatalog()}
        />
        <section className="card p-6">
          <div className="dashed-empty">
            <span className="icon-chip bg-[#eaedff] text-[#00236f]">
              <BookOpenCheck className="h-5 w-5" />
            </span>
            <div className="max-w-md text-center">
              <p className="text-sm font-semibold text-slate-700">Nothing is on your load yet.</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {availableCourses.length
                  ? 'Pick a course schedule above — it joins your study load straight away and is filed against your student number.'
                  : store.profile.section
                    ? `Nothing is open for ${store.profile.section} right now, and the registrar has not published a load for it either.`
                    : 'The registrar publishes each section’s official load, and the courses the school opens for the term appear above as they are opened.'}
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
      <Header published={published} self={loadIsSelfEnrolled} />

      <Available
        courses={availableCourses}
        term={catalogTerm?.label}
        loading={catalogLoading}
        error={catalogError}
        busyId={enrollingId}
        onEnroll={(id) => void store.enrollCourse(id)}
        onRefresh={() => void store.refreshCatalog()}
      />

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
          const offering = offered.get(key(course.code));
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
                    {offering?.enrolled ? <span className="chip bg-[#e8f7f4] text-[#0f5f56]">Enrolled by you</span> : null}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="icon-chip h-9 w-9 bg-[#eaedff] text-[#00236f]">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                  {offering?.enrolled ? (
                    <button
                      type="button"
                      className="btn-ghost px-2.5 py-1 text-[11px]"
                      disabled={enrollingId === offering.id}
                      onClick={() => void store.dropCourse(offering.id)}
                      aria-label={`Drop ${course.code}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {enrollingId === offering.id ? 'Dropping…' : 'Drop'}
                    </button>
                  ) : null}
                </div>
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
        {loadIsSelfEnrolled
          ? `These are the subjects you enrolled in yourself${catalogTerm ? ` for ${catalogTerm.label}` : ''}. Dropping one takes it off your load; the school keeps the record under your student number.`
          : published
            ? `Course enrollment reflects the registrar's published load for ${myTimetable?.section ?? 'your section'}${
                myTimetable ? ` (${termLabel(myTimetable)})` : ''
              }. Grades and attendance are posted by your instructors; raise any discrepancy with the registrar's office.`
            : 'These courses are recorded locally in this browser. The registrar has not published an official load for your section yet.'}
      </p>
    </div>
  );
};

/* ------------------------------- sub-pieces ------------------------------- */

/**
 * The courses the registrar has opened for the live term, with the schedule each
 * one runs. Taking one records a real enrollment — there is no waiting list and
 * no invented approval step, because opening the course was the registrar's
 * decision in the first place.
 */
const Available = ({
  courses,
  term,
  loading,
  error,
  busyId,
  onEnroll,
  onRefresh,
}: {
  courses: CatalogCourse[];
  term?: string;
  loading: boolean;
  error: string;
  busyId: number | null;
  onEnroll: (courseId: number) => void;
  onRefresh: () => void;
}) => (
  <section className="card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <span className="chip bg-[#e8f2ff] text-[#0b4a8f]">
          <CalendarPlus className="h-3.5 w-3.5" />
          Open for enrollment
        </span>
        <h2 className="mt-2 font-serif text-xl font-semibold tracking-tight text-slate-900">Course schedules you can take</h2>
        <p className="mt-1 text-[12px] font-medium text-slate-500">
          {term ? `Opened by the registrar's office for ${term}.` : 'Opened by the registrar’s office for this term.'} Click the
          schedule you want — it joins your study load immediately.
        </p>
      </div>
      <button type="button" className="btn-soft px-3 py-2" onClick={onRefresh} aria-label="Reload the open courses">
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>

    {error ? <p className="mt-3 text-[12px] font-semibold text-slate-500">{error}</p> : null}

    {courses.length === 0 ? (
      <p className="mt-4 text-[12px] font-medium text-slate-400">
        {loading
          ? 'Reading the courses the school has opened…'
          : 'Nothing is open for enrollment right now. Offerings appear here as the registrar’s office opens them.'}
      </p>
    ) : (
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {courses.map((course) => (
          <article key={course.id} className="rounded-2xl border border-line bg-[#fbfdff] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-serif text-lg font-bold tracking-tight text-slate-900">{course.code}</p>
                <h3 className="text-[13px] font-semibold leading-snug text-slate-700">{course.title}</h3>
              </div>
              <span className="chip border border-line bg-white text-slate-500">
                {course.units ? `${course.units.toFixed(1)} units` : 'Units not set'}
              </span>
            </div>

            <p className="mt-2 flex items-start gap-1.5 text-[12px] font-medium text-slate-500">
              <CalendarRange className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{slotsOf(course)}</span>
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
              <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{course.instructor || 'Instructor to be announced'}</span>
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-primary px-3 py-2 text-[12px]"
                disabled={busyId === course.id}
                onClick={() => onEnroll(course.id)}
                aria-label={`Enroll in ${course.code}`}
              >
                {busyId === course.id ? 'Enrolling…' : 'Enroll in this schedule'}
              </button>
              {course.description ? <span className="text-[11px] font-medium text-slate-400">{course.description}</span> : null}
            </div>
          </article>
        ))}
      </div>
    )}
  </section>
);

const Header = ({ published, self }: { published: boolean; self: boolean }) => (
  <section className="card p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0058be]">Academic curriculum</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Enrolled Courses &amp; Academic Curriculum
        </h1>
        <p className="mt-1.5 text-[13px] font-medium text-slate-500">
          {self
            ? 'Your own enrolled load • recorded from the courses the school opened'
            : published
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
