/**
 * Published class schedules — the student half of the contract.
 *
 * The registrar (or the faculty member teaching the class) writes one row in the
 * shared `portal_items` table per section and term:
 *
 *   portal : 'student'
 *   module : 'schedule'
 *   title  : 'Timetable · BSCS 3-A'
 *   detail : JSON, the PublishedTimetable below
 *
 * This module decodes those rows and derives everything the page shows —
 * subjects, weekly hours, conflicts, buildings. Nothing is invented: if the
 * registrar has not published a timetable for the student's section, the page
 * says so instead of drawing sample classes.
 */
import { DAYS, type Day, type ScheduleSlot } from '../types';
import { cecScheduleItems, type ApiResult } from './api';
import { formatTime, toMinutes } from './metrics';

/** One weekly class meeting, exactly as staff entered it. */
export type ScheduleEntry = {
  id: string;
  /** subject code, e.g. "CS 301" — may be empty when the registrar gave none */
  code: string;
  title: string;
  /** credit units, or null when the registrar has not fixed them */
  units: number | null;
  /** delivery mode, e.g. "Lecture", "Laboratory", "Lecture & Laboratory" */
  kind: string;
  day: Day;
  /** 24h "HH:MM" */
  start: string;
  end: string;
  room: string;
  instructor: string;
};

/** The published document for one section in one term. */
export type PublishedTimetable = {
  schoolYear: string;
  semester: string;
  section: string;
  program: string;
  note: string;
  entries: ScheduleEntry[];
  publishedBy: string;
  publishedByName: string;
  publishedAt: string;
  updatedAt?: string;
  updatedByName?: string;
};

/** A timetable plus the shared row it came from. */
export type TimetableItem = PublishedTimetable & { itemId: string };

/* ------------------------------- primitives ------------------------------ */

/**
 * Comparison text that ignores case, spacing and the dash family. The portal
 * writes the school year as "2026–2027" (en dash) while other editors may write
 * "2026-2027"; both must resolve to the same term.
 */
export const fold = (value: string): string =>
  (value ?? '').trim().toLowerCase().replace(/[\u2010-\u2015\u2212-]+/g, '-').replace(/\s+/g, ' ');

export const normalizeSection = (value: string): string => (value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');

const isDay = (value: unknown): value is Day => typeof value === 'string' && (DAYS as readonly string[]).includes(value);
const isText = (value: unknown): value is string => typeof value === 'string';
const isTime = (value: unknown): value is string => isText(value) && /^\d{2}:\d{2}$/.test(value);

const asEntry = (raw: unknown): ScheduleEntry | null => {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (!isDay(row.day) || !isTime(row.start) || !isTime(row.end)) return null;
  const units = typeof row.units === 'number' && Number.isFinite(row.units) ? row.units : null;
  return {
    id: isText(row.id) ? row.id : `${row.day}-${row.start}-${row.code ?? ''}`,
    code: isText(row.code) ? row.code.trim() : '',
    title: isText(row.title) ? row.title.trim() : '',
    units,
    kind: isText(row.kind) ? row.kind.trim() : '',
    day: row.day,
    start: row.start,
    end: row.end,
    room: isText(row.room) ? row.room.trim() : '',
    instructor: isText(row.instructor) ? row.instructor.trim() : '',
  };
};

/** Tolerant reader: damaged or older JSON returns null instead of throwing. */
export const decodeTimetable = (detail: string | null): PublishedTimetable | null => {
  if (!detail) return null;
  try {
    const parsed = JSON.parse(detail) as Record<string, unknown>;
    if (parsed.v !== 1) return null;
    if (!isText(parsed.schoolYear) || !isText(parsed.semester) || !isText(parsed.section)) return null;
    const entries = Array.isArray(parsed.entries)
      ? parsed.entries.map(asEntry).filter((entry): entry is ScheduleEntry => entry !== null)
      : [];
    return {
      schoolYear: parsed.schoolYear,
      semester: parsed.semester,
      section: parsed.section,
      program: isText(parsed.program) ? parsed.program : '',
      note: isText(parsed.note) ? parsed.note : '',
      entries,
      publishedBy: isText(parsed.publishedBy) ? parsed.publishedBy : '',
      publishedByName: isText(parsed.publishedByName) ? parsed.publishedByName : '',
      publishedAt: isText(parsed.publishedAt) ? parsed.publishedAt : '',
      updatedAt: isText(parsed.updatedAt) ? parsed.updatedAt : undefined,
      updatedByName: isText(parsed.updatedByName) ? parsed.updatedByName : undefined,
    };
  } catch {
    return null;
  }
};

/** Every published timetable the school has, newest publication first. */
export const fetchTimetables = async (): Promise<ApiResult<TimetableItem[]>> => {
  const result = await cecScheduleItems();
  if (!result.ok) return result;
  const rows: TimetableItem[] = [];
  for (const row of result.data) {
    const doc = decodeTimetable(row.detail);
    if (doc && doc.entries.length) rows.push({ ...doc, itemId: row.id });
  }
  return { ok: true, data: rows };
};

/* --------------------------------- terms --------------------------------- */

export const sameTerm = (
  item: { schoolYear: string; semester: string },
  period: { schoolYear: string; semester: string } | null,
): boolean =>
  !!period && fold(item.schoolYear) === fold(period.schoolYear) && fold(item.semester) === fold(period.semester);

/** The term as the registrar's office writes it: "2nd Semester AY 2025–2026". */
export const termLabel = (item: { schoolYear: string; semester: string }): string =>
  `${item.semester} AY ${item.schoolYear}`;

/** Distinct terms that actually have published timetables. */
export const termOptions = (items: TimetableItem[]): { schoolYear: string; semester: string; label: string }[] => {
  const seen = new Map<string, { schoolYear: string; semester: string; label: string }>();
  for (const item of items) {
    const key = `${fold(item.schoolYear)}|${fold(item.semester)}`;
    if (!seen.has(key)) {
      seen.set(key, { schoolYear: item.schoolYear, semester: item.semester, label: termLabel(item) });
    }
  }
  return [...seen.values()];
};

/** Published sections, so a student can find theirs even before it is set up. */
export const sectionOptions = (
  items: TimetableItem[],
  term: { schoolYear: string; semester: string } | null,
): { section: string; program: string; entries: number }[] => {
  const seen = new Map<string, { section: string; program: string; entries: number }>();
  for (const item of items) {
    if (term && !sameTerm(item, term)) continue;
    const key = normalizeSection(item.section);
    const current = seen.get(key);
    if (current) current.entries += item.entries.length;
    else seen.set(key, { section: item.section, program: item.program, entries: item.entries.length });
  }
  return [...seen.values()].sort((a, b) => a.section.localeCompare(b.section));
};

/**
 * The document to render: the student's own section in the live term when it
 * exists, otherwise the most recently published document for that section (so a
 * timetable published for last term is still readable rather than invisible).
 */
export const pickTimetable = (
  items: TimetableItem[],
  period: { schoolYear: string; semester: string } | null,
  section: string,
): TimetableItem | null => {
  const target = normalizeSection(section);
  if (!target) return null;
  const mine = items.filter((item) => normalizeSection(item.section) === target);
  if (!mine.length) return null;
  const exact = period ? mine.find((item) => sameTerm(item, period)) : undefined;
  if (exact) return exact;
  return [...mine].sort((a, b) => (b.updatedAt ?? b.publishedAt).localeCompare(a.updatedAt ?? a.publishedAt))[0];
};

/* ------------------------------- derivations ----------------------------- */

export const hoursOf = (entry: ScheduleEntry): number => (toMinutes(entry.end) - toMinutes(entry.start)) / 60;

const isLab = (kind: string): boolean => /lab|practic|studio/i.test(kind);

/** Weekly contact time, split the way the design splits it. */
export const weekHours = (entries: ScheduleEntry[]): { total: number; lecture: number; lab: number } => {
  let lecture = 0;
  let lab = 0;
  for (const entry of entries) {
    if (isLab(entry.kind)) lab += hoursOf(entry);
    else lecture += hoursOf(entry);
  }
  const round = (value: number) => Math.round(value * 10) / 10;
  return { total: round(lecture + lab), lecture: round(lecture), lab: round(lab) };
};

export const totalUnitsOf = (entries: ScheduleEntry[]): { units: number; known: number; missing: number } => {
  const subjects = subjectsOf(entries);
  const units = subjects.reduce((sum, subject) => sum + (subject.units ?? 0), 0);
  return {
    units: Math.round(units * 10) / 10,
    known: subjects.filter((subject) => subject.units !== null).length,
    missing: subjects.filter((subject) => subject.units === null).length,
  };
};

export type SubjectRow = {
  key: string;
  code: string;
  title: string;
  units: number | null;
  kinds: string[];
  rooms: string[];
  instructors: string[];
  /** "Mon / Wed • 09:00 AM – 10:20 AM" for every distinct meeting pattern */
  scheduleText: string;
  meetings: ScheduleEntry[];
};

const shortDay = (day: Day): string => day.slice(0, 3);

const groupMeetings = (meetings: ScheduleEntry[]): string => {
  const groups = new Map<string, Day[]>();
  for (const meeting of meetings) {
    const key = `${meeting.start}-${meeting.end}`;
    const days = groups.get(key) ?? [];
    days.push(meeting.day);
    groups.set(key, days);
  }
  return [...groups.entries()]
    .map(([key, days]) => {
      const [start, end] = key.split('-');
      return `${days.map(shortDay).join(' / ')} • ${formatTime(start)} – ${formatTime(end)}`;
    })
    .join('  |  ');
};

/** One row per subject, the way the registrar's course list reads. */
export const subjectsOf = (entries: ScheduleEntry[]): SubjectRow[] => {
  const groups = new Map<string, ScheduleEntry[]>();
  for (const entry of entries) {
    const key = (entry.code || entry.title).trim().toUpperCase() || entry.id;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return [...groups.entries()]
    .map(([key, meetings]) => {
      const sorted = [...meetings].sort(
        (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.start.localeCompare(b.start),
      );
      return {
        key,
        code: sorted[0].code,
        title: sorted[0].title,
        units: sorted[0].units,
        kinds: [...new Set(sorted.map((m) => m.kind).filter(Boolean))],
        rooms: [...new Set(sorted.map((m) => m.room).filter(Boolean))],
        instructors: [...new Set(sorted.map((m) => m.instructor).filter(Boolean))],
        scheduleText: groupMeetings(sorted),
        meetings: sorted,
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
};

export const meetingsFor = (entries: ScheduleEntry[], day: Day): ScheduleEntry[] =>
  entries.filter((entry) => entry.day === day).sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));

/**
 * Real overlap audit for one section: two meetings clash when they share a day,
 * overlap in time, and collide on the room or the instructor. Counted from the
 * published rows, never asserted.
 */
export const findConflicts = (entries: ScheduleEntry[]): string[] => {
  const problems: string[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const a = entries[i];
      const b = entries[j];
      if (a.day !== b.day) continue;
      if (!(a.start < b.end && b.start < a.end)) continue;
      const label = (row: ScheduleEntry) => row.code || row.title || 'A class';
      if (fold(a.room) && fold(a.room) === fold(b.room)) {
        problems.push(`${label(a)} and ${label(b)} share ${a.room} on ${a.day} at ${formatTime(a.start)}.`);
      }
      if (fold(a.instructor) && fold(a.instructor) === fold(b.instructor)) {
        problems.push(`${label(a)} and ${label(b)} are both assigned to ${a.instructor} on ${a.day} at ${formatTime(a.start)}.`);
      }
    }
  }
  return problems;
};

/** Rooms rolled up to their building, for the campus panel. */
export const buildingsOf = (entries: ScheduleEntry[]): { building: string; rooms: string[]; meetings: number }[] => {
  const groups = new Map<string, Set<string>>();
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.room) continue;
    // "Tech Hall 301" -> "Tech Hall"; "Innovation Lab B" -> "Innovation Lab"
    const building = entry.room.replace(/\s*[\dA-Z]?[-–]?\d+\s*$/, '').replace(/\s+[A-Z]$/, '').trim() || entry.room;
    groups.set(building, (groups.get(building) ?? new Set<string>()).add(entry.room));
    counts.set(building, (counts.get(building) ?? 0) + 1);
  }
  return [...groups.entries()]
    .map(([building, rooms]) => ({ building, rooms: [...rooms].sort(), meetings: counts.get(building) ?? 0 }))
    .sort((a, b) => b.meetings - a.meetings || a.building.localeCompare(b.building));
};

/** Grid palette buckets: computing/engineering core, maths & sciences, general education. */
export type Category = 'core' | 'math' | 'general';

export const categoryOf = (code: string): Category => {
  const head = (code.match(/^[A-Za-z]+/)?.[0] ?? '').toUpperCase();
  if (['MATH', 'STAT', 'SCI', 'PHY', 'CHEM', 'BIO', 'CALC', 'ALGE'].some((token) => head.startsWith(token))) return 'math';
  if (['ENG', 'FIL', 'HUM', 'HIST', 'PSY', 'SOC', 'RIZAL', 'PE', 'NSTP', 'GE', 'LIT', 'PHILO'].some((token) => head.startsWith(token))) return 'general';
  return 'core';
};

export const CATEGORY_LABEL: Record<Category, string> = {
  core: 'Computing & Professional Core',
  math: 'Mathematics & Sciences',
  general: 'General Education',
};

export const CATEGORY_STYLE: Record<Category, { block: string; chip: string; dot: string }> = {
  core: { block: 'border-[#c7d2fe] bg-[#eaedff] text-[#00236f]', chip: 'bg-white/70 text-[#00236f]', dot: 'bg-[#00236f]' },
  math: { block: 'border-[#bfdbfe] bg-[#e8f2ff] text-[#0b4a8f]', chip: 'bg-white/70 text-[#0b4a8f]', dot: 'bg-[#0058be]' },
  general: { block: 'border-[#ccece6] bg-[#e8f7f4] text-[#0f5f56]', chip: 'bg-white/70 text-[#0f5f56]', dot: 'bg-[#0f766e]' },
};

/* ------------------------------ dashboard glue --------------------------- */

/** The published meetings in the dashboard's slot shape, so metrics still apply. */
export const toSlots = (entries: ScheduleEntry[], section: string): ScheduleSlot[] =>
  entries.map((entry) => ({
    id: `${entry.id}`,
    code: entry.code || entry.title,
    title: entry.title,
    section,
    instructor: entry.instructor,
    room: entry.room,
    day: entry.day,
    start: entry.start,
    end: entry.end,
  }));

/* ------------------------------ calendar week ---------------------------- */

export type WeekDay = { day: Day; date: Date; label: string; isToday: boolean };

/** Monday→Saturday of the week containing `from`, with "Feb 23" style labels. */
export const weekDates = (from = new Date()): WeekDay[] => {
  const monday = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const shift = (monday.getDay() + 6) % 7; // Sunday(0) -> 6, Monday(1) -> 0
  monday.setDate(monday.getDate() - shift);
  const today = new Date();
  return DAYS.map((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      day,
      date,
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isToday: date.toDateString() === today.toDateString(),
    };
  });
};

/* -------------------------------- calendar ------------------------------- */

const nextDateFor = (day: Day, from = new Date()): Date => {
  const target = DAYS.indexOf(day) + 1; // Monday = 1 … Saturday = 6
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  date.setDate(date.getDate() + ((target - date.getDay() + 7) % 7));
  return date;
};

const stamp = (date: Date, time: string): string => {
  const [hours, minutes] = time.split(':');
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}T${hours}${minutes}00`;
};

const escapeIcs = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Fold long lines at 75 octets, as RFC 5545 requires. */
const foldLine = (line: string): string => {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = rest.slice(75);
  }
  parts.push(rest);
  return parts.join('\r\n ');
};

/**
 * A weekly recurring calendar for the published meetings. Times stay in local
 * (floating) time so the file behaves for a class held in the school's own
 * timezone, and no term end date is invented: the class simply repeats weekly.
 */
export const buildIcs = (item: PublishedTimetable): string => {
  const now = new Date();
  const stampNow = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}Z`;
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cebu Eastern College//Student Portal//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeIcs(`Class Schedule — ${item.section} (${termLabel(item)})`)}`,
  ];
  for (const entry of item.entries) {
    const day = nextDateFor(entry.day);
    const summary = [entry.code, entry.title].filter(Boolean).join(' ');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${entry.id}-${item.section.replace(/\s+/g, '')}@cec.edu.ph`,
      `DTSTAMP:${stampNow}`,
      `DTSTART:${stamp(day, entry.start)}`,
      `DTEND:${stamp(day, entry.end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${entry.day.slice(0, 2).toUpperCase()}`,
      `SUMMARY:${escapeIcs(summary || 'Class')}`,
      `LOCATION:${escapeIcs(entry.room)}`,
      `DESCRIPTION:${escapeIcs(
        [entry.kind, item.section, entry.instructor, `Published by ${item.publishedByName || 'the registrar'}`]
          .filter(Boolean)
          .join(' • '),
      )}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n');
};

/** Hand the .ics to the browser. Returns false when the browser refuses. */
export const downloadIcs = (item: PublishedTimetable): boolean => {
  try {
    const blob = new Blob([buildIcs(item)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `CEC-class-schedule-${item.section.replace(/[^A-Za-z0-9]+/g, '-')}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
};
