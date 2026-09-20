import api from './api';

export type PortalEnrollment = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  program: string;
  year_level: number;
  phone?: string | null;
  requested_role?: string;
  status: string;
  created_at?: string;
};

export type PortalItem = {
  id: string;
  portal: string;
  module: string;
  title: string;
  detail?: string | null;
  status?: string | null;
  owner?: string | null;
  created_at?: string;
};

export const portalApi = {
  async dbHealth(): Promise<boolean> {
    try {
      const r = await api.get('/portal/health');
      return !!r.data?.success;
    } catch { return false; }
  },
  async enrollPending(): Promise<PortalEnrollment[]> {
    const r = await api.get('/portal/enrollments', { params: { status: 'pending' } });
    return r.data?.data ?? [];
  },
  async enrollCreate(input: { fullName: string; personalEmail: string; phone: string; program: string; yearLevel: number; requestedRole?: string }) {
    const r = await api.post('/portal/enrollments', input);
    return r.data?.data as { id: string; status: string };
  },
  async enrollDecide(id: string, decision: 'approved' | 'rejected') {
    const r = await api.post(`/portal/enrollments/${id}/decide`, { decision });
    return r.data?.data;
  },
  async items(portal?: string, mod?: string): Promise<PortalItem[]> {
    const r = await api.get('/portal/items', { params: { portal, module: mod } });
    return r.data?.data ?? [];
  },
  async itemCreate(input: { portal: string; module: string; title: string; detail?: string; status?: string; owner?: string }) {
    const r = await api.post('/portal/items', input);
    return r.data?.data as { id: string };
  },
  async itemUpdate(id: string, patch: { title?: string; detail?: string; status?: string; owner?: string }) {
    const r = await api.put(`/portal/items/${id}`, patch);
    return r.data?.data;
  },
  async itemRemove(id: string) {
    const r = await api.delete(`/portal/items/${id}`);
    return r.data?.data;
  },
};
