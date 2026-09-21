import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'cec:theme';

export const getTheme = (): Theme => {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch { return 'light'; }
};

export const setTheme = (t: Theme) => {
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  try { window.dispatchEvent(new Event('cec:theme')); } catch { /* ignore */ }
};

export const useTheme = () => {
  const [theme, setT] = useState<Theme>(() => getTheme());
  useEffect(() => {
    const sync = () => setT(getTheme());
    window.addEventListener('cec:theme', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('cec:theme', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return { theme, dark: theme === 'dark', toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
};
