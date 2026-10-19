import { useEffect, useState } from 'react';
import api, { describeApiError } from './api';

/**
 * Published class timetables — the contract shared by the three systems.
 *
 * One row in `portal_items` holds one section's whole official timetable:
 *
 *   portal : 'student'
 *   module : 'schedule'
 *   title  : 'Timetable · BSCS 3-A'
 *   detail : JSON, the `PublishedTimetable` below
 *   status : 'Published'
 *   owner  : the account that published it (registrar/admin, or faculty)
 *
 * Why one row per section instead of one row per class meeting:
 *  - `GET /portal/items` caps its answer at 200 rows, and a school has far more
 *    class meetings than sections, so per-meeting rows would silently truncate.
 *  - A timetable is edited as a document ("this section's term"), and the
 *    registrar office thinks in exactly those terms.
 *
 * The student template reads these rows directly; nothing is invented client
 * side. An empty result means "not published yet", never sample data.
 *
 * Teacher edits are read-modify-write of the same document: fetch the section,
 * replace the entries that belong to the signed-in instructor, publish back.
 */

export const SCHEDULE_PORTAL = 'student';
export const SCHEDULE_MODULE = 'schedule';

/** One weekly class meeting. */
export type ScheduleEntry = {
  /** stable id inside the document, used as the React key */
  id: string;
  /** subject code, e.g. "CS 301" — empty when the registrar did not give one */
  code: string;
  /** descriptive title, e.g. "Systems Programming" */
  title: string;
  /** credit units, or null when unknown (never guessed) */
  units: number | null;
  /** delivery mode chip, e.g. "Lecture", "Laboratory", "Seminar" */
  kind: string;
  /** 'Monday' … 'Saturday' */
  day: string;
  /** 24h "HH:MM" */
  start: string;
  /** 24h "HH:MM" */
  end: string;
  room: string;
  instructor: string;
};

/** The published document for one section in one term. */
export type PublishedTimetable = {
  v: 1;
  schoolYear: string;
  semester: string;
  /** section code as the registrar writes it, e.g. "BSCS 3-A" */
  section: string;
  /** optional program label, e.g. "BS Computer Science" */
  program: string;
  /** optional registrar note shown to students */
  note: string;
  entries: ScheduleEntry[];
  publishedBy: string;
  publishedByName: string;
  publishedAt: string;
  /** set when a faculty member last changed something after publication */
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: string;
};

/** A timetable plus the row it lives in. */
export type TimetableRecord = PublishedTimetable & { itemId: string; rowCreatedAt: string | null };

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** Delivery modes offered to staff. Kept small and explicit — no free text. */
export const DELIVERY_MODES = [
  'Lecture',
  'Laboratory',
  'Lecture & Laboratory',
  'Seminar',
  'Practicum',
  'Online',
] as const;

/**
 * Case/space/dash-insensitive comparison text. Folding the dash family matters:
 * the portal writes the school year as "2026–2027" (en dash) while a form may
 * hand us "2026-2027", and both must resolve to the same term.
 */
const normText = (value: string): string =>
  (value ?? '').trim().toLowerCase().replace(/[\u2010-\u2015\u2212-]+/g, '-').replace(/\s+/g, ' ');

/** Section codes are compared case- and spacing-insensitively: "bscs 3-a" = "BSCS 3-A". */
export const normalizeSection = (value: string): string =>
  (value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');

/** Identity of a published document: one per (school year, semester, section). */
export const timetableKey = (schoolYear: string, semester: string, section: string): string =>
  [normText(schoolYear), normText(semester), normalizeSection(section)].join('|');

const isString = (value: unknown): value is string => typeof value === 'string';

const asEntry = (raw: unknown): ScheduleEntry | null => {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (!isString(row.day) || !isString(row.start) || !isString(row.end)) return null;
  if (!DAY_NAMES.includes(row.day as (typeof DAY_NAMES)[number])) return null;
  if (!/^\d{2}:\d{2}$/.test(row.start) || !/^\d{2}:\d{2}$/.test(row.end)) return null;
  const units = typeof row.units === 'number' && Number.isFinite(row.units) ? row.units : null;
  return {
    id: isString(row.id) ? row.id : `e${Math.random().toString(36).slice(2, 9)}`,
    code: isString(row.code) ? row.code : '',
    title: isString(row.title) ? row.title : '',
    units,
    kind: isString(row.kind) ? row.kind : '',
    day: row.day,
    start: row.start,
    end: row.end,
    room: isString(row.room) ? row.room : '',
    instructor: isString(row.instructor) ? row.instructor : '',
  };
};

export const encodeTimetable = (doc: PublishedTimetable): string => JSON.stringify(doc);

/**
 * Tolerant reader: a row written by an older build, or damaged JSON, returns
 * null instead of throwing — the student page then reports "not published".
 */
export const decodeTimetable = (detail: string | null): PublishedTimetable | null => {
  if (!detail) return null;
  try {
    const parsed = JSON.parse(detail) as Record<string, unknown>;
    if (parsed.v !== 1) return null;
    if (!isString(parsed.section) || !isString(parsed.schoolYear) || !isString(parsed.semester)) return null;
    const entries = Array.isArray(parsed.entries)
      ? parsed.entries.map(asEntry).filter((e): e is ScheduleEntry => e !== null)
      : [];
    return {
      v: 1,
      schoolYear: parsed.schoolYear,
      semester: parsed.semester,
      section: parsed.section,
      program: isString(parsed.program) ? parsed.program : '',
      note: isString(parsed.note) ? parsed.note : '',
      entries,
      publishedBy: isString(parsed.publishedBy) ? parsed.publishedBy : '',
      publishedByName: isString(parsed.publishedByName) ? parsed.publishedByName : '',
      publishedAt: isString(parsed.publishedAt) ? parsed.publishedAt : '',
      updatedBy: isString(parsed.updatedBy) ? parsed.updatedBy : undefined,
      updatedByName: isString(parsed.updatedByName) ? parsed.updatedByName : undefined,
      updatedAt: isString(parsed.updatedAt) ? parsed.updatedAt : undefined,
    };
  } catch {
    return null;
  }
};

type ItemRow = { id: string; detail: string | null; created_at?: string };

/**
 * Every published timetable. The endpoint is shared across the school and has no
 * per-role filter, so the caller narrows by term/section — and only ever renders
 * a section it was asked for.
 */
export async function fetchTimetables(): Promise<TimetableRecord[]> {
  const response = await api.get<{ data?: ItemRow[] }>('/portal/items', {
    params: { portal: SCHEDULE_PORTAL, module: SCHEDULE_MODULE },
  });
  const rows = response.data?.data ?? [];
  const out: TimetableRecord[] = [];
  for (const row of rows) {
    const doc = decodeTimetable(row.detail);
    if (doc) out.push({ ...doc, itemId: row.id, rowCreatedAt: row.created_at ?? null });
  }
  return out.sort((a, b) => normalizeSection(a.section).localeCompare(normalizeSection(b.section)));
}

export type PublishInput = {
  schoolYear: string;
  semester: string;
  section: string;
  program?: string;
  note?: string;
  entries: ScheduleEntry[];
  /** who is publishing, for provenance shown to students and in the audit log */
  publishedBy: string;
  publishedByName: string;
  /** keep the original publisher when a faculty member edits an existing document */
  existing?: TimetableRecord | null;
};

/**
 * Create or update the document for one section. Publishing is an upsert keyed
 * on (school year, semester, section), so pressing Publish twice updates the
 * same row instead of stacking duplicates.
 */
export async function publishTimetable(input: PublishInput): Promise<{ itemId: string; created: boolean }> {
  const now = new Date().toISOString();
  const existing = input.existing ?? null;
  const doc: PublishedTimetable = {
    v: 1,
    schoolYear: input.schoolYear,
    semester: input.semester,
    section: normalizeSection(input.section),
    program: input.program?.trim() ?? '',
    note: input.note?.trim() ?? '',
    entries: input.entries,
    publishedBy: existing?.publishedBy || input.publishedBy,
    publishedByName: existing?.publishedByName || input.publishedByName,
    publishedAt: existing?.publishedAt || now,
    ...(existing
      ? { updatedBy: input.publishedBy, updatedByName: input.publishedByName, updatedAt: now }
      : {}),
  };

  const title = `Timetable · ${doc.section}`;
  const detail = encodeTimetable(doc);

  if (existing) {
    await api.put(`/portal/items/${existing.itemId}`, { title, detail, status: 'Published' });
    return { itemId: existing.itemId, created: false };
  }
  const response = await api.post<{ data?: { id?: string } }>('/portal/items', {
    portal: SCHEDULE_PORTAL,
    module: SCHEDULE_MODULE,
    title,
    detail,
    status: 'Published',
    owner: input.publishedBy,
  });
  return { itemId: response.data?.data?.id ?? '', created: true };
}

/** Withdraw a published timetable from the student portal. */
export async function unpublishTimetable(itemId: string): Promise<void> {
  await api.delete(`/portal/items/${itemId}`);
}

/**
 * React binding for portal screens: the published timetables of the school.
 * `refresh()` re-reads after a publish/withdraw so the UI never shows a stale
 * picture of what students currently see.
 */
export const usePublishedTimetables = () => {
  const [rows, setRows] = useState<TimetableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchTimetables()
      .then((data) => {
        if (!active) return;
        setRows(data);
        setError('');
      })
      .catch((err: unknown) => {
        if (active) setError(describeApiError(err, 'Loading the class schedules'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [nonce]);

  return { rows, loading, error, refresh: () => setNonce((value) => value + 1) };
};

/* ------------------------------ Admin helpers ----------------------------- */

/** A study load as the admin Study Load Builder stores it locally. */
export type StudyLoadRow = {
  id: string;
  name: string;
  subject?: string;
  code?: string;
  teacher?: string;
  room?: string;
  days?: string[];
  start?: string;
  end?: string;
  section?: string;
  units?: string;
  kind?: string;
};

/**
 * Split "CS 301 — Systems Programming" into a code and a title. Registrars type
 * both habits, so accept the code when it is written and never invent one.
 */
export const splitSubject = (subject: string, explicitCode = ''): { code: string; title: string } => {
  const code = explicitCode.trim();
  const text = (subject ?? '').trim();
  if (code) return { code, title: text };
  const match = /^([A-Za-z]{2,6}[\s-]?\d{2,4}[A-Za-z]?)\s*[—–:-]\s*(.+)$/.exec(text);
  if (match) return { code: match[1].trim().toUpperCase(), title: match[2].trim() };
  return { code: '', title: text };
};

/**
 * The Study Load Builder toggles days as short codes ("M", "T", "TH") because
 * that is how a registrar writes a class pattern, but a published timetable has
 * to name the day. Every code — and the legacy free-text patterns kept in old
 * rows, such as "MWF 09:00–10:30" — resolves here, so nothing a registrar typed
 * is silently dropped on the student's page.
 */
const DAY_CODE: Record<string, string> = {
  M: 'Monday', MO: 'Monday', MON: 'Monday', MONDAY: 'Monday',
  T: 'Tuesday', TU: 'Tuesday', TUE: 'Tuesday', TUES: 'Tuesday', TUESDAY: 'Tuesday',
  W: 'Wednesday', WE: 'Wednesday', WED: 'Wednesday', WEDNESDAY: 'Wednesday',
  TH: 'Thursday', THU: 'Thursday', THUR: 'Thursday', THURS: 'Thursday', THURSDAY: 'Thursday',
  F: 'Friday', FR: 'Friday', FRI: 'Friday', FRIDAY: 'Friday',
  S: 'Saturday', SA: 'Saturday', SAT: 'Saturday', SATURDAY: 'Saturday',
};

/** "MWF" → M,W,F and "TTH" → T,TH (longest token first). */
const splitDayPattern = (pattern: string): string[] => {
  const upper = pattern.toUpperCase();
  const tokens: string[] = [];
  let index = 0;
  while (index < upper.length) {
    const pair = upper.slice(index, index + 2);
    if (DAY_CODE[pair] && pair.length === 2) {
      tokens.push(pair);
      index += 2;
      continue;
    }
    tokens.push(upper[index]);
    index += 1;
  }
  return tokens;
};

/** The days of one study load, as full day names, in week order. */
export const daysOfStudyLoad = (row: StudyLoadRow): string[] => {
  const found: string[] = [];
  const push = (raw: string) => {
    const day = DAY_CODE[raw.trim().toUpperCase()];
    if (day && !found.includes(day)) found.push(day);
  };
  for (const code of row.days ?? []) push(String(code));
  if (!found.length) {
    // Rows written before the structured day picker kept "MWF 09:00–10:30".
    const pattern = String((row as { role?: string }).role ?? row.name ?? '').match(/\b([MTWTHFS]{1,7})\s+\d/)?.[1];
    if (pattern) splitDayPattern(pattern).forEach(push);
  }
  return found.sort((a, b) => DAY_NAMES.indexOf(a as (typeof DAY_NAMES)[number]) - DAY_NAMES.indexOf(b as (typeof DAY_NAMES)[number]));
};

/** Expand one study load into one meeting per selected day. */
export const entriesFromStudyLoad = (row: StudyLoadRow, index: number): ScheduleEntry[] => {
  const { code, title } = splitSubject(row.subject ?? row.name, row.code ?? '');
  const units = row.units?.trim() ? Number(row.units) : null;
  const kind = (row.kind ?? '').trim();
  const days = daysOfStudyLoad(row);
  return days.map((day, slot) => ({
    id: `${row.id}-${slot}-${index}`,
    code,
    title: title || row.name,
    units: units !== null && Number.isFinite(units) ? units : null,
    kind,
    day,
    start: row.start ?? '',
    end: row.end ?? '',
    room: (row.room ?? '').trim(),
    instructor: (row.teacher ?? '').trim(),
  }));
};

/**
 * Real overlap audit over the entries of one section: two meetings clash when
 * they share a day, overlap in time, and collide on the room or the instructor.
 * Returned to the student page as a count — it is computed, never asserted.
 */
export const findConflicts = (entries: ScheduleEntry[]): string[] => {
  const problems: string[] = [];
  const rows = entries.filter((e) => e.start && e.end && DAY_NAMES.includes(e.day as (typeof DAY_NAMES)[number]));
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i];
      const b = rows[j];
      if (a.day !== b.day) continue;
      if (!(a.start < b.end && b.start < a.end)) continue;
      const label = (row: ScheduleEntry) => row.code || row.title || 'class';
      if (normText(a.room) && normText(a.room) === normText(b.room)) {
        problems.push(`${label(a)} and ${label(b)} share ${a.room} on ${a.day} at ${a.start}.`);
      }
      if (normText(a.instructor) && normText(a.instructor) === normText(b.instructor)) {
        problems.push(`${label(a)} and ${label(b)} both have ${a.instructor} on ${a.day} at ${a.start}.`);
      }
    }
  }
  return problems;
};

/** A room that is booked twice, or one instructor in two rooms, on the same hour. */
export type ConflictFinding = {
  kind: 'room' | 'faculty';
  day: string;
  start: string;
  end: string;
  /** the room number or the instructor the two meetings collide on */
  shared: string;
  /** "BSCS 3-A · CS 302" — where each side of the collision sits */
  left: string;
  right: string;
};

/**
 * The institutional audit: every published meeting compared against every other,
 * across sections. `findConflicts` answers "is this one section's own week
 * coherent"; this answers "can the school actually run these at once" — the same
 * room, or the same instructor, in two places at the same time. Computed from the
 * published documents, never asserted.
 */
export const findInstitutionalConflicts = (
  sections: { section: string; entries: ScheduleEntry[] }[],
): ConflictFinding[] => {
  const meetings = sections.flatMap((timetable) => timetable.entries.map((entry) => ({ section: timetable.section, entry })));
  const findings: ConflictFinding[] = [];
  const label = (meeting: (typeof meetings)[number]) =>
    `${meeting.section} · ${meeting.entry.code || meeting.entry.title || 'class'}`;
  for (let i = 0; i < meetings.length; i += 1) {
    for (let j = i + 1; j < meetings.length; j += 1) {
      const a = meetings[i];
      const b = meetings[j];
      if (a.entry.day !== b.entry.day) continue;
      if (!(a.entry.start < b.entry.end && b.entry.start < a.entry.end)) continue;
      const window = { day: a.entry.day, start: a.entry.start, end: a.entry.end };
      if (normText(a.entry.room) && normText(a.entry.room) === normText(b.entry.room)) {
        findings.push({ kind: 'room', ...window, shared: a.entry.room, left: label(a), right: label(b) });
      }
      if (normText(a.entry.instructor) && normText(a.entry.instructor) === normText(b.entry.instructor)) {
        findings.push({ kind: 'faculty', ...window, shared: a.entry.instructor, left: label(a), right: label(b) });
      }
    }
  }
  return findings;
};
