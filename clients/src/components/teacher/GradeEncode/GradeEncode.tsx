import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { averagePercent, formatPoint, percentToPoint } from '../../../services/grading';
import type { TeacherStudent } from '../ClassRoster/ClassRoster';

export type TeacherGrade = {
  id: string;
  student: string;
  studentId?: string;
  course: string;
  prelim: string;
  midterm: string;
  final: string;
};

type Props = {
  roster: TeacherStudent[];
  grades: TeacherGrade[];
  onSave: (grades: TeacherGrade[]) => void;
};

type GradeDraft = { prelim: string; midterm: string; final: string };
type Term = keyof GradeDraft;

const TERMS: { key: Term; label: string }[] = [
  { key: 'prelim', label: 'Prelim' },
  { key: 'midterm', label: 'Midterm' },
  { key: 'final', label: 'Final' },
];

const gradeFor = (student: TeacherStudent, grades: TeacherGrade[]) =>
  grades.find((grade) =>
    grade.course === student.course &&
    ((grade.studentId && [student.schoolId, student.id].includes(grade.studentId)) ||
      (grade.student?.toLowerCase() === student.name.toLowerCase())),
  );

const emptyDraft = (): GradeDraft => ({ prelim: '', midterm: '', final: '' });

export function GradeEncode({ roster, grades, onSave }: Props) {
  const [course, setCourse] = useState('');
  const [drafts, setDrafts] = useState<Record<string, GradeDraft>>({});
  const courses = useMemo(() => [...new Set(roster.map((student) => student.course.trim()).filter(Boolean))], [roster]);
  const students = useMemo(() => roster.filter((student) => !course || student.course === course), [roster, course]);

  useEffect(() => {
    if (!courses.includes(course)) setCourse(courses[0] ?? '');
  }, [courses, course]);

  useEffect(() => {
    setDrafts(Object.fromEntries(students.map((student) => {
      const existing = gradeFor(student, grades);
      return [student.id, {
        prelim: existing?.prelim ?? '',
        midterm: existing?.midterm ?? '',
        final: existing?.final ?? '',
      }];
    })));
  }, [students, grades]);

  const change = (studentId: string, term: Term, value: string) => {
    setDrafts((current) => ({
      ...current,
      [studentId]: { ...(current[studentId] ?? emptyDraft()), [term]: value },
    }));
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalid = students.find((student) => TERMS.some(({ key }) => {
      const value = drafts[student.id]?.[key] ?? '';
      return value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100);
    }));
    if (invalid) {
      window.alert(`Grades for ${invalid.name} must be numbers between 0 and 100.`);
      return;
    }

    const studentIds = new Set(students.map((student) => student.schoolId || student.id));
    const names = new Set(students.map((student) => student.name.toLowerCase()));
    const retained = grades.filter((grade) => !(
      grade.course === course &&
      ((grade.studentId && studentIds.has(grade.studentId)) || (grade.student && names.has(grade.student.toLowerCase())))
    ));
    const next = students.reduce<TeacherGrade[]>((all, student) => {
      const draft = drafts[student.id] ?? emptyDraft();
      if (!TERMS.some(({ key }) => draft[key] !== '')) return all;
      const existing = gradeFor(student, grades);
      all.push({
        id: existing?.id ?? globalThis.crypto?.randomUUID?.() ?? `grade-${Date.now()}-${student.id}`,
        student: student.name,
        studentId: student.schoolId || student.id,
        course: student.course,
        ...draft,
      });
      return all;
    }, retained);
    onSave(next);
  };

  return (
    <div className="teacher-page">
      <header className="teacher-page-heading"><div><p className="teacher-eyebrow">ACADEMIC RECORDS</p><h1>Grade Encoding</h1><p>Record term marks. Saved grades are shown in the matching student portal account.</p></div></header>
      <section className="teacher-panel">
        <div className="teacher-panel-heading teacher-roster-heading">
          <div><h2>Term grades</h2><p>Enter a percentage from 0–100 for each grading period. Blank periods remain unposted.</p></div>
          <label className="teacher-search">Subject / section<select value={course} onChange={(event) => setCourse(event.target.value)} disabled={!courses.length}>
            {!courses.length && <option value="">No assigned classes</option>}
            {courses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select></label>
        </div>
        {!students.length ? <div className="teacher-empty">Add students to a subject or section in Class Roster before encoding grades.</div> : (
          <form onSubmit={save}>
            <div className="teacher-table-wrap"><table className="teacher-table">
              <thead><tr><th>Student</th>{TERMS.map(({ key, label }) => <th key={key}>{label} (%)</th>)}<th>Current average</th><th>Point</th></tr></thead>
              <tbody>{students.map((student) => {
                const draft = drafts[student.id] ?? emptyDraft();
                const average = averagePercent([draft.prelim, draft.midterm, draft.final]);
                const point = average === null ? null : percentToPoint(average);
                return <tr key={student.id}>
                  <td><strong>{student.name}</strong><small>{student.schoolId || student.email || student.id}</small></td>
                  {TERMS.map(({ key, label }) => <td key={key}><label className="teacher-grade-input"><span className="sr-only">{label} grade for {student.name}</span><input type="number" min="0" max="100" step="0.01" value={draft[key]} onChange={(event) => change(student.id, key, event.target.value)} /></label></td>)}
                  <td>{average === null ? '—' : `${average.toFixed(1)}%`}</td><td>{point ? formatPoint(point.point) : '—'}</td>
                </tr>;
              })}</tbody>
            </table></div>
            <div className="teacher-form-actions"><button type="submit" className="teacher-button teacher-button-primary">Save grades</button></div>
          </form>
        )}
      </section>
      <section className="teacher-note" role="note"><strong>Student view:</strong> saving publishes these marks to the matching student account, where the average, letter equivalent and source instructor appear on their own Grades page. Blank periods stay unposted, and a student without a school ID on the roster cannot be published.</section>
    </div>
  );
}

export default GradeEncode;
