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
    const token = localStorage.getItem('cec_access_token');
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  } catch { /* private mode */ }
  return config;
});

export default api;