import { useEffect, useMemo, useState } from 'react';

type SearchRecord = { title: string; detail: string; target: string };
type Props = { items: string[]; onNavigate: (item: string) => void; records?: SearchRecord[] };

export const DashboardCommandMenu = ({ items, onNavigate, records = [] }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('cec:favorites') ?? '[]') as string[]; } catch { return []; }
  });
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('cec:recent') ?? '[]') as string[]; } catch { return []; }
  });
  const filtered = useMemo(() => items.filter((item) => item.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const recordResults = useMemo(() => records.filter((record) => `${record.title} ${record.detail}`.toLowerCase().includes(query.toLowerCase())), [records, query]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(true); } if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, []);
  const navigate = (item: string) => {
    const next = [item, ...recent.filter((value) => value !== item)].slice(0, 5);
    setRecent(next); localStorage.setItem('cec:recent', JSON.stringify(next)); setOpen(false); setQuery(''); onNavigate(item);
  };
  const toggleFavorite = (item: string) => {
    const next = favorites.includes(item) ? favorites.filter((value) => value !== item) : [...favorites, item];
    setFavorites(next); localStorage.setItem('cec:favorites', JSON.stringify(next));
  };
  return <><button className="command-trigger" type="button" onClick={() => setOpen(true)} aria-label="Search portal" title="Search portal (Ctrl K)"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg><span>Search portal</span><kbd>Ctrl K</kbd></button>{open && <div className="command-overlay" role="dialog" aria-modal="true" aria-label="Global portal search"><div className="command-menu"><div className="command-search"><span>⌕</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students, subjects, payments..." /><button type="button" onClick={() => setOpen(false)}>Esc</button></div>{!query && recent.length > 0 && <div className="command-section"><small>RECENT</small>{recent.map((item) => <button type="button" key={`recent-${item}`} onClick={() => navigate(item)}>{item}<span>Recent</span></button>)}</div>}{query && recordResults.length > 0 && <div className="command-section"><small>RECORDS</small>{recordResults.map((record) => <button type="button" className="search-record" key={`${record.target}-${record.title}`} onClick={() => navigate(record.target)}><strong>{record.title}</strong><span>{record.detail}</span></button>)}</div>}<div className="command-section"><small>{query ? 'MODULES' : 'ALL MODULES'}</small>{filtered.map((item) => <div className="command-result" key={item}><button type="button" onClick={() => navigate(item)}>{item}</button><button className="favorite-toggle" type="button" onClick={() => toggleFavorite(item)} aria-label={`${favorites.includes(item) ? 'Remove' : 'Add'} ${item} favorite`}>{favorites.includes(item) ? '★' : '☆'}</button></div>)}{!filtered.length && !recordResults.length && <p className="command-empty">No portal records or modules found.</p>}</div></div></div>}</>;
};
