import { CalendarCheck, Plus, Trash2 } from 'lucide-react';
import { AttendanceAudit } from '../AttendanceAudit';
import { attendanceSummary } from '../../lib/metrics';
import { useStore } from '../../store';
import { PageHeader } from './PageHeader';

const STATUS_STYLE: Record<string, string> = {
  Present: 'bg-emerald-50 text-emerald-700',
  Late: 'bg-amber-50 text-amber-700',
  Excused: 'bg-indigo-50 text-indigo-700',
  Absent: 'bg-rose-50 text-rose-600',
};

export const AttendanceView = ({ onAdd }: { onAdd: () => void }) => {
  const { attendance, removeAttendance } = useStore();
  const summary = attendanceSummary(attendance);
  const log = [...attendance].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-5">
      <PageHeader
        icon={CalendarCheck}
        title="Attendance"
        subtitle="Every session you have logged this term"
        action={
          <button type="button" className="btn-primary" onClick={onAdd}>
            <Plus className="h-4 w-4" /> Log session
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AttendanceAudit summary={summary} onAdd={onAdd} />
        </div>

        <section className="card p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="card-title">Session log</h2>
              <p className="card-sub">Newest first — remove any entry logged in error</p>
            </div>
            <span className="pill bg-slate-100 text-slate-600">{summary.total} sessions</span>
          </div>

          {log.length === 0 ? (
            <div className="dashed-empty mt-5">
              <span className="icon-chip bg-[#EFF6FF] text-[#2563EB]">
                <CalendarCheck className="h-5 w-5" />
              </span>
              <p className="max-w-sm text-sm leading-relaxed text-slate-500">
                No attendance recorded yet. Once your instructors post attendance it will show up here.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-2.5 pr-3">Date</th>
                    <th className="pb-2.5 pr-3">Course</th>
                    <th className="pb-2.5 pr-3">Status</th>
                    <th className="pb-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {log.map((record) => (
                    <tr key={record.id} className="border-b border-line/70 last:border-0">
                      <td className="py-3 pr-3 text-slate-500">{record.date}</td>
                      <td className="py-3 pr-3 font-semibold text-slate-800">{record.course}</td>
                      <td className="py-3 pr-3">
                        <span className={`chip ${STATUS_STYLE[record.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          className="text-slate-300 transition hover:text-[#EF4444]"
                          onClick={() => removeAttendance(record.id)}
                          aria-label={`Remove ${record.course} entry for ${record.date}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
