import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { ClipboardCheck, Plus } from 'lucide-react';
import type { AttendanceSummary } from '../lib/metrics';

type AttendanceAuditProps = {
  summary: AttendanceSummary;
  onAdd: () => void;
};

const SEGMENTS = [
  { key: 'present', label: 'Present', color: '#1E3A8A' },
  { key: 'late', label: 'Late Arrivals', color: '#3B82F6' },
  { key: 'excused', label: 'Excused Leave', color: '#94A3B8' },
  { key: 'absent', label: 'Unexcused Absences', color: '#EF4444' },
] as const;

export const AttendanceAudit = ({ summary, onAdd }: AttendanceAuditProps) => {
  const pieData = SEGMENTS.map((seg) => ({ name: seg.label, value: summary[seg.key], color: seg.color }));
  const hasData = summary.total > 0;

  return (
    <section id="attendance" className="card scroll-mt-24 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="icon-chip h-9 w-9 bg-[#EFF6FF] text-[#2563EB]">
            <ClipboardCheck className="h-[18px] w-[18px]" />
          </span>
          <h2 className="card-title">Attendance Audit</h2>
        </div>
        <span className="pill bg-slate-100 text-slate-600">{summary.total} Total Sessions</span>
      </div>

      <div className="mt-5 flex flex-col items-center gap-5">
        <div className="relative h-[176px] w-[176px]">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-full border-[14px] border-slate-100" />
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-[26px] font-bold leading-none ${hasData ? 'text-slate-900' : 'text-slate-300'}`}>
              {summary.rate.toFixed(1)}%
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {hasData ? 'Present' : 'No data'}
            </span>
          </div>
        </div>

        <ul className="w-full space-y-2">
          {SEGMENTS.map((seg) => (
            <li
              key={seg.key}
              className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2"
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                {seg.label}
              </span>
              <span className="whitespace-nowrap text-xs text-slate-500">
                <span className="font-bold text-slate-700">{summary[seg.key]} sessions</span>{' '}
                ({hasData ? ((summary[seg.key] / summary.total) * 100).toFixed(1) : '0.0'}%)
              </span>
            </li>
          ))}
        </ul>

        <button type="button" className="btn-soft w-full" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Log Attendance
        </button>
      </div>
    </section>
  );
};
