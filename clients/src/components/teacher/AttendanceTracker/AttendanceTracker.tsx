import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { TeacherStudent } from '../ClassRoster/ClassRoster';

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';
export type TeacherAttendance = {
  id: string;
  student: string;
  studentId?: string;
  date: string;
  status: AttendanceStatus;
  section?: string;
};

type Props = {
  roster: TeacherStudent[];
  attendance: TeacherAttendance[];
  onSave: (records: TeacherAttendance[]) => void;
};

const STATUSES: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Excused'];
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `attendance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function AttendanceTracker({ roster, attendance, onSave }: Props) {
  const [course, setCourse] = useState('');
  const [date, setDate] = useState(today);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus | ''>>({});
  const courses = useMemo(() => [...new Set(roster.map((student) => student.course.trim()).filter(Boolean))], [roster]);
  const students = useMemo(() => roster.filter((student) => !course || student.course === course), [roster, course]);
  const savedForSession = attendance.filter((record) => record.date === date && record.section === course);
  const present = Object.values(draft).filter((status) => status === 'Present').length;

  useEffect(() => {
    if (!courses.includes(course)) setCourse(courses[0] ?? '');
  }, [courses, course]);

  useEffect(() => {
    const saved = attendance.filter((record) => record.date === date && record.section === course);
    setDraft(Object.fromEntries(students.map((student) => {
      const record = saved.find((item) =>
        (item.studentId && [student.schoolId, student.id].includes(item.studentId)) ||
        item.student.toLowerCase() === student.name.toLowerCase(),
      );
      return [student.id, record?.status ?? ''];
    })));
  }, [attendance, course, date, students]);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const missing = students.find((student) => !draft[student.id]);
    if (missing) {
      window.alert(`Choose an attendance status for ${missing.name} before saving.`);
      return;
    }
    if (savedForSession.length && !window.confirm(`Attendance for ${course} on ${date} is already saved. Replace that session?`)) return;
    const isSessionRecord = (record: TeacherAttendance) => record.date === date && record.section === course;
    const next = attendance.filter((record) => !isSessionRecord(record));
    for (const student of students) {
      next.push({
        id: savedForSession.find((record) =>
          record.studentId === (student.schoolId || student.id) ||
          record.student.toLowerCase() === student.name.toLowerCase(),
        )?.id ?? makeId(),
        student: student.name,
        studentId: student.schoolId || student.id,
        date,
        section: course,
        status: draft[student.id] as AttendanceStatus,
      });
    }
    onSave(next);
  };

  return (
    <div className="teacher-page">
      <header className="teacher-page-heading"><div><p className="teacher-eyebrow">ACADEMIC RECORDS</p><h1>Attendance Tracker</h1><p>Take attendance by subject and date. Saving publishes each session to the matching student account, joined there to the registrar’s published timetable.</p></div></header>
      <section className="teacher-panel">
        <div className="teacher-panel-heading teacher-roster-heading">
          <div><h2>Class session</h2><p>Set the session, mark each student, then save the full attendance record.</p></div>
          <div className="teacher-session-controls">
            <label>Subject / section<select value={course} onChange={(event) => setCourse(event.target.value)} disabled={!courses.length}>
              {!courses.length && <option value="">No assigned classes</option>}
              {courses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select></label>
            <label>Session date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          </div>
        </div>
        {!students.length ? <div className="teacher-empty">Add students to a subject or section in Class Roster before taking attendance.</div> : (
          <form onSubmit={save}>
            <div className="teacher-attendance-toolbar"><span>{students.length} students • {present} marked present</span><button type="button" className="teacher-button" onClick={() => setDraft(Object.fromEntries(students.map((student) => [student.id, 'Present'])))}>Mark all present</button></div>
            <div className="teacher-table-wrap"><table className="teacher-table">
              <thead><tr><th>Student</th><th>School ID</th><th>Attendance status</th></tr></thead>
              <tbody>{students.map((student) => <tr key={student.id}>
                <td><strong>{student.name}</strong><small>{student.email || ' '}</small></td>
                <td>{student.schoolId || '—'}</td>
                <td><select aria-label={`Attendance status for ${student.name}`} value={draft[student.id] ?? ''} onChange={(event) => setDraft((current) => ({ ...current, [student.id]: event.target.value as AttendanceStatus | '' }))}>
                  <option value="">Select status</option>{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select></td>
              </tr>)}</tbody>
            </table></div>
            <div className="teacher-form-actions"><button type="submit" className="teacher-button teacher-button-primary">Save attendance</button></div>
          </form>
        )}
      </section>
      <section className="teacher-panel">
        <div className="teacher-panel-heading"><div><h2>Recent sessions</h2><p>Attendance records saved for your roster.</p></div></div>
        {attendance.length ? <div className="teacher-table-wrap"><table className="teacher-table">
          <thead><tr><th>Date</th><th>Student</th><th>Subject / section</th><th>Status</th></tr></thead>
          <tbody>{[...attendance].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30).map((record) => <tr key={record.id}><td>{record.date}</td><td>{record.student}</td><td>{record.section || '—'}</td><td><span className={`teacher-status teacher-status-${record.status.toLowerCase()}`}>{record.status}</span></td></tr>)}</tbody>
        </table></div> : <div className="teacher-empty">No attendance has been recorded yet.</div>}
      </section>
    </div>
  );
}

export default AttendanceTracker;
