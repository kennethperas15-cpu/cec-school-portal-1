import { useMemo, useState } from 'react';

type Metric = { label: string; value: string; change: string };
const metrics: Metric[] = [
  { label: 'Enrollment by program', value: 'BSIT 142', change: '+12% vs last term' },
  { label: 'Enrollment by year level', value: '3rd Year 118', change: '32% of active students' },
  { label: 'Student retention', value: '91.4%', change: '+2.1% this year' },
  { label: 'Grade distribution', value: '84.6 average', change: 'Most common: 85–89' },
  { label: 'Attendance trend', value: '94.2%', change: '+1.8% this month' },
  { label: 'Revenue by month', value: '₱2.84M', change: '+8.6% this quarter' },
  { label: 'Unpaid balances', value: '₱486,200', change: '27 accounts overdue' },
  { label: 'Faculty teaching load', value: '78%', change: 'Within target range' },
  { label: 'Room utilization', value: '72%', change: 'Peak: 10:00 AM' },
  { label: 'Document processing time', value: '2.4 days', change: '-0.6 days improved' },
];

const csv = (rows: Metric[]) => [['Report', 'Value', 'Comparison'], ...rows.map((row) => [row.label, row.value, row.change])].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');

export const AdminReports = ({ onNotify }: { onNotify: (message: string) => void }) => {
  const [program, setProgram] = useState('All programs');
  const [period, setPeriod] = useState('Current academic year');
  const filtered = useMemo(() => program === 'All programs' ? metrics : metrics.map((metric) => ({ ...metric, value: `${metric.value} • ${program}` })), [program]);
  const downloadCsv = () => { const blob = new Blob([csv(filtered)], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `cec-report-${period.toLowerCase().replace(/\s+/g, '-')}.csv`; link.click(); URL.revokeObjectURL(url); onNotify('CSV report exported'); };
  return <section className="report-page"><div className="report-heading"><div><span className="workflow-kicker">ADMIN REPORTING</span><h1>School performance reports</h1><p>Monitor enrollment, academics, finance, faculty, facilities, and service delivery.</p></div><div className="report-actions"><button className="ghost-button" type="button" onClick={() => window.print()}>Print</button><button className="primary-button" type="button" onClick={downloadCsv}>Export CSV</button></div></div><div className="report-filters"><label>Period<select value={period} onChange={(e) => setPeriod(e.target.value)}><option>Current academic year</option><option>Previous academic year</option><option>Current semester</option><option>Last 30 days</option></select></label><label>Program<select value={program} onChange={(e) => setProgram(e.target.value)}><option>All programs</option><option>BSIT</option><option>BSCS</option><option>BEED</option></select></label></div><div className="report-grid">{filtered.map((metric) => <article className="report-card" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.change}</small><div className="report-spark"><i style={{ width: `${35 + (metric.label.length * 7) % 55}%` }} /></div></article>)}</div><div className="report-chart"><div><h2>Monthly activity overview</h2><p>Illustrative trend from recorded portal activity.</p></div><div className="bar-chart">{[48, 62, 55, 74, 68, 86, 78, 92, 80, 96, 88, 100].map((height, index) => <div key={index}><span style={{ height: `${height}%` }} /><small>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][index]}</small></div>)}</div></div></section>;
};
