import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10000,
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

/** Persist tokens; remembered sessions survive tab/browser restarts. */
export const setTokens = (accessToken?: string, refreshToken?: string, remember = false): void => {
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

export default api;