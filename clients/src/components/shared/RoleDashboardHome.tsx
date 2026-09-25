import React from 'react';
import { useAcademicConfig } from '../../services/academicConfig';

export type DashboardRole = 'student' | 'teacher' | 'admin';

type Props = {
  role: DashboardRole;
  name: string;
  onNavigate: (label: string) => void;
  liveMetrics?: { label: string; value: string; detail: string }[];
  blankSections?: boolean;
};

type DashboardSection = { title: string; target: string; items: { title: string; detail: string; status?: string; target?: string }[] };

const roleContent: Record<DashboardRole, {
  eyebrow: string;
  title: string;
  description: string;
  metrics: { label: string; value: string; detail: string; tone: string }[];
  sections: DashboardSection[];
  actions: { label: string; target: string; icon: string }[];
}> = {
  student: {
    eyebrow: 'STUDENT OVERVIEW',
    title: 'Good morning',
    description: 'Here is your academic snapshot and the next best actions for today.',
    metrics: [
      { label: 'Enrollment status', value: 'Approved', detail: '1st Sem • BSIT 3rd Year', tone: 'green' },
      { label: 'Current average', value: '93.7%', detail: 'Across 4 enrolled subjects', tone: 'blue' },
      { label: 'Attendance', value: '96%', detail: 'Excellent standing', tone: 'purple' },
      { label: 'Outstanding balance', value: '₱18,500', detail: 'Due October 12, 2024', tone: 'orange' },
    ],
    sections: [
      { title: 'Upcoming classes', target: 'Class Schedule', items: [{ title: 'CS 301 — Data Structures', detail: 'Today • 8:00–9:30 AM • Room 301', status: 'Today', target: 'Class Schedule' }, { title: 'CS 302 — Database Systems', detail: 'Tomorrow • 10:00–11:30 AM • Lab 2', status: 'Tomorrow', target: 'Class Schedule' }] },
      { title: 'Assignments & announcements', target: 'Assignments', items: [{ title: 'ER Diagram Project', detail: 'Due October 20 • Database Systems', status: 'Due soon', target: 'Assignments' }, { title: 'Midterm coverage posted', detail: 'Faculty announcement • 2 hours ago', status: 'New', target: 'Announcement Board' }] },
      { title: 'Pending requests', target: 'Document Request', items: [{ title: 'Certificate of Enrollment', detail: 'Document request is being processed', status: 'Processing', target: 'Document Request' }, { title: 'Curriculum checklist', detail: '12 of 16 requirements completed', status: '75%', target: 'Curriculum Checklist' }] },
    ],
    actions: [
      { label: 'Enroll now', target: 'Online Enrollment', icon: '＋' },
      { label: 'View grades', target: 'Grades / Report Card', icon: '↗' },
      { label: 'Pay balance', target: 'Payment Portal', icon: '₱' },
      { label: 'Request document', target: 'Document Request', icon: '▤' },
      { label: 'Contact adviser', target: 'Messaging', icon: '✉' },
    ],
  },
  teacher: {
    eyebrow: 'FACULTY OVERVIEW',
    title: 'Good morning',
    description: 'Stay on top of classes, student progress, and today’s teaching priorities.',
    metrics: [
      { label: 'Assigned sections', value: '4', detail: '12 teaching units', tone: 'blue' },
      { label: 'Total students', value: '126', detail: 'Across all sections', tone: 'purple' },
      { label: 'Pending grades', value: '18', detail: 'Need review this week', tone: 'orange' },
      { label: 'Attendance today', value: '75%', detail: '3 of 4 classes recorded', tone: 'green' },
    ],
    sections: [
      { title: 'Today’s classes', target: 'Class Schedule', items: [{ title: 'BSIT-3A — Data Structures', detail: '7:30–9:00 AM • Room 301', status: 'Completed', target: 'Class Schedule' }, { title: 'BSIT-3B — Web Development', detail: '9:00–10:30 AM • Lab 2', status: 'Upcoming', target: 'Class Schedule' }] },
      { title: 'Upcoming work', target: 'Assignments', items: [{ title: 'Midterm Exam — DB Systems', detail: 'October 18 • 50 items', status: 'Scheduled', target: 'Exam Creation' }, { title: 'ER Diagram Project', detail: '24 submissions • Review pending', status: 'Review', target: 'Assignments' }] },
      { title: 'Recent messages', target: 'Messaging', items: [{ title: 'To BSIT-3A', detail: 'Midterm coverage posted • Today', status: 'New', target: 'Messaging' }, { title: 'Student consultation request', detail: 'Juan Dela Cruz • Tomorrow 1:00 PM', status: 'Open', target: 'Messaging' }] },
    ],
    actions: [
      { label: 'Encode grades', target: 'Grade Encoding', icon: '✓' },
      { label: 'Record attendance', target: 'Daily Attendance', icon: '◷' },
      { label: 'Post announcement', target: 'Announcement Posting', icon: '✦' },
      { label: 'Upload material', target: 'Materials', icon: '↑' },
      { label: 'View roster', target: 'Class List / Roster', icon: '☷' },
    ],
  },
  admin: {
    eyebrow: 'ADMIN OVERVIEW',
    title: 'Good morning',
    description: 'Monitor school operations, approvals, and system activity from one place.',
    metrics: [
      { label: 'Total students', value: '1,248', detail: '+8.4% this semester', tone: 'blue' },
      { label: 'Active teachers', value: '86', detail: '4 pending credentials', tone: 'purple' },
      { label: 'Pending applications', value: '24', detail: '12 submitted today', tone: 'orange' },
      { label: 'Outstanding balances', value: '₱842k', detail: '18 accounts need follow-up', tone: 'green' },
    ],
    sections: [
      { title: 'Enrollment operations', target: 'Enrollment Approval', items: [{ title: 'Applications awaiting review', detail: '24 student applications in queue', status: 'Action needed', target: 'Enrollment Approval' }, { title: 'Approval rate', detail: '92% approved this semester', status: 'Healthy', target: 'Enrollment Stats' }] },
      { title: 'Recent transactions', target: 'Payment Monitoring', items: [{ title: 'Tuition payment received', detail: 'Juan Dela Cruz • ₱18,500 • Today', status: 'Posted', target: 'Payment Monitoring' }, { title: 'Faculty account created', detail: 'Prof. Maria Santos • 30 minutes ago', status: 'Audit', target: 'Account Creation' }] },
      { title: 'System alerts', target: 'Security', items: [{ title: 'Backup completed successfully', detail: 'Today at 02:00 AM • No issues found', status: 'Healthy', target: 'Backup & Restore' }, { title: '4 faculty credentials expire soon', detail: 'Review before October 31', status: 'Review', target: 'Credentials' }] },
    ],
    actions: [
      { label: 'Approve enrollment', target: 'Enrollment Approval', icon: '✓' },
      { label: 'Create account', target: 'Account Creation', icon: '＋' },
      { label: 'Publish announcement', target: 'System Announcements', icon: '✦' },
      { label: 'Generate report', target: 'Enrollment Stats', icon: '▥' },
      { label: 'Manage faculty', target: 'Teacher Records', icon: '☷' },
    ],
  },
};

export const RoleDashboardHome: React.FC<Props> = ({ role, name, onNavigate, liveMetrics, blankSections }) => {
  const academicConfig = useAcademicConfig();
  const content = roleContent[role];
  const metrics = content.metrics.map((m) => {
    const live = liveMetrics?.find((l) => l.label === m.label);
    return live ? { ...m, value: live.value, detail: live.detail } : m;
  });
  const firstName = name.trim().split(/\s+/)[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <section className="role-home">
      <div className="role-home-heading">
        <div><span className="role-home-eyebrow">{content.eyebrow}</span><h1>{greeting}, {firstName} <span>✦</span></h1><p>{content.description}</p></div>
        <span className="role-home-date">CEC Portal • {academicConfig.semester} {academicConfig.schoolYear}</span>
      </div>
      <div className="role-home-metrics" aria-label="Dashboard summary">{metrics.map((metric) => <div className={`role-home-metric ${metric.tone}`} key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></div>)}</div>
      <div className="role-home-actions"><strong>Quick actions</strong>{content.actions.map((action) => <button key={action.label} type="button" onClick={() => onNavigate(action.target)}><span>{action.icon}</span>{action.label}<b>→</b></button>)}</div>
      <div className="role-home-columns">{content.sections.map((section) => <div className="role-home-panel" key={section.title}><div className="role-home-panel-heading"><h2>{section.title}</h2><button type="button" onClick={() => onNavigate(section.target)}>View all <span aria-hidden="true">→</span></button></div>{blankSections ? <p className="role-home-empty">No data yet <span>Waiting for admin to provide subjects.</span></p> : section.items.map((item) => <button type="button" className="role-home-item" key={item.title} onClick={() => onNavigate(item.target ?? section.target)}><span className="role-home-item-icon">{item.title[0]}</span><span><strong>{item.title}</strong><small>{item.detail}</small></span>{item.status && <em>{item.status}</em>}</button>)}</div>)}</div>
    </section>
  );
};
