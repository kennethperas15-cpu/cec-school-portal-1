import { useEffect, useState } from 'react';
import { useCollection, uid } from '../../services/crud';
import { portalApi } from '../../services/portal';
import { RoleDashboardHome } from '../shared/RoleDashboardHome';
import { DashboardCommandMenu } from '../shared/DashboardCommandMenu';
import { NotificationCenter } from '../shared/NotificationCenter';
import { openEditDialog } from '../shared/EditDialog';
import { AdminReports } from './reporting/AdminReports';

type Props = { currentUser: { firstName: string; lastName: string; role: string } | null; onNotify: (t: string) => void; onLogout: () => void; };
const NAVY = '#0B3D91';
type Group = { id: string; label: string; icon: string; items: { label: string; route: string }[] };
const GROUPS: Group[] = [
  { id: 'account', label: 'ACCOUNT MGMT', icon: '◈', items: [{ label: 'RBAC Management', route: 'a_auth_rbac' }, { label: 'Account Creation', route: 'a_auth_accounts' }, { label: 'Password Reset', route: 'a_auth_reset' }] },
  { id: 'enroll', label: 'ENROLLMENT MGMT', icon: '▤', items: [{ label: 'Enrollment Approval', route: 'a_enroll_approval' }, { label: 'Section Assignment', route: 'a_enroll_sections' }, { label: 'Capacity Control', route: 'a_enroll_capacity' }, { label: 'Status Monitoring', route: 'a_enroll_status' }] },
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

export const AdminDashboard = ({ currentUser, onNotify, onLogout }: Props) => {
  const [active, setActive] = useState('Dashboard');
  const [expanded, setExpanded] = useState('account');
  const [collapsed, setCollapsed] = useState(false);
  const enroll = useCollection('a_enroll', [{ id: 'CEC-2024-0030', name: 'Lisa Tan', meta: 'BSIT • Documents Verified' }, { id: 'CEC-2024-0031', name: 'Paul Cruz', meta: 'BSCS • Applied' }]);
  const accounts = useCollection('a_accounts', [{ id: 'CEC-2024-0015', name: 'Juan Dela Cruz', role: 'student' }, { id: 'T-001', name: 'Prof. Santos', role: 'teacher' }, { id: 'ADMIN', name: 'Registrar Admin', role: 'admin' }]);
  const fees = useCollection('a_fees', [{ id: 'f1', name: 'Tuition BSIT', role: '18500' }, { id: 'f2', name: 'Lab Fee', role: '2500' }]);
  const faculty = useCollection('a_faculty', [{ id: 'T-001', name: 'Prof. Santos', role: 'BSIT • 12 units' }]);
  const rooms = useCollection('a_rooms', [{ id: 'R1', name: 'Lab 2', role: '40 seats' }]);
  const offers = useCollection('a_offers', [{ id: 'O1', name: 'IT 302 - Database', role: 'BSIT-3A' }]);
  const bills = useCollection('a_bills', [{ id: 'B1', name: 'Tuition balance', role: '₱18,500' }]);
  const broadcasts = useCollection('a_broadcast', [{ id: 'bc1', name: 'Enrollment extended', role: 'All roles' }]);
  const [perms, setPerms] = useState<Record<string, boolean>>({ 'Teacher-Students': true, 'Teacher-Teachers': true, 'Admin-Students': true, 'Admin-Teachers': true, 'Admin-Finance': true, 'Admin-Admin': true });
  const [fn, setFn] = useState(''); const [fi, setFi] = useState(''); const [fr, setFr] = useState('student');
  const [enrN, setEnrN] = useState(''); const [enrM, setEnrM] = useState('BSIT • Applied');
  const [autoApprove, setAutoApprove] = useState(() => { try { return localStorage.getItem('cec:auto_approve') === '1'; } catch { return false; } });
  const [boxVal, setBoxVal] = useState('');
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

  const decideEnrollment = async (id: string, decision: 'approved' | 'rejected') => {
    try { await portalApi.enrollDecide(id, decision); } catch { /* local-only fallback */ }
    enroll.remove(id);
    syncStudentStatus(id, decision === 'approved' ? 'Approved' : 'Rejected');
    onNotify(`${id} ${decision} — student tracker updated${mysqlOn ? ' (MySQL)' : ''}`);
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
    if (active === 'Dashboard') return <RoleDashboardHome role="admin" name={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Admin'} onNavigate={navigate} />;
    if (active === 'Enrollment Stats' || active === 'Academic Performance' || active === 'Revenue Dashboard') return <AdminReports onNotify={onNotify} />;
    if (active === 'Enrollment Approval') {
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>Enrollment Approval (CRUD)</h1>
        <div style={{ ...box, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div><strong>Auto-approve new applications: {autoApprove ? 'ON' : 'OFF'}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>Student Online Enrollment + Registration write to this queue. Approvals sync back to the student Status Tracker.</div></div><button style={autoApprove ? ghost : btn} onClick={toggleAuto}>{autoApprove ? 'Turn OFF' : 'Turn ON'}</button></div>
        <div style={{ ...box, padding: 0, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 12 }}>Applicant</th><th style={{ padding: 12 }}>Detail</th><th style={{ padding: 12 }}>Decision</th></tr></thead><tbody>{enroll.list.map((a) => <tr key={a.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><strong>{a.name} - {a.id}</strong></td><td style={{ padding: 12 }}>{a.meta}</td><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 8 }}><button style={{ background: '#16a34a', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }} onClick={() => decideEnrollment(a.id, 'approved')}>Approve</button><button style={{ background: '#dc2626', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }} onClick={() => decideEnrollment(a.id, 'rejected')}>Reject</button><button style={ghost} onClick={() => {         openEditDialog('Edit detail', a.meta, (v) => { enroll.update(a.id, { meta: v }); onNotify('Updated'); }) }}>Edit</button></div></td></tr>)}{!enroll.list.length && <tr><td colSpan={3} style={{ padding: 16, color: '#6b7890' }}>Queue empty — new student applications will appear here.</td></tr>}</tbody></table></div>
        <form style={{ display: 'flex', gap: 8, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (!enrN.trim()) return; enroll.create({ id: uid('CEC'), name: enrN.trim(), meta: enrM }); setEnrN(''); onNotify('Application created'); }}><input style={inp} placeholder="Applicant name" value={enrN} onChange={(e) => setEnrN(e.target.value)} /><input style={inp} value={enrM} onChange={(e) => setEnrM(e.target.value)} /><button style={btn} type="submit">Add</button></form>{footer}</section>);
    }
    if (active === 'RBAC Management') {
      const rows = ['Student', 'Teacher', 'Admin']; const cols = ['Students', 'Teachers', 'Finance', 'Admin'];
      return (<section style={card}><h1 style={{ margin: 0 }}>Role-Based Access Control (RBAC) — Update</h1><div style={{ ...box, padding: 0 }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr style={{ background: '#f8fafc' }}><th style={{ textAlign: 'left', padding: 12 }}>Role</th>{cols.map((c) => <th key={c} style={{ padding: 12 }}>{c}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}>{r}</td>{cols.map((c) => <td key={c} style={{ textAlign: 'center', padding: 12 }}><input type="checkbox" checked={!!perms[`${r}-${c}`]} onChange={() => { setPerms((p) => ({ ...p, [`${r}-${c}`]: !p[`${r}-${c}`] })); }} aria-label={`${r}-${c}`} /></td>)}</tr>)}</tbody></table></div><div style={{ marginTop: 12, display: 'flex', gap: 8 }}><button style={btn} onClick={() => onNotify('Permissions updated')}>Save Permissions</button><button style={ghost} onClick={() => { setPerms({}); onNotify('Permissions cleared (Delete)'); }}>Clear all</button></div>{footer}</section>);
    }
    if (active === 'Account Creation') {
      return table('Account Creation / Management', ['ID', 'Name', 'Role', 'Actions'],
        accounts.list.map((a) => <tr key={a.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}>{a.id}</td><td style={{ padding: 12 }}>{a.name}</td><td style={{ padding: 12 }}>{a.role}</td><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 6 }}><button style={ghost} onClick={() => {         openEditDialog('Edit name', a.name, (v) => { accounts.update(a.id, { name: v }); onNotify('Account updated'); }) }}>Edit</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { accounts.remove(a.id); onNotify('Account deleted'); }}>Delete</button></div></td></tr>),
        (<form style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14, maxWidth: 640 }} onSubmit={(e) => { e.preventDefault(); if (!fn.trim() || !fi.trim()) { onNotify('Enter name and ID'); return; } accounts.create({ id: fi.trim(), name: fn.trim(), role: fr }); setFn(''); setFi(''); onNotify('Account created'); }}><input style={inp} placeholder="Full Name" value={fn} onChange={(e) => setFn(e.target.value)} /><select style={inp} value={fr} onChange={(e) => setFr(e.target.value)}><option value="student">student</option><option value="teacher">teacher</option><option value="admin">admin</option></select><input style={inp} placeholder="ID (e.g. CEC-2024-0040)" value={fi} onChange={(e) => setFi(e.target.value)} /><button style={{ ...btn, gridColumn: '1/-1' }} type="submit">Create Account</button></form>));
    }
    if (active === 'Fee Structure' || active === 'Billing & Invoices' || active === 'Teacher Records' || active === 'Room Allocation' || active === 'Subject Offering' || active === 'Broadcast Messaging' || active === 'System Announcements') {
      const map: Record<string, typeof fees> = { 'Fee Structure': fees, 'Billing & Invoices': bills, 'Teacher Records': faculty, 'Room Allocation': rooms, 'Subject Offering': offers, 'Broadcast Messaging': broadcasts, 'System Announcements': broadcasts };
      const col = map[active] ?? fees;
      return table(active, ['Name', 'Detail', 'Actions'],
        col.list.map((r) => <tr key={r.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}>{r.name}</td><td style={{ padding: 12 }}>{r.role}</td><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 6 }}><button style={ghost} onClick={() => {         openEditDialog('Edit record', r.name, (v) => { col.update(r.id, { name: v }); onNotify('Updated'); }) }}>Edit</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { col.remove(r.id); onNotify('Deleted'); }}>Delete</button></div></td></tr>),
        (<form style={{ display: 'flex', gap: 8, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (!boxVal.trim()) return; col.create({ id: uid('x'), name: boxVal.trim(), role: 'New' }); setBoxVal(''); onNotify('Created'); }}><input style={inp} placeholder={`New ${active}`} value={boxVal} onChange={(e) => setBoxVal(e.target.value)} /><button style={btn} type="submit">Add</button></form>));
    }
    if (active.startsWith('Enrollment') || active.startsWith('Academic') || active.startsWith('Financial') || active.startsWith('HR') || active.startsWith('Report') || active.startsWith('System') || active.startsWith('Calendar') || active.startsWith('Payment') || active.startsWith('Scholar') || active.startsWith('Section') || active.startsWith('Capacity') || active.startsWith('Status') || active.startsWith('Curriculum') || active.startsWith('Load') || active.startsWith('Credential')) {
      return (<section style={card}><h1 style={{ margin: 0 }}>{active} (CRUD wired)</h1><div style={box}>Records: <strong>{enroll.list.length + accounts.list.length + fees.list.length}</strong> • Route <strong>{route}</strong><div style={{ display: 'flex', gap: 8, marginTop: 12 }}><button style={btn} onClick={() => { enroll.create({ id: uid('CEC'), name: 'New Applicant', meta: active }); onNotify(`${active} record created`); }}>Create</button><button style={ghost} onClick={() => onNotify(`${active} report exported`)}>Read / Export</button><button style={ghost} onClick={() => { enroll.update(enroll.list[0]?.id ?? '', { meta: `${active} reviewed` }); onNotify('First record updated'); }}>Update first</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { if (enroll.list[0]) { enroll.remove(enroll.list[0].id); onNotify('First record deleted'); } }}>Delete first</button></div></div>{footer}</section>);
    }
    return (<section style={card}><h1 style={{ margin: 0 }}>{active}</h1><div style={box}>Route <strong>{route}</strong> ready.</div>{footer}</section>);
  };

  return (
    <div className="role-dashboard" style={{ minHeight: '100vh', background: '#f3f5f9', fontFamily: 'Inter,system-ui,sans-serif' }}>
      <header className="dashboard-topbar" style={{ height: 68, background: '#fff', borderBottom: '1px solid #e5e9f0', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 270 }}><div style={{ width: 38, height: 38, borderRadius: 10, background: NAVY, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>CEC</div><div><div style={{ fontWeight: 800 }}>Cebu Eastern College</div><div style={{ fontSize: 10, color: '#8a94a6' }}>ADMIN PORTAL • 1ST SEM 2024-2025</div></div></div>
        <button onClick={() => setCollapsed((c) => !c)} style={{ border: '1px solid #e2e7ef', background: '#fff', borderRadius: 10, width: 38, height: 38, cursor: 'pointer' }}>☰</button>
        <button className="dashboard-home-link" type="button" onClick={() => setActive('Dashboard')}>⌂ Dashboard</button><span style={{ background: '#e8f1ff', color: '#1d5fc2', fontSize: 12, fontWeight: 800, borderRadius: 8, padding: '5px 10px' }}>ADMIN</span><span style={{ color: '#8a94a6', fontSize: 13 }}>{active === 'Dashboard' ? 'Overview' : route}</span>
        <DashboardCommandMenu items={moduleItems} records={searchRecords} onNavigate={navigate} />
        <div className="dashboard-actions" style={{ marginLeft: 'auto' }}><NotificationCenter role="admin" onNavigate={navigate} /><div className="dashboard-avatar" style={{ width: 36, height: 36, borderRadius: '50%', background: NAVY, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{currentUser?.firstName?.[0] ?? 'A'}</div></div>
      </header>
      <div style={{ display: 'flex' }}>
        {!collapsed && (<aside className="dashboard-sidebar" style={{ width: 320, background: '#fff', borderRight: '1px solid #e5e9f0', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 'calc(100vh - 68px)' }}>{GROUPS.map((g) => { const open = expanded === g.id; return (<div className={`dashboard-nav-group ${open ? 'is-open' : ''}`} key={g.id} style={{ border: '1px solid #e8ecf3', borderRadius: 12, padding: 8 }}><button onClick={() => setExpanded(open ? '' : g.id)} style={{ width: '100%', display: 'flex', gap: 10, border: 0, background: 'transparent', padding: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13 }}><span>{g.icon}</span><span style={{ flex: 1, textAlign: 'left' }}>{g.label}</span><span>{open ? '⌄' : '›'}</span></button>{open && <div style={{ display: 'grid', gap: 4 }}>{g.items.map((it) => <button key={it.label} onClick={() => setActive(it.label)} style={{ textAlign: 'left', border: 0, borderRadius: 8, padding: '11px 14px', background: active === it.label ? NAVY : '#f8fafc', color: active === it.label ? '#fff' : '#4a5872', cursor: 'pointer', fontWeight: active === it.label ? 700 : 400 }}>{it.label}</button>)}</div>}</div>); })}<div style={{ marginTop: 'auto', borderTop: '1px solid #eef1f6', paddingTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}><div><div style={{ fontWeight: 700, fontSize: 13 }}>{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Admin'}</div><div style={{ fontSize: 12, color: '#8a94a6' }}>admin</div></div><button onClick={onLogout} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: '#8a94a6', cursor: 'pointer' }}>Log out</button></div></aside>)}
        <main className="dashboard-main" style={{ flex: 1, padding: 24, minWidth: 0 }}>{render()}</main>
      </div>
    </div>
  );
};
