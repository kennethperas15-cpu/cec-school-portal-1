import api from './api';

export type AnnouncementCategory = 'General' | 'Urgent' | 'Events';

export type LiveAnnouncement = {
  id: number | string;
  title: string;
  content: string;
  audience: string;
  category?: AnnouncementCategory | string;
  published_at?: string;
  published_by_name?: string | null;
};

export const fetchAnnouncements = async (audience = 'all', category?: string): Promise<LiveAnnouncement[]> => {
  const r = await api.get('/portal/announcements', { params: { audience, category: category && category !== 'All' ? category : undefined } });
  return r.data?.data ?? [];
};

export const publishAnnouncement = async (input: { title: string; content: string; audience?: string; category?: string }) => {
  const r = await api.post('/portal/announcements', input);
  return r.data?.data as { id: number | null; title: string; audience: string };
};
