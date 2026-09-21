import { useMemo, useState } from 'react';

export type NotificationRole = 'student' | 'teacher' | 'admin';
export type PortalNotification = {
  id: string;
  title: string;
  detail: string;
  category: 'Academic' | 'Finance' | 'Enrollment' | 'System' | 'Communication';
  timestamp: string;
  read: boolean;
  target: string;
};

const seeds: Record<NotificationRole, PortalNotification[]> = {
  student: [
    { id: 'student-enrollment', title: 'Enrollment application approved', detail: 'Your BSIT 3rd Year application is ready for registration.', category: 'Enrollment', timestamp: 'Today, 9:42 AM', read: false, target: 'Status Tracker' },
    { id: 'student-grade', title: 'New grade posted', detail: 'A midterm grade is available in Database Systems.', category: 'Academic', timestamp: 'Yesterday', read: false, target: 'Grades / Report Card' },
    { id: 'student-balance', title: 'Payment deadline reminder', detail: 'Your outstanding balance is due on October 12, 2024.', category: 'Finance', timestamp: 'Monday', read: true, target: 'Payment Portal' },
  ],
  teacher: [
    { id: 'teacher-grades', title: 'Grade submission deadline tomorrow', detail: '18 grade entries still need review before the deadline.', category: 'Academic', timestamp: 'Today, 8:30 AM', read: false, target: 'Grade Encoding' },
    { id: 'teacher-message', title: 'New student message', detail: 'Juan Dela Cruz asked about the midterm coverage.', category: 'Communication', timestamp: 'Yesterday', read: false, target: 'Messaging' },
    { id: 'teacher-exam', title: 'Exam scheduled', detail: 'Midterm Exam — DB Systems is scheduled for October 18.', category: 'Academic', timestamp: 'Monday', read: true, target: 'Exam Creation' },
  ],
  admin: [
    { id: 'admin-enrollment', title: '3 enrollment applications need review', detail: 'Open the approval queue to review recent applications.', category: 'Enrollment', timestamp: 'Today, 10:05 AM', read: false, target: 'Enrollment Approval' },
    { id: 'admin-security', title: 'Faculty credentials expiring soon', detail: '4 faculty credentials need attention before October 31.', category: 'System', timestamp: 'Today, 7:15 AM', read: false, target: 'Credentials' },
    { id: 'admin-backup', title: 'Backup completed successfully', detail: 'The scheduled database backup completed without errors.', category: 'System', timestamp: 'Today, 2:00 AM', read: true, target: 'Backup & Restore' },
  ],
};

const storageKey = (role: NotificationRole) => `cec:notifications:${role}`;
const readNotifications = (role: NotificationRole) => {
  try {
    const saved = localStorage.getItem(storageKey(role));
    return saved ? JSON.parse(saved) as PortalNotification[] : seeds[role];
  } catch {
    return seeds[role];
  }
};

type Props = { role: NotificationRole; onNavigate: (target: string) => void };

export const NotificationCenter = ({ role, onNavigate }: Props) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => readNotifications(role));
  const unread = useMemo(() => notifications.filter((item) => !item.read), [notifications]);
  const persist = (next: PortalNotification[]) => {
    setNotifications(next);
    try { localStorage.setItem(storageKey(role), JSON.stringify(next)); } catch { /* fallback remains in memory */ }
  };
  const markRead = (id: string) => persist(notifications.map((item) => item.id === id ? { ...item, read: true } : item));
  const markAllRead = () => persist(notifications.map((item) => ({ ...item, read: true })));
  const remove = (id: string) => persist(notifications.filter((item) => item.id !== id));

  return <div className="notification-center"><button className="dashboard-alert-button" type="button" onClick={() => setOpen((value) => !value)} aria-label={`View notifications${unread.length ? `, ${unread.length} unread` : ''}`}><span className="notification-bell">♢</span>{unread.length > 0 && <b>{unread.length}</b>}</button>{open && <div className="notification-panel" role="dialog" aria-label="Notification center"><div className="notification-panel-heading"><div><strong>Notifications</strong><small>{unread.length ? `${unread.length} unread` : 'All caught up'}</small></div>{unread.length > 0 && <button type="button" onClick={markAllRead}>Mark all read</button>}</div><div className="notification-list">{notifications.map((item) => <article className={`notification-item ${item.read ? 'is-read' : ''}`} key={item.id}><button type="button" onClick={() => { markRead(item.id); onNavigate(item.target); setOpen(false); }}><span className={`notification-category ${item.category.toLowerCase()}`}>{item.category[0]}</span><span><strong>{item.title}</strong><small>{item.detail}</small><em>{item.timestamp} • {item.category}</em></span></button><div><button type="button" onClick={() => markRead(item.id)} disabled={item.read}>{item.read ? 'Read' : 'Mark read'}</button><button type="button" onClick={() => remove(item.id)} aria-label={`Delete ${item.title}`}>×</button></div></article>)}{!notifications.length && <p className="notification-empty">No notifications yet.</p>}</div></div>}</div>;
};
