import api from './api';

/**
 * Registrar / administration reads.
 *
 * These back the admin console screens that list institutional records. Before
 * this existed those lists came from browser-local collections, so two admins on
 * two machines saw different "students" and a fresh browser saw none. Everything
 * here reads the database, so a screen shows the real roster — or an honest empty
 * state when the roster is genuinely empty.
 */

export type AdminOverview = {
  students: number;
  teachers: number;
  admins: number;
  courses: number;
  subjects: number;
  sections: number;
  rooms: number;
  departments: number;
  schedules: number;
  announcements: number;
  accounts: number;
  accountsInactive: number;
  auditEvents: number;
  publishedTimetables: number;
  postedGrades: number;
  postedAttendance: number;
  receipts: number;
  applicationsPending: number;
  applicationsApproved: number;
  applicationsRejected: number;
  applicationsTotal: number;
};

export type AdminOverviewResponse = { data: AdminOverview; warnings: string[] };

export type AdminStudent = {
  id: string;
  student_number: string;
  program: string | null;
  year_level: number | null;
  status: string | null;
  date_of_birth: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string;
  is_active: boolean | null;
  last_login_at: string | null;
  created_at: string | null;
  department_code: string | null;
  department_name: string | null;
};

export type AdminTeacher = {
  id: string;
  employee_number: string;
  specialization: string | null;
  employment_status: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string;
  is_active: boolean | null;
  last_login_at: string | null;
  created_at: string | null;
  department_code: string | null;
  department_name: string | null;
};

export type AdminCourse = {
  id: number;
  code: string;
  school_year: string | null;
  semester: number | null;
  status: string | null;
  subject_code: string | null;
  subject_name: string | null;
  units: number | null;
  description: string | null;
  teacher_id: string | null;
  teacher_first_name: string | null;
  teacher_last_name: string | null;
  teacher_email: string | null;
};

export type AdminSection = { id: number; name: string; school_year: string | null; year_level: number | null };

export type AdminSchedule = {
  id: number;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  course_code: string | null;
  school_year: string | null;
  semester: number | null;
  subject_code: string | null;
  subject_name: string | null;
  building: string | null;
  room_number: string | null;
  capacity: number | null;
  teacher_first_name: string | null;
  teacher_last_name: string | null;
};

export type AdminAccount = {
  id: string;
  email: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_active: boolean | null;
  last_login_at: string | null;
  created_at: string | null;
  locked_until: string | null;
  failed_login_attempts: number | null;
  role_name: string | null;
  role_id: number | null;
  student_number: string | null;
  program: string | null;
  year_level: number | null;
  employee_number: string | null;
  specialization: string | null;
  department_code: string | null;
};

export type AdminDepartment = { id: number; code: string; name: string; description: string | null };

export type AdminConfigEntry = { config_key: string; config_value: string | null; is_public: boolean | null; updated_at: string | null };

export type AdminQuery = {
  search?: string;
  program?: string;
  yearLevel?: string | number;
  status?: string;
  role?: string;
  limit?: number;
};

const cleaned = (query: AdminQuery): Record<string, string | number> => {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value as string | number;
  }
  return out;
};

const list = async <T>(path: string, query: AdminQuery = {}): Promise<T[]> => {
  const response = await api.get(path, { params: cleaned(query) });
  const data = response.data?.data;
  return Array.isArray(data) ? (data as T[]) : [];
};

export const adminApi = {
  overview: async (): Promise<AdminOverviewResponse> => {
    const response = await api.get('/admin/overview');
    return {
      data: response.data?.data as AdminOverview,
      warnings: Array.isArray(response.data?.warnings) ? (response.data.warnings as string[]) : [],
    };
  },
  students: (query: AdminQuery = {}) => list<AdminStudent>('/admin/students', query),
  teachers: (query: AdminQuery = {}) => list<AdminTeacher>('/admin/teachers', query),
  courses: (query: AdminQuery = {}) => list<AdminCourse>('/admin/courses', query),
  sections: (query: AdminQuery = {}) => list<AdminSection>('/admin/sections', query),
  schedules: (query: AdminQuery = {}) => list<AdminSchedule>('/admin/schedules', query),
  accounts: (query: AdminQuery = {}) => list<AdminAccount>('/admin/accounts', query),
  departments: () => list<AdminDepartment>('/admin/departments'),
  config: () => list<AdminConfigEntry>('/admin/config'),
};

/** `2944985` — how the registrar reads a student number back. */
export const fullName = (person: { first_name?: string | null; middle_name?: string | null; last_name?: string | null }): string =>
  [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() || '—';

export const initials = (person: { first_name?: string | null; last_name?: string | null }): string =>
  `${person.first_name?.[0] ?? ''}${person.last_name?.[0] ?? ''}`.toUpperCase() || '·';

/** `2026-10-16T16:54:05.928Z` -> `16 Oct 2026, 4:54 PM`; null stays readable. */
export const formatStamp = (value: string | null | undefined): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const formatDay = (value: string | null | undefined): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};
