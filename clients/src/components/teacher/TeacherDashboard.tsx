import { useEffect, useMemo, useState } from 'react';
import { DashboardShell, type ShellGroup } from '../shared/DashboardShell';
import { AttendanceTracker, type TeacherAttendance } from './AttendanceTracker/AttendanceTracker';
import { ClassRoster, type TeacherStudent } from './ClassRoster/ClassRoster';
import { GradeEncode, type TeacherGrade } from './GradeEncode/GradeEncode';
import { useAcademicConfig } from '../../services/academicConfig';
import { describeApiError } from '../../services/api';
import { fetchAnnouncements, type LiveAnnouncement } from '../../services/announcements';
import {
  fetchAcademicRecords,
  fold,
  groupByStudent,
  publishStudentRecords,
  subjectCodeOf,
  type AttendanceRow,
  type AcademicRecordModule,
  type GradeEntryRow,
} from '../../services/records';
import { fetchTimetables, DAY_NAMES, type TimetableRecord } from '../../services/schedule';
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

const scopedStorageKey = (key: string, identity: string): string =>
  `${key}:${encodeURIComponent(identity.trim().toLowerCase() || 'unidentified')}`;

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
  const academicConfig = useAcademicConfig();
  const name = `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() || 'Teacher';
  const userId = currentUser?.schoolId || currentUser?.id || '';
  const storageIdentity = currentUser?.id || currentUser?.schoolId || currentUser?.email || '';
  const storageKeys = {
    roster: ROSTER_KEY,
    grades: scopedStorageKey(GRADES_KEY, storageIdentity),
    attendance: scopedStorageKey(ATTENDANCE_KEY, storageIdentity),
  };
  const [roster, setRoster] = useState<TeacherStudent[]>(() => readRecords(storageKeys.roster));
  const [grades, setGrades] = useState<TeacherGrade[]>(() => readRecords(storageKeys.grades));
  const [attendance, setAttendance] = useState<TeacherAttendance[]>(() => readRecords(storageKeys.attendance));
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState('');
  const [timetables, setTimetables] = useState<TimetableRecord[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState('');
  const [announcements, setAnnouncements] = useState<LiveAnnouncement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState('');

  useEffect(() => {
    const refresh = () => {
      setRoster(readRecords(storageKeys.roster));
      setGrades(readRecords(storageKeys.grades));
      setAttendance(readRecords(storageKeys.attendance));
    };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener(RECORDS_UPDATED, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(RECORDS_UPDATED, refresh);
    };
  }, [storageKeys.attendance, storageKeys.grades, storageKeys.roster]);

  useEffect(() => {
    let activeRequest = true;
    setRecordsLoading(true);
    void Promise.allSettled([
      fetchAcademicRecords<GradeEntryRow>('grades'),
      fetchAcademicRecords<AttendanceRow>('attendance'),
    ]).then(([gradeResult, attendanceResult]) => {
      if (!activeRequest) return;
      const errors: string[] = [];
      const isCurrentTerm = (record: { schoolYear: string; semester: string }) =>
        fold(record.schoolYear) === fold(academicConfig.schoolYear) &&
        fold(record.semester) === fold(academicConfig.semester);

      if (gradeResult.status === 'fulfilled') {
        const next = gradeResult.value.filter(isCurrentTerm).flatMap((record) =>
          record.entries.map((entry, index) => ({
            id: `${record.itemId}:${index}`,
            student: record.studentName,
            studentId: record.studentId,
            course: entry.course,
            prelim: entry.prelim,
            midterm: entry.midterm,
            final: entry.final,
          })),
        );
        setGrades(next);
        persistRecords(storageKeys.grades, next);
      } else {
        errors.push(describeApiError(gradeResult.reason, 'Loading posted grades'));
      }

      if (attendanceResult.status === 'fulfilled') {
        const next = attendanceResult.value.filter(isCurrentTerm).flatMap((record) =>
          record.entries.map((entry, index) => ({
            id: `${record.itemId}:${index}`,
            student: record.studentName,
            studentId: record.studentId,
            date: entry.date,
            section: entry.course,
            status: entry.status,
          })),
        );
        setAttendance(next);
        persistRecords(storageKeys.attendance, next);
      } else {
        errors.push(describeApiError(attendanceResult.reason, 'Loading posted attendance'));
      }
      setRecordsError(errors.join(' '));
    }).finally(() => {
      if (activeRequest) setRecordsLoading(false);
    });
    return () => { activeRequest = false; };
  }, [academicConfig.schoolYear, academicConfig.semester, storageKeys.attendance, storageKeys.grades]);

  const loadTimetables = async () => {
    setScheduleLoading(true);
    try {
      setTimetables(await fetchTimetables());
      setScheduleError('');
    } catch (error) {
      setScheduleError(describeApiError(error, 'Loading your published schedule'));
    } finally {
      setScheduleLoading(false);
    }
  };

  const loadAnnouncements = async () => {
    setAnnouncementsLoading(true);
    try {
      setAnnouncements(await fetchAnnouncements('teacher'));
      setAnnouncementsError('');
    } catch (error) {
      setAnnouncementsError(describeApiError(error, 'Loading school announcements'));
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  useEffect(() => {
    void loadTimetables();
    void loadAnnouncements();
  }, [userId, name, academicConfig.schoolYear, academicConfig.semester]);

  const persistRoster = (next: TeacherStudent[]) => {
    if (persistRecords(storageKeys.roster, next)) setRoster(next);
    else onNotify('Could not save the class roster. Check browser storage and try again.');
  };

  /**
   * Posts one document per student to the portal, so a mark encoded here shows
   * up on that student's own Grades / Attendance page wherever they sign in.
   *
   * Only the students whose records changed in this save are sent: the sheets
   * are saved whole, but a 40-student class must not mean 40 calls when one row
   * changed. The server keys the upsert on (module, this faculty member, school
   * ID, term), so re-saving edits the same record instead of duplicating it.
   */
  const publishRecords = async (
    module: AcademicRecordModule,
    changed: { studentId: string; studentName: string; entries: unknown[] }[],
  ) => {
    if (!changed.length) return;
    const label = module === 'grades' ? 'Grade' : 'Attendance';
    try {
      const outcome = await publishStudentRecords({
        module,
        schoolYear: academicConfig.schoolYear,
        semester: academicConfig.semester,
        students: changed,
      });
      const parts: string[] = [];
      if (outcome.posted) {
        parts.push(`${outcome.posted} student record${outcome.posted === 1 ? '' : 's'} published to the portal`);
      }
      if (outcome.skipped.length) {
        parts.push(`not published for ${outcome.skipped.join(', ')} — no seven-digit school ID on the roster`);
      }
      if (outcome.failed.length) parts.push(`${outcome.failed.length} failed (${outcome.failed[0]})`);
      if (parts.length) onNotify(`${label}: ${parts.join(' • ')}`);
    } catch (error) {
      onNotify(error instanceof Error ? error.message : `${label} records could not be published to the portal.`);
    }
  };

  const persistGrades = (next: TeacherGrade[]) => {
    if (!persistRecords(storageKeys.grades, next)) {
      onNotify('Could not save grades. Check browser storage and try again.');
      return;
    }
    const before = groupByStudent(grades, (row) => row.studentId || row.student);
    const after = groupByStudent(next, (row) => row.studentId || row.student);
    setGrades(next);
    const changedKeys = new Set([...before.keys(), ...after.keys()]);
    const changed = [...changedKeys]
      .filter((key) => JSON.stringify(before.get(key) ?? []) !== JSON.stringify(after.get(key) ?? []))
      .map((key) => {
        const rows = after.get(key) ?? [];
        const previousRows = before.get(key) ?? [];
        return {
          studentId: key,
          studentName: rows[0]?.student ?? previousRows[0]?.student ?? '',
          entries: rows.map((row) => ({
            code: subjectCodeOf(row.course),
            course: row.course,
            prelim: row.prelim,
            midterm: row.midterm,
            final: row.final,
          })),
        };
      });
    void publishRecords('grades', changed);
  };

  const persistAttendance = (next: TeacherAttendance[]) => {
    if (!persistRecords(storageKeys.attendance, next)) {
      onNotify('Could not save attendance. Check browser storage and try again.');
      return;
    }
    const before = groupByStudent(attendance, (row) => row.studentId || row.student);
    const after = groupByStudent(next, (row) => row.studentId || row.student);
    setAttendance(next);
    const changedKeys = new Set([...before.keys(), ...after.keys()]);
    const changed = [...changedKeys]
      .filter((key) => JSON.stringify(before.get(key) ?? []) !== JSON.stringify(after.get(key) ?? []))
      .map((key) => {
        const rows = after.get(key) ?? [];
        const previousRows = before.get(key) ?? [];
        return {
          studentId: key,
          studentName: rows[0]?.student ?? previousRows[0]?.student ?? '',
          entries: rows.map((row) => ({ date: row.date, course: row.section ?? '', status: row.status })),
        };
      });
    void publishRecords('attendance', changed);
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
  const schedule = timetables
    .filter((record) =>
      fold(record.schoolYear) === fold(academicConfig.schoolYear) &&
      fold(record.semester) === fold(academicConfig.semester),
    )
    .flatMap((record) => record.entries
      .filter((entry) => fold(entry.instructor) === fold(name))
      .map((entry) => ({ ...entry, section: record.section })))
    .sort((left, right) => {
      const dayOrder = DAY_NAMES.indexOf(left.day as (typeof DAY_NAMES)[number]) -
        DAY_NAMES.indexOf(right.day as (typeof DAY_NAMES)[number]);
      return dayOrder || left.start.localeCompare(right.start);
    });
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
      if (recordsLoading) return <div className="teacher-page"><div className="teacher-empty" role="status">Loading your saved grades…</div></div>;
      return <>{recordsError && <div className="teacher-sync-warning" role="alert">{recordsError}</div>}<GradeEncode roster={roster} grades={grades} onSave={persistGrades} /></>;
    }
    if (active === 'Attendance Tracker') {
      if (recordsLoading) return <div className="teacher-page"><div className="teacher-empty" role="status">Loading your saved attendance…</div></div>;
      return <>{recordsError && <div className="teacher-sync-warning" role="alert">{recordsError}</div>}<AttendanceTracker roster={roster} attendance={attendance} onSave={persistAttendance} /></>;
    }

    const classes = courses.map((course) => ({
      name: course,
      students: roster.filter((student) => student.course.trim() === course).length,
    }));
    const totalBandCount = gradeBands.reduce((sum, band) => sum + band.count, 0);
    return (
      <div className="teacher-page teacher-home">
        {recordsError && <div className="teacher-sync-warning" role="alert">Some academic records could not be refreshed from the server. Device-saved data may be out of date. {recordsError}</div>}
        <header className="teacher-home-hero">
          <div className="teacher-home-hero-copy">
            <span className="teacher-home-period">{academicConfig.semester} • AY {academicConfig.schoolYear}</span>
            <h1>{greeting}, {name}!</h1>
            <p>Keep track of your classes, student progress, and today’s teaching priorities.</p>
            <span className="teacher-home-date">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="teacher-home-actions" aria-label="Quick actions">
            <button type="button" onClick={() => navigate('Attendance Tracker')}><span aria-hidden="true">◷</span>Take attendance</button>
            <button type="button" onClick={() => navigate('Grade Encoding')}><span aria-hidden="true">✓</span>Encode grades</button>
            <button type="button" onClick={() => navigate('Class Roster')}><span aria-hidden="true">☷</span>View class roster</button>
          </div>
        </header>
        <section className="teacher-stat-grid" aria-label="Teaching overview">
          <article className="teacher-stat-card"><span>Total students</span><strong>{roster.length}</strong><small>Across your class roster</small></article>
          <article className="teacher-stat-card"><span>Classes / sections</span><strong>{courses.length}</strong><small>Unique assigned subjects</small></article>
          <article className="teacher-stat-card"><span>Attendance today</span><strong>{attendanceToday.length ? `${Math.round((attendanceToday.filter((record) => record.status === 'Present').length / attendanceToday.length) * 100)}%` : '—'}</strong><small>{attendanceToday.length ? `${attendanceToday.length} records for ${today}` : 'No records yet today'}</small></article>
          <article className="teacher-stat-card"><span>Grades entered</span><strong>{completedGrades.length}</strong><small>Students with at least one term mark</small></article>
          <article className="teacher-stat-card"><span>Grade average</span><strong>{averageGrade === null ? '—' : `${averageGrade}%`}</strong><small>{averageGrade === null ? 'No posted marks yet' : 'Across recorded term marks'}</small></article>
        </section>
        <section className="teacher-panel teacher-home-panel">
          <div className="teacher-panel-heading">
            <div><h2>My classes</h2><p>Open a roster, encode marks, or record attendance for a class.</p></div>
            <button type="button" className="teacher-text-button" onClick={() => navigate('Class Roster')}>View all classes <span aria-hidden="true">→</span></button>
          </div>
          {classes.length ? <div className="teacher-class-grid">{classes.map((course) => (
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
            <div className="teacher-panel-heading"><div><h2>Upcoming schedule</h2><p>Published classes assigned to you this term.</p></div><button type="button" className="teacher-text-button" onClick={() => navigate('Class Schedule')}>Open schedule <span aria-hidden="true">→</span></button></div>
            {scheduleLoading ? <div className="teacher-empty" role="status">Loading published schedule…</div>
              : scheduleError ? <div className="teacher-empty" role="alert">{scheduleError}<button type="button" className="teacher-button" onClick={() => void loadTimetables()}>Retry</button></div>
                : schedule.length ? <div className="teacher-activity-list">{schedule.slice(0, 4).map((item) => <article className="teacher-activity-item" key={`${item.id}-${item.section}`}><span className="teacher-activity-marker">◷</span><div><strong>{item.code || item.title || 'Class'} — {item.section}</strong><p>{item.day}, {item.start}–{item.end}{item.room ? ` • ${item.room}` : ''}</p></div></article>)}</div>
                  : <div className="teacher-empty">No published classes are assigned to you for this term.</div>}
          </section>
          <section className="teacher-panel teacher-home-panel">
            <div className="teacher-panel-heading"><div><h2>Recent activity</h2><p>Your latest attendance records and published announcements.</p></div></div>
            {(recentAttendance.length || announcements.length) && <div className="teacher-activity-list">
              {recentAttendance.map((record) => <article className="teacher-activity-item" key={record.id}><span className={`teacher-activity-marker ${record.status.toLowerCase()}`}>✓</span><div><strong>{record.student} — {record.status}</strong><p>{record.section || 'Class attendance'} • {record.date}</p></div><button type="button" onClick={() => navigate('Attendance Tracker')}>View</button></article>)}
              {announcements.slice(0, 2).map((post) => <article className="teacher-activity-item" key={post.id}><span className="teacher-activity-marker">✦</span><div><strong>{post.title}</strong><p>{post.content}</p></div></article>)}
            </div>}
            {announcementsLoading && <div className="teacher-empty" role="status">Loading school announcements…</div>}
            {announcementsError && <div className="teacher-empty" role="alert">{announcementsError}<button type="button" className="teacher-button" onClick={() => void loadAnnouncements()}>Retry</button></div>}
            {!recentAttendance.length && !announcements.length && !announcementsLoading && !announcementsError && <div className="teacher-empty">No recent attendance records or announcements.</div>}
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
