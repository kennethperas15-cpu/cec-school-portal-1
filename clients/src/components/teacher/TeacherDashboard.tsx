import { useEffect, useMemo, useState } from 'react';
import { DashboardShell, type ShellGroup } from '../shared/DashboardShell';
import { AttendanceTracker, type TeacherAttendance } from './AttendanceTracker/AttendanceTracker';
import { ClassRoster, type TeacherStudent } from './ClassRoster/ClassRoster';
import { GradeEncode, type TeacherGrade } from './GradeEncode/GradeEncode';
import { useAcademicConfig } from '../../services/academicConfig';
import { ClassroomBridge } from '../shared/ClassroomBridge';
import { FacultyTimetable } from './FacultyTimetable';
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
      { label: 'Class Schedule', route: 'teacher-schedule' },
      { label: 'Class Roster', route: 'teacher-roster' },
      { label: 'Grade Encoding', route: 'teacher-grades' },
      { label: 'Attendance Tracker', route: 'teacher-attendance' },
      { label: 'Classroom', route: 'teacher-classroom' },
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

type TeacherSchedule = { id: string; title: string; when: string; where: string };
type TeacherPost = { id: string; title: string; body: string };

export type { TeacherAttendance, TeacherGrade, TeacherStudent };

export const TeacherDashboard = ({ currentUser, onNotify, onLogout }: Props) => {
  const [active, setActive] = useState('Dashboard');
  const [expanded, setExpanded] = useState('home');
  const [roster, setRoster] = useState<TeacherStudent[]>(() => readRecords(ROSTER_KEY));
  const [grades, setGrades] = useState<TeacherGrade[]>(() => readRecords(GRADES_KEY));
  const [attendance, setAttendance] = useState<TeacherAttendance[]>(() => readRecords(ATTENDANCE_KEY));
  const academicConfig = useAcademicConfig();
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
  const today = localDate();
  const attendanceToday = attendance.filter((record) => record.date === today);
  const attendanceCounts = useMemo(() => ({
    Present: attendance.filter((record) => record.status === 'Present').length,
    Late: attendance.filter((record) => record.status === 'Late').length,
    Excused: attendance.filter((record) => record.status === 'Excused').length,
    Absent: attendance.filter((record) => record.status === 'Absent').length,
  }), [attendance]);
  const completedGrades = grades.filter((grade) => Boolean(grade.prelim || grade.midterm || grade.final));
  const gradeAverages = completedGrades.flatMap((grade) => {
    const marks = [grade.prelim, grade.midterm, grade.final].filter(Boolean).map(Number);
    const average = marks.length ? marks.reduce((sum, mark) => sum + mark, 0) / marks.length : 0;
    return Number.isFinite(average) ? [average] : [];
  });
  const gradeBands = [
    { label: 'Excellent (90–100)', count: gradeAverages.filter((mark) => mark >= 90).length, color: 'excellent' },
    { label: 'Satisfactory (80–89)', count: gradeAverages.filter((mark) => mark >= 80 && mark < 90).length, color: 'satisfactory' },
    { label: 'Needs support (<80)', count: gradeAverages.filter((mark) => mark < 80).length, color: 'support' },
  ];
  const schedule = readRecords<TeacherSchedule>('cec:t_sched_v2');
  const posts = readRecords<TeacherPost>('cec:t_posts_v2');
  const recentAttendance = [...attendance].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 4);
  const attendanceRate = attendance.length
    ? Math.round((attendanceCounts.Present / attendance.length) * 100)
    : null;
  const averageGrade = gradeAverages.length
    ? Math.round(gradeAverages.reduce((sum, grade) => sum + grade, 0) / gradeAverages.length)
    : null;
  const greeting = new Date().getHours() < 12
    ? 'Good morning'
    : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const searchRecords = roster.map((student) => ({
    title: student.name,
    detail: `${student.course || 'No subject assigned'} • ${student.schoolId || student.email || student.id}`,
    target: 'Class Roster',
  }));
  const moduleItems = ['Dashboard', 'Class Schedule', 'Class Roster', 'Grade Encoding', 'Attendance Tracker', 'Classroom'];
  const navigate = (label: string) => setActive(label);

  const renderPage = () => {
    if (active === 'Class Schedule') {
      // The registrar's published timetable plus this teacher's own meetings —
      // the same records the student portal renders.
      return (
        <FacultyTimetable
          instructorName={name}
          instructorEmail={currentUser?.email ?? ''}
          schoolYear={academicConfig.schoolYear}
          semester={academicConfig.semester}
          onNotify={onNotify}
        />
      );
    }
    if (active === 'Classroom') {
      // Quizzes, assignments and materials live in Google Classroom; the portal
      // deep-links out to it instead of pretending to be an LMS.
      return (
        <div className="teacher-page">
          <ClassroomBridge mode="teacher" onNotify={onNotify} />
        </div>
      );
    }
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

    const classes = courses.map((course) => ({
      name: course,
      students: roster.filter((student) => student.course.trim() === course).length,
    }));
    const totalBandCount = gradeBands.reduce((sum, band) => sum + band.count, 0);
    return (
      <div className="teacher-page teacher-home">
        <header className="teacher-home-heading">
          <div>
            <p className="teacher-eyebrow"><span />{academicConfig.semester} {academicConfig.schoolYear} • {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1>{greeting}, {name}</h1>
            <p>Here is your teaching overview. Class totals and records update from your portal data.</p>
          </div>
          <div className="teacher-home-actions">
            <button type="button" className="teacher-button teacher-button-primary" onClick={() => navigate('Attendance Tracker')}>Take attendance</button>
            <button type="button" className="teacher-button" onClick={() => navigate('Grade Encoding')}>Encode grades</button>
            <button type="button" className="teacher-button" onClick={() => navigate('Class Roster')}>View class roster</button>
          </div>
        </header>
        <section className="teacher-stat-grid" aria-label="Teaching overview">
          <article className="teacher-stat-card"><span>Total students</span><strong>{roster.length}</strong><small>Across your class roster</small></article>
          <article className="teacher-stat-card"><span>Classes / sections</span><strong>{courses.length}</strong><small>Unique assigned subjects</small></article>
          <article className="teacher-stat-card"><span>Attendance today</span><strong>{attendanceToday.length ? `${Math.round((attendanceToday.filter((record) => record.status === 'Present').length / attendanceToday.length) * 100)}%` : '—'}</strong><small>{attendanceToday.length ? `${attendanceToday.length} records for ${today}` : 'No records yet today'}</small></article>
          <article className="teacher-stat-card"><span>Grades entered</span><strong>{completedGrades.length}</strong><small>Students with at least one term mark</small></article>
        </section>
        <section className="teacher-panel teacher-home-panel">
          <div className="teacher-panel-heading">
            <div><h2>My classes</h2><p>Open a roster, encode marks, or record attendance for a class.</p></div>
            <button type="button" className="teacher-text-button" onClick={() => navigate('Class Roster')}>View all classes <span aria-hidden="true">→</span></button>
          </div>
          {classes.length ? <div className="teacher-class-grid">{classes.slice(0, 4).map((course) => (
            <article className="teacher-class-card" key={course.name}>
              <div className="teacher-class-topline"><span className="teacher-course-badge">{course.name}</span><span>{course.students} student{course.students === 1 ? '' : 's'}</span></div>
              <h3>{course.name}</h3>
              <p>Student roster and academic records for this subject.</p>
              <div className="teacher-class-actions">
                <button type="button" onClick={() => navigate('Class Roster')}>Roster</button>
                <button type="button" onClick={() => navigate('Grade Encoding')}>Grades</button>
                <button type="button" onClick={() => navigate('Attendance Tracker')}>Attendance</button>
              </div>
            </article>
          ))}</div> : <div className="teacher-empty">No classes yet. Add students and assign a subject or section in the class roster to get started.<button type="button" className="teacher-button teacher-button-primary" onClick={() => navigate('Class Roster')}>Open class roster</button></div>}
        </section>
        <div className="teacher-home-columns">
          <section className="teacher-panel teacher-home-panel">
            <div className="teacher-panel-heading"><div><h2>Attendance summary</h2><p>{attendanceRate === null ? 'No attendance records saved yet.' : `${attendanceRate}% present across ${attendance.length} saved records.`}</p></div><button type="button" className="teacher-text-button" onClick={() => navigate('Attendance Tracker')}>Full report <span aria-hidden="true">→</span></button></div>
            <div className="teacher-summary-list">{(['Present', 'Late', 'Excused', 'Absent'] as const).map((status) => {
              const count = attendanceCounts[status];
              const percent = attendance.length ? Math.round((count / attendance.length) * 100) : 0;
              return <div className="teacher-summary-row" key={status}><div className="teacher-summary-label"><span className={`teacher-summary-dot ${status.toLowerCase()}`} />{status}</div><strong>{count}<small>{percent}%</small></strong><div className="teacher-progress"><span className={status.toLowerCase()} style={{ width: `${percent}%` }} /></div></div>;
            })}</div>
          </section>
          <section className="teacher-panel teacher-home-panel">
            <div className="teacher-panel-heading"><div><h2>Grade performance</h2><p>{averageGrade === null ? 'No grade data entered yet.' : `Class average across entered term marks: ${averageGrade}%.`}</p></div><button type="button" className="teacher-text-button" onClick={() => navigate('Grade Encoding')}>Grade sheet <span aria-hidden="true">→</span></button></div>
            <div className="teacher-summary-list">{gradeBands.map((band) => {
              const percent = totalBandCount ? Math.round((band.count / totalBandCount) * 100) : 0;
              return <div className="teacher-summary-row" key={band.label}><div className="teacher-summary-label"><span className={`teacher-summary-dot ${band.color}`} />{band.label}</div><strong>{band.count}<small>{percent}%</small></strong><div className="teacher-progress"><span className={band.color} style={{ width: `${percent}%` }} /></div></div>;
            })}</div>
          </section>
        </div>
        <div className="teacher-home-columns teacher-home-bottom">
          <section className="teacher-panel teacher-home-panel">
            <div className="teacher-panel-heading"><div><h2>Upcoming schedule</h2><p>Class times saved in your portal.</p></div><span className="teacher-count">{schedule.length}</span></div>
            {schedule.length ? <div className="teacher-activity-list">{schedule.slice(0, 4).map((item) => <article className="teacher-activity-item" key={item.id}><span className="teacher-activity-marker">◷</span><div><strong>{item.title}</strong><p>{item.when}{item.where ? ` • ${item.where}` : ''}</p></div></article>)}</div> : <div className="teacher-empty">No schedule has been added yet.</div>}
          </section>
          <section className="teacher-panel teacher-home-panel">
            <div className="teacher-panel-heading"><div><h2>Recent activity</h2><p>Latest attendance records and announcements.</p></div></div>
            {recentAttendance.length || posts.length ? <div className="teacher-activity-list">
              {recentAttendance.map((record) => <article className="teacher-activity-item" key={record.id}><span className={`teacher-activity-marker ${record.status.toLowerCase()}`}>✓</span><div><strong>{record.student} — {record.status}</strong><p>{record.section || 'Class attendance'} • {record.date}</p></div><button type="button" onClick={() => navigate('Attendance Tracker')}>View</button></article>)}
              {posts.slice(0, 2).map((post) => <article className="teacher-activity-item" key={post.id}><span className="teacher-activity-marker">✦</span><div><strong>{post.title}</strong><p>{post.body || 'Teacher announcement'}</p></div></article>)}
            </div> : <div className="teacher-empty">Your saved class activity and announcements will appear here.</div>}
          </section>
        </div>
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
