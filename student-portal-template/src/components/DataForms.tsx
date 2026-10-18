import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { CalendarCheck, Plus, Trash2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useStore } from '../store';
import { attendanceSummary, todayISO } from '../lib/metrics';
import type { AttendanceStatus, Day, TaskType } from '../types';
import {
  COURSE_COLORS,
  COURSE_KINDS,
  DAYS,
  PROGRAM_OPTIONS,
  TASK_TYPES,
  TERM_OPTIONS,
  yearOptionsFor,
} from '../types';

type FormProps = { open: boolean; onClose: () => void };

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <label className="block">
    <span className="field-label">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
  </label>
);

const ErrorNote = ({ message }: { message: string }) =>
  message ? (
    <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
      {message}
    </p>
  ) : null;

const shortCode = (value: string): string => value.replace(/\s+/g, '').toUpperCase();

/* ------------------------------------------------------------------ */
/* 1. Class schedule                                                   */
/* ------------------------------------------------------------------ */

export const ScheduleForm = ({ open, onClose }: FormProps) => {
  const { courses, addSchedule } = useStore();
  const [courseId, setCourseId] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [day, setDay] = useState<Day>('Monday');
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('09:30');
  const [section, setSection] = useState('');
  const [instructor, setInstructor] = useState('');
  const [room, setRoom] = useState('');
  const [error, setError] = useState('');

  const linked = courses.find((c) => c.id === courseId);

  useEffect(() => {
    if (!open) return;
    setCourseId('');
    setCustomCode('');
    setCustomTitle('');
    setDay('Monday');
    setStart('08:00');
    setEnd('09:30');
    setSection('');
    setInstructor('');
    setRoom('');
    setError('');
  }, [open]);

  useEffect(() => {
    if (linked) {
      setSection(linked.section);
      setInstructor(linked.instructor);
      setRoom(linked.room);
    }
  }, [linked]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = linked?.code || customCode.trim().toUpperCase();
    const title = linked?.title || customTitle.trim();
    if (!code || !title) return setError('Choose an enrolled course or enter a code and title.');
    if (end <= start) return setError('The end time must be after the start time.');
    addSchedule({ courseId: linked?.id, code, title, section: section.trim(), instructor: instructor.trim(), room: room.trim(), day, start, end });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Class Schedule"
      subtitle="Populate your weekly timetable"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-soft" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="schedule-form" className="btn-primary">
            Add to timetable
          </button>
        </div>
      }
    >
      <form id="schedule-form" className="space-y-4" onSubmit={submit}>
        {courses.length > 0 ? (
          <Field label="Enrolled course" hint="Prefills instructor, room and section">
            <select className="field" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">— Select an enrolled course —</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.title}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {!linked && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Course code">
              <input className="field" placeholder="IT-301" value={customCode} onChange={(e) => setCustomCode(e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Class title">
                <input className="field" placeholder="Web Systems" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Day">
            <select className="field" value={day} onChange={(e) => setDay(e.target.value as Day)}>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start">
            <input type="time" className="field" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End">
            <input type="time" className="field" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Section">
            <input className="field" placeholder="Sec A" value={section} onChange={(e) => setSection(e.target.value)} />
          </Field>
          <Field label="Instructor">
            <input className="field" placeholder="Prof. Dela Cruz" value={instructor} onChange={(e) => setInstructor(e.target.value)} />
          </Field>
          <Field label="Room">
            <input className="field" placeholder="Room 304" value={room} onChange={(e) => setRoom(e.target.value)} />
          </Field>
        </div>
        <ErrorNote message={error} />
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* 2. Grades                                                           */
/* ------------------------------------------------------------------ */

export const GradeForm = ({ open, onClose }: FormProps) => {
  const { courses, grades, addGrade } = useStore();
  const [courseId, setCourseId] = useState('');
  const [freeCourse, setFreeCourse] = useState('');
  const [score, setScore] = useState('');
  const [median, setMedian] = useState('');
  const [term, setTerm] = useState(TERM_OPTIONS[1]);
  const [error, setError] = useState('');

  const linked = courses.find((c) => c.id === courseId);

  useEffect(() => {
    if (!open) return;
    setCourseId('');
    setFreeCourse('');
    setScore('');
    setMedian('');
    setTerm(TERM_OPTIONS[1]);
    setError('');
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const courseName = linked?.code || freeCourse.trim();
    if (!courseName) return setError('Select or enter the course you are grading.');
    const parsed = Number(score);
    if (!score || Number.isNaN(parsed) || parsed < 0 || parsed > 100) return setError('Enter a score between 0 and 100.');
    const parsedMedian = median === '' ? Math.round(parsed) : Number(median);
    if (Number.isNaN(parsedMedian) || parsedMedian < 0 || parsedMedian > 100)
      return setError('Class median must be between 0 and 100.');
    addGrade({ code: shortCode(courseName), course: courseName, score: parsed, median: parsedMedian, term });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enter Grade"
      subtitle="Scores drive the benchmark chart and your cumulative GPA"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-soft" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="grade-form" className="btn-primary">
            Save grade
          </button>
        </div>
      }
    >
      <form id="grade-form" className="space-y-4" onSubmit={submit}>
        {courses.length > 0 ? (
          <Field label="Course">
            <select className="field" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">— Select an enrolled course —</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.title}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        {!linked && (
          <Field label="Course code" hint="No courses enrolled — type the code directly">
            <input className="field" placeholder="CS 301" value={freeCourse} onChange={(e) => setFreeCourse(e.target.value)} />
          </Field>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Your score (0–100)">
            <input type="number" min={0} max={100} step="0.01" className="field" placeholder="95" value={score} onChange={(e) => setScore(e.target.value)} />
          </Field>
          <Field label="Class median">
            <input type="number" min={0} max={100} step="0.01" className="field" placeholder="90" value={median} onChange={(e) => setMedian(e.target.value)} />
          </Field>
          <Field label="Term">
            <select className="field" value={term} onChange={(e) => setTerm(e.target.value)}>
              {TERM_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <ErrorNote message={error} />
        {grades.length > 0 && (
          <div className="rounded-xl border border-line bg-slate-50/70 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Recorded</p>
            <ul className="space-y-1.5">
              {grades.map((g) => (
                <li key={g.id} className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-medium">
                    {g.course} <span className="text-slate-400">· {g.term}</span>
                  </span>
                  <span className="font-semibold text-slate-800">{g.score}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* 3. Attendance                                                       */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS: { value: AttendanceStatus; classes: string }[] = [
  { value: 'Present', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { value: 'Late', classes: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'Excused', classes: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
  { value: 'Absent', classes: 'border-rose-200 bg-rose-50 text-rose-700' },
];

export const AttendanceForm = ({ open, onClose }: FormProps) => {
  const { courses, attendance, logAttendance, removeAttendance } = useStore();
  const [courseId, setCourseId] = useState('');
  const [freeCourse, setFreeCourse] = useState('');
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState<AttendanceStatus>('Present');
  const [error, setError] = useState('');

  const summary = useMemo(() => attendanceSummary(attendance), [attendance]);
  const linked = courses.find((c) => c.id === courseId);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const courseName = linked?.code || freeCourse.trim() || 'General';
    if (!date) return setError('Pick the session date.');
    logAttendance({ course: courseName, date, status });
    setError('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log Attendance"
      subtitle={`${summary.total} sessions recorded • ${summary.rate.toFixed(1)}% present`}
      footer={
        <div className="flex justify-end">
          <button type="button" className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        {courses.length > 0 ? (
          <Field label="Course">
            <select className="field" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">— Select a course —</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.title}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Course">
            <input className="field" placeholder="CS 301" value={freeCourse} onChange={(e) => setFreeCourse(e.target.value)} />
          </Field>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date">
            <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Status">
            <div className="grid grid-cols-4 gap-1.5">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={`rounded-xl border px-1 py-2.5 text-[11px] font-semibold transition ${
                    status === option.value ? option.classes : 'border-line bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {option.value}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <ErrorNote message={error} />
        <button type="submit" className="btn-soft w-full">
          Record session
        </button>

        {attendance.length > 0 && (
          <div className="border-t border-line pt-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Recent sessions</p>
            <ul className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
              {[...attendance]
                .reverse()
                .slice(0, 12)
                .map((record) => (
                  <li key={record.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-xs">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="font-semibold text-slate-800">{record.course}</span>
                      <span className="text-slate-400">{record.date}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className={`chip ${
                          record.status === 'Present'
                            ? 'bg-emerald-50 text-emerald-700'
                            : record.status === 'Late'
                              ? 'bg-amber-50 text-amber-700'
                              : record.status === 'Excused'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {record.status}
                      </span>
                      <button
                        type="button"
                        className="text-slate-300 hover:text-rose-500"
                        onClick={() => removeAttendance(record.id)}
                        aria-label="Remove record"
                      >
                        ×
                      </button>
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* 4. Enroll course                                                    */
/* ------------------------------------------------------------------ */

export const CourseForm = ({ open, onClose }: FormProps) => {
  const { courses, addCourse } = useStore();
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [instructor, setInstructor] = useState('');
  const [units, setUnits] = useState('3');
  const [hours, setHours] = useState('3');
  const [kind, setKind] = useState(COURSE_KINDS[1]);
  const [section, setSection] = useState('');
  const [schedule, setSchedule] = useState('');
  const [room, setRoom] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setCode('');
    setTitle('');
    setInstructor('');
    setUnits('3');
    setHours('3');
    setKind(COURSE_KINDS[1]);
    setSection('');
    setSchedule('');
    setRoom('');
    setError('');
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return setError('A course code is required.');
    if (!title.trim()) return setError('A course title is required.');
    if (courses.some((c) => c.code.trim().toLowerCase() === code.trim().toLowerCase()))
      return setError('That course is already in your load.');
    addCourse({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      instructor: instructor.trim(),
      units: Number(units) || 0,
      hours: Number(hours) || 0,
      kind,
      section: section.trim(),
      schedule: schedule.trim(),
      room: room.trim(),
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enroll Course"
      subtitle="Add a subject to your current semester load"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-soft" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="course-form" className="btn-primary">
            Enroll course
          </button>
        </div>
      }
    >
      <form id="course-form" className="space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Course code">
            <input className="field" placeholder="CS 301" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Descriptive title">
              <input className="field" placeholder="Systems Programming" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Instructor">
            <input className="field" placeholder="Prof. Alan Turing" value={instructor} onChange={(e) => setInstructor(e.target.value)} />
          </Field>
          <Field label="Section">
            <input className="field" placeholder="Sec A" value={section} onChange={(e) => setSection(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Units">
            <input type="number" min={0} step="0.5" className="field" value={units} onChange={(e) => setUnits(e.target.value)} />
          </Field>
          <Field label="Hours / wk">
            <input type="number" min={0} step="1" className="field" value={hours} onChange={(e) => setHours(e.target.value)} />
          </Field>
        </div>
        <Field label="Delivery type">
          <select className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
            {COURSE_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Class schedule">
            <input className="field" placeholder="MWF 09:00–10:30" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
          </Field>
          <Field label="Room">
            <input className="field" placeholder="Room 304" value={room} onChange={(e) => setRoom(e.target.value)} />
          </Field>
        </div>
        <ErrorNote message={error} />
        <div className="flex items-center gap-3 rounded-xl border border-line bg-slate-50/70 p-3">
          <span className={`h-9 w-1.5 rounded-full ${COURSE_COLORS[courses.length % COURSE_COLORS.length].bar}`} />
          <div>
            <p className="text-sm font-semibold text-slate-800">{code || 'COURSE'}</p>
            <p className="text-xs text-slate-500">{title || 'Preview of your course card'}</p>
          </div>
        </div>
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* 5. Profile setup                                                    */
/* ------------------------------------------------------------------ */

export const ProfileForm = ({ open, onClose }: FormProps) => {
  const { profile, setProfile } = useStore();
  const [draft, setDraft] = useState(profile);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(profile);
      setError('');
    }
  }, [open, profile]);

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // Year levels belong to the chosen program, so they change with it — and until
  // a program is chosen there is no year level to offer.
  const yearChoices = draft.program ? yearOptionsFor(draft.program) : [];
  const hasProgram = Boolean(draft.program);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return setError('Please provide your full name.');
    setProfile({
      name: draft.name.trim(),
      program: draft.program,
      year: draft.year,
      section: draft.section.trim(),
      major: draft.major.trim(),
      email: draft.email.trim(),
      honor: draft.honor.trim(),
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Profile Setup"
      subtitle="Your identity is reflected across the header and welcome banner"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-soft" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="profile-form" className="btn-primary">
            Save profile
          </button>
        </div>
      }
    >
      <form id="profile-form" className="space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" hint="Managed by your CEC school account">
            <input className="field bg-slate-50 text-slate-500" value={draft.name} readOnly disabled />
          </Field>
          <Field label="Student email" hint="School address issued by the registrar">
            <input className="field bg-slate-50 text-slate-500" value={draft.email} readOnly disabled />
          </Field>
        </div>
        <Field
          label="Program"
          hint={draft.program ? `Runs ${yearChoices.length} year levels` : 'Choose a program to set the year levels'}
        >
          <select
            className="field"
            value={draft.program}
            onChange={(e) => {
              const next = e.target.value;
              setDraft((d) => {
                const years = yearOptionsFor(next);
                // Year levels follow the program: a year it does not run is dropped.
                return { ...d, program: next, year: years.includes(d.year) ? d.year : '' };
              });
            }}
          >
            <option value="">— Select a program —</option>
            {PROGRAM_OPTIONS.map((program) => (
              <option key={program} value={program}>
                {program}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Major">
            <input className="field" placeholder="Software Engineering" value={draft.major} onChange={(e) => set('major', e.target.value)} />
          </Field>
          <Field label="Year level" hint={hasProgram ? undefined : 'Select a program first'}>
            <select
              className={`field ${hasProgram ? '' : 'bg-slate-50 text-slate-500'}`}
              value={draft.year}
              disabled={!hasProgram}
              onChange={(e) => set('year', e.target.value)}
            >
              <option value="">{hasProgram ? '— Year —' : '— Program first —'}</option>
              {yearChoices.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Section">
            <input className="field" placeholder="A" value={draft.section} onChange={(e) => set('section', e.target.value)} />
          </Field>
        </div>
        <Field label="Honor / standing banner">
          <input className="field" placeholder="Dean's List Honor" value={draft.honor} onChange={(e) => set('honor', e.target.value)} />
        </Field>
        <ErrorNote message={error} />
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* 6. Pending tasks                                                    */
/* ------------------------------------------------------------------ */

export const TasksModal = ({ open, onClose }: FormProps) => {
  const { tasks, courses, addTask, removeTask, toggleTask } = useStore();
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [freeCourse, setFreeCourse] = useState('');
  const [type, setType] = useState<TaskType>(TASK_TYPES[0]);
  const [due, setDue] = useState('');
  const [error, setError] = useState('');

  const openCount = tasks.filter((t) => !t.done).length;
  const linked = courses.find((c) => c.id === courseId);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setCourseId('');
    setFreeCourse('');
    setType(TASK_TYPES[0]);
    setDue('');
    setError('');
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Give the task a title.');
    const parsedDue = due ? new Date(`${due}T00:00:00`) : null;
    addTask({
      title: title.trim(),
      course: linked?.code || freeCourse.trim() || 'General',
      type,
      due: parsedDue && !Number.isNaN(parsedDue.getTime())
        ? parsedDue.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
        : 'No due date',
      done: false,
    });
    setTitle('');
    setDue('');
    setFreeCourse('');
    setError('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pending Tasks"
      subtitle={openCount ? `${openCount} item${openCount === 1 ? '' : 's'} need attention` : 'Nothing outstanding'}
    >
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Task">
          <input
            className="field"
            placeholder="Linked List Lab Report"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Course">
            {courses.length > 0 ? (
              <select className="field" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">— Select —</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="field"
                placeholder="CS 301"
                value={freeCourse}
                onChange={(e) => setFreeCourse(e.target.value)}
              />
            )}
          </Field>
          <Field label="Type">
            <select className="field" value={type} onChange={(e) => setType(e.target.value as TaskType)}>
              {TASK_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due date">
            <input type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
        </div>

        <ErrorNote message={error} />

        <button type="submit" className="btn-primary w-full">
          <Plus className="h-4 w-4" /> Add task
        </button>
      </form>

      <div className="mt-5 border-t border-line pt-4">
        {tasks.length === 0 ? (
          <div className="dashed-empty">
            <span className="icon-chip bg-emerald-50 text-emerald-600">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <p className="text-sm text-slate-500">No active assignments — you are all caught up.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="group flex items-center gap-3 rounded-2xl border border-line p-3.5">
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  aria-label={task.done ? `Mark ${task.title} as pending` : `Mark ${task.title} as done`}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                    task.done
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 text-transparent hover:border-slate-400'
                  }`}
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${task.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {task.title}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {task.course} • Due {task.due}
                  </p>
                </div>
                <span className="chip shrink-0 bg-slate-100 text-slate-600">{task.type}</span>
                <button
                  type="button"
                  onClick={() => removeTask(task.id)}
                  className="shrink-0 text-slate-300 transition hover:text-rose-500"
                  aria-label={`Delete ${task.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};
