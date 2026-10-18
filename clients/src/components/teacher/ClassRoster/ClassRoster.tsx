import { useMemo, useState, type FormEvent } from 'react';

export type TeacherStudent = {
  id: string;
  name: string;
  email: string;
  course: string;
  schoolId?: string;
};

type Grade = { studentId?: string; student?: string; course?: string; prelim?: string; midterm?: string; final?: string };
type Attendance = { studentId?: string; student: string; status: string };

type Props = {
  students: TeacherStudent[];
  grades: Grade[];
  attendance: Attendance[];
  onSave: (students: TeacherStudent[]) => void;
  onNotify: (message: string) => void;
};

const newId = () => globalThis.crypto?.randomUUID?.() ?? `student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function ClassRoster({ students, grades, attendance, onSave, onNotify }: Props) {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [course, setCourse] = useState('');

  const visibleStudents = useMemo(() => students.filter((student) =>
    `${student.name} ${student.email} ${student.schoolId ?? ''} ${student.course}`
      .toLowerCase().includes(query.trim().toLowerCase()),
  ), [students, query]);
  const courseCount = new Set(students.map((student) => student.course.trim()).filter(Boolean)).size;

  const clearForm = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setSchoolId('');
    setCourse('');
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanSchoolId = schoolId.trim();
    const cleanCourse = course.trim();
    if (!cleanName || !cleanCourse) {
      onNotify('Enter the student name and assigned subject or section.');
      return;
    }
    if (cleanSchoolId && students.some((student) => student.schoolId === cleanSchoolId && student.id !== editingId)) {
      onNotify('That student ID is already in this roster.');
      return;
    }
    if (cleanEmail && students.some((student) => student.email.toLowerCase() === cleanEmail.toLowerCase() && student.id !== editingId)) {
      onNotify('That email is already in this roster.');
      return;
    }

    const record: TeacherStudent = {
      id: editingId ?? newId(),
      name: cleanName,
      email: cleanEmail,
      course: cleanCourse,
      ...(cleanSchoolId ? { schoolId: cleanSchoolId } : {}),
    };
    const next = editingId
      ? students.map((student) => student.id === editingId ? record : student)
      : [...students, record];
    onSave(next);
    clearForm();
    onNotify(editingId ? 'Student record updated.' : 'Student added to the class roster.');
  };

  const edit = (student: TeacherStudent) => {
    setEditingId(student.id);
    setName(student.name);
    setEmail(student.email);
    setSchoolId(student.schoolId ?? '');
    setCourse(student.course);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = (student: TeacherStudent) => {
    if (!window.confirm(`Remove ${student.name} from the roster? Their saved grade and attendance records are retained.`)) return;
    onSave(students.filter((item) => item.id !== student.id));
    if (editingId === student.id) clearForm();
    onNotify('Student removed from the roster.');
  };

  const gradeCount = (student: TeacherStudent) => grades.filter((grade) =>
    grade.course === student.course &&
    ((grade.studentId && [student.schoolId, student.id].includes(grade.studentId)) ||
      grade.student?.toLowerCase() === student.name.toLowerCase()),
  ).filter((grade) => Boolean(grade.prelim || grade.midterm || grade.final)).length;
  const attendanceCount = (student: TeacherStudent) => attendance.filter((record) =>
    (record.studentId && [student.schoolId, student.id].includes(record.studentId)) ||
    record.student.toLowerCase() === student.name.toLowerCase(),
  ).length;

  return (
    <div className="teacher-page">
      <header className="teacher-page-heading">
        <div><p className="teacher-eyebrow">TEACHING</p><h1>Class Roster</h1><p>Manage students and the subjects or sections assigned to them.</p></div>
      </header>
      <section className="teacher-panel">
        <div className="teacher-panel-heading"><div><h2>{editingId ? 'Edit student' : 'Add a student'}</h2><p>Name and course are required. Use the official school ID to link this record to student grades.</p></div></div>
        <form className="teacher-form-grid" onSubmit={submit}>
          <label>Student name<input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" /></label>
          <label>School ID<input value={schoolId} onChange={(event) => setSchoolId(event.target.value)} inputMode="numeric" /></label>
          <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" /></label>
          <label>Subject / section<input value={course} onChange={(event) => setCourse(event.target.value)} required placeholder="e.g. CS 302 • Section A" /></label>
          <div className="teacher-form-actions">
            <button className="teacher-button teacher-button-primary" type="submit">{editingId ? 'Save changes' : 'Add student'}</button>
            {editingId && <button className="teacher-button" type="button" onClick={clearForm}>Cancel</button>}
          </div>
        </form>
      </section>
      <section className="teacher-panel">
        <div className="teacher-panel-heading teacher-roster-heading">
          <div><h2>Enrolled students <span className="teacher-count">{students.length}</span></h2><p>{courseCount} subject{courseCount === 1 ? '' : 's'} / section{courseCount === 1 ? '' : 's'} in this roster.</p></div>
          <label className="teacher-search">Search roster<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, ID, email, subject…" /></label>
        </div>
        {visibleStudents.length ? (
          <div className="teacher-table-wrap"><table className="teacher-table">
            <thead><tr><th>Student</th><th>School ID</th><th>Subject / section</th><th>Grades</th><th>Attendance</th><th>Actions</th></tr></thead>
            <tbody>{visibleStudents.map((student) => <tr key={student.id}>
              <td><strong>{student.name}</strong><small>{student.email || 'No email recorded'}</small></td>
              <td>{student.schoolId || '—'}</td><td>{student.course}</td><td>{gradeCount(student)}</td><td>{attendanceCount(student)}</td>
              <td className="teacher-row-actions"><button className="teacher-button" type="button" onClick={() => edit(student)}>Edit</button><button className="teacher-button teacher-button-danger" type="button" onClick={() => remove(student)}>Remove</button></td>
            </tr>)}</tbody>
          </table></div>
        ) : <div className="teacher-empty">{students.length ? 'No students match your search.' : 'No students yet. Add students above to start taking attendance and encoding grades.'}</div>}
      </section>
    </div>
  );
}

export default ClassRoster;
