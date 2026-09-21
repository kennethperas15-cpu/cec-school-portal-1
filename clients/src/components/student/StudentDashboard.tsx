import { useState } from 'react';
import { useCollection, uid } from '../../services/crud';
import { portalApi } from '../../services/portal';
import { RoleDashboardHome } from '../shared/RoleDashboardHome';
import { DashboardCommandMenu } from '../shared/DashboardCommandMenu';
import { NotificationCenter } from '../shared/NotificationCenter';
import { openEditDialog } from '../shared/EditDialog';
import { WorkflowTracker, type WorkflowStep } from '../shared/WorkflowTracker';

type Props = { currentUser: { firstName: string; lastName: string; role: string } | null; onNotify: (t: string) => void; onLogout: () => void; };
type Rec = { id: string; name: string; role: string };
type Col = { list: Rec[]; create: (x: { id?: string; name: string; role: string }) => void; update: (id: string, p: Partial<Rec>) => void; remove: (id: string) => void; setList: (v: Rec[] | ((p: Rec[]) => Rec[])) => void };
const NAVY = '#0B3D91';
type Group = { id: string; label: string; icon: string; items: { label: string; route: string }[] };
const GROUPS: Group[] = [
  { id: 'auth', label: 'AUTHENTICATION', icon: '◈', items: [{ label: 'Profile Management', route: 's_auth_profile' }, { label: 'Registration / Enrollment', route: 's_auth_register' }, { label: 'Password Recovery', route: 's_auth_recovery' }] },
  { id: 'acad', label: 'ACADEMIC RECORDS', icon: '⍾', items: [{ label: 'Grades / Report Card', route: 's_acad_grades' }, { label: 'Class Schedule', route: 's_acad_schedule' }, { label: 'Enrolled Subjects', route: 's_acad_subjects' }, { label: 'Curriculum Checklist', route: 's_acad_checklist' }, { label: 'Attendance Records', route: 's_acad_attendance' }] },
  { id: 'enroll', label: 'ENROLLMENT', icon: '▤', items: [{ label: 'Online Enrollment', route: 's_enr_online' }, { label: 'Section Selection', route: 's_enr_sections' }, { label: 'Document Submission', route: 's_enr_docs' }, { label: 'Status Tracker', route: 's_enr_status' }] },
  { id: 'fin', label: 'FINANCIAL', icon: '▦', items: [{ label: 'Tuition Assessment', route: 's_fin_assess' }, { label: 'Payment Portal', route: 's_fin_pay' }, { label: 'Billing History', route: 's_fin_billing' }, { label: 'Scholarship Application', route: 's_fin_scholar' }] },
  { id: 'lms', label: 'LMS', icon: '▥', items: [{ label: 'Course Material', route: 's_lms_materials' }, { label: 'Assignments', route: 's_lms_assign' }, { label: 'Quiz / Exam', route: 's_lms_quiz' }, { label: 'Announcements', route: 's_lms_announce' }, { label: 'Discussion Forum', route: 's_lms_forum' }] },
  { id: 'lib', label: 'LIBRARY', icon: '▧', items: [{ label: 'Book Catalog', route: 's_lib_catalog' }, { label: 'Borrowing Tracker', route: 's_lib_borrow' }, { label: 'Reservations', route: 's_lib_reserve' }, { label: 'Fines / Penalties', route: 's_lib_fines' }] },
  { id: 'comm', label: 'COMMUNICATION', icon: '✉', items: [{ label: 'Notification Center', route: 's_com_notif' }, { label: 'Announcement Board', route: 's_com_board' }, { label: 'Messaging', route: 's_com_msg' }] },
  { id: 'support', label: 'SUPPORT SERVICES', icon: '◫', items: [{ label: 'Guidance Appointment', route: 's_sup_guide' }, { label: 'Document Request', route: 's_sup_docs' }, { label: 'Complaint / Feedback', route: 's_sup_feedback' }] },
];
const pill: React.CSSProperties = { border: '1px solid #e2e7ef', background: '#fff', borderRadius: 999, padding: '6px 12px', fontSize: 12, color: '#6b7890' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e8ecf3', borderRadius: 16, padding: 32, maxWidth: 1120, margin: '0 auto' };
const box: React.CSSProperties = { border: '1px solid #e6eaf1', borderRadius: 12, padding: 18, marginTop: 14 };
const btn: React.CSSProperties = { background: NAVY, color: '#fff', border: 0, borderRadius: 8, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' };
const ghost: React.CSSProperties = { border: '1px solid #e2e7ef', background: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' };
const inp: React.CSSProperties = { border: '1px solid #e2e7ef', borderRadius: 10, padding: '12px 14px', fontSize: 14, width: '100%', background: '#fff' };
const lbl: React.CSSProperties = { fontSize: 12, color: '#6b7890', letterSpacing: '.04em', marginBottom: 6, display: 'block' };

const Footer = () => (<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}><span style={pill}>CEC Blue #0B3D91 • Gold #FFC928</span><span style={pill}>24 Subsystems • 31 Modules Functional</span><span style={pill}>Full CRUD • localStorage persisted</span></div>);

const CrudSection = ({ title, col, onNotify, hint }: { title: string; col: Col; onNotify: (t: string) => void; hint: string }) => {
  const [v, setV] = useState('');
  return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>{title}</h1>
    <form style={{ display: 'flex', gap: 8, marginTop: 14, maxWidth: 640 }} onSubmit={(e) => { e.preventDefault(); if (!v.trim()) return; col.create({ id: uid('s'), name: v.trim(), role: hint }); setV(''); onNotify(`${title} created`); }}>
      <input style={inp} placeholder={`New ${title}`} value={v} onChange={(e) => setV(e.target.value)} aria-label={title} /><button style={btn} type="submit">Add</button>
    </form>
    <div style={box}>{col.list.map((r) => <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6', fontSize: 14 }}><div><strong>{r.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{r.id} • {r.role}</div></div><div style={{ display: 'flex', gap: 6 }}><button style={ghost} onClick={() => openEditDialog('Edit record', r.name, (nv) => { col.update(r.id, { name: nv }); onNotify('Updated'); })}>Edit</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { if (window.confirm('Delete this record?')) { col.remove(r.id); onNotify('Deleted'); } }}>Delete</button></div></div>)}{!col.list.length && <div style={{ color: '#6b7890' }}>No records yet — add one above.</div>}</div><Footer /></section>);
};

const TwoFieldForm = ({ title, col, onNotify, ph1, ph2 }: { title: string; col: Col; onNotify: (t: string) => void; ph1: string; ph2: string }) => {
  const [a, setA] = useState(''); const [b, setB] = useState('');
  return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>{title}</h1>
    <form style={{ display: 'flex', gap: 8, marginTop: 14, maxWidth: 720 }} onSubmit={(e) => { e.preventDefault(); if (!a.trim()) return; col.create({ id: uid('s'), name: a.trim(), role: b.trim() || 'New' }); setA(''); setB(''); onNotify(`${title} created`); }}>
      <input style={inp} placeholder={ph1} value={a} onChange={(e) => setA(e.target.value)} /><input style={inp} placeholder={ph2} value={b} onChange={(e) => setB(e.target.value)} /><button style={btn} type="submit">Add</button>
    </form>
    <div style={box}>{col.list.map((r) => <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><div><strong>{r.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{r.role}</div></div><div style={{ display: 'flex', gap: 6 }}><button style={ghost} onClick={() => openEditDialog('Update status/detail', r.role, (nv) => { col.update(r.id, { role: nv }); onNotify('Updated'); })}>Update</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { if (window.confirm('Delete this record?')) { col.remove(r.id); onNotify('Deleted'); } }}>Delete</button></div></div>)}</div><Footer /></section>);
};

export const StudentDashboard = ({ currentUser, onNotify, onLogout }: Props) => {
  const [active, setActive] = useState('Dashboard');
  const [expanded, setExpanded] = useState('auth');
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState({ name: 'Juan Dela Cruz', id: 'CEC-2024-0015', course: 'BSIT - 3rd Year', email: 'juan.delacruz@cec.edu.ph', phone: '0917-123-4567', address: 'Colon St., Cebu City', guardian: 'Maria Dela Cruz - 0917-999-0000', emergency: 'Maria Dela Cruz (Mother) - 0917-999-0000 - Brgy. Tejero' });
  const subjects = useCollection<Rec>('s_subjects', [{ id: 'CS301', name: 'CS 301 - Data Structures', role: 'BSIT-3A • 3 units • Enrolled' }, { id: 'CS302', name: 'CS 302 - Database Systems', role: 'BSIT-3A • 3 units • Enrolled' }]);
  const schedule = useCollection<Rec>('s_schedule', [{ id: 'sch1', name: 'Mon 8:00-9:30 AM — CS 301', role: 'Lab 3 • Prof. Santos' }, { id: 'sch2', name: 'Tue 10:00-11:30 AM — CS 302', role: 'Lab 2 • Prof. Reyes' }]);
  const checklist = useCollection<Rec>('s_checklist', [{ id: 'IT101', name: 'IT 101 - Intro to Computing', role: 'done' }, { id: 'IT102', name: 'IT 102 - Programming 1', role: 'done' }, { id: 'IT201', name: 'IT 201 - Data Structures', role: 'pending' }]);
  const attendance = useCollection<Rec>('s_attendance', [{ id: 'at1', name: 'CS 301 — Oct 10', role: 'Present' }, { id: 'at2', name: 'CS 302 — Oct 11', role: 'Late' }]);
  const enrollApps = useCollection<Rec>('s_enroll_apps', [{ id: 'ENR-1', name: 'BSIT • 3rd Year • 1st Sem', role: 'Pending' }]);
  const docs = useCollection<Rec>('s_docs', [{ id: 'd1', name: 'PSA Birth Certificate', role: 'Verified' }]);
  const charges = useCollection<Rec>('s_charges', [{ id: 'c1', name: 'Tuition balance', role: '₱18,500 • Outstanding' }]);
  const history = useCollection<Rec>('s_history', [{ id: 'h1', name: 'OR-1001 — ₱5,000', role: 'Oct 01 • Tuition' }]);
  const scholar = useCollection<Rec>('s_scholar', [{ id: 'sc1', name: 'Academic Excellence', role: 'Under review' }]);
  const materials = useCollection<Rec>('s_materials', [{ id: 'm1', name: 'Week 5 Slides - Normalization', role: 'PDF • CS 302' }]);
  const assigns = useCollection<Rec>('s_assigns', [{ id: 'a1', name: 'ER Diagram Project', role: 'Due Oct 20 • Not submitted' }]);
  const quizzes = useCollection<Rec>('s_quiz', [{ id: 'q1', name: 'Quiz 3 - SQL Joins', role: '10 items • Not taken' }]);
  const books = useCollection<Rec>('s_books', [{ id: 'b1', name: 'Database System Concepts', role: 'Available' }]);
  const borrows = useCollection<Rec>('s_borrows', [{ id: 'br1', name: 'Intro to Algorithms', role: 'Due Oct 25 • Borrowed' }]);
  const fines = useCollection<Rec>('s_fines', [{ id: 'f1', name: 'Overdue — Lab manual', role: '₱50 • Unpaid' }]);
  const notifs = useCollection<Rec>('s_notifs', [{ id: 'n1', name: 'Library extended hours', role: 'Open until 9PM exam week' }]);
  const messages = useCollection<Rec>('s_messages', [{ id: 'msg1', name: 'To adviser: midterm coverage?', role: 'Sent • Today' }]);
  const guide = useCollection<Rec>('s_guide', [{ id: 'g1', name: 'Academic advising — Oct 22 10AM', role: 'Requested' }]);
  const docreq = useCollection<Rec>('s_docreq', [{ id: 'dr1', name: 'Certificate of Enrollment', role: 'Processing' }]);
  const feedback = useCollection<Rec>('s_feedback', [{ id: 'fb1', name: 'Canteen queue feedback', role: 'Submitted' }]);
  const [attFilter, setAttFilter] = useState('');
  const [secSel, setSecSel] = useState<string[]>([]);
  const [payAmt, setPayAmt] = useState('');
  const [payMethod, setPayMethod] = useState('GCash');
  const [payRef, setPayRef] = useState('');

  const submitEnrollment = async (pg: string, yr: string, sm: string) => {
    const auto = (() => { try { return localStorage.getItem('cec:auto_approve') === '1'; } catch { return false; } })();
    // 1) MySQL first (shared enrollment_applications table)
    let remoteId: string | null = null;
    try {
      const r = await portalApi.enrollCreate({
        fullName: profile.name || 'Student Applicant',
        personalEmail: profile.email || 'student@cec.edu.ph',
        phone: profile.phone || '09170000000',
        program: pg,
        yearLevel: Number(yr.replace(/\D/g, '')) || 1,
        requestedRole: 'student',
      });
      remoteId = r.id;
      if (auto) { try { await portalApi.enrollDecide(r.id, 'approved'); } catch { /* keep pending */ } }
    } catch { /* backend offline — local fallback below */ }
    const id = remoteId ?? uid('ENR');
    const status = auto ? 'Approved (auto)' : 'Pending';
    enrollApps.create({ id, name: `${pg} • ${yr} • ${sm}`, role: remoteId ? `${status} • MySQL` : status });
    try {
      const raw = localStorage.getItem('cec:a_enroll');
      const rows = raw ? (JSON.parse(raw) as { id: string; name: string; meta: string }[]) : [];
      if (!rows.some((x) => x.id === id)) {
        rows.push({ id, name: profile.name || 'Student Applicant', meta: `${pg} • ${yr} • ${sm} • ${remoteId ? 'MySQL' : 'local'} • ${auto ? 'Auto-approved' : 'Applied'}` });
        localStorage.setItem('cec:a_enroll', JSON.stringify(rows));
      }
    } catch { /* ignore */ }
    onNotify(auto ? 'Enrollment auto-approved' : remoteId ? 'Enrollment saved to MySQL — pending admin review' : 'Backend offline — enrollment saved locally');
  };
  const [enrPg, setEnrPg] = useState('BSIT'); const [enrYr, setEnrYr] = useState('3rd Year'); const [enrSm, setEnrSm] = useState('1st Semester');
  const route = GROUPS.flatMap((g) => g.items).find((i) => i.label === active)?.route ?? 's_dashboard';
  const moduleItems = ['Dashboard', ...GROUPS.flatMap((g) => g.items.map((item) => item.label))];
  const navigate = (label: string) => setActive(moduleItems.includes(label) ? label : 'Dashboard');
  const searchRecords = [
    { title: 'Juan Dela Cruz', detail: 'CEC-2024-0015 • BSIT-3A • juan.delacruz@cec.edu.ph', target: 'Profile Management' },
    ...subjects.list.map((item) => ({ title: item.name, detail: item.role, target: 'Grades / Report Card' })),
    ...assigns.list.map((item) => ({ title: item.name, detail: item.role, target: 'Assignments' })),
    ...docs.list.map((item) => ({ title: item.name, detail: item.role, target: 'Document Submission' })),
    ...charges.list.map((item) => ({ title: item.name, detail: item.role, target: 'Payment Portal' })),
  ];
  const enrollmentSteps: WorkflowStep[] = [
    { label: 'Application Started', updatedAt: 'Sep 2, 2026', updatedBy: 'Juan Dela Cruz', notes: 'Online enrollment application created.', nextAction: 'Submit all required documents', documents: ['Application form'] },
    { label: 'Documents Submitted', updatedAt: 'Sep 3, 2026', updatedBy: 'Juan Dela Cruz', notes: 'Identity and academic documents uploaded.', nextAction: 'Registrar validation', documents: ['Valid ID', 'Report card'] },
    { label: 'Under Review', updatedAt: 'Sep 4, 2026', updatedBy: 'Registrar Office', notes: 'Application is being validated by the registrar.', nextAction: 'Wait for approval decision', documents: ['Application checklist'] },
    { label: 'Approved', updatedAt: 'Sep 5, 2026', updatedBy: 'Registrar Admin', notes: 'Enrollment requirements approved.', nextAction: 'Complete registration and assessment', documents: ['Approval notice'] },
    { label: 'Registered', nextAction: 'Keep your student records updated' },
  ];
  const documentSteps: WorkflowStep[] = [
    { label: 'Request Submitted', updatedAt: 'Sep 8, 2026', updatedBy: 'Juan Dela Cruz', notes: 'Certificate of enrollment request submitted.', nextAction: 'Records office processing', documents: ['Request form'] },
    { label: 'Processing', updatedAt: 'Sep 9, 2026', updatedBy: 'Records Office', notes: 'Request is being prepared and verified.', nextAction: 'Wait for release notice', documents: ['Student record'] },
    { label: 'Ready for Pickup', nextAction: 'Bring a valid ID to the records office' },
    { label: 'Released', nextAction: 'Keep the released document safely' },
  ];
  const paymentSteps: WorkflowStep[] = [
    { label: 'Assessment Created', updatedAt: 'Sep 1, 2026', updatedBy: 'Finance Office', notes: 'Tuition and applicable fees assessed.', nextAction: 'Review balance and choose payment method', documents: ['Assessment statement'] },
    { label: 'Payment Pending', updatedAt: 'Sep 1, 2026', updatedBy: 'Finance Office', notes: 'No payment has been posted yet.', nextAction: 'Submit payment before the deadline', documents: ['Billing statement'] },
    { label: 'Partially Paid', nextAction: 'Settle the remaining balance' },
    { label: 'Fully Paid', nextAction: 'Wait for receipt issuance' },
    { label: 'Receipt Issued', nextAction: 'Download and retain your official receipt' },
  ];

  const render = () => {
    if (active === 'Dashboard') return <RoleDashboardHome role="student" name={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Student'} onNavigate={navigate} />;
    if (active === 'Profile Management') {
      const F = (k: keyof typeof profile, label: string) => (<div><span style={lbl}>{label}</span><input style={inp} value={profile[k]} onChange={(e) => setProfile({ ...profile, [k]: e.target.value })} aria-label={label} /></div>);
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>Profile Management</h1><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>{F('name', 'NAME')}{F('id', 'ID')}{F('course', 'COURSE')}{F('email', 'EMAIL')}{F('phone', 'PHONE')}{F('address', 'ADDRESS')}{F('guardian', 'GUARDIAN')}{F('emergency', 'EMERGENCY')}</div><div style={{ marginTop: 18 }}><button style={{ ...btn, borderRadius: 10 }} onClick={() => onNotify('Profile changes saved (Update)')}>Save Changes</button></div><Footer /></section>);
    }
    if (active === 'Password Recovery') return (<section style={card}><h1 style={{ margin: 0 }}>Password Recovery</h1><form style={{ display: 'flex', gap: 10, marginTop: 14, maxWidth: 560 }} onSubmit={(e) => { e.preventDefault(); onNotify('Recovery link sent'); }}><input required style={inp} placeholder="student@cec.edu.ph" /><button style={btn} type="submit">Send Link</button></form><Footer /></section>);
    if (active === 'Grades / Report Card') return (<section style={card}><h1 style={{ margin: 0 }}>Grades / Report Card</h1><div style={{ ...box, padding: 0 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 12 }}>Code</th><th style={{ padding: 12 }}>Subject</th><th style={{ padding: 12 }}>Status</th><th style={{ padding: 12 }}>Actions</th></tr></thead><tbody>{subjects.list.map((s) => <tr key={s.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}>{s.id}</td><td style={{ padding: 12 }}>{s.name}</td><td style={{ padding: 12 }}>{s.role}</td><td style={{ padding: 12 }}><button style={ghost} onClick={() => onNotify(`${s.id} report viewed (Read)`)}>View</button> <button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { subjects.remove(s.id); onNotify('Subject dropped (Delete)'); }}>Drop</button></td></tr>)}</tbody></table></div><Footer /></section>);
    if (active === 'Class Schedule') return <TwoFieldForm title="Class Schedule" col={schedule} onNotify={onNotify} ph1="e.g. Wed 1:00-2:30 PM — IT 303" ph2="Room / Professor" />;
    if (active === 'Enrolled Subjects') return <CrudSection title="Enrolled Subjects" col={subjects} onNotify={onNotify} hint="BSIT-3A • 3 units • Enrolled" />;
    if (active === 'Curriculum Checklist') {
      const done = checklist.list.filter((c) => c.role === 'done').length;
      return (<section style={card}><h1 style={{ margin: 0 }}>Curriculum Checklist — {done}/{checklist.list.length} done</h1><div style={{ height: 10, background: '#edf1f5', borderRadius: 8, marginTop: 12 }}><div style={{ width: `${checklist.list.length ? (done / checklist.list.length) * 100 : 0}%`, height: '100%', background: NAVY, borderRadius: 8 }} /></div><div style={box}>{checklist.list.map((c) => <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={c.role === 'done'} onChange={() => { checklist.update(c.id, { role: c.role === 'done' ? 'pending' : 'done' }); onNotify('Checklist updated'); }} />{c.name}</label><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { checklist.remove(c.id); onNotify('Checklist item deleted'); }}>Delete</button></div>)}</div><Footer /></section>);
    }
    if (active === 'Attendance Records') {
      return (<section style={card}><h1 style={{ margin: 0 }}>Attendance Records</h1><input style={{ ...inp, marginTop: 14, maxWidth: 400 }} placeholder="Filter by subject..." value={attFilter} onChange={(e) => setAttFilter(e.target.value)} /><div style={box}>{attendance.list.filter((a) => a.name.toLowerCase().includes(attFilter.toLowerCase())).map((a) => <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><span>{a.name}</span><strong>{a.role}</strong></div>)}</div><Footer /></section>);
    }
    if (active === 'Online Enrollment') {
      return (<section style={card}><h1 style={{ margin: 0 }}>Online Enrollment</h1><p style={{ color: '#6b7890', fontSize: 13 }}>Applications go straight to Admin → Enrollment Approval. Turn on auto-approve there for instant approval.</p><form style={{ display: 'flex', gap: 8, marginTop: 14, maxWidth: 720 }} onSubmit={(e) => { e.preventDefault(); submitEnrollment(enrPg, enrYr, enrSm); }}><select style={inp} value={enrPg} onChange={(e) => setEnrPg(e.target.value)}><option>BSIT</option><option>BSCS</option><option>BEED</option></select><select style={inp} value={enrYr} onChange={(e) => setEnrYr(e.target.value)}><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select><select style={inp} value={enrSm} onChange={(e) => setEnrSm(e.target.value)}><option>1st Semester</option><option>2nd Semester</option></select><button style={btn} type="submit">Submit</button></form><Footer /></section>);
    }
    if (active === 'Section Selection') {
      const catalog = ['BSIT-3A — Data Structures', 'BSIT-3B — Web Development', 'BSCS-3A — Operating Systems'];
      return (<section style={card}><h1 style={{ margin: 0 }}>Section Selection</h1><div style={box}>{catalog.map((c) => <label key={c} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><input type="checkbox" checked={secSel.includes(c)} onChange={() => setSecSel((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))} />{c}</label>)}</div><div style={{ marginTop: 12 }}><button style={btn} onClick={() => { secSel.forEach((s) => subjects.create({ id: uid('CS'), name: s, role: 'Selected • Enrolled' })); setSecSel([]); onNotify(`${secSel.length} sections saved`); }}>Save Selection (Create)</button></div><Footer /></section>);
    }
    if (active === 'Status Tracker') return <WorkflowTracker title="Student enrollment" reference="CEC-2026-0015 • BSIT • 3rd Year" steps={enrollmentSteps} currentIndex={3} />;
    if (active === 'Document Submission') return <WorkflowTracker title="Certificate of enrollment request" reference="Document request • DOC-2026-0091" steps={documentSteps} currentIndex={1} />;
    if (active === 'Tuition Assessment') return <TwoFieldForm title="Tuition Assessment" col={charges} onNotify={onNotify} ph1="Charge" ph2="Amount • Status" />;
    if (active === 'Payment Portal') {
      const methodHint: Record<string, string> = { GCash: 'GCash wallet • 0917-XXX-XXXX • reference no.', Maya: 'Maya wallet • reference no.', 'GoTyme Bank': 'GoTyme • account no. 0100-XXXX-XXXX', UnionBank: 'UnionBank • account no. 1093-XXXX-XXXX', Metrobank: 'Metrobank • account no. 305-XXXX-XXXX', BPI: 'BPI • account no. 1234-XXXX-XX', Cashier: 'Pay at CEC cashier • Window 3' };
      return (<><WorkflowTracker title="Tuition payment" reference="Assessment • AY 2026–2027 • BSIT" steps={paymentSteps} currentIndex={1} /><section style={card}><h1 style={{ margin: 0 }}>Payment Portal</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>{['GCash', 'Maya', 'GoTyme Bank', 'UnionBank', 'Metrobank', 'BPI', 'Cashier'].map((m) => <button key={m} type="button" onClick={() => setPayMethod(m)} style={{ border: payMethod === m ? '2px solid #0B3D91' : '1px solid #e2e7ef', background: payMethod === m ? '#e8f1ff' : '#fff', borderRadius: 10, padding: '10px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{m}</button>)}</div>
        <div style={{ color: '#6b7890', fontSize: 13, marginTop: 10 }}>{methodHint[payMethod]}</div>
        <form style={{ display: 'flex', gap: 8, marginTop: 12, maxWidth: 720 }} onSubmit={(e) => { e.preventDefault(); if (!payAmt.trim()) return; history.create({ id: uid('OR'), name: `OR — ₱${payAmt.trim()} via ${payMethod}${payRef.trim() ? ` • Ref ${payRef.trim()}` : ''}`, role: 'Today • Tuition • Paid' }); charges.setList((rows) => rows.map((r) => ({ ...r, role: r.role.replace('Outstanding', 'Partially paid') }))); setPayAmt(''); setPayRef(''); onNotify(`Payment recorded via ${payMethod}`); }}>
          <input style={inp} placeholder="Amount e.g. 5000" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} aria-label="Amount" />
          <input style={inp} placeholder={payMethod === 'Cashier' ? 'OR number (optional)' : 'Reference / account no.'} value={payRef} onChange={(e) => setPayRef(e.target.value)} aria-label="Reference" />
          <select style={inp} value={payMethod} onChange={(e) => setPayMethod(e.target.value)} aria-label="Payment method"><option>GCash</option><option>Maya</option><option>GoTyme Bank</option><option>UnionBank</option><option>Metrobank</option><option>BPI</option><option>Cashier</option></select>
          <button style={btn} type="submit">Pay now</button>
        </form><Footer />        </section></>);
    }
    if (active === 'Billing History') return <CrudSection title="Billing History" col={history} onNotify={onNotify} hint="Tuition" />;
    if (active === 'Scholarship Application') return <TwoFieldForm title="Scholarship Application" col={scholar} onNotify={onNotify} ph1="Scholarship name" ph2="Status" />;
    if (active === 'Course Material') return <TwoFieldForm title="Course Material" col={materials} onNotify={onNotify} ph1="Material title" ph2="Type • Subject" />;
    if (active === 'Assignments') {
      return (<section style={card}><h1 style={{ margin: 0 }}>Assignments</h1><div style={box}>{assigns.list.map((a) => <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><div><strong>{a.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{a.role}</div></div><div style={{ display: 'flex', gap: 6 }}><button style={btn} onClick={() => { assigns.update(a.id, { role: 'Submitted • For review' }); onNotify('Assignment submitted (Update)'); }}>Submit</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { assigns.remove(a.id); onNotify('Assignment deleted'); }}>Delete</button></div></div>)}</div><Footer /></section>);
    }
    if (active === 'Quiz / Exam') {
      return (<section style={card}><h1 style={{ margin: 0 }}>Quiz / Exam</h1><div style={box}>{quizzes.list.map((qz) => <div key={qz.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><div><strong>{qz.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{qz.role}</div></div><div style={{ display: 'flex', gap: 6 }}><button style={btn} onClick={() => { const score = 7 + Math.floor(Math.random() * 4); quizzes.update(qz.id, { role: `Score ${score}/10 • Taken` }); onNotify(`Quiz submitted: ${score}/10`); }}>Take quiz</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { quizzes.remove(qz.id); onNotify('Quiz deleted'); }}>Delete</button></div></div>)}</div><Footer /></section>);
    }
    if (active === 'Book Catalog') return <TwoFieldForm title="Book Catalog" col={books} onNotify={onNotify} ph1="Book title" ph2="Availability" />;
    if (active === 'Borrowing Tracker') {
      return (<section style={card}><h1 style={{ margin: 0 }}>Borrowing Tracker</h1><div style={box}>{borrows.list.map((b) => <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><div><strong>{b.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{b.role}</div></div><div style={{ display: 'flex', gap: 6 }}><button style={ghost} onClick={() => { borrows.update(b.id, { role: 'Returned' }); onNotify('Book returned (Update)'); }}>Return</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { borrows.remove(b.id); onNotify('Record deleted'); }}>Delete</button></div></div>)}</div><Footer /></section>);
    }
    if (active === 'Reservations') return <TwoFieldForm title="Reservations" col={books} onNotify={onNotify} ph1="Book title" ph2="Pickup date" />;
    if (active === 'Fines / Penalties') {
      return (<section style={card}><h1 style={{ margin: 0 }}>Fines / Penalties</h1><div style={box}>{fines.list.map((f) => <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><div><strong>{f.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{f.role}</div></div><button style={btn} onClick={() => { fines.update(f.id, { role: 'Paid' }); onNotify('Fine paid (Update)'); }}>Pay</button></div>)}</div><Footer /></section>);
    }
    if (active === 'Notification Center' || active === 'Announcement Board' || active === 'Announcements') return <CrudSection title={active} col={notifs} onNotify={onNotify} hint="General" />;
    if (active === 'Messaging' || active === 'Discussion Forum') return <TwoFieldForm title={active} col={messages} onNotify={onNotify} ph1="Message" ph2="To / Topic" />;
    if (active === 'Guidance Appointment') return <TwoFieldForm title="Guidance Appointment" col={guide} onNotify={onNotify} ph1="e.g. Advising — Oct 22 10AM" ph2="Status" />;
    if (active === 'Document Request') return <TwoFieldForm title="Document Request" col={docreq} onNotify={onNotify} ph1="Document type" ph2="Status" />;
    if (active === 'Complaint / Feedback') return <TwoFieldForm title="Complaint / Feedback" col={feedback} onNotify={onNotify} ph1="Subject" ph2="Details / Status" />;
    if (active === 'Registration / Enrollment') {
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>Registration / Enrollment</h1><p style={{ color: '#6b7890', fontSize: 13 }}>New applications are sent to Admin → Enrollment Approval (same queue as Online Enrollment).</p><form style={{ display: 'flex', gap: 8, marginTop: 14, maxWidth: 720 }} onSubmit={(e) => { e.preventDefault(); submitEnrollment(enrPg, enrYr, enrSm); }}><select style={inp} value={enrPg} onChange={(e) => setEnrPg(e.target.value)}><option>BSIT</option><option>BSCS</option><option>BEED</option></select><select style={inp} value={enrYr} onChange={(e) => setEnrYr(e.target.value)}><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select><button style={btn} type="submit">Submit application</button></form><div style={box}>{enrollApps.list.map((a) => <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><div><strong>{a.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{a.id} • {a.role}</div></div><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { enrollApps.remove(a.id); onNotify('Application withdrawn'); }}>Withdraw</button></div>)}</div><Footer /></section>);
    }
    return <CrudSection title={active} col={subjects} onNotify={onNotify} hint="General" />;
  };

  return (
    <div className="role-dashboard" style={{ minHeight: '100vh', background: '#f3f5f9', fontFamily: 'Inter,system-ui,sans-serif' }}>
      <header className="dashboard-topbar" style={{ height: 68, background: '#fff', borderBottom: '1px solid #e5e9f0', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 270 }}><div style={{ width: 38, height: 38, borderRadius: 10, background: NAVY, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>CEC</div><div><div style={{ fontWeight: 800 }}>Cebu Eastern College</div><div style={{ fontSize: 10, color: '#8a94a6' }}>STUDENT PORTAL • 1ST SEM 2024-2025</div></div></div>
        <button onClick={() => setCollapsed((c) => !c)} style={{ border: '1px solid #e2e7ef', background: '#fff', borderRadius: 10, width: 38, height: 38, cursor: 'pointer' }} aria-label="Toggle sidebar">☰</button>
        <button className="dashboard-home-link" type="button" onClick={() => setActive('Dashboard')}>⌂ Dashboard</button><span style={{ background: '#e8f1ff', color: '#1d5fc2', fontSize: 12, fontWeight: 800, borderRadius: 8, padding: '5px 10px' }}>STUDENT</span><span style={{ color: '#8a94a6', fontSize: 13 }}>{active === 'Dashboard' ? 'Overview' : route}</span>
        <DashboardCommandMenu items={moduleItems} records={searchRecords} onNavigate={navigate} />
        <div className="dashboard-actions" style={{ marginLeft: 'auto' }}><NotificationCenter role="student" onNavigate={navigate} /><div className="dashboard-avatar" style={{ width: 36, height: 36, borderRadius: '50%', background: NAVY, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{currentUser?.firstName?.[0] ?? 'S'}</div></div>
      </header>
      <div style={{ display: 'flex' }}>
        {!collapsed && (<aside className="dashboard-sidebar" style={{ width: 320, background: '#fff', borderRight: '1px solid #e5e9f0', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 'calc(100vh - 68px)' }}>{GROUPS.map((g) => { const open = expanded === g.id; return (<div className={`dashboard-nav-group ${open ? 'is-open' : ''}`} key={g.id} style={{ border: '1px solid #e8ecf3', borderRadius: 12, padding: 8 }}><button onClick={() => setExpanded(open ? '' : g.id)} style={{ width: '100%', display: 'flex', gap: 10, border: 0, background: 'transparent', padding: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13 }}><span>{g.icon}</span><span style={{ flex: 1, textAlign: 'left' }}>{g.label}</span><span>{open ? '⌄' : '›'}</span></button>{open && <div style={{ display: 'grid', gap: 4 }}>{g.items.map((it) => <button key={it.label} onClick={() => setActive(it.label)} style={{ textAlign: 'left', border: active === it.label ? '2px solid #111' : 0, borderRadius: 8, padding: '11px 14px', background: active === it.label ? NAVY : 'transparent', color: active === it.label ? '#fff' : '#4a5872', cursor: 'pointer', fontWeight: active === it.label ? 700 : 400 }}>{it.label}</button>)}</div>}</div>); })}<div style={{ marginTop: 'auto', borderTop: '1px solid #eef1f6', paddingTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}><div><div style={{ fontWeight: 700, fontSize: 13 }}>{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Demo Student'}</div><div style={{ fontSize: 12, color: '#8a94a6' }}>student</div></div><button onClick={onLogout} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: '#8a94a6', cursor: 'pointer' }}>Log out</button></div></aside>)}
        <main className="dashboard-main" style={{ flex: 1, padding: 24, minWidth: 0 }}>{render()}</main>
      </div>
    </div>
  );
};
