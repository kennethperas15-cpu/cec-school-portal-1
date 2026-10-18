import { useEffect, useMemo, useState } from 'react';
import { DashboardShell, type ShellGroup } from '../shared/DashboardShell';
import { AttendanceTracker, type TeacherAttendance } from './AttendanceTracker/AttendanceTracker';
import { ClassRoster, type TeacherStudent } from './ClassRoster/ClassRoster';
import { GradeEncode, type TeacherGrade } from './GradeEncode/GradeEncode';
import './teacher-portal.css';

type TeacherUser = {
  firstName: string;
  lastName: string;
  role: string;
  id?: string;
  email?: string;
  schoolId?: string;
} | null;

type Props = {
  currentUser: TeacherUser;
  onNotify: (message: string) => void;
  onLogout: () => void;
};

const ROSTER_KEY = 'cec:t_roster_v2';
const GRADES_KEY = 'cec:t_grades_v2';
const ATTENDANCE_KEY = 'cec:t_attend_v2';
const RECORDS_UPDATED = 'cec:teacher-records-updated';
const GROUPS: ShellGroup[] = [
  { id: 'home', label: 'OVERVIEW', icon: '⌂', items: [{ label: 'Dashboard', route: 'teacher-dashboard' }] },
  {
    id: 'teaching',
    label: 'TEACHING',
    icon: '▤',
    items: [
      { label: 'Class Roster', route: 'teacher-roster' },
      { label: 'Grade Encoding', route: 'teacher-grades' },
      { label: 'Attendance Tracker', route: 'teacher-attendance' },
    ],
  },
];

const readRecords = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
};

const persistRecords = <T,>(key: string, records: T[]): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(records));
    window.dispatchEvent(new Event(RECORDS_UPDATED));
    return true;
  } catch {
    return false;
  }
};

const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export type { TeacherAttendance, TeacherGrade, TeacherStudent };

export const TeacherDashboard = ({ currentUser, onNotify, onLogout }: Props) => {
  const [active, setActive] = useState('Dashboard');
  const [expanded, setExpanded] = useState('home');
  const [roster, setRoster] = useState<TeacherStudent[]>(() => readRecords(ROSTER_KEY));
  const [grades, setGrades] = useState<TeacherGrade[]>(() => readRecords(GRADES_KEY));
  const [attendance, setAttendance] = useState<TeacherAttendance[]>(() => readRecords(ATTENDANCE_KEY));
  const name = `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() || 'Teacher';
  const userId = currentUser?.schoolId || currentUser?.id || '';

  useEffect(() => {
    const refresh = () => {
      setRoster(readRecords(ROSTER_KEY));
      setGrades(readRecords(GRADES_KEY));
      setAttendance(readRecords(ATTENDANCE_KEY));
    };
    window.addEventListener('storage', refresh);
    window.addEventListener(RECORDS_UPDATED, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(RECORDS_UPDATED, refresh);
    };
  }, []);

  const persistRoster = (next: TeacherStudent[]) => {
    if (persistRecords(ROSTER_KEY, next)) setRoster(next);
    else onNotify('Could not save the class roster. Check browser storage and try again.');
  };
  const persistGrades = (next: TeacherGrade[]) => {
    if (persistRecords(GRADES_KEY, next)) {
      setGrades(next);
      onNotify('Grades saved. Students can now view their posted grades.');
    } else onNotify('Could not save grades. Check browser storage and try again.');
  };
  const persistAttendance = (next: TeacherAttendance[]) => {
    if (persistRecords(ATTENDANCE_KEY, next)) {
      setAttendance(next);
      onNotify('Attendance saved. Students can now view their attendance records.');
    } else onNotify('Could not save attendance. Check browser storage and try again.');
  };

  const courses = useMemo(
    () => [...new Set(roster.map((student) => student.course.trim()).filter(Boolean))],
    [roster],
  );
  const searchRecords = roster.map((student) => ({
    title: student.name,
    detail: `${student.course || 'No subject assigned'} • ${student.schoolId || student.email || student.id}`,
    target: 'Class Roster',
  }));
  const moduleItems = ['Dashboard', 'Class Roster', 'Grade Encoding', 'Attendance Tracker'];
  const navigate = (label: string) => setActive(label);

  const renderPage = () => {
    if (active === 'Class Roster') {
      return (
        <ClassRoster
          students={roster}
          grades={grades}
          attendance={attendance}
          onSave={persistRoster}
          onNotify={onNotify}
        />
      );
    }
    if (active === 'Grade Encoding') {
      return <GradeEncode roster={roster} grades={grades} onSave={persistGrades} />;
    }
    if (active === 'Attendance Tracker') {
      return <AttendanceTracker roster={roster} attendance={attendance} onSave={persistAttendance} />;
    }

    const presentToday = attendance.filter((record) =>
      record.date === localDate() && record.status === 'Present',
    ).length;
    const completedGradeRows = grades.filter((grade) =>
      Boolean(grade.prelim || grade.midterm || grade.final),
    ).length;
    return (
      <div className="teacher-page">
        <header className="teacher-page-heading">
          <div>
            <p className="teacher-eyebrow">TEACHER PORTAL</p>
            <h1>Welcome, {name}</h1>
            <p>Manage your student roster, record attendance, and publish grades.</p>
          </div>
          <span className="teacher-period">{new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}</span>
        </header>
        <section className="teacher-stat-grid" aria-label="Teaching overview">
          <article className="teacher-stat-card"><span>Students in roster</span><strong>{roster.length}</strong></article>
          <article className="teacher-stat-card"><span>Subjects / sections</span><strong>{courses.length}</strong></article>
          <article className="teacher-stat-card"><span>Present today</span><strong>{presentToday}</strong></article>
          <article className="teacher-stat-card"><span>Students with grades</span><strong>{completedGradeRows}</strong></article>
        </section>
        <section className="teacher-panel">
          <div className="teacher-panel-heading">
            <div><h2>Teaching tools</h2><p>Changes are saved in the shared portal records on this browser.</p></div>
          </div>
          <div className="teacher-quick-actions">
            {[
              ['Class Roster', 'Add and manage students and their course assignments.'],
              ['Grade Encoding', 'Record prelim, midterm, and final marks for each student.'],
              ['Attendance Tracker', 'Mark and save attendance by class and date.'],
            ].map(([label, detail]) => (
              <button type="button" className="teacher-action-card" key={label} onClick={() => navigate(label)}>
                <strong>{label}</strong><span>{detail}</span><span className="teacher-action-link">Open →</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  };

  return (
    <DashboardShell
      role="teacher"
      groups={GROUPS}
      active={active}
      expanded={expanded}
      onExpand={setExpanded}
      onNavigate={navigate}
      onLogout={onLogout}
      userName={name}
      userIdLine={userId}
      photoUserId={currentUser?.id || userId || 'teacher'}
      moduleItems={moduleItems}
      searchRecords={searchRecords}
      routeCrumb={active === 'Dashboard' ? undefined : active}
      popup={null}
      onClosePopup={() => undefined}
    >
      {renderPage()}
    </DashboardShell>
  );
};

export default TeacherDashboard;
