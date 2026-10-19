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

const emptyNotifications: Record<NotificationRole, PortalNotification[]> = {
  student: [],
  teacher: [],
  admin: [],
};

const legacyDemoIds = new Set([
  'student-enrollment', 'student-grade', 'student-balance',
  'teacher-grades', 'teacher-message', 'teacher-exam',
  'admin-enrollment', 'admin-security', 'admin-backup',
]);

const storageKey = (role: NotificationRole) => `cec:notifications:${role}`;
const readNotifications = (role: NotificationRole) => {
  try {
    const saved = localStorage.getItem(storageKey(role));
    if (!saved) return emptyNotifications[role];
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is PortalNotification =>
        !!item && typeof item === 'object' && typeof item.id === 'string' && !legacyDemoIds.has(item.id),
      )
      : emptyNotifications[role];
  } catch {
    return emptyNotifications[role];
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
