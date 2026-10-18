import axios from 'axios';

// The API is hosted on Render's free tier, which shuts down after ~15 minutes
// of inactivity and needs up to a minute to boot again. A 10 second timeout
// guaranteed that every first request after a quiet spell failed, which is why
// signing in "sometimes" did not work: the student's request never reached the
// server at all. Carry the cold-start budget here so ordinary calls can wait.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const ACCESS_KEY = 'cec_access_token';
const REFRESH_KEY = 'cec_refresh_token';
const REMEMBER_KEY = 'cec_remember';

export const isRemembered = (): boolean => {
  try {
    return localStorage.getItem(REMEMBER_KEY) === '1';
  } catch {
    return false;
  }
};

export const getAccessToken = (): string | null => {
  try {
    return sessionStorage.getItem(ACCESS_KEY) ?? localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
};

export const getRefreshToken = (): string | null => {
  try {
    return sessionStorage.getItem(REFRESH_KEY) ?? localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
};

/**
 * Persist tokens, in localStorage so a student stays signed in after closing the
 * tab or restarting the browser — the deployment is used from phones and shared
 * machines, and losing the session on every visit made the portal feel broken.
 * The sign-in form still exposes "Remember this device"; unticking it keeps the
 * session in sessionStorage for that tab only (the safer choice on a public PC).
 */
export const setTokens = (accessToken?: string, refreshToken?: string, remember = true): void => {
  try {
    if (remember) localStorage.setItem(REMEMBER_KEY, '1');
    else localStorage.removeItem(REMEMBER_KEY);
    const primary = remember ? localStorage : sessionStorage;
    const secondary = remember ? sessionStorage : localStorage;
    if (accessToken) primary.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) primary.setItem(REFRESH_KEY, refreshToken);
    secondary.removeItem(ACCESS_KEY);
    secondary.removeItem(REFRESH_KEY);
  } catch { /* private mode */ }
};

export const clearTokens = (): void => {
  try {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(REMEMBER_KEY);
  } catch { /* private mode */ }
};

// Attach the stored JWT so MySQL-backed routes (receipts, decisions) sync
api.interceptors.request.use((config) => {
  try {
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  } catch { /* private mode */ }
  return config;
});

api.interceptors.response.use(undefined, async (error) => {
  const config = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
  if (error.response?.status !== 401 || !config || config._retry || config.url?.includes('/auth/refresh')) throw error;
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw error;
  config._retry = true;
  try {
    const response = await api.post('/auth/refresh', { refreshToken });
    const tokens = response.data.data as { accessToken: string; refreshToken: string };
    setTokens(tokens.accessToken, tokens.refreshToken, isRemembered());
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    return api(config);
  } catch {
    clearTokens();
    throw error;
  }
});

/**
 * Turns an axios failure into something a student can act on.
 *
 * The old wording collapsed three very different faults into one sentence,
 * which is what made this so hard to diagnose: a sleeping server (no response
 * at all), a stale cached page whose API call is answered by the static host
 * (a plain 404 with an HTML body and no `message` field), and genuine bad
 * credentials. Naming the HTTP status means the next report is diagnosable.
 */
export const describeApiError = (error: unknown, action = 'Sign-in'): string => {
  const apiError = error as {
    response?: { status?: number; data?: unknown };
    code?: string;
  };

  if (!apiError?.response) {
    const unreachable =
      apiError?.code === 'ERR_NETWORK' || apiError?.code === 'ECONNABORTED' || apiError?.code === 'ETIMEDOUT';
    if (unreachable) {
      return 'Cannot reach the portal server. It sleeps when idle and can take up to a minute to wake, so please try again.';
    }
    return error instanceof Error && error.message ? error.message : `${action} failed. Please try again.`;
  }

  const { status, data } = apiError.response;
  const message = data && typeof data === 'object' ? (data as { message?: unknown }).message : undefined;
  if (typeof message === 'string' && message.trim()) return message;

  // 404/405 here means the page is stale: an older build shipped a relative
  // /api base, so sign-in went to the static host instead of the API.
  if (status === 404 || status === 405) {
    return `This page is out of date (HTTP ${status}). Press Ctrl+Shift+R to reload, then try again.`;
  }
  if (status === 401) return 'Invalid credentials. Please check your school ID/email and password.';
  if (typeof status === 'number' && status >= 500) {
    return `The portal server is waking up or redeploying (HTTP ${status}). Please try again in a minute.`;
  }
  return `${action} failed (HTTP ${status ?? 'unknown'}). Please try again.`;
};

export default api;