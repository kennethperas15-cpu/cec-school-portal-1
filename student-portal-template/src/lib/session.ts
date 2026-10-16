/**
 * Session storage shared with the CEC portal.
 *
 * The template has no sign-in of its own. The portal's sign-in popover writes
 * the tokens below and this app reads them back: dev serves both from
 * localhost:5173 and production serves both from the GitHub Pages origin, so a
 * single sign-in covers both apps — and signing out here signs the portal out.
 *
 * These keys and the storage precedence mirror clients/src/services/api.ts
 * exactly. Do not rename one side without the other.
 *
 * Every accessor tolerates a missing web-storage API so the tree still renders
 * in the SSR smoke test, where only localStorage is polyfilled.
 */
import type { CecUser } from './api';

const ACCESS_KEY = 'cec_access_token';
const REFRESH_KEY = 'cec_refresh_token';
const REMEMBER_KEY = 'cec_remember';

/** Display cache of the profile GET /auth/me returns — never a substitute for it. */
const PROFILE_KEY = 'student-portal-template:user:v1';

export type PortalTokens = { accessToken: string; refreshToken: string };

type StoreName = 'session' | 'local';

const storeFor = (name: StoreName): Storage | null => {
  try {
    const store = name === 'session' ? sessionStorage : localStorage;
    return store ?? null;
  } catch {
    /* no web storage in this environment */
    return null;
  }
};

/** Reads through both storages, session first — the portal's own precedence. */
const readAny = (key: string): string | null => {
  const session = storeFor('session');
  const local = storeFor('local');
  return session?.getItem(key) ?? local?.getItem(key) ?? null;
};

export const isRemembered = (): boolean => {
  try {
    return localStorage.getItem(REMEMBER_KEY) === '1';
  } catch {
    return false;
  }
};

/** Null unless both halves of the shared portal session are present. */
export const readTokens = (): PortalTokens | null => {
  const accessToken = readAny(ACCESS_KEY);
  const refreshToken = readAny(REFRESH_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
};

/** Mirrors the portal's setTokens so rotated tokens stay in sync with it. */
export const writeTokens = (tokens: PortalTokens, remember: boolean = isRemembered()): void => {
  const primary = storeFor(remember ? 'local' : 'session');
  const secondary = storeFor(remember ? 'session' : 'local');
  try {
    primary?.setItem(ACCESS_KEY, tokens.accessToken);
    primary?.setItem(REFRESH_KEY, tokens.refreshToken);
    secondary?.removeItem(ACCESS_KEY);
    secondary?.removeItem(REFRESH_KEY);
  } catch {
    /* quota or private mode — the session stays in memory for this tab */
  }
};

/** Clears the shared session, which also signs the CEC portal out. */
export const clearTokens = (): void => {
  for (const name of ['session', 'local'] as const) {
    const store = storeFor(name);
    try {
      store?.removeItem(ACCESS_KEY);
      store?.removeItem(REFRESH_KEY);
    } catch {
      /* ignore */
    }
  }
  try {
    storeFor('local')?.removeItem(REMEMBER_KEY);
  } catch {
    /* ignore */
  }
};

export const readCachedUser = (): CecUser | null => {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CecUser>;
    if (typeof parsed.id !== 'string' || typeof parsed.email !== 'string') return null;
    return parsed as CecUser;
  } catch {
    return null;
  }
};

export const writeCachedUser = (user: CecUser): void => {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
};

export const clearCachedUser = (): void => {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* ignore */
  }
};

/** Reads a JWT payload without verifying the signature — used only for local checks. */
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

/** The account id the token was issued for, when it is a decodable JWT. */
export const tokenSubject = (token: string): string | null => {
  const payload = decodePayload(token);
  return typeof payload?.sub === 'string' ? payload.sub : null;
};
