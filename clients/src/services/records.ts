import { useCallback, useEffect, useState } from 'react';
import api, { describeApiError } from './api';

/**
 * Academic records — the official grades and attendance a faculty member posts.
 *
 * The schedule contract (`services/schedule.ts`) publishes one document per
 * section; this one publishes one document per *student*, because marks belong
 * to a person and each faculty member owns their own submission. The row lives
 * in the same `portal_items` table:
 *
 *   portal : 'student'
 *   module : 'grade'  |  'attendance'
 *   title  : 'Grades · 2836159 Juan Dela Cruz'
 *   detail : JSON, the `AcademicRecordDoc` below
 *   status : 'Posted'
 *   owner  : the faculty member's email (who may edit or retract it)
 *
 * Reads go through `GET /portal/records/:module`, which is authenticated and
 * scoped server-side: a student receives only the documents that carry their own
 * seven-digit school ID, a teacher only their own submissions, the registrar all
 * of them. Grades are never served by the public `/portal/items` shelf.
 */

export type AcademicRecordModule = 'grades' | 'attendance';

export const ACADEMIC_MODULES: AcademicRecordModule[] = ['grades', 'attendance'];

export const MODULE_LABEL: Record<AcademicRecordModule, string> = {
  grades: 'Grades',
  attendance: 'Attendance',
};

/* --------------------------------- shapes -------------------------------- */

/** One subject's marks, exactly as the faculty member encoded them. */
export type GradeEntryRow = {
  /** subject code as typed on the roster, e.g. "CS 302" */
  code: string;
  /** the roster's subject / section text, kept verbatim for provenance */
  course: string;
  prelim: string;
  midterm: string;
  final: string;
};

export type AttendanceStatus = 'Present' | 'Late' | 'Excused' | 'Absent';

/** One recorded session for one subject. */
export type AttendanceRow = {
  /** ISO "YYYY-MM-DD" */
  date: string;
  course: string;
  status: AttendanceStatus;
};

export type AcademicRecordDoc<E> = {
  v: 1;
  schoolYear: string;
  semester: string;
  /** the student's seven-digit school number — the join key */
  studentId: string;
  studentName: string;
  section: string;
  program: string;
  entries: E[];
  postedBy: string;
  postedByName: string;
  postedAt: string;
  updatedAt?: string;
  updatedByName?: string;
};

/** A decoded document plus the shared row it lives in. */
export type AcademicRecord<E> = AcademicRecordDoc<E> & {
  itemId: string;
  module: AcademicRecordModule;
  title: string;
  status: string;
  owner: string;
  rowCreatedAt: string | null;
  rowUpdatedAt: string | null;
};

type ItemRow = {
  id: string;
  module?: string;
  title?: string;
  detail: string | null;
  status?: string | null;
  owner?: string | null;
  created_at?: string;
  updated_at?: string;
};

/* ------------------------------- primitives ------------------------------ */

/** Term text compared the way the portal writes it ("2026–2027", en dash). */
export const fold = (value: string): string =>
  (value ?? '').trim().toLowerCase().replace(/[\u2010-\u2015\u2212-]+/g, '-').replace(/\s+/g, ' ');

const isText = (value: unknown): value is string => typeof value === 'string';

/**
 * The student's school number, when the value really is one. Rosters kept a
 * school ID *and* an internal row id in the same field, so anything that is not
 * a 2xxxxxx number is discarded rather than posted against the wrong key.
 */
export const studentIdOf = (value: unknown): string => {
  const text = typeof value === 'string' ? value.trim() : '';
  return /^2\d{6}$/.test(text) ? text : '';
};

/**
 * The subject code inside the roster's free text. Faculty type "CS 302",
 * "CS 302  Section A" or "CS302 - Section A"; the registrar publishes "CS 302".
 * The leading code token is what both sides agree on.
 */
export const subjectCodeOf = (course: string): string => {
  const match = /\b([A-Za-z]{2,8})\s?-?\s?(\d{1,4})\b/.exec(course ?? '');
  return match ? `${match[1].toUpperCase()} ${match[2]}` : (course ?? '').trim();
};

const asGradeRow = (raw: unknown): GradeEntryRow | null => {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const course = isText(row.course) ? row.course.trim() : '';
  const code = isText(row.code) && row.code.trim() ? row.code.trim() : subjectCodeOf(course);
  if (!course && !code) return null;
  return {
    code,
    course,
    prelim: isText(row.prelim) ? row.prelim.trim() : '',
    midterm: isText(row.midterm) ? row.midterm.trim() : '',
    final: isText(row.final) ? row.final.trim() : '',
  };
};

const ATTENDANCE_STATUSES: AttendanceStatus[] = ['Present', 'Late', 'Excused', 'Absent'];

const asAttendanceRow = (raw: unknown): AttendanceRow | null => {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const date = isText(row.date) ? row.date.trim() : '';
  const status = ATTENDANCE_STATUSES.find((value) => value === row.status);
  if (!date || !status) return null;
  return { date, course: isText(row.course) ? row.course.trim() : '', status };
};

const ENTRY_READERS = {
  grades: asGradeRow,
  attendance: asAttendanceRow,
} as const;

/** Tolerant reader: a damaged or older document yields null instead of throwing. */
export const decodeRecord = <E>(module: AcademicRecordModule, detail: string | null): AcademicRecordDoc<E> | null => {
  if (!detail) return null;
  try {
    const parsed = JSON.parse(detail) as Record<string, unknown>;
    if (parsed.v !== 1) return null;
    if (!isText(parsed.schoolYear) || !isText(parsed.semester) || !isText(parsed.studentId)) return null;
    const read = ENTRY_READERS[module] as (raw: unknown) => E | null;
    const entries = Array.isArray(parsed.entries)
      ? (parsed.entries.map(read).filter((entry): entry is E => entry !== null) as E[])
      : [];
    return {
      v: 1,
      schoolYear: parsed.schoolYear,
      semester: parsed.semester,
      studentId: parsed.studentId,
      studentName: isText(parsed.studentName) ? parsed.studentName : '',
      section: isText(parsed.section) ? parsed.section : '',
      program: isText(parsed.program) ? parsed.program : '',
      entries,
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

/* --------------------------------- reads --------------------------------- */

/**
 * The academic records the caller is allowed to see, decoded. The server has
 * already narrowed the answer by role; this only drops rows that do not decode.
 */
export async function fetchAcademicRecords<E>(module: AcademicRecordModule): Promise<AcademicRecord<E>[]> {
  const response = await api.get<{ data?: ItemRow[] }>(`/portal/records/${module}`);
  const rows = response.data?.data ?? [];
  const out: AcademicRecord<E>[] = [];
  for (const row of rows) {
    const doc = decodeRecord<E>(module, row.detail);
    if (!doc) continue;
    out.push({
      ...doc,
      itemId: row.id,
      module,
      title: row.title ?? '',
      status: row.status ?? '',
      owner: row.owner ?? '',
      rowCreatedAt: row.created_at ?? null,
      rowUpdatedAt: row.updated_at ?? null,
    });
  }
  return out;
}

/** React binding for the admin/registrar panels and the faculty screen. */
export const useAcademicRecords = <E>(module: AcademicRecordModule) => {
  const [records, setRecords] = useState<AcademicRecord<E>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRecords(await fetchAcademicRecords<E>(module));
      setError('');
    } catch (err) {
      setError(describeApiError(err, `Loading the posted ${MODULE_LABEL[module].toLowerCase()}`));
    } finally {
      setLoading(false);
    }
  }, [module]);

  useEffect(() => {
    void load();
  }, [load]);

  return { records, loading, error, refresh: load };
};

/* --------------------------------- writes -------------------------------- */

export type PostRecordInput<E> = {
  module: AcademicRecordModule;
  schoolYear: string;
  semester: string;
  studentId: string;
  studentName: string;
  section?: string;
  program?: string;
  entries: E[];
};

/**
 * Create or update one student's document for one term. The server keys the
 * upsert on (module, faculty owner, school ID, term), so pressing save twice
 * edits the same record instead of stacking duplicates.
 */
export async function postAcademicRecord<E>(input: PostRecordInput<E>): Promise<string> {
  const response = await api.post<{ data?: { id?: string } }>(`/portal/records/${input.module}`, {
    schoolYear: input.schoolYear,
    semester: input.semester,
    studentId: input.studentId,
    studentName: input.studentName,
    section: input.section ?? '',
    program: input.program ?? '',
    entries: input.entries,
  });
  return response.data?.data?.id ?? '';
}

/** Retract a posted record. Only its author, or the registrar, may do this. */
export async function retractAcademicRecord(module: AcademicRecordModule, itemId: string): Promise<void> {
  await api.delete(`/portal/records/${module}/${itemId}`);
}

export type PublishOutcome = {
  /** students whose record reached the server */
  posted: number;
  /** skipped, with the reason — nothing is invented for them */
  skipped: string[];
  /** the server refused or the call failed, with the reason */
  failed: string[];
};

/**
 * Posts one document per student for a whole class list. Students without a
 * usable school ID are skipped and named: the portal joins on that ID, so a
 * record posted without one could never be shown to the right person.
 */
export async function publishStudentRecords<E>(input: {
  module: AcademicRecordModule;
  schoolYear: string;
  semester: string;
  section?: string;
  program?: string;
  students: { studentId: string; studentName: string; entries: E[] }[];
}): Promise<PublishOutcome> {
  const outcome: PublishOutcome = { posted: 0, skipped: [], failed: [] };
  for (const student of input.students) {
    const key = studentIdOf(student.studentId);
    if (!key) {
      outcome.skipped.push(student.studentName || 'A student with no school ID');
      continue;
    }
    try {
      await postAcademicRecord<E>({
        module: input.module,
        schoolYear: input.schoolYear,
        semester: input.semester,
        studentId: key,
        studentName: student.studentName,
        section: input.section,
        program: input.program,
        entries: student.entries,
      });
      outcome.posted += 1;
    } catch (err) {
      outcome.failed.push(`${student.studentName || key}: ${describeApiError(err, 'Posting the record')}`);
    }
  }
  return outcome;
}

/* ------------------------------- grouping -------------------------------- */

/** Rows rolled up per student key, used when one save covers a whole class. */
export const groupByStudent = <T>(rows: T[], keyOf: (row: T) => string): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
};
