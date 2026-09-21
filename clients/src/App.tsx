import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import api from './services/api';
import './styles.css';
import './login.css';
import { AuthContainer } from './components/auth/AuthContainer';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { StudentDashboard } from './components/student/StudentDashboard';

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
    { src: `${import.meta.env.BASE_URL}cec-campus-collage.png`, alt: 'Cebu Eastern College campus facilities' },
    { src: `${import.meta.env.BASE_URL}cec-campus-group.png`, alt: 'Cebu Eastern College faculty and staff' },
    { src: `${import.meta.env.BASE_URL}cec-campus-front.png`, alt: 'Cebu Eastern College building' },
  ];

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('cec_session_user');
      if (storedUser) {
        const user = JSON.parse(storedUser) as PortalUser;
        if (user?.role && ['student', 'teacher', 'admin'].includes(user.role)) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          setActiveNav(user.role === 'student' ? 'Registration / Enrollment' : 'Dashboard');
        }
      }
    } catch {
      localStorage.removeItem('cec_session_user');
    }

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
    localStorage.removeItem('cec_session_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveNav('Dashboard');
    setShowNotifications(false);
  };

  if (!isAuthenticated) {
    return <AuthContainer onLoginSuccess={handleLoginSuccess} onNotify={notify} />;
  }

  if (currentUser?.role === 'teacher') {
    return <TeacherDashboard currentUser={currentUser} onNotify={notify} onLogout={handleLogout} />;
  }

  if (currentUser?.role === 'admin') {
    return <AdminDashboard currentUser={currentUser} onNotify={notify} onLogout={handleLogout} />;
  }

  return <StudentDashboard currentUser={currentUser} onNotify={notify} onLogout={handleLogout} />;
};
