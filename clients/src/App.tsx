import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import api from './services/api';
import './styles.css';
import './login.css';
import { AuthContainer } from './components/auth/AuthContainer';

const Register = lazy(() => import('./components/auth/Register').then(({ Register: component }) => ({ default: component })));
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword').then(({ ForgotPassword: component }) => ({ default: component })));
const ProfileManagement = lazy(() => import('./components/auth/ProfileManagement').then(({ ProfileManagement: component }) => ({ default: component })));

type Course = {
  code: string;
  name: string;
  teacher: string;
  schedule: string;
  score: number;
  color: string;
};

type PortalUser = {
  firstName: string;
  lastName: string;
  role: string;
  id?: string;
  email?: string;
  program?: string;
};

const courses: Course[] = [
  { code: 'MATH 204', name: 'Statistics and Probability', teacher: 'Ms. Camila Reyes', schedule: 'Mon & Wed ? 8:00 AM', score: 94, color: '#1f6feb' },
  { code: 'ENG 202', name: 'Academic Writing', teacher: 'Mr. Daniel Cruz', schedule: 'Tue & Thu ? 10:00 AM', score: 91, color: '#f08a3c' },
  { code: 'CS 210', name: 'Web Systems and Design', teacher: 'Dr. Paolo Santos', schedule: 'Wed & Fri ? 1:00 PM', score: 96, color: '#20a779' },
];

const academicItems = [
  ['?', 'Grades / Report Card'],
  ['?', 'Class Schedule'],
  ['?', 'Enrolled Subjects'],
  ['?', 'Curriculum Checklist'],
  ['?', 'Attendance Records'],
];

const authenticationItems = [
  ['?', 'Profile Management'],
  ['?', 'Registration / Enrollment'],
  ['?', 'Password Recovery'],
];

const subsystemSubmenus: Record<string, string[][]> = {
  Enrollment: [['?', 'Online Enrollment'], ['?', 'Section Selection'], ['?', 'Document Submission'], ['?', 'Status Tracker']],
  Financial: [['?', 'Tuition Assessment'], ['?', 'Payment Portal'], ['?', 'Billing History'], ['?', 'Scholarship Application']],
  LMS: [['?', 'Course Material'], ['?', 'Assignments'], ['?', 'Quiz / Exam'], ['?', 'Announcements'], ['?', 'Discussion Forum']],
  Library: [['?', 'Book Catalog'], ['?', 'Borrowing Tracker'], ['?', 'Reservations'], ['?', 'Fines / Penalties']],
  Communication: [['?', 'Notification Center'], ['?', 'Announcement Board'], ['?', 'Messaging']],
  'Support Services': [['?', 'Guidance Appointment'], ['?', 'Document Request'], ['?', 'Complaint / Feedback']],
};

const subsystemItems = [
  ['?', 'Authentication'],
  ['?', 'Academic Records'],
  ['?', 'Enrollment'],
  ['?', 'Financial'],
  ['?', 'LMS'],
  ['?', 'Library'],
  ['?', 'Communication'],
  ['?', 'Support Services'],
];

const enrolledSubjects = [
  ['CS 301', 'Data Structures'],
  ['CS 302', 'Database Systems'],
  ['CS 303', 'Web Development'],
  ['GE 101', 'Purposive Communication'],
];

const StudentFunctionalPage = ({ page, onNotify }: { page: string; onNotify: (text: string) => void }) => {
  if (page === 'Online Enrollment') {
    return (
      <section className="academic-card">
        <h1>Online Enrollment</h1>
        <div className="year-card">
          <strong>Current Enrollment Window</strong>
          <span><i>?</i>Pre-enlistment is open for the next term.</span>
          <span><i>?</i>Registration closes on October 12.</span>
        </div>
        <button className="primary-button" type="button" onClick={() => onNotify('Enrollment requested')}>Continue enrollment</button>
      </section>
    );
  }

  if (page === 'Section Selection') {
    return (
      <section className="academic-card">
        <h1>Section Selection</h1>
        <div className="year-card">
          <strong>Recommended Sections</strong>
          <span><i>?</i>CS 301 - Section A</span>
          <span><i>?</i>CS 302 - Section B</span>
          <span><i>?</i>GE 101 - Section D</span>
        </div>
        <button className="primary-button" type="button" onClick={() => onNotify('Section selection saved')}>Save preferred sections</button>
      </section>
    );
  }

  if (page === 'Document Submission') {
    return (
      <section className="academic-card">
        <h1>Document Submission</h1>
        <form className="registration-form" onSubmit={(event) => { event.preventDefault(); onNotify('Documents submitted successfully'); }}>
          <input required placeholder="Document type" defaultValue="Certificate of Registration" />
          <textarea required placeholder="Additional notes" defaultValue="Please review and upload the latest scanned copy." />
          <button className="primary-button" type="submit">Submit documents</button>
        </form>
      </section>
    );
  }

  if (page === 'Status Tracker') {
    return (
      <section className="academic-card">
        <h1>Status Tracker</h1>
        <div className="attendance-row">
          <div><strong>Application Status</strong><b>Approved</b></div>
          <div className="attendance-track"><span style={{ width: '92%' }} /></div>
        </div>
        <div className="attendance-row pending-attendance">
          <div><strong>Document Review</strong><b>Pending</b></div>
          <div className="attendance-track"><span style={{ width: '64%' }} /></div>
        </div>
      </section>
    );
  }

  return (
    <section className="academic-card subsystem-placeholder">
      <h1>{page}</h1>
      <p>This workspace is ready for your next process and can be extended with backend logic.</p>
      <button className="primary-button" type="button" onClick={() => onNotify(`${page} opened`)}>Open {page}</button>
    </section>
  );
};

const authenticationPage = (page: string, onNotify: (text: string) => void, currentUser?: PortalUser | null) => {
  if (page === 'Profile Management') {
    return (
      <Suspense fallback={<section className="academic-card auth-card">Loading...</section>}>
        <ProfileManagement onNotify={onNotify} currentUser={currentUser ?? undefined} />
      </Suspense>
    );
  }

  if (page === 'Registration / Enrollment') {
    return (
      <Suspense fallback={<section className="academic-card auth-card">Loading...</section>}>
        <section className="academic-card auth-card">
          <Register embedded onNotify={onNotify} />
        </section>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<section className="academic-card auth-card">Loading...</section>}>
      <section className="academic-card auth-card">
        <ForgotPassword onNotify={onNotify} />
      </section>
    </Suspense>
  );
};

const EnrollmentPage = ({ page, onNotify }: { page: string; onNotify: (text: string) => void }) => {
  const [program, setProgram] = useState('BSIT');
  const [yearLevel, setYearLevel] = useState('3rd Year');
  const [semester, setSemester] = useState('1st Semester');
  const [studentStatus, setStudentStatus] = useState('Regular');
  const [selectedSections, setSelectedSections] = useState<string[]>(['CS 301 - Section A', 'GE 101 - Section D']);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await api.post('/auth/enrollment', {
        fullName: 'Demo Student',
        personalEmail: 'demo@cec.edu.ph',
        phone: '09170000000',
        program,
        yearLevel: Number(yearLevel.replace(/\D/g, '')),
        requestedRole: 'student',
      });
      onNotify('Enrollment saved successfully');
    } catch {
      onNotify('Enrollment saved locally for this demo session');
    }
  };

  return (
    <section className="academic-card">
      <h1>{page}</h1>
      <form className="registration-form" onSubmit={submit}>
        <div>
          <select value={program} onChange={(event) => setProgram(event.target.value)}>
            <option>BSIT</option>
            <option>BSCS</option>
            <option>BEED</option>
          </select>
          <select value={yearLevel} onChange={(event) => setYearLevel(event.target.value)}>
            <option>1st Year</option>
            <option>2nd Year</option>
            <option>3rd Year</option>
            <option>4th Year</option>
          </select>
        </div>
        <div>
          <select value={semester} onChange={(event) => setSemester(event.target.value)}>
            <option>1st Semester</option>
            <option>2nd Semester</option>
          </select>
          <select value={studentStatus} onChange={(event) => setStudentStatus(event.target.value)}>
            <option>Regular</option>
            <option>Irregular</option>
            <option>Shiftee</option>
          </select>
        </div>
        <div className="year-card">
          <strong>Selected Class Sections</strong>
          {selectedSections.map((section) => (
            <span key={section}><i>?</i>{section}</span>
          ))}
        </div>
        <button className="primary-button" type="submit">Submit enrollment</button>
      </form>
    </section>
  );
};

const academicPage = (page: string, onNotify: (text: string) => void, hasEnrollment: boolean, onEnroll: () => void) => {
  const empty = (
    <div className="empty-state">
      <span className="empty-icon">?</span>
      <strong>No academic records yet</strong>
      <p>Records will appear here after the student is enrolled and assigned subjects.</p>
    </div>
  );

  if (!hasEnrollment) {
    if (page === 'Enrolled Subjects') {
      return (
        <section className="academic-card">
          <h1>Enrolled Subjects (Current Sem)</h1>
          {empty}
          <button className="primary-button" type="button" onClick={onEnroll}>Enroll in subjects <span>?</span></button>
        </section>
      );
    }

    return (
      <section className="academic-card">
        <h1>{page}</h1>
        {empty}
      </section>
    );
  }

  if (page === 'Grades / Report Card') {
    return (
      <section className="academic-card">
        <div className="academic-title">
          <h1>Grades / Report Card</h1>
          <span>Official Report ? BSIT - 3rd Year</span>
        </div>
        <div className="pending-banner">Grades are pending. Your teachers have not submitted grades for this term yet.</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Subject</th>
                <th>Prelim</th>
                <th>Midterm</th>
                <th>Final</th>
                <th>Average</th>
                <th>Units</th>
              </tr>
            </thead>
            <tbody>
              {enrolledSubjects.map(([code, name]) => (
                <tr key={code}>
                  <td>{code}</td>
                  <td>{name}</td>
                  <td colSpan={4} className="pending-cell">Pending</td>
                  <td>3</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (page === 'Class Schedule') {
    return (
      <section className="academic-card">
        <h1>Weekly Timetable</h1>
        <div className="timetable">
          <div className="timetable-head">
            <b>Time</b>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => <b key={day}>{day}</b>)}
          </div>
          {[
            ['7:30-9:00', 'CS 301', '', 'CS 301', '', ''],
            ['9:00-10:30', '', 'CS 302', '', 'CS 302', 'CS 303 Lab'],
            ['10:30-12:00', 'GE 101', '', 'GE 101', '', ''],
          ].map((row) => (
            <div className="timetable-row" key={row[0]}>
              {row.map((cell, index) => (
                <span className={index === 0 ? 'time-cell' : cell ? 'class-cell' : ''} key={`${row[0]}-${index}`}>
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (page === 'Enrolled Subjects') {
    return (
      <section className="academic-card">
        <h1>Enrolled Subjects (Current Sem)</h1>
        <div className="subject-list">
          {enrolledSubjects.map(([code, name]) => (
            <button className="subject-row" key={code} type="button" onClick={() => onNotify(`${code} subject details opened`)}>
              <div>
                <strong>{code} - {name}</strong>
                <span>3 units ? BSIT-3A ? Room 301</span>
              </div>
              <b>Enrolled</b>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (page === 'Curriculum Checklist') {
    return (
      <section className="academic-card">
        <h1>Curriculum Checklist / Degree Progress</h1>
        <div className="degree-progress"><span style={{ width: '72%' }} /></div>
        <div className="empty-state">
          <strong>Program progress is on track</strong>
          <p>Your curriculum checklist updates as subjects are completed and approved.</p>
        </div>
      </section>
    );
  }

  if (page === 'Attendance Records') {
    return (
      <section className="academic-card">
        <h1>Attendance Record Viewing</h1>
        <div className="pending-banner">Attendance appears after classes begin and are submitted by faculty.</div>
        {enrolledSubjects.map(([code, name]) => (
          <div className="attendance-row pending-attendance" key={code}>
            <div>
              <strong>{code} - {name}</strong>
              <b>Pending</b>
            </div>
          </div>
        ))}
      </section>
    );
  }

  if (Object.values(subsystemSubmenus).some((items) => items.some(([, item]) => item === page))) {
    return (
      <section className="academic-card subsystem-placeholder">
        <h1>{page}</h1>
        <p>This {page.toLowerCase()} workspace is ready for your next workflow.</p>
        <button className="primary-button" type="button" onClick={() => onNotify(`${page} opened`)}>Open {page}</button>
      </section>
    );
  }

  return (
    <section className="academic-card subsystem-placeholder">
      <h1>{page}</h1>
      <p>This subsystem is ready for your next workflow.</p>
      <button className="primary-button" type="button" onClick={() => onNotify(`${page} opened`)}>Open {page}</button>
    </section>
  );
};

export const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<PortalUser | null>(null);
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [notificationCount, setNotificationCount] = useState(2);
  const [message, setMessage] = useState('');
  const [expandedSubsystem, setExpandedSubsystem] = useState('Academic Records');
  const [hasEnrollment, setHasEnrollment] = useState(false);
  const [campusSlide, setCampusSlide] = useState(0);

  const campusSlides = [
    { src: '/cec-campus-collage.png', alt: 'Cebu Eastern College campus facilities' },
    { src: '/cec-campus-group.png', alt: 'Cebu Eastern College faculty and staff' },
    { src: '/cec-campus-front.png', alt: 'Cebu Eastern College building' },
  ];

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('googleEnrollmentToken');
    if (token) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setCampusSlide((current) => (current + 1) % campusSlides.length), 4500);
    return () => window.clearInterval(timer);
  }, [campusSlides.length]);

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2600);
  };

  const changeSection = (section: string) => {
    setActiveNav(section);
    setShowNotifications(false);
    if (section !== 'Dashboard') {
      notify(`${section} section selected`);
    }
  };

  const handleLoginSuccess = (user: PortalUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setActiveNav(user.role === 'student' ? 'Registration / Enrollment' : 'Dashboard');
    notify(`Welcome back, ${user.firstName}!`);
  };

  const handleLogout = () => {
    localStorage.removeItem('cec_access_token');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveNav('Dashboard');
    setShowNotifications(false);
  };

  if (!isAuthenticated) {
    return <AuthContainer onLoginSuccess={handleLoginSuccess} onNotify={notify} />;
  }

  const initials = currentUser ? `${currentUser.firstName?.[0] ?? ''}${currentUser.lastName?.[0] ?? ''}` : 'U';

  return (
    <div className="portal-shell">
      <aside className="sidebar" style={{ backgroundImage: 'url("/cec-building.png")' }}>
        <div className="brand">
          <img className="brand-mark" src="/cec-logo.png" alt="Cebu Eastern College logo" />
          <div>
            <strong>CEC Portal</strong>
            <span>Student workspace</span>
          </div>
        </div>

        <div className="profile-mini">
          <div className="avatar avatar-large">{initials}</div>
          <div>
            <strong>{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Student'}</strong>
            <span>{currentUser?.role === 'student' ? 'Grade 12 ? STEM' : 'Campus Access'}</span>
          </div>
        </div>

        <nav>
          <span className="nav-label">PORTAL</span>
          <button className={activeNav === 'Dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => changeSection('Dashboard')}>
            <span className="nav-icon">?</span>Dashboard
          </button>

          {subsystemItems.map(([icon, label]) => {
            const isAcademic = label === 'Academic Records';
            const isAuthentication = label === 'Authentication';
            const isExpanded = expandedSubsystem === label;

            return (
              <div className="subsystem-group" key={label}>
                <button
                  className={activeNav === label ? 'nav-item subsystem-button active' : 'nav-item subsystem-button'}
                  onClick={() => {
                    setExpandedSubsystem(isExpanded ? '' : label);
                    if (!isAcademic && !isAuthentication) changeSection(label);
                  }}
                >
                  <span className="nav-icon">{icon}</span>
                  <span>{label}</span>
                  <b className="chevron">{isExpanded ? '?' : '?'}</b>
                </button>

                {isAcademic && isExpanded && (
                  <div className="submenu">
                    {academicItems.map(([itemIcon, itemLabel]) => (
                      <button
                        className={activeNav === itemLabel ? 'submenu-item active' : 'submenu-item'}
                        key={itemLabel}
                        onClick={() => changeSection(itemLabel)}
                      >
                        <span>{itemIcon}</span>{itemLabel}
                      </button>
                    ))}
                  </div>
                )}

                {isAuthentication && isExpanded && (
                  <div className="submenu">
                    {authenticationItems.map(([itemIcon, itemLabel]) => (
                      <button
                        className={activeNav === itemLabel ? 'submenu-item active' : 'submenu-item'}
                        key={itemLabel}
                        onClick={() => changeSection(itemLabel)}
                      >
                        <span>{itemIcon}</span>{itemLabel}
                      </button>
                    ))}
                  </div>
                )}

                {!isAcademic && !isAuthentication && isExpanded && subsystemSubmenus[label] && (
                  <div className="submenu">
                    {subsystemSubmenus[label].map(([itemIcon, itemLabel]) => (
                      <button
                        className={activeNav === itemLabel ? 'submenu-item active' : 'submenu-item'}
                        key={itemLabel}
                        onClick={() => changeSection(itemLabel)}
                      >
                        <span>{itemIcon}</span>{itemLabel}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <span className="nav-label nav-label-spaced">ACCOUNT</span>
          <button className="nav-item" onClick={() => changeSection('Settings')}>
            <span className="nav-icon">?</span>Settings
          </button>
          <button className="nav-item logout-item" onClick={handleLogout}>
            <span className="nav-icon">?</span>Log out
          </button>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />All systems operational
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand">
            <img className="brand-mark" src="/cec-logo.png" alt="Cebu Eastern College logo" />
            <strong>CEC Portal</strong>
          </div>
          <div className="breadcrumb">
            <span>Student portal</span>
            <b>/</b>
            <strong>{activeNav}</strong>
          </div>

          <div className="top-actions">
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setNotificationCount(0);
              }}
            >
              ?{notificationCount > 0 && <span className="notification-dot" />}
            </button>

            <button className="top-profile profile-button" onClick={() => changeSection('Profile Management')}>
              <div className="avatar">{initials}</div>
              <span>{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'User'}</span>
              <b>?</b>
            </button>
          </div>

          {showNotifications && (
            <div className="notification-popover">
              <strong>Notifications</strong>
              <p>Your Web Systems assignment is due tomorrow.</p>
              <p>Attendance record updated.</p>
              <button className="text-button" onClick={() => { setShowNotifications(false); notify('All notifications marked as read'); }}>
                Mark all as read
              </button>
            </div>
          )}
        </header>

        <div className="page">
          {activeNav === 'Dashboard' && (
            <section className="welcome-row">
              <div>
                <span className="eyebrow">CEC PORTAL</span>
                <h1>Welcome to your portal <span>?</span></h1>
                <p>Here&apos;s what&apos;s happening with your academic journey.</p>
              </div>
              <button className="primary-button" type="button" onClick={() => changeSection('Grades / Report Card')}>View academic records <span>?</span></button>
            </section>
          )}

          {activeNav !== 'Dashboard' ? (
            authenticationItems.some(([, item]) => item === activeNav)
              ? authenticationPage(activeNav, notify, currentUser)
              : subsystemSubmenus.Enrollment.some(([, item]) => item === activeNav)
                ? <EnrollmentPage page={activeNav} onNotify={notify} />
                : Object.values(subsystemSubmenus).some((items) => items.some(([, item]) => item === activeNav))
                  ? <StudentFunctionalPage page={activeNav} onNotify={notify} />
                  : academicPage(activeNav, notify, hasEnrollment, () => { setHasEnrollment(true); notify('Subjects enrolled successfully'); })
          ) : hasEnrollment ? (
            <>
              <section className="metrics-grid">
                <article className="metric-card"><div className="metric-top"><span>Current average</span><span className="metric-icon blue">?</span></div><strong>93.7<span>%</span></strong><div className="metric-foot positive">? 2.4% <em>from last term</em></div></article>
                <article className="metric-card"><div className="metric-top"><span>Attendance rate</span><span className="metric-icon green">?</span></div><strong>96<span>%</span></strong><div className="progress-track"><div className="progress-fill green-fill" style={{ width: '96%' }} /></div><div className="metric-foot"><em>Excellent standing</em></div></article>
                <article className="metric-card"><div className="metric-top"><span>Units completed</span><span className="metric-icon orange">?</span></div><strong>18<span className="muted-number"> / 24</span></strong><div className="progress-track"><div className="progress-fill orange-fill" style={{ width: '75%' }} /></div><div className="metric-foot"><em>6 units remaining</em></div></article>
                <article className="metric-card"><div className="metric-top"><span>Class rank</span><span className="metric-icon purple">?</span></div><strong>08<span className="muted-number">th</span></strong><div className="metric-foot purple-text">Top 10% <em>of your batch</em></div></article>
              </section>

              <div className="content-grid">
                <section className="panel courses-panel">
                  <div className="panel-heading"><div><h2>My courses</h2><p>Current term ? 2025?2026</p></div><button className="text-button" type="button" onClick={() => changeSection('Grades / Report Card')}>View all <span>?</span></button></div>
                  <div className="course-list">{courses.map((course) => <button className="course-row course-button" key={course.code} type="button" onClick={() => setSelectedCourse(course)}><div className="course-badge" style={{ backgroundColor: course.color }}>{course.code.split(' ')[0]}</div><div className="course-info"><strong>{course.name}</strong><span>{course.teacher} <i>?</i> {course.schedule}</span></div><div className="course-score"><strong>{course.score}%</strong><span>Current grade</span></div><span className="row-arrow">?</span></button>)}</div>
                </section>

                <section className="panel schedule-panel">
                  <div className="panel-heading"><div><h2>Today&apos;s schedule</h2><p>Monday, September 8</p></div><button className="more-button" type="button" onClick={() => changeSection('Class Schedule')}>???</button></div>
                  <div className="schedule-list">
                    <div className="schedule-item"><span className="time">08:00<br /><small>AM</small></span><div className="schedule-line blue-line" /><div><strong>Statistics and Probability</strong><span>Room 304 ? Ms. Reyes</span></div></div>
                    <div className="schedule-item"><span className="time">10:30<br /><small>AM</small></span><div className="schedule-line orange-line" /><div><strong>Research Consultation</strong><span>Library ? Mr. Cruz</span></div></div>
                    <div className="schedule-item"><span className="time">01:00<br /><small>PM</small></span><div className="schedule-line green-line" /><div><strong>Web Systems and Design</strong><span>Lab 2 ? Dr. Santos</span></div></div>
                  </div>
                </section>
              </div>

              <div className="bottom-grid">
                <section className="panel deadlines-panel"><div className="panel-heading"><div><h2>Upcoming deadlines</h2><p>Stay on top of your requirements</p></div><button className="text-button" type="button" onClick={() => changeSection('Class Schedule')}>See calendar <span>?</span></button></div><div className="deadline"><div className="date-box"><strong>10</strong><span>SEP</span></div><div><strong>Web Systems project proposal</strong><span>Web Systems and Design</span></div><span className="due-tag urgent">Due in 2 days</span></div><div className="deadline"><div className="date-box"><strong>15</strong><span>SEP</span></div><div><strong>Statistics problem set #3</strong><span>Statistics and Probability</span></div><span className="due-tag">Due in 7 days</span></div></section>
                <section className="panel announcement-panel"><div className="panel-heading"><div><h2>Campus updates</h2><p>Latest announcements</p></div><button className="more-button" type="button" onClick={() => notify('You are up to date')}>???</button></div><div className="announcement"><span className="announcement-icon">!</span><div><strong>Student council elections</strong><p>Voting opens this Friday at 8:00 AM.</p><small>2 hours ago</small></div></div><div className="announcement"><span className="announcement-icon purple-icon">?</span><div><strong>Library extended hours</strong><p>Open until 9:00 PM during exam week.</p><small>Yesterday</small></div></div></section>
              </div>
            </>
          ) : (
            <section className="academic-card dashboard-empty">
              <span className="empty-icon">?</span>
              <h1>Your dashboard is waiting for enrollment</h1>
              <p>No classes, grades, attendance, or deadlines are available yet. Enroll in subjects to start your academic record.</p>
              <button className="primary-button" type="button" onClick={() => changeSection('Enrolled Subjects')}>Go to enrollment <span>?</span></button>
            </section>
          )}

          {selectedCourse && (
            <div className="modal-backdrop" onClick={() => setSelectedCourse(null)}>
              <section className="course-modal" onClick={(event) => event.stopPropagation()}>
                <button className="modal-close" aria-label="Close course details" onClick={() => setSelectedCourse(null)}>?</button>
                <div className="course-badge modal-badge" style={{ backgroundColor: selectedCourse.color }}>{selectedCourse.code.split(' ')[0]}</div>
                <span className="eyebrow">{selectedCourse.code}</span>
                <h2>{selectedCourse.name}</h2>
                <p>{selectedCourse.teacher} ? {selectedCourse.schedule}</p>
                <div className="modal-grade"><strong>{selectedCourse.score}%</strong><span>Current grade</span></div>
                <button className="primary-button" type="button" onClick={() => { setSelectedCourse(null); notify('Course records opened'); }}>Open course records <span>?</span></button>
              </section>
            </div>
          )}

          {message && <div className="toast" role="status">{message}</div>}

          <footer>
            <span>? 2025 CEC School Portal</span>
            <span>Need help? <a href="mailto:support@cec.edu">Contact support</a></span>
          </footer>
        </div>
      </main>
    </div>
  );
};
