import api from './api';

export type NotifyRole = 'student' | 'teacher' | 'admin';
export type NotifyCategory = 'Academic' | 'Finance' | 'Enrollment' | 'System' | 'Communication';

const key = (role: NotifyRole) => `cec:notifications:${role}`;

export const pushNotification = (
  roles: NotifyRole | NotifyRole[] | 'all',
  note: { title: string; detail: string; category: NotifyCategory; target: string }
) => {
  const list: NotifyRole[] = roles === 'all' ? ['student', 'teacher', 'admin'] : Array.isArray(roles) ? roles : [roles];
  const entry = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    ...note,
    timestamp: 'Just now',
    read: false,
  };
  list.forEach((role) => {
    try {
      const raw = localStorage.getItem(key(role));
      const rows = raw ? (JSON.parse(raw) as typeof entry[]) : [];
      localStorage.setItem(key(role), JSON.stringify([entry, ...rows].slice(0, 50)));
    } catch { /* private mode — popup still shows */ }
  });
  // Best-effort MySQL mirror (shared portal_items) so other devices can see it
  try {
    void api.post('/portal/items', {
      portal: 'all',
      module: `notification:${list.join(',')}`,
      title: note.title,
      detail: `${note.detail} • ${note.category} → ${note.target}`,
      status: 'New',
    }).catch(() => undefined);
  } catch { /* offline */ }
  return entry;
};
