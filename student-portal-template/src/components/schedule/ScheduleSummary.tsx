import { CalendarClock, ShieldAlert, ShieldCheck, Timer } from 'lucide-react';
import { formatTime } from '../../lib/metrics';
import type { ScheduleEntry } from '../../lib/schedule';

/**
 * The three bento cards above the grid. Every number is derived from the
 * published meetings: contact hours are summed, today's classes are counted, and
 * the audit is a real overlap check — not a decorative "0 Conflicts" badge.
 */

export const ScheduleSummary = ({
  entries,
  hours,
  todayEntries,
  conflicts,
  todayLabel,
}: {
  entries: ScheduleEntry[];
  hours: { total: number; lecture: number; lab: number };
  todayEntries: ScheduleEntry[];
  conflicts: string[];
  todayLabel: string;
}) => {
  const first = todayEntries[0];
  const last = todayEntries[todayEntries.length - 1];
  const clean = conflicts.length === 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className="card p-5">
        <div className="flex items-center gap-2">
          <span className="icon-chip h-8 w-8 bg-[#eaedff] text-[#00236f]">
            <Timer className="h-4 w-4" />
          </span>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Weekly contact time</p>
        </div>
        <p className="mt-3 text-3xl font-bold tracking-tight text-[#00236f]">
          {hours.total.toFixed(1)}
          <span className="ml-1.5 text-sm font-semibold text-slate-400">Hours Total</span>
        </p>
        <p className="mt-1 text-[12px] font-medium text-slate-500">
          {hours.lecture > 0 && `${hours.lecture.toFixed(1)} hrs lecture`}
          {hours.lecture > 0 && hours.lab > 0 && ' • '}
          {hours.lab > 0 && `${hours.lab.toFixed(1)} hrs lab / practicum`}
          {!entries.length && 'Nothing published yet'}
        </p>
      </section>

      <section className="card p-5">
        <div className="flex items-center gap-2">
          <span className="icon-chip h-8 w-8 bg-[#e8f2ff] text-[#0058be]">
            <CalendarClock className="h-4 w-4" />
          </span>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Today&apos;s schedule</p>
        </div>
        <p className="mt-3 text-xl font-bold tracking-tight text-[#00236f]">{todayLabel}</p>
        <p className="mt-1 text-[12px] font-medium text-slate-500">
          {todayEntries.length
            ? `${todayEntries.length} class${todayEntries.length === 1 ? '' : 'es'} scheduled today (${formatTime(first.start)} – ${formatTime(last.end)})`
            : 'No classes published for today'}
        </p>
      </section>

      <section className="card p-5">
        <div className="flex items-center gap-2">
          <span
            className={`icon-chip h-8 w-8 ${
              clean ? 'bg-[#e8f7f4] text-[#0f766e]' : 'bg-[#fef2f2] text-[#b91c1c]'
            }`}
          >
            {clean ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
          </span>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Integrity audit</p>
        </div>
        <p className={`mt-3 text-3xl font-bold tracking-tight ${clean ? 'text-[#0f766e]' : 'text-[#b91c1c]'}`}>
          {conflicts.length} Conflict{conflicts.length === 1 ? '' : 's'}
        </p>
        <p className="mt-1 text-[12px] font-medium text-slate-500">
          {clean
            ? 'No room or instructor overlap in your section’s published timetable'
            : conflicts[0]}
        </p>
      </section>
    </div>
  );
};
