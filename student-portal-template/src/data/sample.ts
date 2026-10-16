import type {
  AttendanceRecord,
  AttendanceStatus,
  Bulletin,
  Course,
  Day,
  GradeEntry,
  Insights,
  Milestone,
  Profile,
  ScheduleSlot,
  Task,
} from '../types';

export type AppState = {
  profile: Profile;
  courses: Course[];
  schedule: ScheduleSlot[];
  grades: GradeEntry[];
  attendance: AttendanceRecord[];
  tasks: Task[];
  insights: Insights;
};

export const AY_OPTIONS = [
  'AY 2025–2026 • 1st Semester',
  'AY 2025–2026 • 2nd Semester',
  'AY 2025–2026 • Summer Term',
  'AY 2024–2025 • 2nd Semester',
];

export const DEFAULT_AY = 'AY 2025–2026 • 2nd Semester';

export const EMPTY_APP_STATE: AppState = {
  profile: { name: '', program: '', year: '', section: '', major: '', email: '', honor: '' },
  courses: [],
  schedule: [],
  grades: [],
  attendance: [],
  tasks: [],
  insights: { gpa: 0, gpaDelta: 0, rankLabel: '', standing: '' },
};

/* ------------------------------------------------------------------ */
/* Sample dataset — mirrors the reference dashboard                    */
/* ------------------------------------------------------------------ */

const SAMPLE_PROFILE: Profile = {
  name: 'Alex Morgan',
  program: 'BS Computer Science',
  year: 'Year 3',
  section: 'A',
  major: 'Software Engineering',
  email: 'alex.morgan@university.edu',
  honor: "Dean's Honor List",
};

const SAMPLE_COURSES: Omit<Course, 'id'>[] = [
  {
    code: 'CS 301',
    title: 'Systems Programming',
    instructor: 'Prof. Alan Turing',
    section: 'Sec A',
    units: 3.5,
    hours: 4,
    kind: 'Lecture & Lab',
    room: 'Tech Hall 301',
    schedule: 'MWF 09:00–10:30',
  },
  {
    code: 'CS 302',
    title: 'Database Architecture',
    instructor: 'Dr. Eleanor Vance',
    section: 'Sec A',
    units: 3.5,
    hours: 4,
    kind: 'Lecture & Studio',
    room: 'Tech Hall 304',
    schedule: 'MWF 10:30–12:00',
  },
  {
    code: 'CS 305',
    title: 'Software Eng. & Design',
    instructor: 'Prof. Marcus Brody',
    section: 'Sec B',
    units: 4,
    hours: 4,
    kind: 'Capstone Track',
    room: 'Innovation Lab B',
    schedule: 'TTh 14:00–15:30',
  },
  {
    code: 'MATH 220',
    title: 'Linear Algebra & Matrices',
    instructor: 'Dr. Sarah Chen',
    section: 'Sec C',
    units: 3,
    hours: 3,
    kind: 'Lecture Only',
    room: 'Room 212',
    schedule: 'MWF 13:00–14:00',
  },
  {
    code: 'CS 310',
    title: 'Computer Networks & Sec',
    instructor: 'Prof. David Ross',
    section: 'Sec A',
    units: 3,
    hours: 3,
    kind: 'Lab Oriented',
    room: 'Tech Hall 305',
    schedule: 'TTh 08:00–09:30',
  },
  {
    code: 'ENG 205',
    title: 'Technical Writing for Eng',
    instructor: 'Dr. Linda Martinez',
    section: 'Sec D',
    units: 3,
    hours: 3,
    kind: 'Seminar',
    room: 'Room 118',
    schedule: 'F 15:30–17:00',
  },
];

const SAMPLE_GRADES: Omit<GradeEntry, 'id'>[] = [
  { code: 'CS301', course: 'CS 301', score: 94, median: 90, term: 'Midterm' },
  { code: 'CS302', course: 'CS 302', score: 96, median: 92, term: 'Midterm' },
  { code: 'CS305', course: 'CS 305', score: 91, median: 88, term: 'Midterm' },
  { code: 'MATH220', course: 'MATH 220', score: 88, median: 90, term: 'Midterm' },
  { code: 'CS310', course: 'CS 310', score: 95, median: 91, term: 'Midterm' },
  { code: 'ENG205', course: 'ENG 205', score: 90, median: 89, term: 'Midterm' },
];

const SAMPLE_LESSONS = [
  {
    code: 'CS 301',
    title: 'Systems Programming',
    section: 'Sec A',
    instructor: 'Prof. Alan Turing',
    room: 'Tech Hall 301',
    start: '09:00',
    end: '10:30',
  },
  {
    code: 'CS 302',
    title: 'Database Architecture',
    section: 'Sec A',
    instructor: 'Dr. Eleanor Vance',
    room: 'Tech Hall 304',
    start: '10:30',
    end: '12:00',
  },
  {
    code: 'CS 305',
    title: 'Software Eng. & Design',
    section: 'Sec B',
    instructor: 'Prof. Marcus Brody',
    room: 'Innovation Lab B',
    start: '14:00',
    end: '15:30',
  },
];

const WEEKDAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const SAMPLE_TASKS: Omit<Task, 'id'>[] = [
  { title: 'Linked List Lab Report', course: 'CS 301', type: 'Lab', due: 'Mar 06', done: false },
  { title: 'Packet Capture Analysis Lab', course: 'CS 310', type: 'Lab', due: 'Mar 07', done: false },
  { title: 'Eigenvalues & Eigenvectors Quiz', course: 'MATH 220', type: 'Quiz', due: 'Mar 05', done: false },
  { title: 'Sprint 2 Deliverable', course: 'CS 305', type: 'Project', due: 'Mar 10', done: false },
];

export const SAMPLE_BULLETINS: Bulletin[] = [
  {
    id: 'b1',
    category: 'Academic Affairs',
    title: 'Midterm Examination Timetable Published',
    body: 'The Office of the Dean has finalized the schedule for Midterm Exams for all departments.',
    relative: '2 hours ago',
  },
  {
    id: 'b2',
    category: 'Department',
    title: 'ACM Hackathon 2026 Registration Open',
    body: 'Compete in 36-hour algorithmic challenges with corporate mentors.',
    relative: 'Yesterday',
  },
  {
    id: 'b3',
    category: 'Facilities',
    title: 'Library Extended Hours for Midterms',
    body: 'Main University Library and digital computer pods will remain accessible until 1:00 AM.',
    relative: '3 days ago',
  },
];

export const SAMPLE_MILESTONES: Milestone[] = [
  {
    id: 'm1',
    month: 'MAR',
    day: '16',
    title: 'Midterm Examination Week',
    date: 'March 16 – March 20',
    meta: 'All departments',
  },
  {
    id: 'm2',
    month: 'APR',
    day: '25',
    title: 'Grading Clearance Deadline',
    date: 'April 25',
    meta: 'Final submissions & audits',
  },
];

const buildAttendance = (): AttendanceRecord[] => {
  const codes = SAMPLE_COURSES.map((c) => c.code);
  const statuses: AttendanceStatus[] = [
    ...Array<AttendanceStatus>(82).fill('Present'),
    'Late',
    'Late',
    'Excused',
  ];
  const base = new Date('2026-03-04T00:00:00');
  return statuses.map((status, index) => {
    const day = new Date(base);
    day.setDate(base.getDate() - Math.floor(index * 1.4));
    return {
      id: `att-${index + 1}`,
      course: codes[index % codes.length],
      date: day.toISOString().slice(0, 10),
      status,
    };
  });
};

const buildSchedule = (courses: Course[]): ScheduleSlot[] => {
  const byCode = new Map(courses.map((c) => [c.code, c]));
  const slots: ScheduleSlot[] = [];
  WEEKDAYS.forEach((day) => {
    SAMPLE_LESSONS.forEach((lesson) => {
      slots.push({
        id: `slot-${day}-${lesson.code}`.replace(/\s+/g, ''),
        courseId: byCode.get(lesson.code)?.id,
        ...lesson,
        day,
      });
    });
  });
  return slots;
};

/** Builds a fresh instance of the reference dataset (new ids every call). */
export const createSampleState = (): AppState => {
  const courses: Course[] = SAMPLE_COURSES.map((course, index) => ({
    ...course,
    id: `course-${index + 1}`,
  }));

  return {
    profile: { ...SAMPLE_PROFILE },
    courses,
    schedule: buildSchedule(courses),
    grades: SAMPLE_GRADES.map((grade, index) => ({ ...grade, id: `grade-${index + 1}` })),
    attendance: buildAttendance(),
    tasks: SAMPLE_TASKS.map((task, index) => ({ ...task, id: `task-${index + 1}` })),
    insights: {
      gpa: 3.84,
      gpaDelta: 0.08,
      rankLabel: 'Top 5%',
      standing: 'Summa Cum Laude Track',
    },
  };
};
