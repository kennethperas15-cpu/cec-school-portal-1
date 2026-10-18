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
  payment_reference_no?: string | null;
  payment_status?: string;
  student_status?: string;
  assigned_school_id?: string | null;
  school_year?: string | null;
  semester?: number | null;
  created_at?: string;
};

export type EnrollmentSubmission = {
  applicantType: 'new' | 'returning';
  fullName?: string;
  personalEmail?: string;
  phone?: string;
  address?: string;
  program: string;
  yearLevel: number;
  schoolYear?: string;
  semester?: number;
  schoolId?: string;
  paymentReferenceNo: string;
  educationLevel?: string;
  classification?: string;
  lrn?: string;
  details?: Record<string, unknown>;
};

export type EnrollmentReceipt = {
  applicationId: string;
  schoolId: string;
  status: string;
  paymentStatus: string;
  studentStatus: string;
  submittedAt: string;
  summary: {
    fullName: string;
    program: string;
    yearLevel: number;
    schoolYear: string | null;
    semester: number;
    paymentReferenceNo: string;
  };
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
  async enrollPending(term?: { schoolYear?: string; semester?: number }): Promise<PortalEnrollment[]> {
    const r = await api.get('/portal/enrollments', { params: { status: 'pending', schoolYear: term?.schoolYear, semester: term?.semester } });
    return r.data?.data ?? [];
  },
  /** The registrar's register: applications of one status, newest first. */
  async enrollByStatus(status: 'pending' | 'approved' | 'rejected', term?: { schoolYear?: string; semester?: number }): Promise<PortalEnrollment[]> {
    const r = await api.get('/portal/enrollments', { params: { status, schoolYear: term?.schoolYear, semester: term?.semester } });
    return r.data?.data ?? [];
  },
  async enrollCreate(input: { fullName: string; personalEmail: string; phone: string; program: string; yearLevel: number; requestedRole?: string; schoolYear?: string; semester?: number }) {
    const r = await api.post('/portal/enrollments', input);
    return r.data?.data as { id: string; status: string };
  },
  async enrollmentSubmit(input: EnrollmentSubmission) {
    const r = await api.post('/portal/enrollment/submit', input);
    return r.data?.data as EnrollmentReceipt;
  },
  async enrollDecide(id: string, decision: 'approved' | 'rejected') {
    const r = await api.post(`/portal/enrollments/${id}/decide`, { decision });
    return r.data?.data as {
      id: string;
      status: string;
      schoolEmail?: string;
      schoolId?: string;
      emailSent?: boolean;
      deliveryNote?: string;
      temporaryPassword?: string;
    };
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
  async coeSubmit(input: { fullName: string; program?: string; yearLevel?: number; purpose?: string }) {
    const r = await api.post('/portal/coe', input);
    return r.data?.data as { transactionNo: string; status: string; submittedAt: string };
  },
  async coeTrack(transactionNo: string) {
    const r = await api.get('/portal/coe/track', { params: { transactionNo } });
    return r.data?.data as {
      transaction_no: string; status: string; full_name: string; program: string | null;
      created_at: string; decided_at: string | null;
    };
  },
  async coeQueue(status = 'pending') {
    const r = await api.get('/portal/coe', { params: { status } });
    return r.data?.data as {
      id: string; transaction_no: string; full_name: string; program: string | null;
      year_level: number | null; purpose: string; status: string; created_at: string; email: string | null;
    }[];
  },
  async coeDecide(id: string, decision: 'ready' | 'rejected') {
    const r = await api.post(`/portal/coe/${id}/decide`, { decision });
    return r.data?.data as { transactionNo: string; status: string; emailSent: boolean };
  },
  async conversations(): Promise<{
    id: string; created_at: string; peer_name: string | null; last_body: string | null; last_at: string | null;
  }[]> {
    const r = await api.get('/portal/conversations');
    return r.data?.data ?? [];
  },
  async conversationCreate(identifier: string) {
    const r = await api.post('/portal/conversations', { identifier });
    return r.data?.data as { id: string; peerName: string };
  },
  async conversationMessages(id: string): Promise<{
    id: number; sender_id: string; sender_name: string; body: string; created_at: string;
  }[]> {
    const r = await api.get(`/portal/conversations/${id}/messages`);
    return r.data?.data ?? [];
  },
};
