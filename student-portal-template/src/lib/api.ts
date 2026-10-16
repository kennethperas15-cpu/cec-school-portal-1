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

/** Public CEC website (landing page). */
export const CEC_WEBSITE_URL = 'https://kennethperas15-cpu.github.io/cec-school-portal-1/';

export type CecUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  schoolId?: string;
};

export type CecSession = {
  accessToken: string;
  refreshToken: string;
  user: CecUser;
};

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

export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

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
      return { ok: false, message: payload?.message || `The CEC portal service replied with HTTP ${response.status}.` };
    }
    return { ok: true, data: payload.data as T };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    return {
      ok: false,
      message: aborted
        ? 'The CEC portal service took too long to respond. Please try again.'
        : 'Cannot reach the CEC portal service. Check your connection and try again.',
    };
  } finally {
    clearTimeout(timer);
  }
};

const post = <T>(path: string, body: unknown, token?: string) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) }, token);

const get = <T>(path: string, token?: string) => request<T>(path, { method: 'GET' }, token);

/* --------------------------------- Auth ---------------------------------- */

export const cecLogin = (identifier: string, password: string) =>
  post<CecSession>('/api/auth/login', { identifier, password });

export const cecRefresh = (refreshToken: string) => post<CecSession>('/api/auth/refresh', { refreshToken });

export const cecLogout = (refreshToken: string) => post<unknown>('/api/auth/logout', { refreshToken });

export const cecForgotPassword = (identifier: string, email: string) =>
  post<{ emailSent: boolean }>('/api/auth/forgot-password', { identifier, email });

/* -------------------------------- Portal --------------------------------- */

export const cecAcademicPeriod = () => get<AcademicPeriod>('/api/portal/config/academic');

export const cecAnnouncements = (audience: 'students' | 'all' = 'students') =>
  get<RawAnnouncement[]>(`/api/portal/announcements?audience=${audience}`);
