import { CalendarDays } from 'lucide-react';
import type { Milestone } from '../types';

type TermMilestonesProps = {
  milestones: Milestone[];
};

export const TermMilestones = ({ milestones }: TermMilestonesProps) => (
  <section className="card p-6">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="icon-chip h-9 w-9 bg-[#EFF6FF] text-[#2563EB]">
          <CalendarDays className="h-[18px] w-[18px]" />
        </span>
        <h2 className="card-title">Term Milestones</h2>
      </div>
      <span className="pill bg-slate-100 uppercase tracking-wide text-slate-600">Semester 2</span>
    </div>

    <ol className="mt-4 space-y-2.5">
      {milestones.length === 0 && (
        <li className="rounded-xl bg-[#F4F7FB] px-4 py-6 text-center text-sm text-slate-500">
          No milestones scheduled for this term.
        </li>
      )}
      {milestones.map((milestone) => (
        <li key={milestone.id} className="flex items-center gap-3.5 rounded-xl bg-[#F4F7FB] p-3">
          <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-white text-[#1B365D] shadow-sm">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{milestone.month}</span>
            <span className="text-base font-bold leading-none">{milestone.day}</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">{milestone.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {milestone.date}
              {milestone.meta ? ` • ${milestone.meta}` : ''}
            </p>
          </div>
        </li>
      ))}
    </ol>
  </section>
);
