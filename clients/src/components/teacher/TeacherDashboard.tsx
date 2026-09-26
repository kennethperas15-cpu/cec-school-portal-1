import { useEffect, useState } from 'react';
import { useCollection, uid, genSchoolId } from '../../services/crud';
import { useTheme } from '../../services/theme';
import { percentToPoint, formatPoint, averagePercent, gwa } from '../../services/grading';
import { pushNotification } from '../../services/notify';
import { setPhoto, readPhotoFile } from '../../services/photos';
import { PhotoAvatar } from '../shared/PhotoAvatar';
import { AlertPopup } from '../shared/AlertPopup';
import { ChangePassword } from '../shared/ChangePassword';
import { RoleDashboardHome } from '../shared/RoleDashboardHome';
import { DashboardCommandMenu } from '../shared/DashboardCommandMenu';
import { NotificationCenter } from '../shared/NotificationCenter';
import { openEditDialog } from '../shared/EditDialog';
import { useAcademicConfig } from '../../services/academicConfig';
import type { DashboardSection } from '../shared/RoleDashboardHome';

type Props = { currentUser: { firstName: string; lastName: string; role: string; id?: string; email?: string } | null; onNotify: (t: string) => void; onLogout: () => void; };
const NAVY = '#0B3D91';
const BASE = import.meta.env.BASE_URL || '/';
type Group = { id: string; label: string; icon: string; items: { label: string; route: string }[] };
const GROUPS: Group[] = [
  { id: 'home', label: 'DASHBOARD', icon: '⌂', items: [{ label: 'Dashboard', route: 't_dashboard' }] },
  { id: 'account', label: 'ACCOUNT', icon: '◈', items: [{ label: 'Profile Management', route: 't_auth_profile' }, { label: 'Password Recovery', route: 't_auth_recovery' }] },
  { id: 'class', label: 'CLASS MANAGEMENT', icon: '⍾', items: [{ label: 'Class List / Roster', route: 't_class_roster' }, { label: 'My Sections', route: 't_class_sections' }, { label: 'Seating Chart', route: 't_class_seating' }, { label: 'Student Lookup', route: 't_class_lookup' }] },
  { id: 'grading', label: 'GRADING', icon: '▤', items: [{ label: 'Grade Encoding', route: 't_grade_encode' }, { label: 'Computation', route: 't_grade_compute' }, { label: 'Finalization', route: 't_grade_final' }, { label: 'Exam Creation', route: 't_grade_exam' }] },
  { id: 'attendance', label: 'ATTENDANCE', icon: '◷', items: [{ label: 'Daily Attendance', route: 't_att_daily' }, { label: 'History', route: 't_att_history' }, { label: 'Report', route: 't_att_report' }] },
  { id: 'lms', label: 'LMS', icon: '▥', items: [{ label: 'Materials', route: 't_lms_materials' }, { label: 'Assignments', route: 't_lms_assign' }, { label: 'Announcements', route: 't_lms_announce' }, { label: 'Forum', route: 't_lms_forum' }] },
  { id: 'scheduling', label: 'SCHEDULING', icon: '▦', items: [{ label: 'Class Schedule', route: 't_sched_classes' }, { label: 'Consultation Slots', route: 't_sched_consult' }] },
  { id: 'communication', label: 'COMMUNICATION', icon: '✉', items: [{ label: 'Messaging', route: 't_comm_messenger' }, { label: 'Announcement Posting', route: 't_comm_post' }] },
  { id: 'reporting', label: 'REPORTING', icon: '◫', items: [{ label: 'Report Cards', route: 't_rep_cards' }, { label: 'Performance', route: 't_rep_perf' }, { label: 'Attendance Summary', route: 't_rep_att' }] },
];
const pill: React.CSSProperties = { border: '1px solid #e2e7ef', background: '#fff', borderRadius: 999, padding: '6px 12px', fontSize: 12, color: '#6b7890' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e8ecf3', borderRadius: 16, boxShadow: '0 1px 2px rgba(16,24,40,.05)', padding: 28, maxWidth: 1120, margin: '0 auto' };
const box: React.CSSProperties = { border: '1px solid #e6eaf1', borderRadius: 12, padding: 18, marginTop: 14 };
const btn: React.CSSProperties = { background: NAVY, color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const ghost: React.CSSProperties = { border: '1px solid #e2e7ef', background: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' };
const inp: React.CSSProperties = { border: '1px solid #e2e7ef', borderRadius: 8, padding: '10px 12px', fontSize: 13, width: '100%' };

const RowActions = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
    <button style={ghost} onClick={onEdit}>Edit</button>
    <button style={{ ...ghost, color: '#b91c1c', borderColor: '#fecaca' }} onClick={onDelete}>Delete</button>
  </div>
);

const localDateKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const scheduleIsToday = (value: string, today: Date): boolean => {
  const dateMatch = value.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (dateMatch) return dateMatch[0] === localDateKey(today);
  const normalized = value.trim().toLowerCase();
  const weekday = today.getDay();
  const namedDays = [
    ['sun', 'sunday'], ['mon', 'monday'], ['tue', 'tues', 'tuesday'], ['wed', 'wednesday'],
    ['thu', 'thur', 'thurs', 'thursday'], ['fri', 'friday'], ['sat', 'saturday'],
  ];
  if (namedDays[weekday].some((day) => new RegExp(`^${day}(\\b|\\s)`).test(normalized))) return true;
  if (/^su(\b|\s)/.test(normalized)) return weekday === 0;
  const code = normalized.match(/^[a-z,\s/]+/)?.[0]?.replace(/[\s,/]/g, '').toUpperCase() ?? '';
  const tokens = [{ code: 'TH', day: 4 }, { code: 'SU', day: 0 }, { code: 'M', day: 1 }, { code: 'T', day: 2 }, { code: 'W', day: 3 }, { code: 'F', day: 5 }, { code: 'S', day: 6 }];
  let remaining = code;
  const days: number[] = [];
  while (remaining) {
    const token = tokens.find((entry) => remaining.startsWith(entry.code));
    if (!token) return false;
    days.push(token.day);
    remaining = remaining.slice(token.code.length);
  }
  return days.includes(weekday);
};

const sectionCodeOf = (title: string): string => title.match(/^([a-z]+\s*-\s*\d+[a-z0-9]*)/i)?.[1]?.replace(/\s/g, '') ?? title.trim();

const localDateValue = (value: string): Date | null => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const TeacherDashboard = ({ currentUser, onNotify, onLogout }: Props) => {
  const [active, setActive] = useState('Dashboard');
  const [expanded, setExpanded] = useState('home');
  const [collapsed, setCollapsed] = useState(false);
  // Mobile: start shut, auto-close after each navigation so content is usable
  useEffect(() => {
    try {
      if (window.innerWidth < 800) setCollapsed(true);
    } catch { /* non-browser render */ }
  }, [active]);
  const { dark, toggle } = useTheme();
  const academicConfig = useAcademicConfig();
  const [dashboardSection, setDashboardSection] = useState('');
  const [q, setQ] = useState('');
  const roster = useCollection<{ id: string; name: string; course: string; email: string }>('t_roster_v2', []);
  // v2 stores: pre-launch — no enrolled students, so no sections, tasks, or messages
  const sections = useCollection<{ id: string; title: string; detail: string }>('t_sections_v2', []);
  // v2: gradebook starts empty — no demo students (fresh key, old seeds retired)
  const grades = useCollection('t_grades_v2', [] as { id: string; student: string; prelim: string; midterm: string; final: string; locked: string; section?: string }[]);
  const exams = useCollection<{ id: string; title: string; date: string; items: string }>('t_exams_v2', []);
  const attend = useCollection<{ id: string; student: string; date: string; status: string; section?: string }>('t_attend_v2', []);
  const materials = useCollection<{ id: string; title: string; type: string }>('t_materials_v2', []);
  const assigns = useCollection<{ id: string; title: string; due: string; submitted: string; section?: string }>('t_assign_v2', []);
  const posts = useCollection<{ id: string; title: string; body: string }>('t_posts_v2', []);
  const forum = useCollection<{ id: string; title: string; body: string }>('t_forum_v2', []);
  const sched = useCollection<{ id: string; title: string; when: string; where: string }>('t_sched_v2', []);
  const consults = useCollection<{ id: string; title: string; when: string; where: string }>('t_consult_v2', []);
  const messages = useCollection<{ id: string; title: string; when: string; where: string }>('t_messages_v2', []);
  const [profile, setProfile] = useState(() => {
    try {
      const raw = localStorage.getItem('cec:t_profile');
      if (raw) return JSON.parse(raw);
    } catch { /* fall through to defaults */ }
    return { name: 'Prof. Juan Santos - T-001', dept: 'BSIT Department • juan.santos@cec.edu.ph' };
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [rosNm, setRosNm] = useState(''); const [rosEm, setRosEm] = useState('');
  const [secT, setSecT] = useState(''); const [secD, setSecD] = useState('');
  const [grdSt, setGrdSt] = useState(''); const [grdMid, setGrdMid] = useState('');
  const [examT, setExamT] = useState('');
  const [examDate, setExamDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return localDateKey(date);
  });
  const [attSn, setAttSn] = useState(''); const [attSs, setAttSs] = useState('Present');
  const [genF1, setGenF1] = useState('');
  const [popup, setPopup] = useState<{ title: string; message: string; lines?: string[] } | null>(null);
  const [photoTick, setPhotoTick] = useState(0);
  const [photoError, setPhotoError] = useState('');
  const myPhotoId = currentUser?.id || 'T-001';

  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError('');
    try {
      const url = await readPhotoFile(file);
      setPhoto(myPhotoId, url);
      setPhotoTick((t) => t + 1);
      onNotify('Profile photo updated');
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Could not read that image.');
    }
  };

  const route = GROUPS.flatMap((g) => g.items).find((i) => i.label === active)?.route ?? 't_dashboard';
  const moduleItems = ['Dashboard', ...GROUPS.flatMap((g) => g.items.map((item) => item.label))];
  const navigate = (label: string, context?: string) => {
    setActive(moduleItems.includes(label) ? label : 'Dashboard');
    setDashboardSection(context ?? '');
  };
  const activeSectionCode = dashboardSection ? sectionCodeOf(dashboardSection) : '';
  const searchRecords = [
    ...roster.list.map((item) => ({ title: item.name, detail: `${item.id} • ${item.course} • ${item.email}`, target: 'Student Lookup' })),
    ...sections.list.map((item) => ({ title: item.title, detail: item.detail, target: 'My Sections' })),
    ...assigns.list.map((item) => ({ title: item.title, detail: `Due ${item.due} • ${item.submitted} submitted`, target: 'Assignments' })),
    ...messages.list.map((item) => ({ title: item.title, detail: item.where, target: 'Messaging' })),
  ];
  const startEdit = (id: string, values: Record<string, string>) => { setEditingId(id); setDraft(values); };
  const footer = null;

  const crudTable = (opts: { title: string; columns: string[]; rows: React.ReactNode; form?: React.ReactNode; note?: React.ReactNode }) => (
    <section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>{opts.title}</h1>{opts.form}{opts.note}<div style={{ ...box, padding: 0, overflow: 'hidden', marginTop: opts.note ? 12 : undefined }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>{opts.columns.map((c) => <th key={c} style={{ padding: '12px 14px' }}>{c}</th>)}</tr></thead><tbody>{opts.rows}</tbody></table></div>{footer}</section>
  );

  const phScaleNote = (
    <p style={{ margin: '10px 0 0', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
      PH college scale — type a <strong>percent</strong> (75–100) or a <strong>point</strong> (1.00–5.00):
      97–100 → 1.00 Excellent · 94–96 → 1.25 · 91–93 → 1.50 · 88–90 → 1.75 ·
      85–87 → 2.00 · 82–84 → 2.25 · 79–81 → 2.50 · 76–78 → 2.75 · 75 → 3.00 (passing) ·
      below 75 → 5.00 Failure.
    </p>
  );

  const render = () => {
    if (active === 'Dashboard') {
      const today = new Date();
      const todayKey = localDateKey(today);
      const classesToday = sched.list.filter((item) => scheduleIsToday(item.when, today));
      const todayAttendance = attend.list.filter((item) => item.date === todayKey);
      const recordedStudents = new Set(todayAttendance.flatMap((item) => [item.student.trim().toLowerCase(), item.id.trim().toLowerCase()]));
      const studentsWithoutAttendance = roster.list.filter((student) => !recordedStudents.has(student.name.trim().toLowerCase()) && !recordedStudents.has(student.id.trim().toLowerCase()));
      const incompleteGrades = grades.list.filter((grade) => !grade.locked && [grade.prelim, grade.midterm, grade.final].some((value) => !value.trim()));
      const readyToFinalize = grades.list.filter((grade) => !grade.locked && [grade.prelim, grade.midterm, grade.final].every((value) => !!value.trim()));
      const assignmentsToReview = assigns.list.filter((assignment) => Number.parseInt(assignment.submitted, 10) > 0);
      const upcomingExams = exams.list.filter((exam) => {
        const date = localDateValue(exam.date);
        return date !== null && date >= new Date(todayKey);
      }).sort((a, b) => (localDateValue(a.date)?.getTime() ?? 0) - (localDateValue(b.date)?.getTime() ?? 0));
      const classItems: DashboardSection['items'] = classesToday.map((item) => {
        const section = sectionCodeOf(item.title);
        return {
          title: item.title,
          detail: [item.when, item.where].filter(Boolean).join(' • '),
          status: 'Today',
          target: 'Class Schedule',
          actions: [
            { label: 'Attendance', target: 'Daily Attendance', context: item.title },
            { label: 'Roster', target: 'Class List / Roster', context: item.title },
            { label: 'Gradebook', target: 'Grade Encoding', context: section },
          ],
        };
      });
      const teacherSections: DashboardSection[] = [
        { title: 'Classes today', target: 'Class Schedule', emptyMessage: 'No classes with a schedule for today. Add or update class times in Class Schedule.', items: classItems },
        { title: 'Attendance to record', target: 'Daily Attendance', emptyMessage: todayAttendance.length ? 'Attendance has been recorded for the students currently in today’s roster.' : 'No attendance entries are dated today.', items: studentsWithoutAttendance.length ? [{ title: `${studentsWithoutAttendance.length} student${studentsWithoutAttendance.length === 1 ? '' : 's'} without a record`, detail: `Based on ${roster.list.length} roster entries and attendance dated ${todayKey}.`, status: 'Action needed', target: 'Daily Attendance' }] : [] },
        { title: 'Assignment review', target: 'Assignments', emptyMessage: 'No assignment submissions are recorded for review.', items: assignmentsToReview.slice(0, 5).map((assignment) => ({ title: assignment.title, detail: `${assignment.submitted} submission${assignment.submitted === '1' ? '' : 's'} recorded${assignment.due ? ` • Due ${assignment.due}` : ''}`, status: 'Review', target: 'Assignments', ...(assignment.section ? { actions: [{ label: 'Review section', target: 'Assignments', context: assignment.section }] } : {}) })) },
        { title: 'Grade completion & submission', target: 'Grade Encoding', emptyMessage: 'No incomplete or unfinalized grade records.', items: [
          ...incompleteGrades.slice(0, 4).map((grade) => ({ title: grade.student, detail: `Missing ${[!grade.prelim && 'prelim', !grade.midterm && 'midterm', !grade.final && 'final'].filter(Boolean).join(', ')} score${grade.section ? ` • ${grade.section}` : ''}`, status: 'Complete', target: 'Grade Encoding', ...(grade.section ? { actions: [{ label: 'Open gradebook', target: 'Grade Encoding', context: grade.section }] } : {}) })),
          ...readyToFinalize.slice(0, 3).map((grade) => ({ title: grade.student, detail: `All term scores entered${grade.section ? ` • ${grade.section}` : ''}`, status: 'Finalize', target: 'Finalization', ...(grade.section ? { actions: [{ label: 'Finalize section', target: 'Finalization', context: grade.section }] } : {}) })),
        ] },
        { title: 'Upcoming exams', target: 'Exam Creation', emptyMessage: 'No upcoming exams with a valid future date.', items: upcomingExams.slice(0, 4).map((exam) => ({ title: exam.title, detail: `${exam.date} • ${exam.items} items`, status: 'Scheduled', target: 'Exam Creation' })) },
      ];
      const priority = classesToday.length && studentsWithoutAttendance.length
        ? { title: `Record today’s attendance for ${studentsWithoutAttendance.length} student${studentsWithoutAttendance.length === 1 ? '' : 's'}`, detail: `${classesToday.length} class${classesToday.length === 1 ? '' : 'es'} scheduled today • ${studentsWithoutAttendance.length} roster entries have no attendance record dated ${todayKey}.`, actionLabel: 'Record attendance', target: 'Daily Attendance' }
        : assignmentsToReview[0]
          ? { title: `Review submissions: ${assignmentsToReview[0].title}`, detail: `${assignmentsToReview[0].submitted} submission${assignmentsToReview[0].submitted === '1' ? '' : 's'} recorded${assignmentsToReview[0].due ? ` • Due ${assignmentsToReview[0].due}` : ''}.`, actionLabel: 'Review assignments', target: 'Assignments' }
          : incompleteGrades[0]
            ? { title: `Complete grades for ${incompleteGrades[0].student}`, detail: `At least one term score is missing${incompleteGrades[0].section ? ` • ${incompleteGrades[0].section}` : ''}.`, actionLabel: 'Open grade encoding', target: 'Grade Encoding' }
            : readyToFinalize[0]
              ? { title: `Finalize grades for ${readyToFinalize[0].student}`, detail: 'All term scores are present and this record is still unlocked.', actionLabel: 'Open finalization', target: 'Finalization' }
              : { title: 'No urgent work is recorded', detail: 'Check your schedule or open a roster to prepare for your next class.', actionLabel: 'View schedule', target: 'Class Schedule', tone: 'clear' as const };
      const presentToday = todayAttendance.filter((item) => item.status === 'Present').length;
      return (
        <RoleDashboardHome
          role="teacher"
          name={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Faculty'}
          onNavigate={navigate}
          dashboardSections={teacherSections}
          priority={priority}
          liveMetrics={[
            { label: 'Assigned sections', value: String(sections.list.length), detail: sections.list.length ? 'Across assigned loads' : 'No sections assigned yet' },
            { label: 'Total students', value: String(roster.list.length), detail: roster.list.length ? 'Roster entries across assigned classes' : 'No students in the teacher roster' },
            { label: 'Pending grades', value: String(incompleteGrades.length), detail: incompleteGrades.length ? 'Grade rows missing one or more term scores' : 'No incomplete grade rows' },
            { label: 'Attendance today', value: todayAttendance.length ? `${Math.round((presentToday / todayAttendance.length) * 100)}%` : '—', detail: todayAttendance.length ? `${presentToday} present of ${todayAttendance.length} records dated ${todayKey}` : `No attendance records dated ${todayKey}` },
          ]}
        />
      );
    }
    if (active === 'Profile Management') return (<section style={card}><h1 style={{ margin: 0 }}>Teacher Profile Management</h1>
      <div style={{ ...box, display: 'flex', gap: 16, alignItems: 'center' }} key={photoTick}>
        <PhotoAvatar userId={myPhotoId} name={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : profile.name} size={72} />
        <div><strong>My profile photo</strong><div style={{ fontSize: 12, color: '#6b7890', margin: '4px 0 8px' }}>Shown to students, parents and admin. JPG/PNG under 2MB.</div>
          <label style={{ ...ghost, display: 'inline-block' }}>Upload photo<input type="file" accept="image/*" hidden onChange={(e) => uploadPhoto(e.target.files?.[0])} /></label>
          {photoError && <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>{photoError}</div>}
        </div>
      </div>
      <div style={box}><input style={inp} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} aria-label="Profile name" /><input style={{ ...inp, marginTop: 10 }} value={profile.dept} onChange={(e) => setProfile({ ...profile, dept: e.target.value })} aria-label="Department" /><div style={{ marginTop: 12 }}><button style={btn} onClick={() => { try { localStorage.setItem('cec:t_profile', JSON.stringify(profile)); } catch { /* ignore */ } onNotify('Teacher profile saved'); }}>Save</button></div></div><div style={{ marginTop: 18, borderTop: '1px solid #eef1f6', paddingTop: 16 }}><ChangePassword identifier={currentUser?.email || myPhotoId} onNotify={onNotify} /></div>{footer}</section>);
    if (active === 'Password Recovery') return (<section style={card}><h1 style={{ margin: 0 }}>Password Recovery</h1><form style={{ display: 'flex', gap: 10, marginTop: 14, maxWidth: 560 }} onSubmit={(e) => { e.preventDefault(); onNotify('Recovery link sent'); }}><input required style={inp} placeholder="teacher@cec.edu.ph" /><button style={btn} type="submit">Send Link</button></form>{footer}</section>);
    if (active === 'Class List / Roster') {
      const sectionRoster = roster.list.filter((student) => !activeSectionCode || student.course.toLowerCase().includes(activeSectionCode.toLowerCase()));
      return crudTable({ title: `Class List / Roster${activeSectionCode ? ` — ${activeSectionCode}` : ''}`, columns: ['Photo', 'ID', 'Name', 'Course', 'Email', 'Actions'],
        note: activeSectionCode && !sectionRoster.length ? <p style={{ color: '#6b7890', fontSize: 12 }}>No roster records are linked to {activeSectionCode}. The current roster is organized by course code.</p> : undefined,
        form: (<form style={{ display: 'flex', gap: 8, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (!rosNm.trim()) return; roster.create({ id: genSchoolId('student'), name: rosNm.trim(), course: activeSectionCode || 'BSIT-3A', email: rosEm.trim() || '-' }); setRosNm(''); setRosEm(''); onNotify('Student added with 2xxxxxx ID'); }}><input style={inp} placeholder="Full name" value={rosNm} onChange={(e) => setRosNm(e.target.value)} /><input style={inp} placeholder="Email" value={rosEm} onChange={(e) => setRosEm(e.target.value)} /><button style={btn} type="submit">Add</button></form>),
        rows: sectionRoster.filter((r) => (r.name + r.id).toLowerCase().includes(q.toLowerCase())).map((r) => <tr key={r.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><PhotoAvatar userId={r.id} name={r.name} size={34} /></td><td style={{ padding: 12 }}>{r.id}</td><td style={{ padding: 12 }}>{editingId === r.id ? <input style={inp} value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /> : <><strong>{r.name}</strong><br /><small style={{ color: '#6b7890' }}>{r.id}</small></>}</td><td style={{ padding: 12 }}>{r.course}</td><td style={{ padding: 12 }}>{editingId === r.id ? <input style={inp} value={draft.email ?? ''} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /> : r.email}</td><td style={{ padding: 12 }}>{editingId === r.id ? <div style={{ display: 'flex', gap: 6 }}><button style={btn} onClick={() => { roster.update(r.id, { name: draft.name ?? r.name, email: draft.email ?? r.email }); setEditingId(null); onNotify('Student updated'); }}>Save</button><button style={ghost} onClick={() => setEditingId(null)}>Cancel</button></div> : <RowActions onEdit={() => startEdit(r.id, { name: r.name, email: r.email })} onDelete={() => { roster.remove(r.id); onNotify('Student deleted'); }} />}</td></tr>) });
    }
    if (active === 'My Sections') {
      return crudTable({ title: 'Section / Subject Handling', columns: ['Section', 'Detail', 'Actions'],
        form: (<form style={{ display: 'flex', gap: 8, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (!secT.trim()) return; sections.create({ id: uid('SEC'), title: secT.trim(), detail: secD.trim() }); setSecT(''); setSecD(''); onNotify('Section created'); }}><input style={inp} placeholder="e.g. BSIT-3C - Networks" value={secT} onChange={(e) => setSecT(e.target.value)} /><input style={inp} placeholder="Schedule • Room" value={secD} onChange={(e) => setSecD(e.target.value)} /><button style={btn} type="submit">Add</button></form>),
        rows: sections.list.map((s) => <tr key={s.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><strong>{s.title}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{s.id}</div></td><td style={{ padding: 12 }}>{s.detail}</td><td style={{ padding: 12 }}><RowActions onEdit={() => {         openEditDialog('Section title', s.title, (nt) => { sections.update(s.id, { title: nt }); onNotify('Section updated'); }) }} onDelete={() => { sections.remove(s.id); onNotify('Section deleted'); }} /></td></tr>) });
    }
    if (active === 'Student Lookup') return (<section style={card}><h1 style={{ margin: 0 }}>Student Information Lookup</h1><input style={{ ...inp, marginTop: 14, maxWidth: 560 }} placeholder="Search ID or name..." value={q} onChange={(e) => setQ(e.target.value)} /><div style={box}>{roster.list.filter((r) => (r.name + r.id).toLowerCase().includes(q.toLowerCase())).map((r) => <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eef1f6', fontSize: 14 }}><PhotoAvatar userId={r.id} name={r.name} size={32} /><div style={{ flex: 1 }}><strong>{r.name}</strong> • {r.id} • {r.email}</div><button style={ghost} onClick={() => { roster.remove(r.id); onNotify('Student deleted from lookup'); }}>Delete</button></div>)}</div>{footer}</section>);
    if (active === 'Seating Chart') return (<section style={card}><h1 style={{ margin: 0 }}>Seating Chart</h1><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 14 }}>{roster.list.map((r) => <div key={r.id} style={{ background: '#eef4ff', borderRadius: 10, padding: 14, textAlign: 'center', fontSize: 13 }}><div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><PhotoAvatar userId={r.id} name={r.name} size={40} /></div><strong>{r.name}</strong><div><button style={ghost} onClick={() => { roster.remove(r.id); onNotify('Seat removed'); }}>Remove</button></div></div>)}</div><div style={{ marginTop: 12 }}><button style={btn} onClick={() => onNotify('Seating saved')}>Save Arrangement</button></div>{footer}</section>);
    if (active === 'Grade Encoding') {
      const sectionGrades = grades.list.filter((grade) => !activeSectionCode || grade.section === activeSectionCode);
      const scopeNote = activeSectionCode ? <p style={{ color: '#6b7890', fontSize: 12 }}>Showing grade rows linked to {activeSectionCode}. New rows created here will be assigned to this section.</p> : null;
      return crudTable({ title: `Grade Encoding — PH 1.00–5.00${activeSectionCode ? ` • ${activeSectionCode}` : ''}`, note: <>{phScaleNote}{scopeNote}</>, columns: ['Student', 'Prelim % / Pt', 'Midterm % / Pt', 'Final % / Pt', 'Average', 'Point', 'Remarks', 'Actions'],
        form: (<form style={{ display: 'flex', gap: 8, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (!grdSt.trim()) return; grades.create({ id: uid('g'), student: grdSt.trim(), prelim: grdMid, midterm: grdMid, final: '', locked: '', ...(activeSectionCode ? { section: activeSectionCode } : {}) }); setGrdSt(''); setGrdMid(''); onNotify('Grade row created'); }}><input style={inp} placeholder="Student name" value={grdSt} onChange={(e) => setGrdSt(e.target.value)} /><input style={inp} placeholder="Midterm % or point (1.00–5.00)" type="number" min={1} max={100} step={0.25} value={grdMid} onChange={(e) => setGrdMid(e.target.value)} /><button style={btn} type="submit">Add</button></form>),
        rows: sectionGrades.map((g) => {
          const avg = averagePercent([g.prelim, g.midterm, g.final]);
          const gp = avg === null ? null : percentToPoint(avg);
          return <tr key={g.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><PhotoAvatar userId={g.id} name={g.student} size={30} /><strong>{g.student}</strong></div>{g.locked && <span style={{ ...pill, marginLeft: 8 }}>Locked</span>}</td>{(['prelim', 'midterm', 'final'] as const).map((f) => <td key={f} style={{ padding: 12 }}><input style={{ ...inp, width: 80 }} value={(g as Record<string, string>)[f] ?? ''} disabled={!!g.locked} type="number" min={1} max={100} step={0.25} onChange={(e) => grades.update(g.id, { [f]: e.target.value } as Partial<typeof g>)} aria-label={`${f} grade — percent or 1.00–5.00 point`} /></td>)}<td style={{ padding: 12, fontWeight: 800 }}>{avg === null ? '—' : `${avg.toFixed(1)}%`}</td><td style={{ padding: 12, fontWeight: 800, color: gp && gp.point === 5 ? '#b91c1c' : '#0B3D91' }}>{gp ? formatPoint(gp.point) : '—'}</td><td style={{ padding: 12 }}><span style={{ background: gp && gp.remarks === 'PASSED' ? '#dcfce7' : '#fee2e2', color: gp && gp.remarks === 'PASSED' ? '#15803d' : '#b91c1c', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>{gp ? gp.remarks : '—'}</span></td><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 6 }}><button style={ghost} onClick={() => { grades.update(g.id, g.locked ? { locked: '' } : { locked: '1' }); onNotify(g.locked ? 'Grade unlocked' : 'Grade locked/finalized'); }}>{g.locked ? 'Unlock' : 'Lock'}</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { grades.remove(g.id); onNotify('Grade deleted'); }}>Delete</button></div></td></tr>;
        }) });
    }
    if (active === 'Exam Creation') {
      return crudTable({ title: 'Exam Creation', columns: ['Title', 'Date', 'Items', 'Actions'],
        form: (<form style={{ display: 'flex', gap: 8, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (!examT.trim() || !examDate) return; exams.create({ id: uid('e'), title: examT.trim(), date: examDate, items: '50' }); setExamT(''); onNotify('Exam created'); }}><input style={inp} placeholder="Exam title" value={examT} onChange={(e) => setExamT(e.target.value)} /><input style={inp} type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} aria-label="Exam date" /><button style={btn} type="submit">Add</button></form>),
        rows: exams.list.map((x) => <tr key={x.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}>{x.title}</td><td style={{ padding: 12 }}>{x.date}</td><td style={{ padding: 12 }}>{x.items}</td><td style={{ padding: 12 }}><RowActions onEdit={() => {         openEditDialog('Exam title', x.title, (v) => { exams.update(x.id, { title: v }); onNotify('Exam updated'); }) }} onDelete={() => { exams.remove(x.id); onNotify('Exam deleted'); }} /></td></tr>) });
    }
    if (active === 'Computation') {
      const pts = grades.list.map((g) => { const avg = averagePercent([g.prelim, g.midterm, g.final]); return avg === null ? 0 : percentToPoint(avg).point; });
      const classGwa = gwa(pts);
      return (<section style={card}><h1 style={{ margin: 0 }}>Grading Computation — PH System{classGwa !== null && <span style={{ fontSize: 15 }}> • Class GWA: <strong>{formatPoint(classGwa)}</strong></span>}</h1><div style={box}>{grades.list.map((g) => { const avg = averagePercent([g.prelim, g.midterm, g.final]); const gp = avg === null ? null : percentToPoint(avg); return <div key={g.id} style={{ padding: '8px 0', borderBottom: '1px solid #eef1f6' }}><strong>{g.student}</strong> — {avg === null ? 'No grades yet' : <>{avg.toFixed(1)}% → <strong>{gp && formatPoint(gp.point)}</strong> ({gp && gp.equivalent}) • {gp && gp.remarks}</>}</div>; })}</div>{footer}</section>);
    }
    if (active === 'Finalization') return (<section style={card}><h1 style={{ margin: 0 }}>Grade Finalization</h1><div style={box}>{grades.list.map((g) => <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eef1f6' }}><span>{g.student} {g.locked ? '(Locked)' : '(Draft)'}</span><button style={btn} onClick={() => { grades.update(g.id, { locked: g.locked ? '' : '1' }); onNotify('Finalization toggled'); }}>{g.locked ? 'Reopen' : 'Finalize'}</button></div>)}</div>{footer}</section>);
    if (active === 'Daily Attendance') {
      const sectionAttendance = attend.list.filter((item) => !activeSectionCode || item.section === activeSectionCode);
      return crudTable({ title: `Daily Attendance${activeSectionCode ? ` — ${activeSectionCode}` : ''}`, columns: ['Student', 'Date', 'Status', 'Actions'],
        note: activeSectionCode && !sectionAttendance.length ? <p style={{ color: '#6b7890', fontSize: 12 }}>No attendance records are linked to this section yet. New entries will be tagged {activeSectionCode}.</p> : undefined,
        form: (<form style={{ display: 'flex', gap: 8, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (!attSn.trim()) return; attend.create({ id: uid('a'), student: attSn.trim(), date: localDateKey(new Date()), status: attSs, ...(activeSectionCode ? { section: activeSectionCode } : {}) }); setAttSn(''); onNotify('Attendance created'); }}><input style={inp} placeholder="Student" value={attSn} onChange={(e) => setAttSn(e.target.value)} /><select style={inp} value={attSs} onChange={(e) => setAttSs(e.target.value)}><option>Present</option><option>Late</option><option>Absent</option></select><button style={btn} type="submit">Add</button></form>),
        rows: sectionAttendance.map((a) => <tr key={a.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><PhotoAvatar userId={a.id} name={a.student} size={30} />{a.student}</div></td><td style={{ padding: 12 }}>{a.date}</td><td style={{ padding: 12 }}><select style={inp} value={a.status} onChange={(e) => { attend.update(a.id, { status: e.target.value }); onNotify('Attendance updated'); }}><option>Present</option><option>Late</option><option>Absent</option></select></td><td style={{ padding: 12 }}><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { attend.remove(a.id); onNotify('Attendance deleted'); }}>Delete</button></td></tr>) });
    }
    if (active === 'History' || active === 'Report' || active === 'Attendance Summary' || active === 'Performance' || active === 'Report Cards') {
      const present = attend.list.filter((a) => a.status === 'Present').length;
      return (<section style={card}><h1 style={{ margin: 0 }}>{active}</h1><div style={box}>Total records: <strong>{attend.list.length}</strong> • Present: <strong>{present}</strong> • Grades: <strong>{grades.list.length}</strong><div style={{ marginTop: 10 }}><button style={ghost} onClick={() => onNotify(`${active} exported`)}>Export</button> <button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { attend.setList([]); onNotify('Attendance history cleared'); }}>Clear history</button></div></div>{footer}</section>);
    }
    if (active === 'Announcement Posting') {
      return crudTable({ title: 'Announcement Posting', columns: ['Title', 'Detail', 'Actions'],
        form: (<form style={{ display: 'flex', gap: 8, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (!genF1.trim()) return; const title = genF1.trim(); posts.create({ id: uid('p'), title, body: 'Posted to sections' }); setGenF1(''); pushNotification(['student', 'admin'], { title: `New announcement: ${title}`, detail: 'Posted by faculty — check Announcement Board.', category: 'Communication', target: 'Announcement Board' }); setPopup({ title: 'Announcement posted', message: 'Students and admin were notified with a popup entry.', lines: [title] }); onNotify('Announcement posted'); }}><input style={inp} placeholder="Announcement title" value={genF1} onChange={(e) => setGenF1(e.target.value)} /><button style={btn} type="submit">Post</button></form>),
        rows: (posts.list as { id: string; title: string; body: string }[]).map((r) => <tr key={r.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><strong>{r.title}</strong></td><td style={{ padding: 12, color: '#6b7890' }}>{r.body}</td><td style={{ padding: 12 }}><RowActions onEdit={() => { openEditDialog('Edit announcement', r.title, (v) => { posts.update(r.id, { title: v }); onNotify('Updated'); }); }} onDelete={() => { posts.remove(r.id); onNotify('Deleted'); }} /></td></tr>) });
    }
    if (active === 'Messaging') {
      return crudTable({ title: 'Messaging', columns: ['Title', 'Detail', 'Actions'],
        form: (<form style={{ display: 'flex', gap: 8, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (!genF1.trim()) return; const title = genF1.trim(); messages.create({ id: uid('msg'), title, when: 'Today', where: 'Sent to section' }); setGenF1(''); pushNotification(['student'], { title: `New message from faculty`, detail: title, category: 'Communication', target: 'Messaging' }); setPopup({ title: 'Message sent', message: 'Students received a popup notification.', lines: [title] }); onNotify('Message sent'); }}><input style={inp} placeholder="Message section..." value={genF1} onChange={(e) => setGenF1(e.target.value)} /><button style={btn} type="submit">Send</button></form>),
        rows: (messages.list as { id: string; title: string; where: string }[]).map((r) => <tr key={r.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><strong>{r.title}</strong></td><td style={{ padding: 12, color: '#6b7890' }}>{r.where}</td><td style={{ padding: 12 }}><RowActions onEdit={() => { openEditDialog('Edit message', r.title, (v) => { messages.update(r.id, { title: v }); onNotify('Updated'); }); }} onDelete={() => { messages.remove(r.id); onNotify('Deleted'); }} /></td></tr>) });
    }
    if (active === 'Materials' || active === 'Assignments' || active === 'Announcements' || active === 'Forum' || active === 'Class Schedule' || active === 'Consultation Slots') {
      const map: Record<string, ReturnType<typeof useCollection>> = { Materials: materials as unknown as ReturnType<typeof useCollection>, Assignments: assigns as unknown as ReturnType<typeof useCollection>, Announcements: posts as unknown as ReturnType<typeof useCollection>, Forum: forum as unknown as ReturnType<typeof useCollection>, Messaging: messages as unknown as ReturnType<typeof useCollection>, 'Announcement Posting': posts as unknown as ReturnType<typeof useCollection>, 'Class Schedule': sched as unknown as ReturnType<typeof useCollection>, 'Consultation Slots': consults as unknown as ReturnType<typeof useCollection> };
      const col = map[active] ?? materials as unknown as ReturnType<typeof useCollection>;
      return crudTable({ title: active, columns: ['Title', 'Detail', 'Actions'],
        form: (<form style={{ display: 'flex', gap: 8, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (!genF1.trim()) return; col.create({ id: uid('x'), title: genF1.trim(), body: '', type: '', due: '', submitted: '', date: '', items: '', when: '', where: '' } as unknown as { id: string }); setGenF1(''); onNotify(`${active} created`); }}><input style={inp} placeholder={`New ${active.toLowerCase()} title`} value={genF1} onChange={(e) => setGenF1(e.target.value)} /><button style={btn} type="submit">Add</button></form>),
        rows: (col.list as { id: string; title: string }[]).map((r) => <tr key={r.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><strong>{r.title}</strong></td><td style={{ padding: 12, color: '#6b7890' }}>{Object.values(r).slice(2, 4).join(' • ')}</td><td style={{ padding: 12 }}><RowActions onEdit={() => {         openEditDialog('Edit title', r.title, (v) => { col.update(r.id, { title: v } as Partial<{ id: string }>); onNotify('Updated'); }) }} onDelete={() => { col.remove(r.id); onNotify('Deleted'); }} /></td></tr>) });
    }
    return (<section style={card}><h1 style={{ margin: 0 }}>{active}</h1><div style={box}>Route <strong>{route}</strong> ready.</div>{footer}</section>);
  };

  return (
    <div className={`role-dashboard${dark ? ' cec-dark' : ''}`} style={{ minHeight: '100vh', background: dark ? '#0b1220' : '#f3f5f9', fontFamily: 'Inter,system-ui,sans-serif' }}>
      <header className="dashboard-topbar" style={{ height: 68, background: '#fff', borderBottom: '1px solid #e5e9f0', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 270 }}><button onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar" style={{ border: '1px solid #e2e7ef', background: '#fff', borderRadius: 10, width: 38, height: 38, cursor: 'pointer', fontSize: 16 }}>☰</button><img src={`${BASE}cec-logo.png`} alt="Cebu Eastern College crest" width={38} height={38} style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'contain', background: '#fff', padding: 2 }} /><div><div style={{ fontWeight: 800 }}>Cebu Eastern College</div><div style={{ fontSize: 10, color: '#8a94a6' }}>TEACHER PORTAL • {academicConfig.semester.toUpperCase()} {academicConfig.schoolYear}</div></div></div>
        <span style={{ background: '#e8f1ff', color: '#1d5fc2', fontSize: 12, fontWeight: 800, borderRadius: 8, padding: '5px 10px' }}>TEACHER</span><span style={{ color: '#8a94a6', fontSize: 13 }}>{active === 'Dashboard' ? 'Overview' : route}</span>
        <div className="dashboard-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}><DashboardCommandMenu items={moduleItems} records={searchRecords} onNavigate={navigate} /><NotificationCenter role="teacher" onNavigate={navigate} /><button type="button" className="theme-toggle" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>{dark ? '☀' : '🌙'}</button><span key={photoTick}><PhotoAvatar userId={myPhotoId} name={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Teacher'} size={36} /></span><button type="button" className="dashboard-logout" onClick={onLogout} aria-label="Log out" title="Log out"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></svg></button></div>
      </header>
      <div style={{ display: 'flex' }}>
        {!collapsed && (<aside className="dashboard-sidebar" style={{ width: 320, background: '#fff', borderRight: '1px solid #e5e9f0', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 'calc(100vh - 68px)' }}>{GROUPS.map((g) => { const open = expanded === g.id; return (<div className={`dashboard-nav-group ${open ? 'is-open' : ''}`} key={g.id} style={{ border: '1px solid #e8ecf3', borderRadius: 12, padding: 8 }}><button onClick={() => setExpanded(open ? '' : g.id)} style={{ width: '100%', display: 'flex', gap: 10, border: 0, background: 'transparent', padding: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13 }}><span>{g.icon}</span><span style={{ flex: 1, textAlign: 'left' }}>{g.label}</span><span>{open ? '⌄' : '›'}</span></button>{open && <div style={{ display: 'grid', gap: 4 }}>{g.items.map((it) => <button key={it.label} onClick={() => setActive(it.label)} style={{ textAlign: 'left', border: 0, borderRadius: 8, padding: '11px 14px', background: active === it.label ? NAVY : 'transparent', color: active === it.label ? '#fff' : '#4a5872', cursor: 'pointer' }}>{it.label}</button>)}</div>}</div>); })}<div style={{ marginTop: 'auto', borderTop: '1px solid #eef1f6', paddingTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}><span key={photoTick}><PhotoAvatar userId={myPhotoId} name={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Prof. Santos'} size={34} /></span><div><div style={{ fontWeight: 700, fontSize: 13 }}>{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Prof. Santos'}</div><div style={{ fontSize: 12, color: '#8a94a6' }}>{myPhotoId}</div><div style={{ fontSize: 12, color: '#8a94a6' }}>teacher</div></div><button onClick={onLogout} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: '#8a94a6', cursor: 'pointer' }}>Log out</button></div></aside>)}
        <main className="dashboard-main" style={{ flex: 1, padding: 24, minWidth: 0 }}>{render()}</main>
      </div>
      {popup && <AlertPopup title={popup.title} message={popup.message} lines={popup.lines} onClose={() => setPopup(null)} />}
    </div>
  );
};
