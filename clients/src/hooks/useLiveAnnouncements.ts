import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAnnouncements, type LiveAnnouncement } from '../services/announcements';

/**
 * Live announcements: fetches on mount, re-polls on an interval and on
 * window focus. Calls `onNew` once per announcement the session hasn't seen,
 * so dashboards can pop a toast/popup the moment admin publishes.
 */
export const useLiveAnnouncements = (
  audience = 'all',
  options: { intervalMs?: number; onNew?: (item: LiveAnnouncement) => void } = {},
) => {
  const { intervalMs = 10000, onNew } = options;
  const [items, setItems] = useState<LiveAnnouncement[]>([]);
  const [live, setLive] = useState(false);
  const seen = useRef<Set<number | string>>(new Set());
  const firstLoad = useRef(true);
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchAnnouncements(audience);
      const fresh = rows.filter((r) => !seen.current.has(r.id));
      rows.forEach((r) => seen.current.add(r.id));
      setItems(rows);
      setLive(true);
      // Skip the toast storm on first load — only announce later arrivals.
      if (firstLoad.current) firstLoad.current = false;
      else fresh.forEach((r) => onNewRef.current?.(r));
    } catch {
      setLive(false);
    }
  }, [audience]);

  useEffect(() => {
    let active = true;
    void refresh();
    const timer = window.setInterval(() => { if (active) void refresh(); }, intervalMs);
    const onFocus = () => { if (active) void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh, intervalMs]);

  return { items, live, refresh };
};
