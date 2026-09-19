import { useEffect, useState, type FormEvent } from 'react';
import api from './services/api';
import './styles.css';
import './login.css';
import { AuthContainer, Register, ForgotPassword, ProfileManagement } from './components/auth';

const assetUrl = (fileName: string) => `${import.meta.env.BASE_URL}${fileName}`;

type Course = {
  code: string;
  name: string;
  teacher: string;
  schedule: string;
  score: number;
  color: string;
};

const courses: Course[] = [
  { code: 'MATH 204', name: 'Statistics and Probability', teacher: 'Ms. Camila Reyes', schedule: 'Mon & Wed · 8:00 AM', score: 94, color: '#1f6feb' },
  { code: 'ENG 202', name: 'Academic Writing', teacher: 'Mr. Daniel Cruz', schedule: 'Tue & Thu · 10:00 AM', score: 91, color: '#f08a3c' },
  { code: 'CS 210', name: 'Web Systems and Design', teacher: 'Dr. Paolo Santos', schedule: 'Wed & Fri · 1:00 PM', score: 96, color: '#20a779' },
];

const academicItems = [
  ['▤', 'Grades / Report Card'],
  ['◷', 'Class Schedule'],
  ['◈', 'Enrolled Subjects'],
  ['✓', 'Curriculum Checklist'],
  ['◒', 'Attendance Records'],
];

const authenticationItems = [
  ['♙', 'Profile Management'],
  ['▣', 'Registration / Enrollment'],
  ['↻', 'Password Recovery'],
];

const subsystemSubmenus: Record<string, string[][]> = {
  Enrollment: [['↗', 'Online Enrollment'], ['▣', 'Section Selection'], ['▤', 'Document Submission'], ['◷', 'Status Tracker']],
  Financial: [['₱', 'Tuition Assessment'], ['↗', 'Payment Portal'], ['▤', 'Billing History'], ['◆', 'Scholarship Application']],
  LMS: [['▤', 'Course Material'], ['✓', 'Assignments'], ['□', 'Quiz / Exam'], ['◉', 'Announcements'], ['◇', 'Discussion Forum']],
  Library: [['▥', 'Book Catalog'], ['↔', 'Borrowing Tracker'], ['▢', 'Reservations'], ['₱', 'Fines / Penalties']],
  Communication: [['♢', 'Notification Center'], ['▤', 'Announcement Board'], ['✉', 'Messaging']],
  'Support Services': [['◉', 'Guidance Appointment'], ['▤', 'Document Request'], ['♡', 'Complaint / Feedback']],
};

const subsystemItems = [
  ['♙', 'Authentication'],
  ['▤', 'Academic Records'],
  ['▣', 'Enrollment'],
  ['▤', 'Financial'],
  ['▥', 'LMS'],
  ['▢', 'Library'],
  ['✉', 'Communication'],
  ['?', 'Support Services'],
];

const enrolledSubjects = [
  ['CS 301', 'Data Structures'], ['CS 302', 'Database Systems'], ['CS 303', 'Web Development'], ['GE 101', 'Purposive Communication'],
];

const demoAccounts: Record<string, { identifier: string; password: string }> = {
  Student: { identifier: 'CEC-2024-0015', password: 'student123' },
  Teacher: { identifier: 'T-001', password: 'teacher123' },
  Admin: { identifier: 'ADMIN', password: 'admin123' },
};

const StudentRegistrationPage = ({ onNotify }: { onNotify: (text: string) => void }) => {
  const [fullName, setFullName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [program, setProgram] = useState('BSIT');
  const [yearLevel, setYearLevel] = useState('1');
  const [error, setError] = useState('');
  const [issuedAccount, setIssuedAccount] = useState<{ schoolEmail: string; temporaryPassword: string; emailSent: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await api.post('/auth/enrollment', {
        fullName,
        personalEmail,
        phone,
        program,
        yearLevel: Number(yearLevel),
        requestedRole: 'student',
      });
      setIssuedAccount(response.data.data);
      onNotify('Your school account was issued.');
    } catch (requestError) {
      const apiError = requestError as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message ?? 'Registration could not be completed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (issuedAccount) {
    return <section className="academic-card auth-card">
      <h1>School Account Issued</h1>
      <p className="auth-description">Use these credentials to sign in to the CEC Portal. Save them now because the temporary password is shown only once.</p>
      <div className="status-message"><strong>School email:</strong> {issuedAccount.schoolEmail}<br /><strong>Temporary password:</strong> {issuedAccount.temporaryPassword}</div>
      {!issuedAccount.emailSent && <p className="login-error">Email delivery is not configured, so the credentials could not be sent to Gmail. Configure SMTP and keep these displayed credentials safe.</p>}
    </section>;
  }

  return <section className="academic-card auth-card">
    <h1>New Student Registration / Enrollment</h1>
    <form className="registration-form" onSubmit={submit}>
      <input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full Name" />
      <div><input required type="email" value={personalEmail} onChange={(event) => setPersonalEmail(event.target.value)} placeholder="Personal Gmail address" /><input required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Contact" /></div>
      <div><select value={program} onChange={(event) => setProgram(event.target.value)}><option>BSIT</option><option>BSCS</option><option>BEED</option></select><select value={yearLevel} onChange={(event) => setYearLevel(event.target.value)}><option value="1">1st Year</option><option value="2">2nd Year</option><option value="3">3rd Year</option><option value="4">4th Year</option></select></div>
      {error && <p className="login-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Issuing Account...' : 'Submit Registration'}</button>
    </form>
  </section>;
};

const authenticationPage = (
  page: string,
  onNotify: (text: string) => void,
<<<<<<< HEAD
) => {
  if (page === 'Profile Management') return <section className="academic-card auth-card"><h1>Profile Management</h1><div className="form-grid"><label>NAME<input placeholder="Your full name" /></label><label>ID<input placeholder="Your account ID" /></label><label>COURSE<input placeholder="Your program" /></label><label>EMAIL<input placeholder="Your email address" /></label><label>PHONE<input placeholder="Enter phone number" /></label><label>ADDRESS<input placeholder="Enter address" /></label><label>GUARDIAN<input placeholder="Enter guardian name" /></label><label>EMERGENCY CONTACT<input placeholder="Enter emergency contact" /></label></div><button className="primary-button" onClick={() => onNotify('Profile changes saved')}>Save Changes</button></section>;
  if (page === 'Registration / Enrollment') return <StudentRegistrationPage onNotify={onNotify} />;
  return <section className="academic-card auth-card"><h1>Password Recovery</h1><p className="auth-description">Enter your email to receive reset instructions.</p><form className="recovery-form" onSubmit={(event) => { event.preventDefault(); onNotify('Reset instructions sent'); }}><input required type="email" placeholder="student@cec.edu.ph" /><button className="primary-button" type="submit">Send Reset Link</button></form></section>;
=======
  currentUser?: { firstName: string; lastName: string; role: string } | null,
) => {
  if (page === 'Profile Management') return <ProfileManagement onNotify={onNotify} currentUser={currentUser ?? undefined} />;
  if (page === 'Registration / Enrollment') return <section className="academic-card auth-card"><Register embedded onNotify={onNotify} /></section>;
  return <section className="academic-card auth-card"><ForgotPassword onNotify={onNotify} /></section>;
>>>>>>> second-branch
};

const EnrollmentPage = ({ page, onNotify }: { page: string; onNotify: (text: string) => void }) => {
  const [program, setProgram] = useState('BSIT');
  const [yearLevel, setYearLevel] = useState('3rd Year');
  const [semester, setSemester] = useState('1st Semester');
  const [studentStatus, setStudentStatus] = useState('Regular');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [irregularChoices, setIrregularChoices] = useState<Record<string, 'advance' | 'wait'>>({});
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const courseCatalog: Record<string, { edpCode: string; subjectCode: string; subject: string; units: number; section: string; schedule: string; room: string }[]> = {
    'BSIT-1st Year': [
      { edpCode: '10001', subjectCode: 'IT 111', subject: 'Introduction to Computing', units: 3, section: 'BSIT-1A', schedule: 'Mon/Wed 8:00-9:30 AM', room: 'Lab 1' },
      { edpCode: '10002', subjectCode: 'IT 112', subject: 'Computer Programming 1', units: 3, section: 'BSIT-1A', schedule: 'Tue/Thu 9:30-11:00 AM', room: 'Lab 2' },
      { edpCode: '10003', subjectCode: 'GE 101', subject: 'Purposive Communication', units: 3, section: 'BSIT-1B', schedule: 'Fri 8:00-11:00 AM', room: 'Room 201' },
      { edpCode: '10004', subjectCode: 'IT 113', subject: 'Computer Programming 2', units: 3, section: 'BSIT-1A', schedule: 'Mon/Wed 9:30-11:00 AM', room: 'Lab 2' },
      { edpCode: '10005', subjectCode: 'MATH 111', subject: 'Mathematics in the Modern World', units: 3, section: 'BSIT-1B', schedule: 'Tue/Thu 8:00-9:30 AM', room: 'Room 202' },
      { edpCode: '10006', subjectCode: 'GE 102', subject: 'Readings in Philippine History', units: 3, section: 'BSIT-1A', schedule: 'Wed/Fri 9:30-11:00 AM', room: 'Room 203' },
      { edpCode: '10007', subjectCode: 'PE 111', subject: 'Physical Education 1', units: 2, section: 'BSIT-1C', schedule: 'Sat 8:00-10:00 AM', room: 'Gym' },
      { edpCode: '10008', subjectCode: 'NSTP 111', subject: 'National Service Training Program 1', units: 3, section: 'BSIT-1C', schedule: 'Sat 1:00-4:00 PM', room: 'Room 101' },
    ],
    'BSIT-3rd Year': [
      { edpCode: '30101', subjectCode: 'IT 301', subject: 'Data Structures and Algorithms', units: 3, section: 'BSIT-3A', schedule: 'Mon/Wed 8:00-9:30 AM', room: 'Lab 3' },
      { edpCode: '30102', subjectCode: 'IT 302', subject: 'Database Systems', units: 3, section: 'BSIT-3A', schedule: 'Tue/Thu 10:00-11:30 AM', room: 'Lab 2' },
      { edpCode: '30103', subjectCode: 'IT 303', subject: 'Web Systems and Technologies', units: 3, section: 'BSIT-3B', schedule: 'Wed/Fri 1:00-2:30 PM', room: 'Lab 1' },
      { edpCode: '30104', subjectCode: 'IT 304', subject: 'Systems Analysis and Design', units: 3, section: 'BSIT-3B', schedule: 'Tue/Thu 1:00-2:30 PM', room: 'Room 305' },
      { edpCode: '30105', subjectCode: 'IT 305', subject: 'Information Assurance and Security', units: 3, section: 'BSIT-3A', schedule: 'Mon/Wed 2:30-4:00 PM', room: 'Lab 3' },
      { edpCode: '30106', subjectCode: 'IT 306', subject: 'Human-Computer Interaction', units: 3, section: 'BSIT-3B', schedule: 'Tue/Thu 2:30-4:00 PM', room: 'Room 306' },
      { edpCode: '30107', subjectCode: 'IT 307', subject: 'IT Project Management', units: 3, section: 'BSIT-3A', schedule: 'Fri 8:00-11:00 AM', room: 'Room 305' },
      { edpCode: '30108', subjectCode: 'IT 308', subject: 'Professional Elective 1', units: 3, section: 'BSIT-3B', schedule: 'Fri 1:00-4:00 PM', room: 'Lab 1' },
    ],
    'BSCS-3rd Year': [
      { edpCode: '35101', subjectCode: 'CS 301', subject: 'Data Structures', units: 3, section: 'BSCS-3A', schedule: 'Mon/Wed 8:00-9:30 AM', room: 'Lab 3' },
      { edpCode: '35102', subjectCode: 'CS 302', subject: 'Database Systems', units: 3, section: 'BSCS-3A', schedule: 'Tue/Thu 10:00-11:30 AM', room: 'Lab 2' },
      { edpCode: '35103', subjectCode: 'CS 303', subject: 'Web Development', units: 3, section: 'BSCS-3B', schedule: 'Wed/Fri 1:00-2:30 PM', room: 'Lab 1' },
      { edpCode: '35104', subjectCode: 'CS 304', subject: 'Operating Systems', units: 3, section: 'BSCS-3A', schedule: 'Mon/Wed 2:30-4:00 PM', room: 'Lab 3' },
      { edpCode: '35105', subjectCode: 'CS 305', subject: 'Computer Networks', units: 3, section: 'BSCS-3B', schedule: 'Tue/Thu 1:00-2:30 PM', room: 'Lab 2' },
      { edpCode: '35106', subjectCode: 'CS 306', subject: 'Software Engineering', units: 3, section: 'BSCS-3A', schedule: 'Fri 8:00-11:00 AM', room: 'Room 305' },
      { edpCode: '35107', subjectCode: 'CS 307', subject: 'Artificial Intelligence', units: 3, section: 'BSCS-3B', schedule: 'Fri 1:00-4:00 PM', room: 'Lab 1' },
      { edpCode: '35108', subjectCode: 'CS 308', subject: 'Computer Science Elective 1', units: 3, section: 'BSCS-3A', schedule: 'Wed/Fri 9:30-11:00 AM', room: 'Room 306' },
    ],
    'BEED-3rd Year': [
      { edpCode: '37101', subjectCode: 'EDUC 301', subject: 'Teaching Profession', units: 3, section: 'BEED-3A', schedule: 'Mon/Wed 9:30-11:00 AM', room: 'Room 204' },
      { edpCode: '37102', subjectCode: 'EDUC 302', subject: 'Assessment of Learning', units: 3, section: 'BEED-3A', schedule: 'Tue/Thu 8:00-9:30 AM', room: 'Room 204' },
      { edpCode: '37103', subjectCode: 'EDUC 303', subject: 'Curriculum Development', units: 3, section: 'BEED-3B', schedule: 'Fri 1:00-4:00 PM', room: 'Room 206' },
      { edpCode: '37104', subjectCode: 'EDUC 304', subject: 'Facilitating Learner-Centered Teaching', units: 3, section: 'BEED-3A', schedule: 'Mon/Wed 1:00-2:30 PM', room: 'Room 204' },
      { edpCode: '37105', subjectCode: 'EDUC 305', subject: 'Technology for Teaching and Learning', units: 3, section: 'BEED-3B', schedule: 'Tue/Thu 1:00-2:30 PM', room: 'Room 206' },
      { edpCode: '37106', subjectCode: 'EDUC 306', subject: 'Inclusive Education', units: 3, section: 'BEED-3A', schedule: 'Wed/Fri 8:00-9:30 AM', room: 'Room 204' },
      { edpCode: '37107', subjectCode: 'EDUC 307', subject: 'Assessment Strategies', units: 3, section: 'BEED-3B', schedule: 'Wed/Fri 9:30-11:00 AM', room: 'Room 206' },
      { edpCode: '37108', subjectCode: 'EDUC 308', subject: 'Teaching Internship Preparation', units: 3, section: 'BEED-3A', schedule: 'Sat 8:00-11:00 AM', room: 'Room 204' },
    ],
  };
  const sections = courseCatalog[`${program}-${yearLevel}`] ?? [];
  const toggleSection = (edpCode: string) => setSelectedSections((current) => current.includes(edpCode) ? current.filter((item) => item !== edpCode) : [...current, edpCode]);
  const chooseIrregularPlan = (edpCode: string, choice: 'advance' | 'wait') => {
    setIrregularChoices((current) => ({ ...current, [edpCode]: choice }));
    setSelectedSections((current) => choice === 'advance' && !current.includes(edpCode) ? [...current, edpCode] : choice === 'wait' ? current.filter((item) => item !== edpCode) : current);
  };
  const uploadDocument = (name: string, file: File | undefined) => {
    if (!file) return;
    setDocuments((current) => ({ ...current, [name]: file.name }));
    onNotify(`${name} uploaded`);
  };

  if (page === 'Online Enrollment') return <section className="academic-card enrollment-card"><h1>Online Enrollment / Re-enrollment</h1><form className="enrollment-form" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); onNotify('Enrollment application submitted'); }}><select defaultValue="1st Sem 2024-2025" aria-label="Academic term"><option>1st Sem 2024-2025</option><option>2nd Sem 2024-2025</option></select><select defaultValue="BSIT" aria-label="Program"><option>BSIT</option><option>BSCS</option><option>BEED</option></select><select defaultValue="3rd Year" aria-label="Year level"><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select><select defaultValue="Regular" aria-label="Student status"><option>Regular</option><option>Irregular</option></select><button className="primary-button" type="submit">{submitted ? 'Enrollment Submitted' : 'Submit Enrollment'}</button></form></section>;
  if (page === 'Section Selection') return <section className="academic-card enrollment-card"><h1>Section / Subject Selection</h1><p className="auth-description">Each semester has eight available subjects. Regular students may select their full load. Irregular students may advance selected subjects or wait until the next semester.</p><div className="registration-form"><div><select value={program} onChange={(event) => { setProgram(event.target.value); setSelectedSections([]); setIrregularChoices({}); }} aria-label="Program"><option>BSIT</option><option>BSCS</option><option>BEED</option></select><select value={yearLevel} onChange={(event) => { setYearLevel(event.target.value); setSelectedSections([]); setIrregularChoices({}); }} aria-label="Year level"><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select><select value={semester} onChange={(event) => { setSemester(event.target.value); setSelectedSections([]); setIrregularChoices({}); }} aria-label="Semester"><option>1st Semester</option><option>2nd Semester</option></select><select value={studentStatus} onChange={(event) => { setStudentStatus(event.target.value); setSelectedSections([]); setIrregularChoices({}); }} aria-label="Student status"><option>Regular</option><option>Irregular</option></select></div></div><div className="status-message">{program} · {yearLevel} · {semester} · {studentStatus} · {sections.length} subjects available</div><div className="table-wrap"><table><thead><tr><th>EDP Code</th><th>Subject Code</th><th>Subject</th><th>Units</th><th>Section</th><th>Schedule / Room</th><th>{studentStatus === 'Irregular' ? 'Enrollment plan' : 'Select'}</th></tr></thead><tbody>{sections.length ? sections.map((course) => <tr key={course.edpCode}><td><strong>{course.edpCode}</strong></td><td>{course.subjectCode}</td><td>{course.subject}</td><td>{course.units}</td><td>{course.section}</td><td>{course.schedule}<br /><small>{course.room}</small></td><td>{studentStatus === 'Irregular' ? <select value={irregularChoices[course.edpCode] ?? ''} onChange={(event) => chooseIrregularPlan(course.edpCode, event.target.value as 'advance' | 'wait')} aria-label={`Plan for ${course.subject}`}><option value="">Choose</option><option value="advance">Advance now</option><option value="wait">Wait until next semester</option></select> : <input type="checkbox" checked={selectedSections.includes(course.edpCode)} onChange={() => toggleSection(course.edpCode)} aria-label={`Select ${course.subject}`} />}</td></tr>) : <tr><td colSpan={7}>No subjects configured for this program and year level.</td></tr>}</tbody></table></div><button className="primary-button" onClick={() => onNotify(`${selectedSections.length} subject${selectedSections.length === 1 ? '' : 's'} selected for ${program} ${semester}`)} disabled={!selectedSections.length}>Save Section Selection <span>→</span></button></section>;
  if (page === 'Document Submission') return <section className="academic-card enrollment-card"><h1>Document Submission (Requirements Upload)</h1><div className="document-list">{[['COR', 'COR'], ['PSA Birth Certificate', 'PSA Birth Certificate'], ['Good Moral', 'Good Moral']].map(([key, label]) => <div className="document-row" key={key}><div><strong>{label}</strong><span className={documents[key] ? 'document-verified' : 'document-pending'}>{documents[key] ? `Verified • ${documents[key]}` : 'Pending'}</span></div><label className="upload-button">↥ Upload<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => uploadDocument(key, event.target.files?.[0])} /></label></div>)}</div></section>;
  return <section className="academic-card enrollment-card"><h1>Enrollment Status Tracker</h1><div className="status-steps">{['Applied', 'Documents Verified', 'Assessed', 'Paid', 'Approved', 'Enrolled'].map((step, index) => <div className="status-step" key={step}><span>{index + 1}</span><b>{step}</b></div>)}</div><div className="status-message">Current: <strong>Pending</strong> · Submit your enrollment application to begin the process.</div></section>;
};

const StudentFunctionalPage = ({ page, onNotify }: { page: string; onNotify: (text: string) => void }) => {
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const books = ['Introduction to Algorithms', 'Database System Concepts', 'Web Development with TypeScript'];
  const assignments = ['Responsive Portal Layout', 'SQL Data Modeling', 'Systems Analysis Reflection'];

  if (page === 'Payment Portal') return <section className="academic-card"><h1>Payment Portal</h1><p className="auth-description">Select an outstanding charge and record your payment reference.</p><div className="table-wrap"><table><thead><tr><th>Charge</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{[['Tuition balance', '₱18,500', 'Outstanding'], ['Library fee', '₱500', 'Outstanding']].map(([name, amount, status]) => <tr key={name}><td>{name}</td><td>{amount}</td><td>{status}</td><td><button className="text-button" onClick={() => onNotify(`${name} payment form opened`)}>Pay now</button></td></tr>)}</tbody></table></div></section>;
  if (page === 'Book Catalog') return <section className="academic-card"><h1>Book Catalog</h1><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search books by title" /><div className="subject-list">{books.filter((book) => book.toLowerCase().includes(query.toLowerCase())).map((book) => <div className="subject-row" key={book}><div><strong>{book}</strong><span>Available at the CEC library</span></div><button className="text-button" onClick={() => onNotify(`${book} details opened`)}>View</button></div>)}</div></section>;
  if (page === 'Reservations') return <section className="academic-card"><h1>Library Reservations</h1><div className="subject-list">{books.map((book) => <label className="section-option" key={book}><input type="checkbox" checked={selected.includes(book)} onChange={() => setSelected((items) => items.includes(book) ? items.filter((item) => item !== book) : [...items, book])} /><span><strong>{book}</strong><small>Reserve for pickup</small></span></label>)}</div><button className="primary-button" onClick={() => onNotify(`${selected.length} book reservation${selected.length === 1 ? '' : 's'} submitted`)}>Submit Reservations</button></section>;
  if (page === 'Assignments') return <section className="academic-card"><h1>Assignments</h1><div className="subject-list">{assignments.map((assignment) => <div className="subject-row" key={assignment}><div><strong>{assignment}</strong><span>{submitted ? 'Submitted for review' : 'Due this week'}</span></div><button className="text-button" onClick={() => { setSubmitted(true); onNotify(`${assignment} submitted`); }}>Submit</button></div>)}</div></section>;
  if (page === 'Discussion Forum') return <section className="academic-card"><h1>Discussion Forum</h1><form className="recovery-form" onSubmit={(event) => { event.preventDefault(); setMessage(''); onNotify('Discussion post published'); }}><input required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a discussion post" /><button className="primary-button" type="submit">Post message</button></form><div className="status-message">Latest topic: How should schools protect student data?</div></section>;
  if (page === 'Messaging') return <section className="academic-card"><h1>Messaging</h1><form className="recovery-form" onSubmit={(event) => { event.preventDefault(); setMessage(''); onNotify('Message sent to your adviser'); }}><input required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message your adviser" /><button className="primary-button" type="submit">Send message</button></form></section>;
  if (page === 'Guidance Appointment') return <section className="academic-card"><h1>Guidance Appointment</h1><form className="registration-form" onSubmit={(event) => { event.preventDefault(); onNotify('Guidance appointment requested'); }}><input required type="date" /><select defaultValue="Academic advising"><option>Academic advising</option><option>Personal counseling</option><option>Career guidance</option></select><button className="primary-button" type="submit">Request appointment</button></form></section>;
  if (page === 'Complaint / Feedback') return <section className="academic-card"><h1>Complaint / Feedback</h1><form className="registration-form" onSubmit={(event) => { event.preventDefault(); onNotify('Feedback submitted to support services'); }}><input required placeholder="Subject" /><textarea required placeholder="Describe your feedback or concern" /><button className="primary-button" type="submit">Submit feedback</button></form></section>;
  if (page === 'Document Request') return <section className="academic-card"><h1>Document Request</h1><form className="registration-form" onSubmit={(event) => { event.preventDefault(); onNotify('Document request submitted'); }}><select defaultValue="Certificate of Enrollment"><option>Certificate of Enrollment</option><option>Official Transcript</option><option>Good Moral Certificate</option></select><button className="primary-button" type="submit">Request document</button></form></section>;
  return <section className="academic-card"><h1>{page}</h1><p className="auth-description">This student workspace is ready for your current term.</p><button className="primary-button" onClick={() => onNotify(`${page} action completed`)}>Start {page}</button></section>;
};

const academicPage = (page: string, onNotify: (text: string) => void, hasEnrollment: boolean, onEnroll: () => void) => {
  const empty = <div className="empty-state"><span className="empty-icon">○</span><strong>No academic records yet</strong><p>Records will appear here after the student is enrolled and assigned subjects.</p></div>;
  if (!hasEnrollment) {
    if (page === 'Enrolled Subjects') return <section className="academic-card"><h1>Enrolled Subjects (Current Sem)</h1>{empty}<button className="primary-button" onClick={onEnroll}>Enroll in subjects <span>→</span></button></section>;
    return <section className="academic-card"><h1>{page}</h1>{empty}</section>;
  }
  if (page === 'Grades / Report Card') return <section className="academic-card"><div className="academic-title"><h1>Grades / Report Card</h1><span>Official Report • BSIT - 3rd Year</span></div><div className="pending-banner">Grades are pending. Your teachers have not submitted grades for this term yet.</div><div className="table-wrap"><table><thead><tr><th>Code</th><th>Subject</th><th>Prelim</th><th>Midterm</th><th>Final</th><th>Average</th><th>Units</th></tr></thead><tbody>{enrolledSubjects.map(([code, name]) => <tr key={code}><td>{code}</td><td>{name}</td><td colSpan={4} className="pending-cell">Pending</td><td>3</td></tr>)}</tbody></table></div></section>;
  if (page === 'Class Schedule') return <section className="academic-card"><h1>Weekly Timetable</h1><div className="timetable"><div className="timetable-head"><b>Time</b>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => <b key={day}>{day}</b>)}</div>{[['7:30-9:00', 'CS 301', '', 'CS 301', '', ''], ['9:00-10:30', '', 'CS 302', '', 'CS 302', 'CS 303 Lab'], ['10:30-12:00', 'GE 101', '', 'GE 101', '', '']].map((row) => <div className="timetable-row" key={row[0]}>{row.map((cell, index) => <span className={index === 0 ? 'time-cell' : cell ? 'class-cell' : ''} key={`${row[0]}-${index}`}>{cell}</span>)}</div>)}</div></section>;
  if (page === 'Enrolled Subjects') return <section className="academic-card"><h1>Enrolled Subjects (Current Sem)</h1><div className="subject-list">{enrolledSubjects.map(([code, name]) => <button className="subject-row" key={code} onClick={() => onNotify(`${code} subject details opened`)}><div><strong>{code} - {name}</strong><span>3 units • BSIT-3A • Room 301</span></div><b>Enrolled</b></button>)}</div></section>;
  if (page === 'Curriculum Checklist') return <section className="academic-card"><h1>Curriculum Checklist / Degree Progress</h1><div className="degree-progress"><span style={{ width: '0%' }} /></div><div className="empty-state"><strong>Progress begins after enrollment</strong><p>Your curriculum checklist will update as subjects are completed.</p></div></section>;
  if (page === 'Attendance Records') return <section className="academic-card"><h1>Attendance Record Viewing</h1><div className="pending-banner">Attendance will appear after your assigned classes begin.</div>{enrolledSubjects.map(([code, name]) => <div className="attendance-row pending-attendance" key={code}><div><strong>{code} - {name}</strong><b>Pending</b></div></div>)}</section>;
  if (Object.values(subsystemSubmenus).some((items) => items.some(([, item]) => item === page))) return <section className="academic-card subsystem-placeholder"><h1>{page}</h1><p>This {page.toLowerCase()} workspace is ready for your next workflow.</p><button className="primary-button" onClick={() => onNotify(`${page} opened`)}>Open {page} <span>→</span></button></section>;
  return <section className="academic-card subsystem-placeholder"><h1>{page}</h1><p>This subsystem is ready for your next workflow.</p><button className="primary-button" onClick={() => onNotify(`${page} opened`)}>Open {page} <span>→</span></button></section>;
};

export const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ firstName: string; lastName: string; role: string } | null>(null);
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [notificationCount, setNotificationCount] = useState(2);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginRole, setLoginRole] = useState('Student');
  const [loginError, setLoginError] = useState('');
  const [enrollmentSubmitted, setEnrollmentSubmitted] = useState(false);
  const [enrollmentName, setEnrollmentName] = useState('');
  const [enrollmentEmail, setEnrollmentEmail] = useState('');
  const [enrollmentPhone, setEnrollmentPhone] = useState('');
  const [enrollmentProgram, setEnrollmentProgram] = useState('BSIT');
  const [enrollmentYear, setEnrollmentYear] = useState('1st Year');
  const [googleEnrollmentToken, setGoogleEnrollmentToken] = useState('');
  const [expandedSubsystem, setExpandedSubsystem] = useState('Academic Records');
  const [hasEnrollment, setHasEnrollment] = useState(false);
  const [campusSlide, setCampusSlide] = useState(0);
  const campusSlides = [
<<<<<<< HEAD
    { src: assetUrl('cec-campus-collage.png'), alt: 'Cebu Eastern College campus facilities' },
    { src: assetUrl('cec-campus-group.png'), alt: 'Cebu Eastern College faculty and staff' },
    { src: assetUrl('cec-campus-front.png'), alt: 'Cebu Eastern College building' },
=======
    { src: '/cec-campus-collage.png', alt: 'Cebu Eastern College campus facilities' },
    { src: '/cec-campus-group.png', alt: 'Cebu Eastern College faculty and staff' },
    { src: '/cec-campus-front.png', alt: 'Cebu Eastern College building' },
>>>>>>> second-branch
  ];

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('googleEnrollmentToken');
    if (token) {
      setGoogleEnrollmentToken(token);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setCampusSlide((current) => (current + 1) % campusSlides.length), 4500);
    return () => window.clearInterval(timer);
  }, []);

  const startGoogleLogin = async () => {
    try {
      const response = await api.post('/auth/google/login-url');
      window.location.assign(response.data.url);
    } catch (error) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setLoginError(apiError.response?.data?.message ?? 'Google login is not configured.');
    }
  };

  const submitEnrollment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');
    try {
      await api.post('/auth/enrollment', {
        fullName: enrollmentName,
        personalEmail: enrollmentEmail,
        phone: enrollmentPhone,
        program: enrollmentProgram,
        yearLevel: Number(enrollmentYear.replace(/\D/g, '')),
        requestedRole: loginRole.toLowerCase(),
        googleToken: googleEnrollmentToken || undefined,
      });
      setEnrollmentSubmitted(true);
      setLoginError('Account created. Your school email and temporary password were sent to your Gmail.');
      notify('Account details sent to your Gmail.');
    } catch (error) {
      const apiError = error as { response?: { data?: { message?: string } } };
      setLoginError(apiError.response?.data?.message ?? 'Enrollment could not be completed. Please try again.');
    }
  };

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2600);
  };

  const changeSection = (section: string) => {
    setActiveNav(section);
    setShowNotifications(false);
    if (section !== 'Dashboard') notify(`${section} section selected`);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLoginError('Enter your email and password to continue.');
      return;
    }
    setLoginError('');
    const account = demoAccounts[loginRole];
    if (account && email.trim().toUpperCase() === account.identifier.toUpperCase() && password === account.password) {
      const names = loginRole === 'Student' ? { firstName: 'Demo', lastName: 'Student' } : { firstName: loginRole, lastName: 'User' };
      setCurrentUser({ ...names, role: loginRole.toLowerCase() });
      setIsAuthenticated(true);
      setActiveNav(loginRole === 'Student' ? 'Registration / Enrollment' : 'Dashboard');
      notify(`Welcome back, ${names.firstName}`);
      return;
    }
    try {
      const response = await api.post('/auth/login', { identifier: email.trim(), password });
      const user = response.data.data.user;
      setCurrentUser({ firstName: user.firstName, lastName: user.lastName, role: user.role });
      setIsAuthenticated(true);
      setActiveNav(user.role === 'student' ? 'Registration / Enrollment' : 'Dashboard');
      notify(`Welcome back, ${user.firstName}`);
    } catch (requestError) {
      const apiError = requestError as { response?: { data?: { message?: string } } };
      setLoginError(apiError.response?.data?.message ?? `Invalid credentials. Demo ${loginRole.toLowerCase()} account: ${account?.identifier ?? 'not available'}.`);
    }
  };

  if (!isAuthenticated) {
    return (
<<<<<<< HEAD
      <main className="login-page" style={{ backgroundImage: `url("${assetUrl('cec-login-banner.png')}")` }}>
        <section className="login-card">
          <div className="login-intro">
            <div className="login-brand"><img className="brand-mark login-mark" src={assetUrl('cec-logo.png')} alt="Cebu Eastern College logo" /></div>
            <h1>Cebu Eastern College Portal</h1>
            <div className="campus-slideshow" aria-label="Cebu Eastern College campus gallery">
              <img className="campus-slide-image" src={campusSlides[campusSlide].src} alt={campusSlides[campusSlide].alt} />
              <div className="campus-slide-dots">{campusSlides.map((slide, index) => <button key={slide.src} type="button" className={index === campusSlide ? 'campus-dot active' : 'campus-dot'} onClick={() => setCampusSlide(index)} aria-label={`Show campus image ${index + 1}`} />)}</div>
            </div>
          </div>
          <div className="login-form-panel">
            <div className="login-heading"><h2>Login to CEC Portal</h2></div>
            <div className="role-tabs">{['Student', 'Teacher', 'Admin'].map((role) => <button type="button" className={loginRole === role ? 'role-tab selected' : 'role-tab'} key={role} onClick={() => { setLoginRole(role); setLoginError(''); }}>{role}</button>)}</div>
            {loginRole === 'Student' && googleEnrollmentToken && !enrollmentSubmitted ? <form onSubmit={submitEnrollment} className="login-form">
              <h3>Apply for a {loginRole} account</h3>
              <p className="login-help">Submit your Gmail and details. Your CEC account will be created and sent to that Gmail immediately.</p>
              <label htmlFor="enrollment-name">FULL NAME</label>
              <input id="enrollment-name" required value={enrollmentName} onChange={(event) => setEnrollmentName(event.target.value)} placeholder="Your full name" />
              <label htmlFor="enrollment-email">PERSONAL EMAIL</label>
              <input id="enrollment-email" required type="email" value={enrollmentEmail} onChange={(event) => setEnrollmentEmail(event.target.value)} placeholder="your Gmail address" />
              <label htmlFor="enrollment-phone">CONTACT NUMBER</label>
              <input id="enrollment-phone" required value={enrollmentPhone} onChange={(event) => setEnrollmentPhone(event.target.value)} placeholder="09XXXXXXXXX" />
              <label htmlFor="enrollment-program">PROGRAM</label>
              <select id="enrollment-program" value={enrollmentProgram} onChange={(event) => setEnrollmentProgram(event.target.value)}><option>BSIT</option><option>BSCS</option><option>BEED</option></select>
              <label htmlFor="enrollment-year">YEAR LEVEL</label>
              <select id="enrollment-year" value={enrollmentYear} onChange={(event) => setEnrollmentYear(event.target.value)}><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select>
              {loginError && <p className="login-error" role="alert">{loginError}</p>}
              <button className="login-button" type="submit">Submit Enrollment</button>
            </form> : <form onSubmit={handleLogin} className="login-form">
              <label htmlFor="email">ID / USERNAME</label>
              <input id="email" type="text" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your issued school account" autoComplete="username" />
              <label htmlFor="password">PASSWORD</label>
              <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••••" autoComplete="current-password" />
              <div className="login-options"><span /> <button type="button" className="text-button" onClick={() => setLoginError('Please contact support@cec.edu to reset your password.')}>Forgot Password?</button></div>
              {loginError && <p className="login-error" role="alert">{loginError}</p>}
              <button className="login-button" type="submit">Login to Portal</button>
              <button type="button" className="text-button" onClick={() => { setEnrollmentSubmitted(false); setLoginError(''); }}>Submit another application</button>
            </form>}
            <p className="login-help">Need help signing in? <a href="mailto:support@cec.edu">Contact support</a></p>
          </div>
        </section>
      </main>
=======
      <AuthContainer
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          setActiveNav(user.role === 'student' ? 'Registration / Enrollment' : 'Dashboard');
          notify(`Welcome back, ${user.firstName}`);
        }}
        onNotify={notify}
      />
>>>>>>> second-branch
    );
  }

  return (
    <div className="portal-shell">
      <aside className="sidebar" style={{ backgroundImage: `url("${assetUrl('cec-building.png')}")` }}>
        <div className="brand">
<<<<<<< HEAD
          <img className="brand-mark" src={assetUrl('cec-logo.png')} alt="Cebu Eastern College logo" />
=======
          <img className="brand-mark" src="/cec-logo.png" alt="Cebu Eastern College logo" />
>>>>>>> second-branch
          <div>
            <strong>CEC Portal</strong>
            <span>Student workspace</span>
          </div>
        </div>
        <div className="profile-mini">
          <div className="avatar avatar-large">AJ</div>
          <div>          <strong>{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Student'}</strong><span>Grade 12 · STEM</span></div>
        </div>
        <nav>
        <span className="nav-label">PORTAL</span>
        <button className={activeNav === 'Dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => changeSection('Dashboard')}><span className="nav-icon">▦</span>Dashboard</button>
        {subsystemItems.map(([icon, label]) => {
          const isAcademic = label === 'Academic Records';
          const isAuthentication = label === 'Authentication';
          const isExpanded = expandedSubsystem === label;
          return <div className="subsystem-group" key={label}>
            <button className={activeNav === label ? 'nav-item subsystem-button active' : 'nav-item subsystem-button'} onClick={() => { setExpandedSubsystem(isExpanded ? '' : label); if (!isAcademic && !isAuthentication) changeSection(label); }}>
              <span className="nav-icon">{icon}</span><span>{label}</span><b className="chevron">{isExpanded ? '⌄' : '›'}</b>
            </button>
            {isAcademic && isExpanded && <div className="submenu">{academicItems.map(([itemIcon, itemLabel]) => <button className={activeNav === itemLabel ? 'submenu-item active' : 'submenu-item'} key={itemLabel} onClick={() => changeSection(itemLabel)}><span>{itemIcon}</span>{itemLabel}</button>)}</div>}
            {isAuthentication && isExpanded && <div className="submenu">{authenticationItems.map(([itemIcon, itemLabel]) => <button className={activeNav === itemLabel ? 'submenu-item active' : 'submenu-item'} key={itemLabel} onClick={() => changeSection(itemLabel)}><span>{itemIcon}</span>{itemLabel}</button>)}</div>}
            {!isAcademic && !isAuthentication && isExpanded && subsystemSubmenus[label] && <div className="submenu">{subsystemSubmenus[label].map(([itemIcon, itemLabel]) => <button className={activeNav === itemLabel ? 'submenu-item active' : 'submenu-item'} key={itemLabel} onClick={() => changeSection(itemLabel)}><span>{itemIcon}</span>{itemLabel}</button>)}</div>}
          </div>;
        })}
        <span className="nav-label nav-label-spaced">ACCOUNT</span>
        <button className="nav-item" onClick={() => changeSection('Settings')}><span className="nav-icon">⚙</span>Settings</button>
        <button className="nav-item logout-item" onClick={() => { localStorage.removeItem('cec_access_token'); setCurrentUser(null); setIsAuthenticated(false); setActiveNav('Dashboard'); setShowNotifications(false); }}><span className="nav-icon">↪</span>Log out</button>
        </nav>
        <div className="sidebar-footer"><span className="status-dot" />All systems operational</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
<<<<<<< HEAD
          <div className="mobile-brand"><img className="brand-mark" src={assetUrl('cec-logo.png')} alt="Cebu Eastern College logo" /><strong>CEC Portal</strong></div>
=======
          <div className="mobile-brand"><img className="brand-mark" src="/cec-logo.png" alt="Cebu Eastern College logo" /><strong>CEC Portal</strong></div>
>>>>>>> second-branch
          <div className="breadcrumb"><span>Student portal</span><b>/</b><strong>{activeNav}</strong></div>
          <div className="top-actions">
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => { setShowNotifications(!showNotifications); setNotificationCount(0); }}>♢{notificationCount > 0 && <span className="notification-dot" />}</button>
            <button className="top-profile profile-button" onClick={() => { localStorage.removeItem('cec_access_token'); setCurrentUser(null); setIsAuthenticated(false); setEmail(''); setPassword(''); }}><div className="avatar">{currentUser ? `${currentUser.firstName[0] ?? ''}${currentUser.lastName[0] ?? ''}` : 'U'}</div><span>{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'User'}</span><b>⌄</b></button>
          </div>
          {showNotifications && <div className="notification-popover"><strong>Notifications</strong><p>Your Web Systems assignment is due tomorrow.</p><p>Attendance record updated.</p><button className="text-button" onClick={() => { setShowNotifications(false); notify('All notifications marked as read'); }}>Mark all as read</button></div>}
        </header>

        <div className="page">
          {activeNav === 'Dashboard' && <section className="welcome-row">
            <div><span className="eyebrow">CEC PORTAL</span><h1>Welcome to your portal <span>✦</span></h1><p>Here&apos;s what&apos;s happening with your academic journey.</p></div>
            <button className="primary-button" onClick={() => changeSection('Grades / Report Card')}>View academic records <span>→</span></button>
          </section>}

<<<<<<< HEAD
          {activeNav !== 'Dashboard' ? (authenticationItems.some(([, item]) => item === activeNav) ? authenticationPage(activeNav, notify) : subsystemSubmenus.Enrollment.some(([, item]) => item === activeNav) ? <EnrollmentPage page={activeNav} onNotify={notify} /> : Object.values(subsystemSubmenus).some((items) => items.some(([, item]) => item === activeNav)) ? <StudentFunctionalPage page={activeNav} onNotify={notify} /> : academicPage(activeNav, notify, hasEnrollment, () => { setHasEnrollment(true); notify('Subjects enrolled successfully'); })) : hasEnrollment ? <>
=======
          {activeNav !== 'Dashboard' ? (authenticationItems.some(([, item]) => item === activeNav) ? authenticationPage(activeNav, notify, currentUser) : subsystemSubmenus.Enrollment.some(([, item]) => item === activeNav) ? <EnrollmentPage page={activeNav} onNotify={notify} /> : Object.values(subsystemSubmenus).some((items) => items.some(([, item]) => item === activeNav)) ? <StudentFunctionalPage page={activeNav} onNotify={notify} /> : academicPage(activeNav, notify, hasEnrollment, () => { setHasEnrollment(true); notify('Subjects enrolled successfully'); })) : hasEnrollment ? <>
>>>>>>> second-branch
          <section className="metrics-grid">
            <article className="metric-card"><div className="metric-top"><span>Current average</span><span className="metric-icon blue">↗</span></div><strong>93.7<span>%</span></strong><div className="metric-foot positive">↑ 2.4% <em>from last term</em></div></article>
            <article className="metric-card"><div className="metric-top"><span>Attendance rate</span><span className="metric-icon green">✓</span></div><strong>96<span>%</span></strong><div className="progress-track"><div className="progress-fill green-fill" style={{ width: '96%' }} /></div><div className="metric-foot"><em>Excellent standing</em></div></article>
            <article className="metric-card"><div className="metric-top"><span>Units completed</span><span className="metric-icon orange">▤</span></div><strong>18<span className="muted-number"> / 24</span></strong><div className="progress-track"><div className="progress-fill orange-fill" style={{ width: '75%' }} /></div><div className="metric-foot"><em>6 units remaining</em></div></article>
            <article className="metric-card"><div className="metric-top"><span>Class rank</span><span className="metric-icon purple">★</span></div><strong>08<span className="muted-number">th</span></strong><div className="metric-foot purple-text">Top 10% <em>of your batch</em></div></article>
          </section>

          <div className="content-grid">
            <section className="panel courses-panel">
              <div className="panel-heading"><div><h2>My courses</h2><p>Current term · 2025–2026</p></div><button className="text-button" onClick={() => changeSection('Grades / Report Card')}>View all <span>→</span></button></div>
              <div className="course-list">{courses.map((course) => <button className="course-row course-button" key={course.code} onClick={() => setSelectedCourse(course)}><div className="course-badge" style={{ backgroundColor: course.color }}>{course.code.split(' ')[0]}</div><div className="course-info"><strong>{course.name}</strong><span>{course.teacher} <i>·</i> {course.schedule}</span></div><div className="course-score"><strong>{course.score}%</strong><span>Current grade</span></div><span className="row-arrow">›</span></button>)}</div>
            </section>
            <section className="panel schedule-panel">
              <div className="panel-heading"><div><h2>Today&apos;s schedule</h2><p>Monday, September 8</p></div><button className="more-button" onClick={() => changeSection('Class Schedule')}>•••</button></div>
              <div className="schedule-list">
                <div className="schedule-item"><span className="time">08:00<br /><small>AM</small></span><div className="schedule-line blue-line" /><div><strong>Statistics and Probability</strong><span>Room 304 · Ms. Reyes</span></div></div>
                <div className="schedule-item"><span className="time">10:30<br /><small>AM</small></span><div className="schedule-line orange-line" /><div><strong>Research Consultation</strong><span>Library · Mr. Cruz</span></div></div>
                <div className="schedule-item"><span className="time">01:00<br /><small>PM</small></span><div className="schedule-line green-line" /><div><strong>Web Systems and Design</strong><span>Lab 2 · Dr. Santos</span></div></div>
              </div>
            </section>
          </div>

          <div className="bottom-grid">
            <section className="panel deadlines-panel"><div className="panel-heading"><div><h2>Upcoming deadlines</h2><p>Stay on top of your requirements</p></div><button className="text-button" onClick={() => changeSection('Class Schedule')}>See calendar <span>→</span></button></div><div className="deadline"><div className="date-box"><strong>10</strong><span>SEP</span></div><div><strong>Web Systems project proposal</strong><span>Web Systems and Design</span></div><span className="due-tag urgent">Due in 2 days</span></div><div className="deadline"><div className="date-box"><strong>15</strong><span>SEP</span></div><div><strong>Statistics problem set #3</strong><span>Statistics and Probability</span></div><span className="due-tag">Due in 7 days</span></div></section>
            <section className="panel announcement-panel"><div className="panel-heading"><div><h2>Campus updates</h2><p>Latest announcements</p></div><button className="more-button" onClick={() => notify('You are up to date')}>•••</button></div><div className="announcement"><span className="announcement-icon">!</span><div><strong>Student council elections</strong><p>Voting opens this Friday at 8:00 AM.</p><small>2 hours ago</small></div></div><div className="announcement"><span className="announcement-icon purple-icon">◆</span><div><strong>Library extended hours</strong><p>Open until 9:00 PM during exam week.</p><small>Yesterday</small></div></div></section>
          </div>
          </> : <section className="academic-card dashboard-empty"><span className="empty-icon">○</span><h1>Your dashboard is waiting for enrollment</h1><p>No classes, grades, attendance, or deadlines are available yet. Enroll in subjects to start your academic record.</p><button className="primary-button" onClick={() => changeSection('Enrolled Subjects')}>Go to enrollment <span>→</span></button></section>}
          {selectedCourse && <div className="modal-backdrop" onClick={() => setSelectedCourse(null)}><section className="course-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" aria-label="Close course details" onClick={() => setSelectedCourse(null)}>×</button><div className="course-badge modal-badge" style={{ backgroundColor: selectedCourse.color }}>{selectedCourse.code.split(' ')[0]}</div><span className="eyebrow">{selectedCourse.code}</span><h2>{selectedCourse.name}</h2><p>{selectedCourse.teacher} · {selectedCourse.schedule}</p><div className="modal-grade"><strong>{selectedCourse.score}%</strong><span>Current grade</span></div><button className="primary-button" onClick={() => { setSelectedCourse(null); notify('Course records opened'); }}>Open course records <span>→</span></button></section></div>}
          {message && <div className="toast" role="status">{message}</div>}
          <footer><span>© 2025 CEC School Portal</span><span>Need help? <a href="mailto:support@cec.edu">Contact support</a></span></footer>
        </div>
      </main>
    </div>
  );
};
