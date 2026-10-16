import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, DoorOpen, Plus, Trash2, User } from 'lucide-react';
import type { ScheduleSlot } from '../types';
import { formatLongDate, formatTime, minutesUntil, slotState } from '../lib/metrics';

type TodayScheduleProps = {
  slots: ScheduleSlot[];
  onAdd: () => void;
  onRemove: (id: string) => void;
};

type RowHint = { highlight: boolean; label: string; kind: 'completed' | 'starting' | 'upcoming' };

const rowHint = (slot: ScheduleSlot, now: Date): RowHint => {
  const state = slotState(slot, now);
  if (state === 'Completed') return { highlight: false, label: 'Completed', kind: 'completed' };
  if (state === 'Ongoing') return { highlight: true, label: 'Ongoing', kind: 'starting' };
  const mins = minutesUntil(slot, now);
  if (mins > 0 && mins <= 45) return { highlight: true, label: `Starting in ${mins}m`, kind: 'starting' };
  return { highlight: false, label: 'Upcoming', kind: 'upcoming' };
};

export const TodaySchedule = ({ slots, onAdd, onRemove }: TodayScheduleProps) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section id="schedule" className="card scroll-mt-24 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="h-5 w-5 text-[#1B365D]" />
          <h2 className="card-title">Today&apos;s Academic Schedule</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill bg-slate-100 text-slate-600">{formatLongDate()}</span>
          <button type="button" className="btn-soft px-2.5 py-2" onClick={onAdd} aria-label="Add class to schedule">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {slots.length === 0 ? (
        <div className="dashed-empty mt-5">
          <span className="icon-chip bg-[#EFF6FF] text-[#2563EB]">
            <CalendarDays className="h-5 w-5" />
          </span>
          <p className="max-w-sm text-sm leading-relaxed text-slate-500">
            No classes scheduled for today. Click{' '}
            <span className="font-semibold text-slate-700">&lsquo;Class Schedule&rsquo;</span> to populate your
            timetable.
          </p>
          <button type="button" className="btn-primary" onClick={onAdd}>
            <Plus className="h-4 w-4" /> Add Class Schedule
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-2.5">
          {slots.map((slot) => {
            const hint = rowHint(slot, now);
            const on = hint.highlight;
            const muted = on ? 'text-blue-200' : 'text-slate-400';
            const body = on ? 'text-blue-100' : 'text-slate-500';
            return (
              <div
                key={slot.id}
                className={`group flex items-center gap-4 rounded-xl p-3.5 transition ${
                  on ? 'bg-[#1E3A8A] text-white shadow-soft' : 'bg-[#F8FAFC] hover:bg-slate-100'
                }`}
              >
                <div className="w-16 shrink-0">
                  <p className={`text-[13px] font-bold ${on ? 'text-white' : 'text-slate-900'}`}>
                    {formatTime(slot.start)}
                  </p>
                  <p className={`text-[11px] ${muted}`}>{formatTime(slot.end)}</p>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`truncate text-sm ${on ? 'text-white' : 'text-slate-800'}`}>
                      <span className="font-semibold">{slot.code}</span>
                      <span className={`mx-1.5 ${muted}`}>•</span>
                      {slot.title}
                    </p>
                    {slot.section && (
                      <span
                        className={`chip shrink-0 border ${
                          on ? 'border-white/25 bg-white/15 text-white' : 'border-line bg-white text-slate-500'
                        }`}
                      >
                        {slot.section}
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs ${body}`}>
                    <span className="inline-flex items-center gap-1">
                      <DoorOpen className="h-3.5 w-3.5" /> {slot.room || 'Room TBA'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> {slot.instructor || 'Instructor TBA'}
                    </span>
                  </p>
                </div>

                <span
                  className={`chip shrink-0 ${
                    on
                      ? 'bg-white text-[#1E3A8A]'
                      : hint.kind === 'completed'
                        ? 'border border-emerald-100 bg-white text-emerald-600'
                        : 'border border-line bg-white text-slate-500'
                  }`}
                >
                  {hint.kind === 'completed' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : hint.kind === 'starting' ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                  {hint.label}
                </span>

                <button
                  type="button"
                  className={`shrink-0 opacity-0 transition group-hover:opacity-100 focus:opacity-100 ${
                    on ? 'text-blue-200 hover:text-white' : 'text-slate-300 hover:text-[#EF4444]'
                  }`}
                  onClick={() => onRemove(slot.id)}
                  aria-label={`Remove ${slot.code}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
