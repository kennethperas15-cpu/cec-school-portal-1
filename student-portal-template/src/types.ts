export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
export type Day = (typeof DAYS)[number];

export type Profile = {
  name: string;
  program: string;
  year: string;
  section: string;
  major: string;
  email: string;
  /** e.g. "Dean's Honor List" */
  honor: string;
};

export type Course = {
  id: string;
  code: string;
  title: string;
  instructor: string;
  section: string;
  /** credit units, e.g. 3.5 */
  units: number;
  /** weekly contact hours, e.g. 4 */
  hours: number;
  /** delivery type chip, e.g. "Lecture & Lab" */
  kind: string;
  room: string;
  /** display schedule text, e.g. "MWF 09:00–10:30" */
  schedule: string;
};

export type ScheduleSlot = {
  id: string;
  courseId?: string;
  code: string;
  title: string;
  section: string;
  instructor: string;
  room: string;
  day: Day;
  /** "HH:MM" 24h */
  start: string;
  end: string;
};

export type ScheduleState = 'Completed' | 'Ongoing' | 'Upcoming';

export type GradeEntry = {
  id: string;
  /** short code used on the benchmark x-axis, e.g. "CS301" */
  code: string;
  /** full label shown in tooltips, e.g. "CS 301" */
  course: string;
  /** your assessment score 0–100 */
  score: number;
  /** class median 0–100 */
  median: number;
  term: string;
};

export type AttendanceStatus = 'Present' | 'Late' | 'Excused' | 'Absent';

export type AttendanceRecord = {
  id: string;
  course: string;
  date: string;
  status: AttendanceStatus;
};

export type TaskType = 'Lab' | 'Quiz' | 'Project' | 'Exam' | 'Reading';

export const TASK_TYPES: TaskType[] = ['Lab', 'Quiz', 'Project', 'Exam', 'Reading'];

export type Task = {
  id: string;
  title: string;
  course: string;
  type: TaskType;
  due: string;
  done: boolean;
};

/** Categories are free-form because they come from the live announcements table. */
export type BulletinCategory = string;

export type Bulletin = {
  id: string;
  category: BulletinCategory;
  title: string;
  body: string;
  /** human relative time, e.g. "2 hours ago" */
  relative: string;
  /** staff member who published the notice, when known */
  author?: string;
};

export type Milestone = {
  id: string;
  /** three-letter month for the date badge, e.g. "MAR" */
  month: string;
  /** day of month for the date badge, e.g. "16" */
  day: string;
  title: string;
  date: string;
  meta: string;
};

/** Official (non-derivable) academic insights shown on the stat cards. */
export type Insights = {
  /** official cumulative GPA on the 4.00 scale, e.g. 3.84 */
  gpa: number;
  /** GPA movement this term, e.g. 0.08 */
  gpaDelta: number;
  /** rank descriptor, e.g. "Top 5%" */
  rankLabel: string;
  /** honor track label, e.g. "Summa Cum Laude Track" */
  standing: string;
};

export const PROGRAM_OPTIONS = [
  'BS Computer Science',
  'BS Information Technology',
  'BS Information Systems',
  'BS Accountancy',
  'BS Business Administration',
  'Bachelor of Elementary Education',
  'Bachelor of Secondary Education',
  'BS Civil Engineering',
];

export const YEAR_OPTIONS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];

export const TERM_OPTIONS = ['Prelim', 'Midterm', 'Semi-Final', 'Final'];

export const COURSE_KINDS = [
  'Lecture Only',
  'Lecture & Lab',
  'Lecture & Studio',
  'Laboratory',
  'Lab Oriented',
  'Seminar',
  'Capstone Track',
];

/** Rotating palette so enrolled courses never look monotonous. */
export const COURSE_COLORS = [
  { bar: 'bg-[#3B82F6]', soft: 'bg-[#EFF6FF]', text: 'text-[#1D4ED8]', hex: '#3B82F6' },
  { bar: 'bg-[#6366F1]', soft: 'bg-[#EEF2FF]', text: 'text-[#4338CA]', hex: '#6366F1' },
  { bar: 'bg-[#8B5CF6]', soft: 'bg-[#F5F3FF]', text: 'text-[#6D28D9]', hex: '#8B5CF6' },
  { bar: 'bg-[#0EA5E9]', soft: 'bg-[#F0F9FF]', text: 'text-[#0369A1]', hex: '#0EA5E9' },
  { bar: 'bg-[#10B981]', soft: 'bg-[#ECFDF5]', text: 'text-[#047857]', hex: '#10B981' },
  { bar: 'bg-[#F59E0B]', soft: 'bg-[#FFFBEB]', text: 'text-[#B45309]', hex: '#F59E0B' },
];
