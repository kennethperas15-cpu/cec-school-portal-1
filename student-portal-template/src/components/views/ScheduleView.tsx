import { CalendarDays, CheckCircle2, Circle, DoorOpen, Plus, Trash2, User } from 'lucide-react';
import { DAYS } from '../../types';
import { formatTime, minutesUntil, slotState, todayName } from '../../lib/metrics';
import { useStore } from '../../store';
import { PageHeader } from './PageHeader';

const rowTone = (state: ReturnType<typeof slotState>, mins: number) => {
  if (state === 'Completed') return { on: false, label: 'Completed', kind: 'completed' as const };
  if (state === 'Ongoing') return { on: true, label: 'Ongoing', kind: 'starting' as const };
  if (mins > 0 && mins <= 45) return { on: true, label: `Starting in ${mins}m`, kind: 'starting' as const };
  return { on: false, label: 'Upcoming', kind: 'upcoming' as const };
};

export const ScheduleView = ({ onAdd }: { onAdd: () => void }) => {
  const { schedule, removeSchedule } = useStore();
  const today = todayName();
  const now = new Date();

  const byDay = DAYS.map((day) => ({
    day,
    slots: schedule.filter((slot) => slot.day === day).sort((a, b) => a.start.localeCompare(b.start)),
  })).filter((group) => group.slots.length > 0);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={CalendarDays}
        title="Class Schedule"
        subtitle={
          schedule.length
            ? `${schedule.length} weekly session${schedule.length === 1 ? '' : 's'} across ${byDay.length} day${byDay.length === 1 ? '' : 's'}`
            : 'Your weekly timetable will appear here once you add classes'
        }
        action={
          <button type="button" className="btn-primary" onClick={onAdd}>
            <Plus className="h-4 w-4" /> Add class
          </button>
        }
      />

      {byDay.length === 0 ? (
        <section className="card p-6">
          <div className="dashed-empty">
            <span className="icon-chip bg-[#EFF6FF] text-[#2563EB]">
              <CalendarDays className="h-5 w-5" />
            </span>
            <p className="max-w-sm text-sm leading-relaxed text-slate-500">
              No classes on your timetable yet. Add sessions for each subject you are enrolled in.
            </p>
            <button type="button" className="btn-primary" onClick={onAdd}>
              <Plus className="h-4 w-4" /> Add your first class
            </button>
          </div>
        </section>
      ) : (
        byDay.map(({ day, slots }) => (
          <section key={day} className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="card-title flex items-center gap-2">
                {day}
                {day === today && <span className="chip bg-[#1B365D] text-white">Today</span>}
              </h2>
              <span className="pill bg-slate-100 text-slate-600">
                {slots.length} class{slots.length === 1 ? '' : 'es'}
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {slots.map((slot) => {
                const state = slotState(slot, now);
                const tone = slotState(slot, now) === 'Completed' ? null : rowTone(state, minutesUntil(slot, now));
                const on = tone?.on ?? false;
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
                          : tone?.kind === 'completed'
                            ? 'border border-emerald-100 bg-white text-emerald-600'
                            : 'border border-line bg-white text-slate-500'
                      }`}
                    >
                      {tone?.kind === 'completed' ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : tone?.kind === 'starting' ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      ) : (
                        <Circle className="h-3 w-3" />
                      )}
                      {tone?.label ?? 'Completed'}
                    </span>

                    <button
                      type="button"
                      className={`shrink-0 transition ${
                        on ? 'text-blue-200 hover:text-white' : 'text-slate-300 hover:text-[#EF4444]'
                      }`}
                      onClick={() => removeSchedule(slot.id)}
                      aria-label={`Remove ${slot.code} on ${slot.day}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
};
