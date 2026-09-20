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
