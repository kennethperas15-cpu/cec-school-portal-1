import { useEffect, useState, type ReactNode } from 'react';
import { useCollection, uid, genSchoolId, isValidSchoolId, type SchoolRole } from '../../services/crud';
import { useTheme } from '../../services/theme';
import { portalApi } from '../../services/portal';
import { pushNotification } from '../../services/notify';
import { DOC_STAGES, SUBMIT_STAGES, listTrackedDocs, writeStage } from '../../services/docStages';
import { pipelineBadges } from '../../services/pipeline';
import { setPhoto, readPhotoFile } from '../../services/photos';
import { PhotoAvatar } from '../shared/PhotoAvatar';
import { AlertPopup } from '../shared/AlertPopup';
import { ChangePassword } from '../shared/ChangePassword';
import { RoleDashboardHome } from '../shared/RoleDashboardHome';
import { DashboardCommandMenu } from '../shared/DashboardCommandMenu';
import { NotificationCenter } from '../shared/NotificationCenter';
import { openEditDialog } from '../shared/EditDialog';
import { AdminReports } from './reporting/AdminReports';
import { LiveReport } from './reporting/LiveReports';

type Props = { currentUser: { firstName: string; lastName: string; role: string; id?: string; email?: string } | null; onNotify: (t: string) => void; onLogout: () => void; };
const NAVY = '#0B3D91';
const BASE = import.meta.env.BASE_URL || '/';
type Group = { id: string; label: string; icon: string; items: { label: string; route: string }[] };
const GROUPS: Group[] = [
  { id: 'account', label: 'ACCOUNT MGMT', icon: '◈', items: [{ label: 'RBAC Management', route: 'a_auth_rbac' }, { label: 'Account Creation', route: 'a_auth_accounts' }, { label: 'Password Reset', route: 'a_auth_reset' }] },
  { id: 'enroll', label: 'ENROLLMENT MGMT', icon: '▤', items: [{ label: 'Enrollment Approval', route: 'a_enroll_approval' }, { label: 'Document Verification', route: 'a_enroll_docs' }, { label: 'Section Assignment', route: 'a_enroll_sections' }, { label: 'Capacity Control', route: 'a_enroll_capacity' }, { label: 'Status Monitoring', route: 'a_enroll_status' }] },
  { id: 'academic', label: 'ACADEMIC MGMT', icon: '▥', items: [{ label: 'Curriculum Setup', route: 'a_acad_curriculum' }, { label: 'Subject Offering', route: 'a_acad_subjects' }, { label: 'Calendar', route: 'a_acad_calendar' }, { label: 'Room Allocation', route: 'a_acad_rooms' }] },
  { id: 'finance', label: 'FINANCIAL MGMT', icon: '▦', items: [{ label: 'Billing & Invoices', route: 'a_fin_billing' }, { label: 'Fee Structure', route: 'a_fin_fees' }, { label: 'Payment Monitoring', route: 'a_fin_payments' }, { label: 'Scholarships', route: 'a_fin_scholar' }] },
  { id: 'hr', label: 'HR / FACULTY', icon: '⍾', items: [{ label: 'Teacher Records', route: 'a_hr_records' }, { label: 'Load Assignment', route: 'a_hr_load' }, { label: 'Credentials', route: 'a_hr_cred' }] },
  { id: 'comm', label: 'COMMUNICATION', icon: '✉', items: [{ label: 'Broadcast Messaging', route: 'a_comm_broadcast' }, { label: 'System Announcements', route: 'a_comm_announce' }] },
  { id: 'reporting', label: 'REPORTING', icon: '◫', items: [{ label: 'Enrollment Stats', route: 'a_rep_enroll' }, { label: 'Academic Performance', route: 'a_rep_acad' }, { label: 'Revenue Dashboard', route: 'a_rep_revenue' }] },
  { id: 'system', label: 'SYSTEM ADMIN', icon: '⚙', items: [{ label: 'System Config', route: 'a_sys_config' }, { label: 'Audit Log', route: 'a_sys_audit' }, { label: 'Backup & Restore', route: 'a_sys_backup' }, { label: 'Security', route: 'a_sys_security' }] },
];
const pill: React.CSSProperties = { border: '1px solid #e2e7ef', background: '#fff', borderRadius: 999, padding: '6px 12px', fontSize: 12, color: '#6b7890' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e8ecf3', borderRadius: 16, padding: 28, maxWidth: 1120, margin: '0 auto' };
const box: React.CSSProperties = { border: '1px solid #e6eaf1', borderRadius: 12, padding: 18, marginTop: 14 };
const btn: React.CSSProperties = { background: NAVY, color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const ghost: React.CSSProperties = { border: '1px solid #e2e7ef', background: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' };
const inp: React.CSSProperties = { border: '1px solid #e2e7ef', borderRadius: 8, padding: '10px 12px', fontSize: 13, width: '100%' };

type Rec3 = { id: string; name: string; role: string };
type Col3 = { list: Rec3[]; create: (x: { id?: string; name: string; role: string }) => void; update: (id: string, p: Partial<Rec3>) => void; remove: (id: string) => void };

const AdminTable = ({ title, col, colA, colB, phA, phB, onNotify, footer }: { title: string; col: Col3; colA: string; colB: string; phA: string; phB: string; onNotify: (t: string) => void; footer: ReactNode }) => {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  return (<section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>{title}</h1>
    <form style={{ display: 'flex', gap: 8, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (!a.trim()) return; col.create({ id: uid('x'), name: a.trim(), role: b.trim() || '—' }); setA(''); setB(''); onNotify(`${title} record created`); }}>
      <input style={inp} placeholder={phA} value={a} onChange={(e) => setA(e.target.value)} aria-label={phA} />
      <input style={inp} placeholder={phB} value={b} onChange={(e) => setB(e.target.value)} aria-label={phB} />
      <button style={btn} type="submit">Add</button>
    </form>
    <div style={{ ...box, padding: 0, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 12 }}>{colA}</th><th style={{ padding: 12 }}>{colB}</th><th style={{ padding: 12 }}>Actions</th></tr></thead><tbody>{col.list.map((r) => <tr key={r.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><strong>{r.name}</strong><div style={{ fontSize: 11, color: '#6b7890' }}>{r.id}</div></td><td style={{ padding: 12 }}>{r.role}</td><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 6 }}><button style={ghost} onClick={() => { openEditDialog(`Edit ${colB}`, r.role, (v) => { col.update(r.id, { role: v }); onNotify('Updated'); }); }}>Edit</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { col.remove(r.id); onNotify('Deleted'); }}>Delete</button></div></td></tr>)}{!col.list.length && <tr><td colSpan={3} style={{ padding: 16, color: '#6b7890' }}>No records yet.</td></tr>}</tbody></table></div>{footer}</section>);
};

export const AdminDashboard = ({ currentUser, onNotify, onLogout }: Props) => {
  const [active, setActive] = useState('Dashboard');
  const [expanded, setExpanded] = useState('account');
  const [collapsed, setCollapsed] = useState(false);
  const { dark, toggle } = useTheme();
  // v2 stores: pre-launch — no demo students, teachers, or payments (all start empty)
  const enroll = useCollection<{ id: string; name: string; meta: string }>('a_enroll_v2', []);
  const accounts = useCollection<{ id: string; name: string; role: string }>('a_accounts_v2', []);
  const fees = useCollection<{ id: string; name: string; role: string }>('a_fees_v2', []);
  const faculty = useCollection<{ id: string; name: string; role: string }>('a_faculty_v2', []);
  const rooms = useCollection<{ id: string; name: string; role: string }>('a_rooms_v2', []);
  const offers = useCollection<{ id: string; name: string; role: string }>('a_offers_v2', []);
  const bills = useCollection<{ id: string; name: string; role: string }>('a_bills_v2', []);
  const broadcasts = useCollection<{ id: string; name: string; role: string }>('a_broadcast_v2', []);
  const assign = useCollection<{ id: string; name: string; role: string }>('a_assign_v2', []);
  const cap = useCollection<{ id: string; name: string; role: string }>('a_capacity_v2', []);
  const curr = useCollection('a_curriculum', [{ id: 'BSIT', name: 'BS Information Technology', role: '8 semesters • 42 subjects' }]);
  const cal = useCollection('a_calendar', [{ id: 'ev1', name: 'Enrollment opens', role: '2026-10-01' }]);
  const loads = useCollection<{ id: string; name: string; role: string }>('a_loads_v2', []);
  const creds = useCollection<{ id: string; name: string; role: string }>('a_creds_v2', []);
  const scholars = useCollection<{ id: string; name: string; role: string }>('a_scholars_v2', []);
  const syscfg = useCollection('a_syscfg', [{ id: 'school_year', name: 'Current school year', role: '2026–2027' }]);
  const [perms, setPerms] = useState<Record<string, boolean>>({ 'Teacher-Students': true, 'Teacher-Teachers': true, 'Admin-Students': true, 'Admin-Teachers': true, 'Admin-Finance': true, 'Admin-Admin': true });
  const [fn, setFn] = useState(''); const [fi, setFi] = useState(''); const [fr, setFr] = useState('student');
  const [enrN, setEnrN] = useState(''); const [enrM, setEnrM] = useState('BSIT • Applied');
  const [autoApprove, setAutoApprove] = useState(() => { try { return localStorage.getItem('cec:auto_approve') === '1'; } catch { return false; } });
  const [boxVal, setBoxVal] = useState('');
  const [remoteReceipts, setRemoteReceipts] = useState<{ id: string; title: string; detail?: string | null; status?: string | null }[]>([]);
  useEffect(() => {
    portalApi.items(undefined, 'receipt').then((rows) => setRemoteReceipts(rows)).catch(() => undefined);
  }, []);
  const [resetWho, setResetWho] = useState('');
  const [docTick, setDocTick] = useState(0);
  const bumpDocs = () => setDocTick((t) => t + 1);
  const [popup, setPopup] = useState<{ title: string; message: string; lines?: string[] } | null>(null);
  const [photoTick, setPhotoTick] = useState(0);
  const [photoError, setPhotoError] = useState('');
  const myPhotoId = currentUser?.id || 'ADMIN';

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
  const [mysqlOn, setMysqlOn] = useState(false);

  // Pull shared MySQL queue once (merges pending applications from all students)
  useEffect(() => {
    let live = true;
    portalApi.enrollPending().then((rows) => {
      if (!live) return;
      setMysqlOn(true);
      enroll.setList((current) => {
        const ids = new Set(current.map((r) => r.id));
        const missing = rows.filter((r) => !ids.has(r.id)).map((r) => ({
          id: r.id, name: `${r.first_name} ${r.last_name}`.trim(), meta: `${r.program} • Year ${r.year_level} • MySQL pending`,
        }));
        return missing.length ? [...missing, ...current] : current;
      });
    }).catch(() => { if (live) setMysqlOn(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const decideEnrollment = async (id: string, decision: 'approved' | 'rejected' | 'enrolled') => {
    try { await portalApi.enrollDecide(id, decision === 'rejected' ? 'rejected' : 'approved'); } catch { /* local-only fallback */ }
    const applicant = enroll.list.find((a) => a.id === id);
    if (decision === 'rejected') {
      enroll.remove(id);
      syncStudentStatus(id, 'Rejected');
    } else if (decision === 'enrolled') {
      // EDP final step: enrollee lands on the teacher roster so all systems connect
      try {
        const raw = localStorage.getItem('cec:t_roster_v2');
        const roster = raw ? (JSON.parse(raw) as { id: string; name: string; course: string; email: string }[]) : [];
        if (applicant && !roster.some((r) => r.id === id)) {
          roster.push({ id, name: applicant.name, course: (applicant.meta || '').split('•')[0].trim(), email: '-' });
          localStorage.setItem('cec:t_roster_v2', JSON.stringify(roster));
        }
      } catch { /* ignore */ }
      enroll.remove(id);
      syncStudentStatus(id, 'Enrolled');
    } else {
      syncStudentStatus(id, 'Approved');
    }
    onNotify(`${id} ${decision} — student tracker updated${mysqlOn ? ' (MySQL)' : ''}`);
  };

  // Explicit registrar stepping stones — the ONLY way stages advance:
  // Docs ✓ → Approve → Enroll (row leaves the queue only when Enrolled/Rejected)
  const setAppStage = (id: string, stage: 'Pending • Documents Verified' | 'Approved') => {
    syncStudentStatus(id, stage);
    onNotify(`${id} → ${stage} — student tracker updated`);
  };

  const syncStudentStatus = (id: string, status: string) => {
    try {
      const raw = localStorage.getItem('cec:s_enroll_apps');
      if (!raw) return;
      const rows = JSON.parse(raw) as { id: string; name: string; role: string }[];
      localStorage.setItem('cec:s_enroll_apps', JSON.stringify(rows.map((r) => (r.id === id ? { ...r, role: status } : r))));
    } catch { /* ignore */ }
  };
  const toggleAuto = () => {
    setAutoApprove((v) => {
      try { localStorage.setItem('cec:auto_approve', v ? '0' : '1'); } catch { /* ignore */ }
      onNotify(v ? 'Auto-approve OFF — applications need admin review' : 'Auto-approve ON — new applications approved automatically');
      return !v;
    });
  };
  const route = GROUPS.flatMap((g) => g.items).find((i) => i.label === active)?.route ?? 'a_dashboard';
  const moduleItems = ['Dashboard', ...GROUPS.flatMap((g) => g.items.map((item) => item.label))];
  const navigate = (label: string) => setActive(moduleItems.includes(label) ? label : 'Dashboard');
  const searchRecords = [
    ...accounts.list.map((item) => ({ title: item.name, detail: `${item.id} • ${item.role}`, target: 'Account Creation' })),
    ...enroll.list.map((item) => ({ title: item.name, detail: `${item.id} • ${item.meta}`, target: 'Enrollment Approval' })),
    ...faculty.list.map((item) => ({ title: item.name, detail: item.role, target: 'Teacher Records' })),
    ...bills.list.map((item) => ({ title: item.name, detail: item.role, target: 'Billing & Invoices' })),
    ...broadcasts.list.map((item) => ({ title: item.name, detail: item.role, target: 'System Announcements' })),
  ];
  const footer = (<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}><span style={pill}>CEC Blue #0B3D91 • Gold #FFC928</span><span style={pill}>Full CRUD • localStorage</span><span style={pill}>Thesis Ready • Toast + Audit Log</span></div>);

  const table = (title: string, cols: string[], rows: React.ReactNode, form?: React.ReactNode) => (
    <section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>{title} (CRUD)</h1>{form}<div style={{ ...box, padding: 0, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>{cols.map((c) => <th key={c} style={{ padding: 12 }}>{c}</th>)}</tr></thead><tbody>{rows}</tbody></table></div>{footer}</section>
  );

  const render = () => {
    if (active === 'Dashboard') {
      const peso = (s: string) => {
        const t = s.trim();
        if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
        const m = s.replace(/,/g, '').match(/₱\s*(\d+(?:\.\d+)?)/);
        return m ? Number(m[1]) : 0;
      };
      const outstanding = bills.list.reduce((n, b) => n + peso(`${b.name} ${b.role}`), 0);
      const teachers = faculty.list.length + accounts.list.filter((a) => a.role === 'teacher').length;
      const students = accounts.list.filter((a) => a.role === 'student').length;
      return (
        <RoleDashboardHome
          role="admin"
          name={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Admin'}
          onNavigate={navigate}
          liveMetrics={[
            { label: 'Total students', value: String(students), detail: students ? 'Enrolled via portal' : 'No students yet' },
            { label: 'Active teachers', value: String(teachers), detail: teachers ? 'Across departments' : 'No teachers yet' },
            { label: 'Pending applications', value: String(enroll.list.length), detail: enroll.list.length ? 'In approval queue' : 'Queue empty' },
            { label: 'Outstanding balances', value: outstanding > 0 ? `₱${outstanding.toLocaleString()}` : '₱0', detail: outstanding > 0 ? 'Across open invoices' : 'No balances yet' },
          ]}
        />
      );
    }
    if (active === 'Enrollment Stats') return <><LiveReport kind="enrollment" onNotify={onNotify} />{enroll.list.length + accounts.list.length > 0 ? <><div style={{ height: 16 }} /><AdminReports onNotify={onNotify} /></> : null}</>;
    if (active === 'Academic Performance') return <LiveReport kind="academic" onNotify={onNotify} />;
    if (active === 'Revenue Dashboard') return <LiveReport kind="revenue" onNotify={onNotify} />;
    if (active === 'Enrollment Approval') {
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>Enrollment Approval</h1>
        <div style={{ ...box, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}><div><strong>Auto-approve new applications: {autoApprove ? 'ON' : 'OFF'}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>Online + walk-in applications land here. Advance each one yourself: Docs ✓ → Approve → Enroll ✓. Nothing moves without a registrar click.</div><div style={{ display: 'flex', gap: 8, marginTop: 8 }}>{(() => { const p = pipelineBadges(); return (<><span style={{ ...pill, background: p.docs ? '#ecfdf5' : '#fff' }}>Registrar docs {p.docs ? '✓' : '—'}</span><span style={{ ...pill, background: p.pay ? '#ecfdf5' : '#fff' }}>Accounting pay {p.pay ? '✓' : '—'}</span></>); })()}</div></div><button style={autoApprove ? ghost : btn} onClick={toggleAuto}>{autoApprove ? 'Turn OFF' : 'Turn ON'}</button></div>
        <div style={{ ...box, padding: 0, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 12 }}>Applicant</th><th style={{ padding: 12 }}>Detail</th><th style={{ padding: 12 }}>Decision</th></tr></thead><tbody>{enroll.list.map((a) => <tr key={a.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><PhotoAvatar userId={a.id} name={a.name} size={32} /><strong>{a.name} - {a.id}</strong></div></td><td style={{ padding: 12 }}>{a.meta}</td><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 8 }}><button style={{ background: '#16a34a', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }} onClick={() => decideEnrollment(a.id, 'approved')}>Approve</button><button style={{ background: '#0B3D91', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }} onClick={() => decideEnrollment(a.id, 'enrolled')}>Enroll ✓</button><button style={{ background: '#dc2626', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }} onClick={() => decideEnrollment(a.id, 'rejected')}>Reject</button><button style={ghost} onClick={() => {         openEditDialog('Edit detail', a.meta, (v) => { enroll.update(a.id, { meta: v }); onNotify('Updated'); }) }}>Edit</button></div></td></tr>)}{!enroll.list.length && <tr><td colSpan={3} style={{ padding: 16, color: '#6b7890' }}>Queue empty — new student applications will appear here.</td></tr>}</tbody></table></div>
        <form style={{ display: 'flex', gap: 8, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (!enrN.trim()) return; const nid = genSchoolId('student'); enroll.create({ id: nid, name: enrN.trim(), meta: enrM }); try { const raw = localStorage.getItem('cec:s_enroll_apps'); const rows = raw ? (JSON.parse(raw) as { id: string; name: string; role: string }[]) : []; rows.push({ id: nid, name: `${enrM.split('•')[0].trim()} • walk-in`, role: 'Pending' }); localStorage.setItem('cec:s_enroll_apps', JSON.stringify(rows)); } catch { /* ignore */ } setEnrN(''); onNotify('Walk-in application created — visible in student tracker'); }}><input style={inp} placeholder="Applicant name" value={enrN} onChange={(e) => setEnrN(e.target.value)} /><input style={inp} value={enrM} onChange={(e) => setEnrM(e.target.value)} /><button style={btn} type="submit">Add walk-in</button></form>{footer}</section>);
    }
    if (active === 'Document Verification') {
      void docTick;
      const docs = listTrackedDocs();
      const stageName = (d: { id: string; stage: number }) => (d.id === 'DOC-2026-0091' ? DOC_STAGES[d.stage] : SUBMIT_STAGES[d.stage]);
      const stageCount = (d: { id: string }) => (d.id === 'DOC-2026-0091' ? DOC_STAGES.length : SUBMIT_STAGES.length);
      let docNames: Record<string, string> = {};
      try {
        const raw = localStorage.getItem('cec:s_docs');
        const rows = raw ? (JSON.parse(raw) as { id: string; name: string; role: string }[]) : [];
        rows.forEach((r) => { docNames[r.id] = `${r.name} — ${r.role}`; });
      } catch { /* ignore */ }
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>Document Verification — Registrar</h1>        <p style={{ color: '#6b7890', fontSize: 13 }}>Confirm submissions here. Student trackers update automatically — students cannot advance stages themselves.</p>
        <div style={{ ...box, padding: 0, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 12 }}>Document</th><th style={{ padding: 12 }}>Stage</th><th style={{ padding: 12 }}>Registrar action</th></tr></thead><tbody>{docs.map((d) => { const atMin = d.stage === 0; const atMax = d.stage >= stageCount(d) - 1; const decide = (dir: 1 | -1) => { try { const next = Math.max(0, Math.min(stageCount(d) - 1, d.stage + dir)); writeStage(d.id, next); const verb = dir === 1 ? 'confirmed' : 'moved back'; pushNotification(['student'], { title: `Document ${d.id}: ${stageName({ ...d, stage: next })}`, detail: dir === 1 ? 'Registrar confirmed your submission — tracker updated automatically.' : `Registrar moved it back to ${stageName({ ...d, stage: next })}.`, category: 'Enrollment', target: 'Document Submission' }); if (dir === 1) setPopup({ title: 'Stage confirmed', message: `${d.id} is now at ${stageName({ ...d, stage: next })}. Student notified.`, lines: [d.id] }); bumpDocs(); onNotify(`${d.id} ${verb} → ${stageName({ ...d, stage: next })}`); } catch { onNotify('Could not save — storage unavailable'); } }; return <tr key={d.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><strong>{d.id}</strong><br /><small style={{ color: '#6b7890' }}>{docNames[d.id] ?? 'Awaiting upload'}</small></td><td style={{ padding: 12 }}>{stageName(d)} ({d.stage + 1}/{stageCount(d)})</td><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 6 }}><button style={{ ...ghost, ...(atMin ? { opacity: .45, cursor: 'not-allowed' } : null) }} disabled={atMin} onClick={() => decide(-1)}>Return</button><button style={{ ...btn, ...(atMax ? { background: '#94a3b8', cursor: 'not-allowed' } : null) }} disabled={atMax} onClick={() => decide(1)}>Confirm ✓</button></div></td></tr>; })}{!docs.length && <tr><td colSpan={3} style={{ padding: 16, color: '#6b7890' }}>No documents submitted yet — student uploads appear here automatically.</td></tr>}</tbody></table></div>{footer}</section>);
    }
    if (active === 'RBAC Management') {
      const rows = ['Student', 'Teacher', 'Admin']; const cols = ['Students', 'Teachers', 'Finance', 'Admin'];
      return (<section style={card}><h1 style={{ margin: 0 }}>Role-Based Access Control (RBAC) — Update</h1><div style={{ ...box, padding: 0 }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr style={{ background: '#f8fafc' }}><th style={{ textAlign: 'left', padding: 12 }}>Role</th>{cols.map((c) => <th key={c} style={{ padding: 12 }}>{c}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}>{r}</td>{cols.map((c) => <td key={c} style={{ textAlign: 'center', padding: 12 }}><input type="checkbox" checked={!!perms[`${r}-${c}`]} onChange={() => { setPerms((p) => ({ ...p, [`${r}-${c}`]: !p[`${r}-${c}`] })); }} aria-label={`${r}-${c}`} /></td>)}</tr>)}</tbody></table></div><div style={{ marginTop: 12, display: 'flex', gap: 8 }}><button style={btn} onClick={() => onNotify('Permissions updated')}>Save Permissions</button><button style={ghost} onClick={() => { setPerms({}); onNotify('Permissions cleared (Delete)'); }}>Clear all</button></div>{footer}</section>);
    }
    if (active === 'Account Creation') {
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>Account Creation / Management</h1>
        <div style={{ ...box, display: 'flex', gap: 16, alignItems: 'center' }} key={photoTick}>
          <PhotoAvatar userId={myPhotoId} name={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Admin'} size={64} />
          <div><strong>My admin photo</strong><div style={{ fontSize: 12, color: '#6b7890', margin: '4px 0 8px' }}>JPG/PNG under 2MB.</div>
            <label style={{ ...ghost, display: 'inline-block' }}>Upload photo<input type="file" accept="image/*" hidden onChange={(e) => uploadPhoto(e.target.files?.[0])} /></label>
            {photoError && <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>{photoError}</div>}
          </div>
        </div>
        {table('Accounts', ['Photo', 'ID', 'Name', 'Role', 'Actions'],
        accounts.list.map((a) => <tr key={a.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><PhotoAvatar userId={a.id} name={a.name} size={34} /></td><td style={{ padding: 12 }}>{a.id}</td><td style={{ padding: 12 }}><strong>{a.name}</strong><br /><small style={{ color: '#6b7890' }}>{a.id}</small></td><td style={{ padding: 12 }}>{a.role}</td><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 6 }}><button style={ghost} onClick={() => { openEditDialog('Edit name', a.name, (v) => { accounts.update(a.id, { name: v }); onNotify('Account updated'); }); }}>Edit</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { accounts.remove(a.id); onNotify('Account deleted'); }}>Delete</button></div></td></tr>),
        (<form style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14, maxWidth: 640 }} onSubmit={(e) => { e.preventDefault(); if (!fn.trim() || !fi.trim()) { onNotify('Enter name and ID'); return; } const need: SchoolRole = fr === 'teacher' ? 'teacher' : fr === 'admin' ? 'admin' : 'student'; if (!isValidSchoolId(fi, need)) { onNotify(`ID must be 6 digits starting with ${need === 'student' ? '2' : need === 'teacher' ? '3' : '4'} for ${need}s`); return; } accounts.create({ id: fi.trim(), name: fn.trim(), role: fr }); setFn(''); setFi(''); onNotify('Account created'); }}><input style={inp} placeholder="Full Name" value={fn} onChange={(e) => setFn(e.target.value)} /><select style={inp} value={fr} onChange={(e) => { setFr(e.target.value); setFi(genSchoolId(e.target.value === 'teacher' ? 'teacher' : e.target.value === 'admin' ? 'admin' : 'student')); }} aria-label="Role"><option value="student">student (2xxxxx)</option><option value="teacher">teacher (3xxxxx)</option><option value="admin">admin (4xxxxx)</option></select><input style={inp} placeholder="6-digit ID (student 2•teacher 3•admin 4)" value={fi} onChange={(e) => setFi(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" /><button type="button" style={ghost} onClick={() => setFi(genSchoolId(fr === 'teacher' ? 'teacher' : fr === 'admin' ? 'admin' : 'student'))}>Auto ID</button><button style={{ ...btn, gridColumn: '1/-1' }} type="submit">Create Account</button></form>))}
      </section>);
    }
    if (active === 'Teacher Records') {
      return table('Teacher Records / Faculty Faces', ['Photo', 'Name', 'Load', 'Actions'],
        faculty.list.map((t) => <tr key={t.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><PhotoAvatar userId={t.id} name={t.name} size={38} /></td><td style={{ padding: 12 }}><strong>{t.name}</strong><div style={{ fontSize: 11, color: '#6b7890' }}>{t.id}</div></td><td style={{ padding: 12 }}>{t.role}</td><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 6 }}><button style={ghost} onClick={() => { openEditDialog('Edit record', t.name, (v) => { faculty.update(t.id, { name: v }); onNotify('Updated'); }); }}>Edit</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { faculty.remove(t.id); onNotify('Deleted'); }}>Delete</button></div></td></tr>),
        (<form style={{ display: 'flex', gap: 8, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (!boxVal.trim()) return; faculty.create({ id: genSchoolId('teacher'), name: boxVal.trim(), role: 'New hire • 6 units' }); setBoxVal(''); onNotify('Faculty record created with 3xxxxx ID'); }}><input style={inp} placeholder="Faculty name" value={boxVal} onChange={(e) => setBoxVal(e.target.value)} /><button style={btn} type="submit">Add</button></form>));
    }
    if (active === 'Broadcast Messaging' || active === 'System Announcements') {
      return table(active, ['Title', 'Detail', 'Actions'],
        broadcasts.list.map((r) => <tr key={r.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><strong>{r.name}</strong></td><td style={{ padding: 12 }}>{r.role}</td><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 6 }}><button style={ghost} onClick={() => { openEditDialog('Edit broadcast', r.name, (v) => { broadcasts.update(r.id, { name: v }); onNotify('Updated'); }); }}>Edit</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { broadcasts.remove(r.id); onNotify('Deleted'); }}>Delete</button></div></td></tr>),
        (<form style={{ display: 'flex', gap: 8, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (!boxVal.trim()) return; const title = boxVal.trim(); broadcasts.create({ id: uid('bc'), name: title, role: 'All roles • Just now' }); setBoxVal(''); pushNotification('all', { title: `System announcement: ${title}`, detail: 'Published by admin — check your Announcement Board.', category: 'Communication', target: 'Announcement Board' }); setPopup({ title: 'Broadcast sent', message: 'All roles received a popup notification entry.', lines: [title] }); onNotify('Broadcast sent to all roles'); }}><input style={inp} placeholder="Announcement to all roles" value={boxVal} onChange={(e) => setBoxVal(e.target.value)} /><button style={btn} type="submit">Broadcast</button></form>));
    }
    if (active === 'Fee Structure' || active === 'Billing & Invoices' || active === 'Teacher Records' || active === 'Room Allocation' || active === 'Subject Offering' || active === 'Broadcast Messaging' || active === 'System Announcements') {
      const map: Record<string, typeof fees> = { 'Fee Structure': fees, 'Billing & Invoices': bills, 'Teacher Records': faculty, 'Room Allocation': rooms, 'Subject Offering': offers, 'Broadcast Messaging': broadcasts, 'System Announcements': broadcasts };
      const col = map[active] ?? fees;
      return table(active, ['Name', 'Detail', 'Actions'],
        col.list.map((r) => <tr key={r.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}>{r.name}</td><td style={{ padding: 12 }}>{r.role}</td><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 6 }}><button style={ghost} onClick={() => {         openEditDialog('Edit record', r.name, (v) => { col.update(r.id, { name: v }); onNotify('Updated'); }) }}>Edit</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { col.remove(r.id); onNotify('Deleted'); }}>Delete</button></div></td></tr>),
        (<form style={{ display: 'flex', gap: 8, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (!boxVal.trim()) return; col.create({ id: uid('x'), name: boxVal.trim(), role: 'New' }); setBoxVal(''); onNotify('Created'); }}><input style={inp} placeholder={`New ${active}`} value={boxVal} onChange={(e) => setBoxVal(e.target.value)} /><button style={btn} type="submit">Add</button></form>));
    }
    if (active === 'Section Assignment') return <AdminTable title="Section Assignment" col={assign} colA="Student / Applicant" colB="Section" phA="e.g. Juan Dela Cruz" phB="e.g. BSIT-3A" onNotify={onNotify} footer={footer} />;
    if (active === 'Capacity Control') return <AdminTable title="Capacity Control" col={cap} colA="Section" colB="Enrolled / Capacity" phA="e.g. BSIT-3A" phB="e.g. 38 / 40" onNotify={onNotify} footer={footer} />;
    if (active === 'Status Monitoring') {
      const pending = enroll.list.length;
      const approved = (() => { try { const raw = localStorage.getItem('cec:s_enroll_apps'); const rows = raw ? (JSON.parse(raw) as { role: string }[]) : []; return rows.filter((r) => r.role.toLowerCase().includes('approv')).length; } catch { return 0; } })();
      const total = pending + approved + accounts.list.length;
      const bar = (label: string, v: number, max: number, color: string) => (<div style={{ marginTop: 10 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{label}</span><strong>{v}</strong></div><div style={{ height: 8, background: '#edf1f5', borderRadius: 8, marginTop: 6 }}><div style={{ width: `${max ? Math.round((v / max) * 100) : 0}%`, height: '100%', background: color, borderRadius: 8 }} /></div></div>);
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>Status Monitoring</h1><div style={box}>{bar('Pending applications', pending, total, '#ee9950')}{bar('Approved enrollments', approved, total, '#2bb17f')}{bar('Active accounts', accounts.list.length, total, '#3d82da')}<div style={{ marginTop: 14 }}><button style={btn} onClick={() => onNotify('Statuses refreshed from live queues')}>Refresh statuses</button></div></div>{footer}</section>);
    }
    if (active === 'Curriculum Setup') return <AdminTable title="Curriculum Setup" col={curr} colA="Program" colB="Structure" phA="e.g. BSCS" phB="e.g. 8 semesters" onNotify={onNotify} footer={footer} />;
    if (active === 'Calendar') return <AdminTable title="Academic Calendar" col={cal} colA="Event" colB="Date" phA="e.g. Midterm exams" phB="2026-10-20" onNotify={onNotify} footer={footer} />;
    if (active === 'Load Assignment') return <AdminTable title="Load Assignment" col={loads} colA="Faculty" colB="Units • Sections" phA="e.g. Ms. Reyes" phB="e.g. 9 units" onNotify={onNotify} footer={footer} />;
    if (active === 'Credentials') return <AdminTable title="Faculty Credentials" col={creds} colA="Credential" colB="Validity" phA="e.g. PRC License" phB="Valid until 2028-01-01" onNotify={onNotify} footer={footer} />;
    if (active === 'Password Reset') {
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>Password Reset</h1><div style={{ ...box }}><ChangePassword identifier={currentUser?.email || myPhotoId} onNotify={onNotify} /></div><form style={{ display: 'flex', gap: 8, marginTop: 14, maxWidth: 560 }} onSubmit={(e) => { e.preventDefault(); if (!resetWho.trim()) return; onNotify(`Reset link sent to accounts matching "${resetWho.trim()}"`); pushNotification(['student', 'teacher'], { title: 'Password reset issued', detail: 'Admin issued a password reset for your account.', category: 'System', target: 'Password Recovery' }); setResetWho(''); }}><input style={inp} placeholder="Name, ID or email" value={resetWho} onChange={(e) => setResetWho(e.target.value)} aria-label="Account to reset" /><button style={btn} type="submit">Send reset</button></form><div style={box}>{accounts.list.map((a) => <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eef1f6', fontSize: 14 }}><span><strong>{a.name}</strong> • {a.id}</span><button style={ghost} onClick={() => onNotify(`Reset link sent to ${a.name}`)}>Reset</button></div>)}</div>{footer}</section>);
    }
    if (active === 'Scholarships') {
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>Scholarship Approvals</h1><div style={{ ...box, padding: 0, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 12 }}>Applicant</th><th style={{ padding: 12 }}>Status</th><th style={{ padding: 12 }}>Decision</th></tr></thead><tbody>{scholars.list.map((s) => <tr key={s.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><strong>{s.name}</strong></td><td style={{ padding: 12 }}>{s.role}</td><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 6 }}><button style={{ background: '#16a34a', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }} onClick={() => { scholars.update(s.id, { role: 'Approved' }); try { const raw = localStorage.getItem('cec:s_scholar_v2'); const rows = raw ? (JSON.parse(raw) as { id: string; role: string }[]) : []; localStorage.setItem('cec:s_scholar_v2', JSON.stringify(rows.map((r) => (r.id === s.id ? { ...r, role: 'Approved by finance office' } : r)))); } catch { /* ignore */ } pushNotification(['student'], { title: 'Scholarship approved', detail: `${s.name} — finance office decision posted.`, category: 'Finance', target: 'Scholarship Application' }); onNotify(`${s.name} scholarship approved — student updated`); }}>Approve</button><button style={{ background: '#dc2626', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }} onClick={() => { scholars.update(s.id, { role: 'Denied' }); try { const raw = localStorage.getItem('cec:s_scholar_v2'); const rows = raw ? (JSON.parse(raw) as { id: string; role: string }[]) : []; localStorage.setItem('cec:s_scholar_v2', JSON.stringify(rows.map((r) => (r.id === s.id ? { ...r, role: 'Denied by finance office' } : r)))); } catch { /* ignore */ } onNotify(`${s.name} scholarship denied — student updated`); }}>Deny</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { scholars.remove(s.id); onNotify('Scholarship record deleted'); }}>Delete</button></div></td></tr>)}</tbody></table></div>{footer}</section>);
    }
    if (active === 'Payment Monitoring') {
      const peso = (s: string) => { const m = s.replace(/,/g, '').match(/₱\s*(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : 0; };
      const total = bills.list.reduce((n, b) => n + peso(`${b.name} ${b.role}`), 0);
      let receipts: { id: string; name: string; role: string; remote?: boolean; verifiedRemote?: boolean }[] = [];
      let verified: string[] = [];
      try {
        const hRaw = localStorage.getItem('cec:s_history_v2');
        receipts = hRaw ? JSON.parse(hRaw) : [];
        const vRaw = localStorage.getItem('cec:receipts_verified');
        verified = vRaw ? JSON.parse(vRaw) : [];
      } catch { /* ignore */ }
      remoteReceipts.forEach((r) => {
        if (!receipts.some((x) => x.id === r.id)) {
          receipts.push({ id: r.id, name: r.title, role: `${r.detail ?? ''} • ${r.status ?? 'Posted'}`, remote: true, verifiedRemote: r.status === 'Verified' });
        }
      });
      const verifyReceipt = (id: string, label: string, remote?: boolean) => {
        if (remote) {
          portalApi.itemUpdate(id, { status: 'Verified' }).then(() => {
            setRemoteReceipts((rows) => rows.map((r) => (r.id === id ? { ...r, status: 'Verified' } : r)));
            onNotify(`${label} verified — student tracker updated`);
          }).catch(() => onNotify('Could not reach database — receipt kept as posted'));
          pushNotification(['student'], { title: 'Receipt verified by accounting', detail: `${label} — your payment tracker now shows Receipt Issued.`, category: 'Finance', target: 'Payment Portal' });
          return;
        }
        if (!verified.includes(id)) {
          verified = [...verified, id];
          try { localStorage.setItem('cec:receipts_verified', JSON.stringify(verified)); } catch { /* ignore */ }
        }
        pushNotification(['student'], { title: 'Receipt verified by accounting', detail: `${label} — your payment tracker now shows Receipt Issued.`, category: 'Finance', target: 'Payment Portal' });
        onNotify(`${label} verified — student tracker updated`);
      };
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>Payment Monitoring — Accounting</h1>
        <div style={box}>Tracked invoices: <strong>{bills.list.length}</strong> • Total on books: <strong>₱{total.toLocaleString()}</strong>
          <div style={{ marginTop: 12 }}><strong>Student receipts ({receipts.length})</strong></div>
          {receipts.length ? receipts.map((h) => <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eef1f6', fontSize: 14 }}><span><strong>{h.name}</strong><div style={{ fontSize: 11, color: '#6b7890' }}>{h.id} • {h.role}{h.remote ? ' • MySQL' : ''}</div></span>{verified.includes(h.id) || h.verifiedRemote ? <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>Verified ✓</span> : <button style={btn} onClick={() => verifyReceipt(h.id, h.name, h.remote)}>Verify</button>}</div>) : <div style={{ fontSize: 13, color: '#6b7890' }}>No student payments posted yet.</div>}
          {bills.list.map((b) => <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eef1f6', fontSize: 14 }}><span><strong>{b.name}</strong> • {b.role}</span><button style={ghost} onClick={() => { bills.update(b.id, { role: `${b.role} • Verified` }); onNotify(`${b.name} marked verified`); }}>Verify</button></div>)}
        </div>{footer}</section>);
    }
    if (active === 'System Config') return <AdminTable title="System Config" col={syscfg} colA="Key" colB="Value" phA="e.g. enrollment_open" phB="e.g. true" onNotify={onNotify} footer={footer} />;
    if (active === 'Audit Log') {
      let trail: { id: string; title: string; detail: string }[] = [];
      try {
        const raw = localStorage.getItem('cec:notifications:admin');
        trail = raw ? JSON.parse(raw) : [];
      } catch { trail = []; }
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>Audit Log</h1><div style={box}>{trail.length ? trail.slice(0, 20).map((t) => <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid #eef1f6', fontSize: 13 }}><strong>{t.title}</strong><div style={{ color: '#6b7890' }}>{t.detail}</div></div>) : <div style={{ color: '#6b7890' }}>No admin activity recorded yet — actions you take (approvals, broadcasts, confirms) appear here.</div>}</div>{footer}</section>);
    }
    if (active === 'Backup & Restore') {
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>Backup &amp; Restore</h1><div style={box}><p style={{ fontSize: 13, color: '#475569' }}>Download every local portal record as JSON, or restore from a backup file. MySQL: full versioned dump lives at <code>database/cec_portal_v2_full.sql</code>.</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button style={btn} onClick={() => {
        const data: Record<string, string | null> = {};
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('cec:')) data[k] = localStorage.getItem(k); }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `cec-portal-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        onNotify('Backup downloaded');
      }}>Download backup</button><label style={{ ...ghost, display: 'inline-block' }}>Restore<input type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const data = JSON.parse(String(r.result)) as Record<string, string>; Object.entries(data).forEach(([k, v]) => { if (k.startsWith('cec:')) localStorage.setItem(k, v); }); onNotify('Backup restored — refresh to see it'); } catch { onNotify('Invalid backup file'); } }; r.readAsText(f); }} /></label><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { if (!window.confirm('Clear ALL local portal records (students, teachers, payments, docs)? The MySQL database is untouched.')) return; const keep = ['cec:theme', 'cec_session_user', 'cec_access_token', 'cec_remember_identifier']; const keys: string[] = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('cec:') && !keep.includes(k)) keys.push(k); } keys.forEach((k) => localStorage.removeItem(k)); onNotify(`Cleared ${keys.length} record stores — refresh for empty systems`); }}>Reset demo data</button></div></div>{footer}</section>);
    }
    if (active === 'Security') {
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>Security Monitoring</h1><div style={box}><div style={{ fontSize: 14 }}>Auto-approve new enrollments: <strong>{autoApprove ? 'ON' : 'OFF'}</strong> (toggle in Enrollment Approval)</div><div style={{ fontSize: 14, marginTop: 8 }}>Active session: <strong>{currentUser ? `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})` : '—'}</strong></div><div style={{ fontSize: 14, marginTop: 8 }}>Demo accounts use fixed credentials for thesis presentation; MySQL passwords are bcrypt-hashed.</div><div style={{ marginTop: 12 }}><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { localStorage.removeItem('cec_access_token'); onLogout(); onNotify('All sessions revoked — signed out'); }}>Revoke sessions &amp; sign out</button></div></div>{footer}</section>);
    }
    return (<section style={card}><h1 style={{ margin: 0 }}>{active}</h1><div style={box}>Route <strong>{route}</strong> ready.</div>{footer}</section>);
  };

  return (
    <div className={`role-dashboard${dark ? ' cec-dark' : ''}`} style={{ minHeight: '100vh', background: dark ? '#0b1220' : '#f3f5f9', fontFamily: 'Inter,system-ui,sans-serif' }}>
      <header className="dashboard-topbar" style={{ height: 68, background: '#fff', borderBottom: '1px solid #e5e9f0', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 270 }}><img src={`${BASE}cec-logo.png`} alt="Cebu Eastern College crest" width={38} height={38} style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'contain', background: '#fff', padding: 2 }} /><div><div style={{ fontWeight: 800 }}>Cebu Eastern College</div><div style={{ fontSize: 10, color: '#8a94a6' }}>ADMIN PORTAL • 1ST SEM 2024-2025</div></div></div>
        <button onClick={() => setCollapsed((c) => !c)} style={{ border: '1px solid #e2e7ef', background: '#fff', borderRadius: 10, width: 38, height: 38, cursor: 'pointer' }}>☰</button>
        <button className="dashboard-home-link" type="button" onClick={() => setActive('Dashboard')}>⌂ Dashboard</button><span style={{ background: '#e8f1ff', color: '#1d5fc2', fontSize: 12, fontWeight: 800, borderRadius: 8, padding: '5px 10px' }}>ADMIN</span><span style={{ color: '#8a94a6', fontSize: 13 }}>{active === 'Dashboard' ? 'Overview' : route}</span>
        <DashboardCommandMenu items={moduleItems} records={searchRecords} onNavigate={navigate} />
        <div className="dashboard-actions" style={{ marginLeft: 'auto' }}><NotificationCenter role="admin" onNavigate={navigate} /><button type="button" className="theme-toggle" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>{dark ? '☀' : '🌙'}</button><span key={photoTick}><PhotoAvatar userId={myPhotoId} name={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Admin'} size={36} /></span></div>
      </header>
      <div style={{ display: 'flex' }}>
        {!collapsed && (<aside className="dashboard-sidebar" style={{ width: 320, background: '#fff', borderRight: '1px solid #e5e9f0', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 'calc(100vh - 68px)' }}>{GROUPS.map((g) => { const open = expanded === g.id; return (<div className={`dashboard-nav-group ${open ? 'is-open' : ''}`} key={g.id} style={{ border: '1px solid #e8ecf3', borderRadius: 12, padding: 8 }}><button onClick={() => setExpanded(open ? '' : g.id)} style={{ width: '100%', display: 'flex', gap: 10, border: 0, background: 'transparent', padding: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13 }}><span>{g.icon}</span><span style={{ flex: 1, textAlign: 'left' }}>{g.label}</span><span>{open ? '⌄' : '›'}</span></button>{open && <div style={{ display: 'grid', gap: 4 }}>{g.items.map((it) => <button key={it.label} onClick={() => setActive(it.label)} style={{ textAlign: 'left', border: 0, borderRadius: 8, padding: '11px 14px', background: active === it.label ? NAVY : '#f8fafc', color: active === it.label ? '#fff' : '#4a5872', cursor: 'pointer', fontWeight: active === it.label ? 700 : 400 }}>{it.label}</button>)}</div>}</div>); })}<div style={{ marginTop: 'auto', borderTop: '1px solid #eef1f6', paddingTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}><span key={photoTick}><PhotoAvatar userId={myPhotoId} name={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Admin'} size={34} /></span><div><div style={{ fontWeight: 700, fontSize: 13 }}>{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Admin'}</div><div style={{ fontSize: 12, color: '#8a94a6' }}>{myPhotoId}</div><div style={{ fontSize: 12, color: '#8a94a6' }}>admin</div></div><button onClick={onLogout} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: '#8a94a6', cursor: 'pointer' }}>Log out</button></div></aside>)}
        <main className="dashboard-main" style={{ flex: 1, padding: 24, minWidth: 0 }}>{render()}</main>
      </div>
      {popup && <AlertPopup title={popup.title} message={popup.message} lines={popup.lines} onClose={() => setPopup(null)} />}
    </div>
  );
};
