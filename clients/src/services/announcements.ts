import api from './api';

export type LiveAnnouncement = {
  id: number | string;
  title: string;
  content: string;
  audience: string;
  published_at?: string;
  published_by_name?: string | null;
};

export const fetchAnnouncements = async (audience = 'all'): Promise<LiveAnnouncement[]> => {
  const r = await api.get('/portal/announcements', { params: { audience } });
  return r.data?.data ?? [];
};

export const publishAnnouncement = async (input: { title: string; content: string; audience?: string }) => {
  const r = await api.post('/portal/announcements', input);
  return r.data?.data as { id: number | null; title: string; audience: string };
};
