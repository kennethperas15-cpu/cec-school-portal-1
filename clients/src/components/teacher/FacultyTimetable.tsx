import { useEffect, useMemo, useState } from 'react';
import { describeApiError } from '../../services/api';
import {
  DAY_NAMES,
  DELIVERY_MODES,
  fetchTimetables,
  findConflicts,
  normalizeSection,
  publishTimetable,
  timetableKey,
  unpublishTimetable,
  type ScheduleEntry,
  type TimetableRecord,
} from '../../services/schedule';

/**
 * Faculty side of the class-schedule contract.
 *
 * The registrar publishes a section's official timetable; a faculty member sees
 * here every meeting the registrar assigned to them, and can add or correct the
 * meetings of the subjects they teach. Both write the same published document,
 * so whatever is saved here is exactly what the student portal renders — no
 * second copy, no demo rows.
 *
 * Scope rule: a teacher only ever rewrites the meetings whose instructor is
 * their own name. Everything else in the document is carried through untouched.
 */

type Props = {
  instructorName: string;
  instructorEmail: string;
  schoolYear: string;
  semester: string;
  onNotify: (message: string) => void;
};

const NAVY = '#0B3D91';
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e8eef7', borderRadius: 20, boxShadow: '0 12px 34px rgba(15,31,56,.05)', padding: 28, maxWidth: 1120, margin: '0 auto' };
const box: React.CSSProperties = { border: '1px solid #eef2f8', borderRadius: 14, padding: 18, marginTop: 14, background: '#fbfcfe' };
const btn: React.CSSProperties = { background: `linear-gradient(135deg, ${NAVY}, #123f7d)`, color: '#fff', border: 0, borderRadius: 12, padding: '11px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 10px 22px rgba(11,61,145,.22)' };
const ghost: React.CSSProperties = { border: '1px solid #e2e7ef', background: '#fff', borderRadius: 10, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#33415c' };
const inp: React.CSSProperties = { border: '1.5px solid #e4ebf5', borderRadius: 12, padding: '11px 13px', fontSize: 13, width: '100%', background: '#f7f9fc', color: '#0f1f38' };
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#6b7890' };
const td: React.CSSProperties = { padding: '12px', fontSize: 13, color: '#0f1f38', verticalAlign: 'top' };

const fold = (value: string): string => (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** "09:00" -> "9:00 AM" for staff-facing text (the stored value stays 24h). */
const to12h = (value: string): string => {
  const [hh, mm] = (value ?? '').split(':').map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return value;
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${suffix}`;
};

export const FacultyTimetable = ({ instructorName, instructorEmail, schoolYear, semester, onNotify }: Props) => {
  const [timetables, setTimetables] = useState<TimetableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [section, setSection] = useState('');
  const [day, setDay] = useState<string>(DAY_NAMES[0]);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [room, setRoom] = useState('');
  const [units, setUnits] = useState('');
  const [kind, setKind] = useState<string>(DELIVERY_MODES[0]);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await fetchTimetables();
      setTimetables(rows);
      setError('');
    } catch (err) {
      setError(describeApiError(err, 'Loading the class schedules'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mine = fold(instructorName);

  /** Every meeting in the current term whose instructor is me. */
  const myLoad = useMemo(() => {
    const rows: { entry: ScheduleEntry; record: TimetableRecord }[] = [];
    for (const record of timetables) {
      if (fold(record.schoolYear) !== fold(schoolYear) || fold(record.semester) !== fold(semester)) continue;
      for (const entry of record.entries) {
        if (fold(entry.instructor) === mine) rows.push({ entry, record });
      }
    }
    return rows.sort((a, b) => (a.entry.day === b.entry.day ? a.entry.start.localeCompare(b.entry.start) : a.entry.day.localeCompare(b.entry.day)));
  }, [timetables, mine, schoolYear, semester]);

  const conflicts = useMemo(() => findConflicts(myLoad.map((row) => row.entry)), [myLoad]);

  const sections = useMemo(
    () => [...new Set(timetables.filter((r) => fold(r.schoolYear) === fold(schoolYear) && fold(r.semester) === fold(semester)).map((r) => r.section))].sort(),
    [timetables, schoolYear, semester],
  );

  const resetForm = () => {
    setCode(''); setTitle(''); setSection(''); setRoom(''); setUnits(''); setKind(DELIVERY_MODES[0]);
    setDay(DAY_NAMES[0]); setStart('09:00'); setEnd('10:00');
  };

  const save = async () => {
    const sectionCode = normalizeSection(section);
    const subjectCode = code.trim();
    const subjectTitle = title.trim();
    if (!sectionCode) { onNotify('Type the section code this class belongs to'); return; }
    if (!subjectCode && !subjectTitle) { onNotify('Give the class a subject code or a title'); return; }
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || start >= end) {
      onNotify('Set a start time earlier than the end time'); return;
    }
    const unitsValue = units.trim() ? Number(units) : null;

    setBusy(true);
    try {
      const existing = timetables.find(
        (item) => timetableKey(item.schoolYear, item.semester, item.section) === timetableKey(schoolYear, semester, sectionCode),
      ) ?? null;

      const entry: ScheduleEntry = {
        id: `${fold(subjectCode) || fold(subjectTitle)}-${day}-${Date.now().toString(36)}`,
        code: subjectCode,
        title: subjectTitle,
        units: unitsValue !== null && Number.isFinite(unitsValue) ? unitsValue : null,
        kind,
        day,
        start,
        end,
        room: room.trim(),
        instructor: instructorName,
      };

      // Replace my own meeting for the same subject on the same day; keep the rest.
      const replacing = (existing?.entries ?? []).some(
        (row) => fold(row.instructor) === mine && fold(row.day) === fold(day) && fold(row.code) === fold(entry.code) && fold(row.title) === fold(entry.title),
      );
      const kept = (existing?.entries ?? []).filter(
        (row) => !(fold(row.instructor) === mine && fold(row.day) === fold(day) && fold(row.code) === fold(entry.code) && fold(row.title) === fold(entry.title)),
      );
      const nextEntries = [...kept, entry];

      await publishTimetable({
        schoolYear,
        semester,
        section: sectionCode,
        program: existing?.program ?? '',
        note: existing?.note ?? '',
        entries: nextEntries,
        publishedBy: instructorEmail || instructorName,
        publishedByName: instructorName,
        existing,
      });
      await load();
      onNotify(
        replacing
          ? `${subjectCode || subjectTitle} on ${day} updated. Students see the change immediately.`
          : `${subjectCode || subjectTitle} on ${day} added to ${sectionCode}. Students see it in Class Schedule.`,
      );
      resetForm();
    } catch (err) {
      onNotify(describeApiError(err, 'Saving the class'));
    } finally {
      setBusy(false);
    }
  };

  const removeMeeting = async (record: TimetableRecord, entry: ScheduleEntry) => {
    setBusy(true);
    try {
      const nextEntries = record.entries.filter((row) => row.id !== entry.id);
      if (!nextEntries.length) {
        await unpublishTimetable(record.itemId);
        onNotify(`${record.section} had no classes left, so its timetable was withdrawn`);
      } else {
        await publishTimetable({
          schoolYear: record.schoolYear,
          semester: record.semester,
          section: record.section,
          program: record.program,
          note: record.note,
          entries: nextEntries,
          publishedBy: instructorEmail || instructorName,
          publishedByName: instructorName,
          existing: record,
        });
        onNotify(`${entry.code || entry.title} removed from ${record.section}`);
      }
      await load();
    } catch (err) {
      onNotify(describeApiError(err, 'Removing the class'));
    } finally {
      setBusy(false);
    }
  };

  const editMeeting = (entry: ScheduleEntry) => {
    setCode(entry.code); setTitle(entry.title); setSection(section || sections[0] || '');
    setDay(entry.day); setStart(entry.start); setEnd(entry.end);
    setRoom(entry.room); setUnits(entry.units === null ? '' : String(entry.units));
    setKind(entry.kind || DELIVERY_MODES[0]);
  };

  return (
    <section style={card}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Class Schedule</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7890' }}>
            What the registrar published for you, and the meetings you keep up to date. Students see the same records.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ background: '#eef4ff', color: NAVY, borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 700 }}>
            {schoolYear} • {semester}
          </span>
          <button style={ghost} onClick={() => { void load(); }} disabled={loading || busy}>Refresh</button>
        </div>
      </div>

      {error && (
        <div style={{ ...box, borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b' }}>{error}</div>
      )}

      <div style={box}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#6b7890' }}>Meetings this week</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: NAVY }}>{myLoad.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#6b7890' }}>Sections I teach</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: NAVY }}>{new Set(myLoad.map((row) => row.record.section)).size}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#6b7890' }}>Conflicts</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: conflicts.length ? '#b91c1c' : '#15803d' }}>{conflicts.length}</div>
          </div>
        </div>
      </div>

      {conflicts.length > 0 && (
        <div style={{ ...box, borderColor: '#fde68a', background: '#fffbeb' }}>
          <strong style={{ fontSize: 13, color: '#92400e' }}>Overlaps found in your load</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: '#92400e' }}>
            {conflicts.map((problem) => <li key={problem}>{problem}</li>)}
          </ul>
        </div>
      )}

      <div style={{ ...box, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #eef2f8' }}>
              <th style={th}>Day</th><th style={th}>Time</th><th style={th}>Subject</th><th style={th}>Section</th>
              <th style={th}>Room</th><th style={th}>Mode</th><th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {myLoad.map(({ entry, record }) => (
              <tr key={`${record.itemId}-${entry.id}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={td}>{entry.day}</td>
                <td style={td}>{to12h(entry.start)} – {to12h(entry.end)}</td>
                <td style={td}>
                  <strong>{entry.code || entry.title}</strong>
                  {entry.code && entry.title ? <div style={{ fontSize: 12, color: '#6b7890' }}>{entry.title}</div> : null}
                  {entry.units !== null ? <div style={{ fontSize: 11, color: '#8a94a6' }}>{entry.units} units</div> : null}
                </td>
                <td style={td}>{record.section}</td>
                <td style={td}>{entry.room || '—'}</td>
                <td style={td}>{entry.kind || '—'}</td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={ghost} onClick={() => editMeeting(entry)}>Load into form</button>
                    <button style={{ ...ghost, color: '#b91c1c', borderColor: '#fecaca' }} disabled={busy} onClick={() => { void removeMeeting(record, entry); }}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
            {!myLoad.length && !loading && (
              <tr>
                <td colSpan={7} style={{ ...td, color: '#6b7890' }}>
                  Nothing published for you yet in {schoolYear} {semester}. The registrar publishes your assigned classes, and you can add a meeting below.
                </td>
              </tr>
            )}
            {loading && (
              <tr><td colSpan={7} style={{ ...td, color: '#6b7890' }}>Loading published schedules…</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ ...box, background: '#fff' }}>
        <strong style={{ fontSize: 15 }}>Add or correct a class meeting</strong>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6b7890' }}>
          Same subject, same day, later save = the meeting is updated in place. Students see the change immediately.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <input style={{ ...inp, flex: '0 1 140px' }} placeholder="Subject code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 12))} aria-label="Subject code" />
          <input style={{ ...inp, flex: '2 1 220px' }} placeholder="Subject title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Subject title" />
          <input style={{ ...inp, flex: '1 1 160px' }} placeholder="Section code" value={section} onChange={(e) => setSection(e.target.value)} aria-label="Section code" list="faculty-sections" />
          <datalist id="faculty-sections">{sections.map((value) => <option key={value} value={value} />)}</datalist>
          <input style={{ ...inp, flex: '1 1 180px' }} placeholder="Room" value={room} onChange={(e) => setRoom(e.target.value)} aria-label="Room" />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <select style={{ ...inp, flex: '0 1 150px' }} value={day} onChange={(e) => setDay(e.target.value)} aria-label="Day">
            {DAY_NAMES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <input style={{ ...inp, flex: '0 1 120px' }} type="time" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Start time" />
          <input style={{ ...inp, flex: '0 1 120px' }} type="time" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="End time" />
          <select style={{ ...inp, flex: '0 1 210px' }} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Class type">
            {DELIVERY_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </select>
          <input style={{ ...inp, flex: '0 1 110px' }} placeholder="Units" value={units} onChange={(e) => setUnits(e.target.value.replace(/[^\d.]/g, '').slice(0, 4))} inputMode="decimal" aria-label="Units" />
          <button style={btn} disabled={busy} onClick={() => { void save(); }}>{busy ? 'Saving…' : 'Save meeting'}</button>
          <button style={ghost} disabled={busy} onClick={resetForm}>Clear</button>
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: '#8a94a6' }}>
        {sections.length
          ? `Published sections in this term: ${sections.join(', ')}`
          : 'No section has a published timetable in this term yet.'}
      </div>
    </section>
  );
};
