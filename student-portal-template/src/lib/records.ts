/**
 * Official academic records — grades and attendance posted by the faculty.
 *
 * The teacher's Grade Encoding and Attendance Tracker screens publish one
 * document per student, per term:
 *
 *   GET /api/portal/records/grades      (authenticated)
 *   GET /api/portal/records/attendance  (authenticated)
 *
 * The server narrows the answer to the signed-in student's own documents before
 * they ever leave the database, so this module never filters somebody else's
 * marks out of the payload — it only decodes what it is given and joins it to
 * the registrar's published load so a mark reads as a subject, not a code.
 *
 * Nothing here falls back to sample data: no posted record means the page says
 * so, and a subject the faculty never posted simply has no mark yet.
 */
import type { AttendanceRecord, AttendanceStatus, Course } from '../types';
import { cecAttendanceRecords, cecGradeRecords, type ApiResult } from './api';
import { letterGrade } from './metrics';

/* --------------------------------- shapes -------------------------------- */

/** One subject's marks, exactly as the faculty member encoded them. */
export type GradeRow = {
  code: string;
  /** the roster's subject / section text, kept verbatim */
  course: string;
  prelim: string;
  midterm: string;
  final: string;
};

/** One recorded session. */
export type AttendanceRow = {
  /** ISO "YYYY-MM-DD" */
  date: string;
  course: string;
  status: AttendanceStatus;
};

type RecordBase = {
  itemId: string;
  title: string;
  schoolYear: string;
  semester: string;
  studentId: string;
  studentName: string;
  postedBy: string;
  postedByName: string;
  postedAt: string;
  updatedAt?: string;
  updatedByName?: string;
};

export type GradeRecord = RecordBase & { entries: GradeRow[] };
export type AttendanceDoc = RecordBase & { entries: AttendanceRow[] };

/* ------------------------------- primitives ------------------------------ */

const isText = (value: unknown): value is string => typeof value === 'string';

const STATUSES: AttendanceStatus[] = ['Present', 'Late', 'Excused', 'Absent'];

/** Comparison text: case, punctuation and spacing free. */
export const key = (value: string): string => (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * A mark as a number. Faculty type "94.2", "94.2%" or leave it blank; anything
 * that is not a number in 0–100 stays unset rather than being read as zero.
 */
export const scoreOf = (value: string): number | null => {
  const match = /-?\d+(?:\.\d+)?/.exec(value ?? '');
  if (!match) return null;
  const score = Number(match[0]);
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
};

/** Which marks exist, and their plain mean — the same mean the faculty sheet shows. */
export const marksOf = (row: GradeRow): { prelim: number | null; midterm: number | null; final: number | null; average: number | null } => {
  const prelim = scoreOf(row.prelim);
  const midterm = scoreOf(row.midterm);
  const final = scoreOf(row.final);
  const present = [prelim, midterm, final].filter((value): value is number => value !== null);
  const average = present.length ? Math.round((present.reduce((sum, value) => sum + value, 0) / present.length) * 10) / 10 : null;
  return { prelim, midterm, final, average };
};

/** The letter the portal uses everywhere else, so the pages never disagree. */
export const letterOf = (score: number | null): string => (score === null ? '—' : letterGrade(score));

/**
 * Standing band, using the same boundaries the faculty dashboard shows on its
 * own grade sheet. Nothing else about honours or ranking is asserted.
 */
export const BANDS = [
  { label: 'Excellent (90–100)', min: 90 },
  { label: 'Satisfactory (80–89)', min: 80 },
  { label: 'Needs support (below 80)', min: 0 },
] as const;

export const bandOf = (score: number | null): string =>
  score === null ? '' : (BANDS.find((band) => score >= band.min)?.label ?? '');

/** How much of the term has been posted for one subject. */
export const statusOf = (row: GradeRow): string => {
  const { prelim, midterm, final } = marksOf(row);
  if (prelim !== null && midterm !== null && final !== null) return 'Complete';
  if (final !== null) return 'Final posted';
  if (midterm !== null) return 'Midterm posted';
  if (prelim !== null) return 'Prelim posted';
  return 'No marks yet';
};

const isValidGradeRow = (raw: unknown): raw is Record<string, unknown> => !!raw && typeof raw === 'object';

/* --------------------------------- decoding ------------------------------- */

function decodeRows<E>(module: 'grades' | 'attendance', raw: unknown): E[] {
  if (!Array.isArray(raw)) return [];
  const out: E[] = [];
  for (const item of raw) {
    if (!isValidGradeRow(item)) continue;
    if (module === 'grades') {
      const course = isText(item.course) ? item.course.trim() : '';
      const code = isText(item.code) && item.code.trim() ? item.code.trim() : course;
      if (!code && !course) continue;
      out.push({
        code,
        course,
        prelim: isText(item.prelim) ? item.prelim.trim() : '',
        midterm: isText(item.midterm) ? item.midterm.trim() : '',
        final: isText(item.final) ? item.final.trim() : '',
      } as E);
      continue;
    }
    const date = isText(item.date) ? item.date.trim() : '';
    const status = STATUSES.find((value) => value === item.status);
    if (!date || !status) continue;
    out.push({ date, course: isText(item.course) ? item.course.trim() : '', status } as E);
  }
  return out;
}

const decodeBase = (row: { id: string; title?: string; detail: string | null }): RecordBase | null => {
  if (!row.detail) return null;
  try {
    const parsed = JSON.parse(row.detail) as Record<string, unknown>;
    if (parsed.v !== 1) return null;
    if (!isText(parsed.schoolYear) || !isText(parsed.semester)) return null;
    return {
      itemId: row.id,
      title: row.title ?? '',
      schoolYear: parsed.schoolYear,
      semester: parsed.semester,
      studentId: isText(parsed.studentId) ? parsed.studentId : '',
      studentName: isText(parsed.studentName) ? parsed.studentName : '',
      postedBy: isText(parsed.postedBy) ? parsed.postedBy : '',
      postedByName: isText(parsed.postedByName) ? parsed.postedByName : '',
      postedAt: isText(parsed.postedAt) ? parsed.postedAt : '',
      updatedAt: isText(parsed.updatedAt) ? parsed.updatedAt : undefined,
      updatedByName: isText(parsed.updatedByName) ? parsed.updatedByName : undefined,
    };
  } catch {
    return null;
  }
};

/** The student's posted grades, decoded. */
export const fetchGradeRecords = async (token?: string): Promise<ApiResult<GradeRecord[]>> => {
  const result = await cecGradeRecords(token);
  if (!result.ok) return result;
  const out: GradeRecord[] = [];
  for (const row of result.data) {
    const base = decodeBase(row);
    if (!base) continue;
    const parsed = JSON.parse(row.detail ?? '{}') as { entries?: unknown };
    out.push({ ...base, entries: decodeRows<GradeRow>('grades', parsed.entries) });
  }
  return { ok: true, data: out };
};

/** The student's posted attendance, decoded. */
export const fetchAttendanceDocs = async (token?: string): Promise<ApiResult<AttendanceDoc[]>> => {
  const result = await cecAttendanceRecords(token);
  if (!result.ok) return result;
  const out: AttendanceDoc[] = [];
  for (const row of result.data) {
    const base = decodeBase(row);
    if (!base) continue;
    const parsed = JSON.parse(row.detail ?? '{}') as { entries?: unknown };
    out.push({ ...base, entries: decodeRows<AttendanceRow>('attendance', parsed.entries) });
  }
  return { ok: true, data: out };
};

/* ---------------------------------- joining ------------------------------- */

/**
 * The published subject a faculty record belongs to.
 *
 * The two sides write the same code differently — the registrar publishes
 * "CS 302", the roster keeps "CS 302  Section A" — so the codes are compared
 * with punctuation and spacing removed, longest code first so "CS 302" never
 * loses to a shorter accidental match.
 */
export const matchCourse = (courses: Course[], text: string): Course | null => {
  const wanted = key(text);
  if (!wanted) return null;
  const ordered = [...courses].sort((a, b) => key(b.code).length - key(a.code).length);
  for (const course of ordered) {
    const code = key(course.code);
    if (code && code === wanted) return course;
  }
  for (const course of ordered) {
    const code = key(course.code);
    if (code.length >= 4 && (wanted.includes(code) || code.includes(wanted))) return course;
  }
  const byTitle = [...courses].sort((a, b) => key(b.title).length - key(a.title).length);
  for (const course of byTitle) {
    const title = key(course.title);
    if (title.length >= 6 && wanted.includes(title)) return course;
  }
  return null;
};

/** A subject's marks, joined to the registrar's published load where possible. */
export type CourseMarks = {
  /** the published subject, when the faculty record matches one */
  course: Course | null;
  /** what to print when there is no published subject to borrow a title from */
  code: string;
  title: string;
  units: number | null;
  instructor: string;
  schedule: string;
  room: string;
  kind: string;
  rows: GradeRow[];
  /** strongest subject average across the subject's rows */
  average: number | null;
  letter: string;
  status: string;
};

/** One row per subject, newest record first, unmatched faculty rows kept visible. */
export const courseMarks = (records: GradeRecord[], courses: Course[]): CourseMarks[] => {
  const groups = new Map<string, GradeRow[]>();
  for (const record of records) {
    for (const row of record.entries) {
      const course = matchCourse(courses, row.course || row.code);
      const groupKey = course ? `published:${key(course.code)}` : `raw:${key(row.course || row.code)}`;
      groups.set(groupKey, [...(groups.get(groupKey) ?? []), row]);
    }
  }
  return [...groups.entries()]
    .map(([groupKey, rows]) => {
      const sample = rows[0];
      const course = groupKey.startsWith('published:')
        ? courses.find((item) => groupKey === `published:${key(item.code)}`) ?? null
        : null;
      const averages = rows.map((row) => marksOf(row).average).filter((value): value is number => value !== null);
      const average = averages.length ? Math.round((averages.reduce((sum, value) => sum + value, 0) / averages.length) * 10) / 10 : null;
      return {
        course,
        code: course?.code || sample.code || sample.course,
        title: course?.title || sample.course || sample.code,
        units: course ? course.units : null,
        instructor: course?.instructor ?? '',
        schedule: course?.schedule ?? '',
        room: course?.room ?? '',
        kind: course?.kind ?? '',
        rows,
        average,
        letter: letterOf(average),
        status: rows.length === 1 ? statusOf(rows[0]) : `${rows.length} records`,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
};

/** A subject's attendance, joined to the same published load. */
export type CourseAttendance = {
  course: Course | null;
  code: string;
  title: string;
  instructor: string;
  schedule: string;
  room: string;
  rows: AttendanceRow[];
  total: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  rate: number;
  /** 80% is the institutional requirement the school already states */
  meetsRequirement: boolean;
};

export const courseAttendance = (docs: AttendanceDoc[], courses: Course[]): CourseAttendance[] => {
  const groups = new Map<string, AttendanceRow[]>();
  for (const doc of docs) {
    for (const row of doc.entries) {
      const course = matchCourse(courses, row.course);
      const groupKey = course ? `published:${key(course.code)}` : `raw:${key(row.course) || 'unassigned'}`;
      groups.set(groupKey, [...(groups.get(groupKey) ?? []), row]);
    }
  }
  return [...groups.entries()]
    .map(([groupKey, rows]) => {
      const sample = rows[0];
      const course = groupKey.startsWith('published:')
        ? courses.find((item) => groupKey === `published:${key(item.code)}`) ?? null
        : null;
      const count = (status: AttendanceStatus) => rows.filter((row) => row.status === status).length;
      const total = rows.length;
      const present = count('Present');
      const rate = total ? Math.round((present / total) * 1000) / 10 : 0;
      return {
        course,
        code: course?.code || sample.course || 'Unassigned',
        title: course?.title || sample.course || '',
        instructor: course?.instructor ?? '',
        schedule: course?.schedule ?? '',
        room: course?.room ?? '',
        rows,
        total,
        present,
        late: count('Late'),
        excused: count('Excused'),
        absent: count('Absent'),
        rate,
        meetsRequirement: total > 0 && rate >= 80,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
};

/* --------------------------------- summaries ------------------------------ */

export type GradeSummary = {
  /** mean of every posted subject average */
  average: number | null;
  letter: string;
  band: string;
  /** subjects with at least one mark */
  evaluated: number;
  /** subjects in the published load */
  enrolled: number;
  /** units of the evaluated subjects, when the registrar fixed their units */
  unitsEvaluated: number;
  unitsMissing: number;
  top: CourseMarks | null;
  complete: number;
  awaitingFinal: number;
  /** every posted mark, newest record first */
  postedAt: string;
  postedByName: string;
};

export const summarizeGrades = (marks: CourseMarks[], courses: Course[]): GradeSummary => {
  const scored = marks.filter((row) => row.average !== null);
  const average = scored.length
    ? Math.round((scored.reduce((sum, row) => sum + (row.average ?? 0), 0) / scored.length) * 10) / 10
    : null;
  const units = scored.reduce((sum, row) => sum + (row.units ?? 0), 0);
  const top = [...scored].sort((a, b) => (b.average ?? 0) - (a.average ?? 0))[0] ?? null;
  return {
    average,
    letter: letterOf(average),
    band: bandOf(average),
    evaluated: scored.length,
    enrolled: courses.length,
    unitsEvaluated: Math.round(units * 10) / 10,
    unitsMissing: scored.filter((row) => row.units === null).length,
    top,
    complete: scored.filter((row) => row.status === 'Complete').length,
    awaitingFinal: scored.filter((row) => row.status !== 'Complete').length,
    postedAt: '',
    postedByName: '',
  };
};

export type AttendanceSummary = {
  total: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  rate: number;
  meetsRequirement: boolean;
  /** subjects at 80% or better, and the ones below it */
  cleared: number;
  atRisk: number;
  courses: number;
};

export const summarizeAttendance = (perCourse: CourseAttendance[]): AttendanceSummary => {
  const sum = (pick: (row: CourseAttendance) => number) => perCourse.reduce((total, row) => total + pick(row), 0);
  const total = sum((row) => row.total);
  const present = sum((row) => row.present);
  const rate = total ? Math.round((present / total) * 1000) / 10 : 0;
  return {
    total,
    present,
    late: sum((row) => row.late),
    excused: sum((row) => row.excused),
    absent: sum((row) => row.absent),
    rate,
    meetsRequirement: total > 0 && rate >= 80,
    cleared: perCourse.filter((row) => row.meetsRequirement).length,
    atRisk: perCourse.filter((row) => !row.meetsRequirement).length,
    courses: perCourse.length,
  };
};

/** The log in the dashboard's own attendance shape, so shared widgets can read it. */
export const asAttendanceRecords = (docs: AttendanceDoc[]): AttendanceRecord[] =>
  docs.flatMap((doc) =>
    doc.entries.map((row, index) => ({
      id: `${doc.itemId}-${index}`,
      course: row.course,
      date: row.date,
      status: row.status,
    })),
  );

/* ------------------------------ grading scale ----------------------------- */

/** The portal's own percentage → letter bands, for the reference card. */
export const GRADING_SCALE: { band: string; range: string }[] = [
  { band: 'A+', range: '97 – 100' },
  { band: 'A', range: '93 – 96' },
  { band: 'A-', range: '90 – 92' },
  { band: 'B+', range: '87 – 89' },
  { band: 'B', range: '83 – 86' },
  { band: 'B-', range: '80 – 82' },
  { band: 'C+', range: '77 – 79' },
  { band: 'C', range: '73 – 76' },
  { band: 'C-', range: '70 – 72' },
  { band: 'D+', range: '67 – 69' },
  { band: 'D', range: '65 – 66' },
  { band: 'F', range: 'Below 65' },
];

/** Distinct terms the posted records actually mention, newest first. */
export const termOptions = (records: { schoolYear: string; semester: string }[]): { schoolYear: string; semester: string; label: string }[] => {
  const seen = new Map<string, { schoolYear: string; semester: string; label: string }>();
  for (const record of records) {
    const id = `${record.schoolYear}|${record.semester}`.toLowerCase();
    if (!seen.has(id)) {
      seen.set(id, {
        schoolYear: record.schoolYear,
        semester: record.semester,
        label: `${record.semester} AY ${record.schoolYear}`,
      });
    }
  }
  return [...seen.values()];
};

/** Records narrowed to one term, or all of them when no term is chosen. */
export const inTerm = <T extends { schoolYear: string; semester: string }>(records: T[], term: { schoolYear: string; semester: string } | null): T[] =>
  term
    ? records.filter(
        (record) =>
          record.schoolYear.toLowerCase() === term.schoolYear.toLowerCase() &&
          record.semester.toLowerCase() === term.semester.toLowerCase(),
      )
    : records;
