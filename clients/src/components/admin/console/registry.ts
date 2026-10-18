import { useCallback, useEffect, useState } from 'react';
import { describeApiError } from '../../../services/api';

/**
 * One registry read, with the three states a registrar table actually has:
 * loading, loaded (possibly empty), and unreadable. Pages never have to guess
 * whether "no rows" means "nothing recorded" or "the read failed".
 */
export const useRegistry = <T,>(load: () => Promise<T[]>, action: string) => {
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await load());
    } catch (failure) {
      setRows(null);
      setError(describeApiError(failure, action));
    } finally {
      setLoading(false);
    }
  }, [load, action]);

  useEffect(() => {
    void run();
  }, [run]);

  return { rows, error, loading, reload: run };
};

/** Case-insensitive contains across however many fields a column can show. */
export const matches = (term: string, ...values: (string | number | null | undefined)[]): boolean => {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => String(value ?? '').toLowerCase().includes(needle));
};

/** `active` -> `Active` — database enums read better with a capital. */
export const humanise = (value: string | null | undefined): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : '—';

export const unique = (values: (string | null | undefined)[]): string[] =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim())))).sort((a, b) => a.localeCompare(b));

/**
 * Export what the screen is showing. The CSV is built from the rows already on
 * screen, so an export never claims more than the registrar could see.
 */
export const downloadCsv = (filename: string, head: string[], rows: (string | number | null | undefined)[][]) => {
  const escape = (value: string | number | null | undefined) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const body = [head, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
