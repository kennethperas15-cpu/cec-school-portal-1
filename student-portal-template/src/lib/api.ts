/**
 * Client for the live CEC Portal API (Express + Postgres) — the same service the
 * CEC School Portal uses. Everything here talks to real endpoints; nothing is
 * stubbed, and no data is invented client-side.
 *
 * Base URL resolution
 *  - `VITE_CEC_API_URL` wins when set.
 *  - Dev: "" so requests stay same-origin and Vite proxies `/api` to the API
 *    (see vite.config.ts), which sidesteps CORS entirely on localhost.
 *  - Build: the public API host, which allows the GitHub Pages origin via CORS.
 */

const DEFAULT_API = 'https://cec-portal-api-5i1q.onrender.com';
const OVERRIDE = import.meta.env.VITE_CEC_API_URL as string | undefined;

export const CEC_API_URL = (OVERRIDE ?? (import.meta.env.DEV ? '' : DEFAULT_API)).replace(/\/+$/, '');

/**
 * Public CEC website (the landing page that hosts the sign-in popover).
 *
 * While working locally the landing page is the CEC portal's own dev server on
 * port 5173, and that holds no matter how the template itself is being served
 * (dev server or preview). The published Pages site is only ever used from a
 * real deployment, so local work never reaches github.io.
 */
const PAGES_SITE = 'https://kennethperas15-cpu.github.io/cec-school-portal-1/';
const SITE_PATH = '/cec-school-portal-1/';
const LOCAL_PORT = '5173';
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;

/** The local landing page, or null when this is not a localhost session. */
function localSite(): string | null {
  if (typeof window === 'undefined' || !LOCAL_HOST.test(window.location.hostname)) return null;
  // Keep the host being used (localhost, 127.0.0.1 or a LAN address) so the
  // same link works from a phone on the network, but always land on 5173.
  return `${window.location.protocol}//${window.location.hostname}:${LOCAL_PORT}${SITE_PATH}`;
}

export const CEC_WEBSITE_URL =
  (import.meta.env.VITE_CEC_WEBSITE_URL as string | undefined) ?? localSite() ?? PAGES_SITE;

export type CecUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  schoolId?: string;
};

export type CecTokens = { accessToken: string; refreshToken: string };

/** Tokens plus the profile behind them — what the app renders from. */
export type CecSession = CecTokens & { user: CecUser };

export type AcademicPeriod = { schoolYear: string; semester: string };

export type RawAnnouncement = {
  id: string;
  title: string;
  content: string;
  audience: string;
  category: string;
  published_at: string;
  published_by_name: string | null;
};

/** `status` is the HTTP status, or 0 when the request never reached the API. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string; status: number };

/** Render's free tier can cold-start, so allow a generous window. */
const REQUEST_TIMEOUT_MS = 45_000;

type Envelope<T> = { success?: boolean; data?: T; message?: string };

const request = async <T>(path: string, init: RequestInit, token?: string): Promise<ApiResult<T>> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${CEC_API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as Envelope<T> | null;
    if (!response.ok || !payload?.success) {
      return {
        ok: false,
        message: payload?.message || `The CEC portal service replied with HTTP ${response.status}.`,
        status: response.status,
      };
    }
    return { ok: true, data: payload.data as T };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    return {
      ok: false,
      message: aborted
        ? 'The CEC portal service took too long to respond. Please try again.'
        : 'Cannot reach the CEC portal service. Check your connection and try again.',
      status: 0,
    };
  } finally {
    clearTimeout(timer);
  }
};

const post = <T>(path: string, body: unknown, token?: string) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) }, token);

const get = <T>(path: string, token?: string) => request<T>(path, { method: 'GET' }, token);

/* --------------------------------- Auth ---------------------------------- */

/**
 * Signing in happens in the CEC portal popover; this app only adopts the
 * session it leaves behind (see lib/session.ts).
 *
 * `refresh` also returns a `user`, but its profile omits schoolId, so the app
 * always reads the profile from `cecMe` instead of trusting that copy.
 */
export const cecRefresh = (refreshToken: string) => post<CecTokens>('/api/auth/refresh', { refreshToken });

export const cecLogout = (refreshToken: string) => post<unknown>('/api/auth/logout', { refreshToken });

/** Profile behind the shared access token: name, school ID, role. */
export const cecMe = (accessToken: string) => get<CecUser>('/api/auth/me', accessToken);

/* -------------------------------- Portal --------------------------------- */

export const cecAcademicPeriod = () => get<AcademicPeriod>('/api/portal/config/academic');

export const cecAnnouncements = (audience: 'students' | 'all' = 'students') =>
  get<RawAnnouncement[]>(`/api/portal/announcements?audience=${audience}`);

/* ------------------------------- Payments -------------------------------- */

/**
 * A cash receipt raised from the student portal. EDP staff open the admin
 * dashboard, check the printed reference against the cash on hand, and verify
 * it — which flips `status` from "PLEASE PAY" to "Verified".
 */
export type PortalItem = {
  id: string;
  portal: string;
  module: string;
  title: string;
  detail: string | null;
  status: string | null;
  owner: string | null;
  created_at?: string;
};

/**
 * Raises a PLEASE PAY receipt for the EDP office. The row is the receipt: the
 * title carries the reference number and the owner is the student the payment
 * belongs to. Returns the new row id.
 */
export const cecRaiseReceipt = (
  accessToken: string,
  input: { title: string; detail: string; status: string; owner: string },
) =>
  post<{ id: string }>(
    '/api/portal/items',
    { portal: 'student', module: 'receipt', ...input },
    accessToken,
  );

/**
 * Receipts raised from the student portal, newest first. The endpoint is shared
 * across the school, so callers filter down to their own rows by owner.
 */
export const cecReceipts = () => get<PortalItem[]>('/api/portal/items?portal=student&module=receipt');

/* ------------------------------- Schedule -------------------------------- */

/**
 * Published class timetables — one row per section in one term, written by the
 * registrar (Study Load Builder) or corrected by a faculty member from their own
 * Class Schedule screen. `detail` is the JSON timetable document decoded in
 * lib/schedule.ts; nothing here is generated client-side.
 */
export const cecScheduleItems = () =>
  get<PortalItem[]>('/api/portal/items?portal=student&module=schedule');

/* ------------------------- Course offerings (enrollment) ------------------- */

/** One weekly meeting of an offering, exactly as the registrar entered it. */
export type CatalogMeeting = { day: string; dayOfWeek: number; start: string; end: string; room: string };

/**
 * A course the school has opened for the live term. `enrolled` says whether the
 * signed-in student already holds it, so one answer drives both halves of the
 * enrollment page: what they may pick and what they hold.
 */
export type CatalogCourse = {
  id: number;
  code: string;
  title: string;
  subjectCode: string;
  units: number | null;
  description: string | null;
  instructor: string;
  status: string;
  /** Still open for enrollment — a closed course can be held but not picked. */
  open: boolean;
  meetings: CatalogMeeting[];
  enrolled: boolean;
};

export type CourseCatalog = {
  term: { schoolYear: string; semester: number; label: string };
  courses: CatalogCourse[];
};

/**
 * The offerings the registrar opened for the live term, each with the weekly
 * meetings it runs — the course schedules a student picks from. Authenticated:
 * the answer also marks which of them this student already holds.
 */
export const cecCourseCatalog = (token: string) => get<CourseCatalog>('/api/portal/course-catalog', token);

/** Take one of those offerings; the server records a real enrollment for it. */
export const cecEnrollCourse = (token: string, courseId: number) =>
  post<{ courseId: number; enrolled: boolean }>('/api/portal/course-catalog/enroll', { courseId }, token);

/** Drop one of them again. */
export const cecDropCourse = (token: string, courseId: number) =>
  request<{ courseId: number; enrolled: boolean }>(
    `/api/portal/course-catalog/enroll/${courseId}`,
    { method: 'DELETE' },
    token,
  );

/* ---------------------------- Academic records ---------------------------- */

/**
 * The signed-in student's own posted grades and attendance. Unlike the schedule
 * shelf above, these routes are authenticated and scoped on the server: with the
 * access token, the answer holds only the documents that carry this student's
 * seven-digit school ID. Without one it holds nothing.
 */
export const cecGradeRecords = (token?: string) =>
  get<PortalItem[]>('/api/portal/records/grades', token);

export const cecAttendanceRecords = (token?: string) =>
  get<PortalItem[]>('/api/portal/records/attendance', token);
