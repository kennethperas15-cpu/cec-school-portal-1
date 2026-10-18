import React, { useEffect, useState } from 'react';
import { useTheme } from '../../services/theme';
import { useAcademicConfig } from '../../services/academicConfig';
import { PhotoAvatar } from './PhotoAvatar';
import { AlertPopup } from './AlertPopup';
import { DashboardCommandMenu } from './DashboardCommandMenu';
import { NotificationCenter } from './NotificationCenter';
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Users,
  type LucideIcon,
} from 'lucide-react';
const BASE = import.meta.env.BASE_URL || '/';
const NAVY = '#0B3D91';
const TEACHER_NAV_ICONS: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  'Class Schedule': CalendarDays,
  'Class Roster': Users,
  'Grade Encoding': BookOpen,
  'Attendance Tracker': CalendarCheck,
  Classroom: ClipboardList,
};

export type ShellGroup = {
  id: string;
  label: string;
  icon: string;
  items: { label: string; route: string }[];
};

export type ShellPopup = { title: string; message: string; lines?: string[] } | null;

interface DashboardShellProps {
  role: 'student' | 'teacher' | 'admin';
  groups: ShellGroup[];
  active: string;
  expanded: string;
  onExpand: (id: string) => void;
  onNavigate: (label: string) => void;
  onLogout: () => void;
  userName: string;
  userIdLine: string;
  photoUserId: string;
  photoVersion?: number | string;
  moduleItems: string[];
  searchRecords: { title: string; detail: string; target: string }[];
  routeCrumb?: string;
  popup: ShellPopup;
  onClosePopup: () => void;
  children: React.ReactNode;
}

/**
 * Shared responsive navigation shell (Sidebar + Top Navbar) for the
 * student, teacher, and admin portals. Role-specific content stays in the
 * dashboards; chrome, navigation, theme, search, and notifications live here.
 */
export const DashboardShell: React.FC<DashboardShellProps> = ({
  role, groups, active, expanded, onExpand, onNavigate, onLogout,
  userName, userIdLine, photoUserId, photoVersion, moduleItems, searchRecords,
  routeCrumb, popup, onClosePopup, children,
}) => {
  const { dark, toggle } = useTheme();
  const academicConfig = useAcademicConfig();
  const [collapsed, setCollapsed] = useState(false);
  // Mobile: start shut, auto-close after each navigation so content is usable
  useEffect(() => {
    try {
      if (window.innerWidth < 800) setCollapsed(true);
    } catch { /* non-browser render */ }
  }, [active]);

  return (
    <div className={`role-dashboard role-dashboard-${role}${(role === 'admin' || role === 'teacher') && collapsed ? ' is-sidebar-collapsed' : ''}${dark ? ' cec-dark' : ''}`} style={{ minHeight: '100vh', background: dark ? '#0b1220' : '#f3f5f9', fontFamily: 'Inter,system-ui,sans-serif' }}>
      {(role === 'admin' || role === 'teacher') && !collapsed && <button type="button" className="dashboard-sidebar-backdrop" onClick={() => setCollapsed(true)} aria-label="Close navigation" />}
      <header className="dashboard-topbar" style={{ height: 68, background: '#fff', borderBottom: '1px solid #e5e9f0', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, position: 'sticky', top: 0, zIndex: 5 }}>
        <div className="dashboard-topbar-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 270 }}><button onClick={() => setCollapsed((c) => !c)} style={{ border: '1px solid #e2e7ef', background: '#fff', borderRadius: 10, width: 38, height: 38, cursor: 'pointer', fontSize: 16 }} aria-label="Toggle sidebar">☰</button><img src={`${BASE}cec-logo.png`} alt="Cebu Eastern College crest" width={38} height={38} style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'contain', background: '#fff', padding: 2 }} /><div><div style={{ fontWeight: 800 }}>Cebu Eastern College</div><div style={{ fontSize: 10, color: '#8a94a6' }}>{role.toUpperCase()} PORTAL • {academicConfig.semester.toUpperCase()} {academicConfig.schoolYear}</div></div></div>
        <span className="dashboard-role-badge" style={{ background: '#e8f1ff', color: '#1d5fc2', fontSize: 12, fontWeight: 800, borderRadius: 8, padding: '5px 10px' }}>{role.toUpperCase()}</span>
        {routeCrumb && <span className="dashboard-route-crumb" style={{ color: '#8a94a6', fontSize: 13 }}>{routeCrumb}</span>}
        {(role === 'admin' || role === 'teacher') && <span className="dashboard-academic-period">{academicConfig.semester} • AY {academicConfig.schoolYear}</span>}
        <div className="dashboard-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}><DashboardCommandMenu items={moduleItems} records={searchRecords} onNavigate={onNavigate} /><NotificationCenter role={role} onNavigate={onNavigate} /><button type="button" className="theme-toggle" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>{dark ? '☀' : '🌙'}</button>{role === 'admin' || role === 'teacher' ? <span className="dashboard-topbar-user"><span key={photoVersion}><PhotoAvatar userId={photoUserId} name={userName} size={36} /></span><span className="dashboard-topbar-user-copy"><strong>{userName}</strong><small>{userIdLine}</small></span></span> : <span key={photoVersion}><PhotoAvatar userId={photoUserId} name={userName} size={36} /></span>}<button type="button" className="dashboard-logout" onClick={onLogout} aria-label="Log out" title="Log out"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></svg></button></div>
      </header>
      <div style={{ display: 'flex' }}>
        {!collapsed && (<aside className="dashboard-sidebar" style={{ width: role === 'teacher' || role === 'admin' ? 240 : 320, background: '#fff', borderRight: '1px solid #e5e9f0', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 'calc(100vh - 68px)' }}>{role === 'admin' && <><div className="dashboard-sidebar-brand"><img src={`${BASE}cec-logo.png`} alt="Cebu Eastern College seal" width={40} height={40} /><div><strong>Cebu Eastern College</strong><span>Administrator Portal</span></div></div><div className="dashboard-sidebar-status">Active Administrator • AY {academicConfig.schoolYear}</div></>}{role === 'teacher' ? <><div className="dashboard-sidebar-brand"><img src={`${BASE}cec-logo.png`} alt="Cebu Eastern College seal" width={40} height={40} /><div><strong>Cebu Eastern College</strong><span>Teacher Portal</span></div></div><div className="dashboard-sidebar-status">Active Teacher • {academicConfig.schoolYear}</div><nav className="teacher-shell-nav"><p className="teacher-shell-nav-label">Academic Menu</p>{groups.flatMap((group) => group.items).map((item) => { const Icon = TEACHER_NAV_ICONS[item.label] ?? LayoutDashboard; return <button type="button" aria-current={active === item.label ? 'page' : undefined} className={`teacher-shell-nav-item${active === item.label ? ' is-active' : ''}`} key={item.label} onClick={() => onNavigate(item.label)}><Icon aria-hidden="true" />{item.label}</button>; })}<div className="teacher-shell-nav-system"><p className="teacher-shell-nav-label">System</p><button type="button" className="teacher-shell-nav-item" onClick={onLogout}><LogOut aria-hidden="true" />Logout</button></div></nav></> : groups.map((g) => { const open = expanded === g.id; return (<div className={`dashboard-nav-group ${open ? 'is-open' : ''}`} key={g.id} style={{ border: '1px solid #e8ecf3', borderRadius: 12, padding: 8 }}><button onClick={() => onExpand(open ? '' : g.id)} style={{ width: '100%', display: 'flex', gap: 10, border: 0, background: 'transparent', padding: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13 }}><span>{g.icon}</span><span style={{ flex: 1, textAlign: 'left' }}>{g.label}</span><span>{open ? '⌄' : '›'}</span></button>{open && <div style={{ display: 'grid', gap: 4 }}>{g.items.map((it) => <button className={`dashboard-nav-item${active === it.label ? ' is-active' : ''}`} key={it.label} onClick={() => onNavigate(it.label)} style={{ textAlign: 'left', border: 0, borderRadius: 8, padding: '11px 14px', background: active === it.label ? NAVY : 'transparent', color: active === it.label ? '#fff' : '#4a5872', cursor: 'pointer', fontWeight: active === it.label ? 700 : 400 }}>{it.label}</button>)}</div>}</div>); })}{role !== 'teacher' && <div style={{ marginTop: 'auto', borderTop: '1px solid #eef1f6', paddingTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}><span key={photoVersion}><PhotoAvatar userId={photoUserId} name={userName} size={34} /></span><div><div style={{ fontWeight: 700, fontSize: 13 }}>{userName}</div><div style={{ fontSize: 12, color: '#8a94a6' }}>{userIdLine}</div><div style={{ fontSize: 12, color: '#8a94a6' }}>{role}</div></div><button onClick={onLogout} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: '#8a94a6', cursor: 'pointer' }}>Log out</button></div>}</aside>)}
        <main className="dashboard-main" style={{ flex: 1, padding: 24, minWidth: 0 }}>{children}</main>
      </div>
      {popup && <AlertPopup title={popup.title} message={popup.message} lines={popup.lines} onClose={onClosePopup} />}
    </div>
  );
};

export default DashboardShell;
