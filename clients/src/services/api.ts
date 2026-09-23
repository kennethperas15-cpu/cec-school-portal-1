import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the stored JWT so MySQL-backed routes (receipts, decisions) sync
api.interceptors.request.use((config) => {
  try {
    const token = sessionStorage.getItem('cec_access_token');
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
  const refreshToken = sessionStorage.getItem('cec_refresh_token');
  if (!refreshToken) throw error;
  config._retry = true;
  try {
    const response = await api.post('/auth/refresh', { refreshToken });
    const tokens = response.data.data as { accessToken: string; refreshToken: string };
    sessionStorage.setItem('cec_access_token', tokens.accessToken);
    sessionStorage.setItem('cec_refresh_token', tokens.refreshToken);
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    return api(config);
  } catch {
    sessionStorage.removeItem('cec_access_token');
    sessionStorage.removeItem('cec_refresh_token');
    throw error;
  }
});

export default api;