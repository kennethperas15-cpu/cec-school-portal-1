import type { CecSession } from './api';

const SESSION_KEY = 'student-portal-template:session:v1';

const isCecSession = (value: unknown): value is CecSession => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CecSession>;
  return (
    typeof candidate.accessToken === 'string' &&
    candidate.accessToken.length > 0 &&
    typeof candidate.refreshToken === 'string' &&
    candidate.refreshToken.length > 0 &&
    !!candidate.user &&
    typeof candidate.user.email === 'string'
  );
};

export const loadSession = (): CecSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCecSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveSession = (session: CecSession): void => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable — session stays in memory for this tab */
  }
};

export const clearSession = (): void => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
};

/** Reads a JWT payload without verifying the signature — used only for a local expiry check. */
const decodePayload = (token: string): Record<string, unknown> | null => {
  const segment = token.split('.')[1];
  if (!segment) return null;
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  try {
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/** True when the access token is missing an expiry or has already expired. */
export const isAccessTokenExpired = (token: string): boolean => {
  const payload = decodePayload(token);
  const exp = payload?.exp;
  if (typeof exp !== 'number') return false;
  return exp * 1000 <= Date.now();
};
