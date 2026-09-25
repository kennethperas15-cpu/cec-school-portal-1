import { useEffect, useState } from 'react';

export type ID = string;

const read = <T>(key: string, seed: T[]): T[] => {
  try {
    const raw = localStorage.getItem(`cec:${key}`);
    if (raw) return JSON.parse(raw) as T[];
  } catch { /* seed fallback */ }
  return seed;
};

export const useCollection = <T extends { id: string }>(key: string, seed: T[]) => {
  const [list, setList] = useState<T[]>(() => read<T>(key, seed));

  useEffect(() => {
    try { localStorage.setItem(`cec:${key}`, JSON.stringify(list)); } catch { /* ignore */ }
  }, [key, list]);

  const create = (item: Omit<T, 'id'> & { id?: string }) =>
    setList((rows) => [...rows, { ...item, id: item.id || `${key}-${Date.now()}` } as T]);

  const update = (id: string, patch: Partial<T>) =>
    setList((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const remove = (id: string) => setList((rows) => rows.filter((r) => r.id !== id));

  return { list, setList, create, update, remove };
};

export const uid = (p: string) => `${p}-${Math.floor(1000 + Math.random() * 9000)}`;

// School ID rule: 7 digits, leading digit by role (student=2, teacher=3, admin=4).
export type SchoolRole = 'student' | 'teacher' | 'admin';
export const genSchoolId = (role: SchoolRole): string => {
  const lead = role === 'student' ? '2' : role === 'teacher' ? '3' : '4';
  let id = '';
  for (let i = 0; i < 6; i++) id += Math.floor(Math.random() * 10).toString();
  return `${lead}${id}`;
};

export const isValidSchoolId = (id: string, role: SchoolRole): boolean => {
  if (!/^\d{7}$/.test(id.trim())) return false;
  const lead = role === 'student' ? '2' : role === 'teacher' ? '3' : '4';
  return id.trim().startsWith(lead);
};

// One-time migration for accounts created before the 7-digit rule:
// issues a valid ID and rewrites it across all local stores. Returns the valid ID.
export const ensureSchoolId = (oldId: string | undefined, role: SchoolRole): string => {
  if (oldId && isValidSchoolId(oldId, role)) return oldId.trim();
  const fresh = genSchoolId(role);
  const swap = (key: string, match: (r: Record<string, unknown>) => boolean, patch: (r: Record<string, unknown>) => Record<string, unknown>) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const rows = JSON.parse(raw) as Record<string, unknown>[];
      localStorage.setItem(key, JSON.stringify(rows.map((r) => (match(r) ? patch(r) : r))));
    } catch { /* ignore */ }
  };
  const byId = (r: Record<string, unknown>) => r.id === oldId;
  swap('cec:registrations', byId, (r) => ({ ...r, id: fresh }));
  swap('cec:a_accounts_v2', byId, (r) => ({ ...r, id: fresh }));
  swap('cec:s_enroll_apps', byId, (r) => ({ ...r, id: fresh }));
  swap('cec:a_enroll_v2', byId, (r) => ({ ...r, id: fresh }));
  swap('cec:t_roster_v2', byId, (r) => ({ ...r, id: fresh }));
  // Carry the profile photo to the new ID so faces don't disappear
  try {
    const photo = localStorage.getItem(`cec:photo:${oldId}`);
    if (photo && !localStorage.getItem(`cec:photo:${fresh}`)) {
      localStorage.setItem(`cec:photo:${fresh}`, photo);
    }
  } catch { /* ignore */ }
  return fresh;
};
