import { useMemo, useState } from 'react';

type Props = { kind: 'enrollment' | 'academic' | 'revenue'; onNotify: (t: string) => void };

type Rec = { id: string; name: string; role?: string; meta?: string };

const load = <T,>(key: string, fallback: T[]): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : fallback;
  } catch { return fallback; }
};

const peso = (s: string) => {
  const m = s.replace(/,/g, '').match(/₱\s*(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
};

const programOf = (s: string): string => {
  const m = s.toUpperCase().match(/BSIT|BSCS|BEED|BSED/);
  return m ? m[0] : 'Other';
};

const toCsv = (headers: string[], rows: (string | number)[][]): string =>
  [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

const download = (filename: string, text: string) => {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const Bar = ({ label, value, max, color = '#0B3D91' }: { label: string; value: number; max: number; color?: string }) => (
  <div style={{ marginTop: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{label}</span><strong>{value}</strong></div>
    <div style={{ height: 9, background: '#edf1f5', borderRadius: 8, marginTop: 6 }}>
      <div style={{ width: `${max ? Math.round((value / max) * 100) : 0}%`, height: '100%', background: color, borderRadius: 8 }} />
    </div>
  </div>
);

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e8ecf3', borderRadius: 16, padding: 28, maxWidth: 1120, margin: '0 auto' };
const box: React.CSSProperties = { border: '1px solid #e6eaf1', borderRadius: 12, padding: 18, marginTop: 14 };
const btn: React.CSSProperties = { background: '#0B3D91', color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const ghost: React.CSSProperties = { border: '1px solid #e2e7ef', background: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' };
const inp: React.CSSProperties = { border: '1px solid #e2e7ef', borderRadius: 8, padding: '10px 12px', fontSize: 13 };

export const LiveReport = ({ kind, onNotify }: Props) => {
  const [program, setProgram] = useState('All programs');
  const [query, setQuery] = useState('');

  const enroll = useMemo(() => load<Rec>('cec:a_enroll', []), []);
  const accounts = useMemo(() => load<Rec>('cec:a_accounts', []), []);
  const grades = useMemo(() => load<{ prelim: string; midterm: string; final: string }>('cec:t_grades', []), []);
  const bills = useMemo(() => load<Rec>('cec:a_bills', []), []);
  const history = useMemo(() => load<Rec>('cec:s_history', []), []);

  if (kind === 'enrollment') {
    const inProg = (meta: string) => program === 'All programs' || programOf(meta) === program;
    const pending = enroll.filter((e) => inProg(e.meta ?? ''));
    const students = accounts.filter((a) => (a.role === 'student') && (program === 'All programs' || programOf(a.name) === program || true));
    const byProgram = ['BSIT', 'BSCS', 'BEED'].map((p) => ({ p, n: enroll.filter((e) => programOf(e.meta ?? '') === p).length }));
    const max = Math.max(1, ...byProgram.map((b) => b.n));
    const rows = pending.map((e) => [e.id, e.name, e.meta ?? '']);
    return (
      <section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>Enrollment Stats — live</h1>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <select style={inp} value={program} onChange={(e) => setProgram(e.target.value)} aria-label="Program filter"><option>All programs</option><option>BSIT</option><option>BSCS</option><option>BEED</option></select>
          <input style={inp} placeholder="Search applicant..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
          <button style={ghost} onClick={() => window.print()}>Print</button>
          <button style={btn} onClick={() => { download('enrollment-stats.csv', toCsv(['ID', 'Name', 'Detail'], rows)); onNotify('Enrollment stats exported'); }}>Export CSV</button>
        </div>
        <div style={box}>
          <div style={{ fontSize: 13 }}>Pending in queue: <strong>{pending.length}</strong> • Student accounts: <strong>{students.length}</strong></div>
          {byProgram.map((b) => <Bar key={b.p} label={b.p} value={b.n} max={max} />)}
        </div>
        <div style={{ ...box, padding: 0, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 12 }}>Applicant</th><th style={{ padding: 12 }}>Detail</th></tr></thead><tbody>
          {pending.filter((e) => (e.name + e.id).toLowerCase().includes(query.toLowerCase())).map((e) => <tr key={e.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><strong>{e.name}</strong><br /><small style={{ color: '#6b7890' }}>{e.id}</small></td><td style={{ padding: 12 }}>{e.meta}</td></tr>)}
        </tbody></table></div>
      </section>
    );
  }

  if (kind === 'academic') {
    const avgs = grades.map((g) => {
      const nums = [g.prelim, g.midterm, g.final].filter((v) => v !== '' && !Number.isNaN(Number(v))).map(Number);
      return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    }).filter((v): v is number => v !== null);
    const bands: [string, number, number][] = [['97–100 (1.00)', 97, 100], ['91–96 (1.25–1.50)', 91, 96.99], ['85–90 (1.75–2.00)', 85, 90.99], ['79–84 (2.25–2.50)', 79, 84.99], ['75–78 (2.75–3.00)', 75, 78.99], ['Below 75 (5.00)', 0, 74.99]];
    const counts = bands.map(([label, lo, hi]) => ({ label, n: avgs.filter((a) => a >= lo && a <= hi).length }));
    const max = Math.max(1, ...counts.map((c) => c.n));
    const mean = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
    const rows = counts.map((c) => [c.label, c.n]);
    return (
      <section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>Academic Performance — live</h1>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button style={ghost} onClick={() => window.print()}>Print</button>
          <button style={btn} onClick={() => { download('academic-performance.csv', toCsv(['Band', 'Students'], rows)); onNotify('Academic report exported'); }}>Export CSV</button>
        </div>
        <div style={box}>
          <div style={{ fontSize: 13 }}>Graded students: <strong>{avgs.length}</strong>{mean !== null && <> • Mean average: <strong>{mean.toFixed(1)}%</strong></>}</div>
          {!avgs.length && <div style={{ fontSize: 13, color: '#6b7890', marginTop: 8 }}>No teacher-encoded grades yet — bands fill in once grading starts.</div>}
          {counts.map((c) => <Bar key={c.label} label={c.label} value={c.n} max={max} color={c.label.startsWith('Below') ? '#dc2626' : '#0B3D91'} />)}
        </div>
      </section>
    );
  }

  const collected = history.reduce((n, h) => n + peso(`${h.name} ${h.role ?? ''}`), 0);
  const outstanding = bills.reduce((n, b) => n + peso(`${b.name} ${b.role ?? ''}`), 0);
  const maxR = Math.max(1, collected, outstanding);
  const revRows: (string | number)[][] = bills.map((b) => [b.id, b.name, b.role ?? '']);
  return (
    <section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>Revenue Dashboard — live</h1>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button style={ghost} onClick={() => window.print()}>Print</button>
        <button style={btn} onClick={() => { download('revenue.csv', toCsv(['ID', 'Charge', 'Detail'], revRows)); onNotify('Revenue report exported'); }}>Export CSV</button>
      </div>
      <div style={box}>
        <Bar label="Collected (receipts)" value={collected} max={maxR} color="#16a34a" />
        <Bar label="Outstanding (invoices)" value={outstanding} max={maxR} color="#ee9950" />
        <div style={{ fontSize: 13, marginTop: 10 }}>Net position: <strong>₱{(collected - outstanding).toLocaleString()}</strong> • Receipts: <strong>{history.length}</strong> • Invoices: <strong>{bills.length}</strong></div>
      </div>
    </section>
  );
};
