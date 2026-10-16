import type {
  AttendanceRecord,
  Course,
  GradeEntry,
  ScheduleSlot,
  ScheduleState,
  Task,
  TaskType,
} from '../types';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const todayName = (): string => WEEKDAY_NAMES[new Date().getDay()];

export const formatLongDate = (d = new Date()): string =>
  d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const formatTime = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${suffix}`;
};

export const totalUnits = (courses: Course[]): number =>
  courses.reduce((sum, c) => sum + (Number.isFinite(c.units) ? c.units : 0), 0);

/* --------------------------------- Grading -------------------------------- */

export const letterGrade = (score: number): string => {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 65) return 'D';
  return 'F';
};

/** Average of the student's assessment scores, e.g. 92.3 */
export const compositeScore = (grades: GradeEntry[]): number => {
  if (!grades.length) return 0;
  const total = grades.reduce((sum, g) => sum + g.score, 0);
  return Math.round((total / grades.length) * 10) / 10;
};

export const gradeForCode = (grades: GradeEntry[], code: string): GradeEntry | undefined =>
  grades.find((g) => g.code.replace(/\s+/g, '').toUpperCase() === code.replace(/\s+/g, '').toUpperCase());

/* ------------------------------- Attendance ------------------------------ */

export type AttendanceSummary = {
  total: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  /** present ÷ total, one decimal, e.g. 96.5 */
  rate: number;
};

export const attendanceSummary = (records: AttendanceRecord[]): AttendanceSummary => {
  const count = (status: AttendanceRecord['status']) => records.filter((r) => r.status === status).length;
  const total = records.length;
  const present = count('Present');
  return {
    total,
    present,
    late: count('Late'),
    excused: count('Excused'),
    absent: count('Absent'),
    rate: total ? Math.round((present / total) * 1000) / 10 : 0,
  };
};

/* ------------------------------- Schedule -------------------------------- */

export const classesToday = (schedule: ScheduleSlot[]): ScheduleSlot[] =>
  schedule.filter((slot) => slot.day === todayName()).sort((a, b) => a.start.localeCompare(b.start));

export const slotState = (slot: ScheduleSlot, now = new Date()): ScheduleState => {
  const current = now.getHours() * 60 + now.getMinutes();
  if (current >= toMinutes(slot.end)) return 'Completed';
  if (current >= toMinutes(slot.start)) return 'Ongoing';
  return 'Upcoming';
};

export const minutesUntil = (slot: ScheduleSlot, now = new Date()): number =>
  toMinutes(slot.start) - (now.getHours() * 60 + now.getMinutes());

export const nextClass = (slots: ScheduleSlot[], now = new Date()): ScheduleSlot | null =>
  slots.find((slot) => slotState(slot, now) !== 'Completed') ?? null;

/** "CS 302 in 20m (Tech Hall 304)" style hint for the Classes Today card. */
export const nextClassHint = (slots: ScheduleSlot[], now = new Date()): string => {
  const slot = nextClass(slots, now);
  if (!slot) return slots.length ? 'All lectures completed' : '';
  const mins = minutesUntil(slot, now);
  if (mins > 0 && mins <= 90) return `${slot.code} in ${mins}m (${slot.room})`;
  if (mins <= 0) return `Now: ${slot.code} (${slot.room})`;
  return `Next: ${slot.code} at ${formatTime(slot.start)}`;
};

/* --------------------------------- Tasks --------------------------------- */

const TASK_ORDER: TaskType[] = ['Lab', 'Quiz', 'Project', 'Exam', 'Reading'];

export const taskBreakdown = (tasks: Task[]): string[] =>
  TASK_ORDER.filter((type) => tasks.some((t) => t.type === type && !t.done)).map((type) => {
    const count = tasks.filter((t) => t.type === type && !t.done).length;
    return `${count} ${type}${count > 1 ? 's' : ''}`;
  });

export const openTasks = (tasks: Task[]): Task[] => tasks.filter((t) => !t.done);

/* ------------------------------- Benchmark ------------------------------- */

export type BenchmarkPoint = { code: string; course: string; you: number; median: number };

export const benchmarkData = (grades: GradeEntry[]): BenchmarkPoint[] =>
  [...grades]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((g) => ({ code: g.code, course: g.course, you: g.score, median: g.median }));
