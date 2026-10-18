import { CalendarClock, DoorOpen, User } from 'lucide-react';
import { useMemo } from 'react';
import { DAYS, type Day } from '../../types';
import { formatTime, toMinutes } from '../../lib/metrics';
import {
  CATEGORY_LABEL,
  CATEGORY_STYLE,
  categoryOf,
  meetingsFor,
  weekDates,
  type Category,
  type ScheduleEntry,
  type TimetableItem,
} from '../../lib/schedule';

/**
 * The weekly matrix from the design: a real time axis on the left, one column per
 * teaching day, class blocks positioned by their published start/end times.
 *
 * Layout rules that keep it honest even with messy registrar input:
 *  - the axis is drawn from the hours the section actually uses, not a fixed day;
 *  - two meetings that overlap are drawn side by side instead of hiding one;
 *  - the campus break band only appears when the drawn day really spans noon.
 */

const HOUR_HEIGHT = 74;
const FLOOR_HOUR = 6;
const CEIL_HOUR = 21;

type Packed = { entry: ScheduleEntry; lane: number };

/** Greedy lane packing: overlapping meetings get their own sub-column. */
const pack = (entries: ScheduleEntry[]): { rows: Packed[]; lanes: number } => {
  const sorted = [...entries].sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(a.end) - toMinutes(b.end),
  );
  const laneEnds: number[] = [];
  const rows = sorted.map((entry) => {
    const start = toMinutes(entry.start);
    let lane = laneEnds.findIndex((end) => end <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = toMinutes(entry.end);
    return { entry, lane };
  });
  return { rows, lanes: Math.max(1, laneEnds.length) };
};

const Block = ({
  entry,
  lane,
  lanes,
  startHour,
  muted,
}: {
  entry: ScheduleEntry;
  lane: number;
  lanes: number;
  startHour: number;
  muted: boolean;
}) => {
  const style = CATEGORY_STYLE[categoryOf(entry.code)];
  const top = ((toMinutes(entry.start) - startHour * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(48, ((toMinutes(entry.end) - toMinutes(entry.start)) / 60) * HOUR_HEIGHT - 6);
  const width = 100 / lanes;
  // Short meetings (a single one-hour class) cannot hold every line, so the block
  // sheds detail instead of clipping it. Everything stays on its title tooltip.
  const density = height >= 96 ? 'full' : height >= 72 ? 'medium' : 'compact';
  const time = `${formatTime(entry.start)} – ${formatTime(entry.end)}`;
  return (
    <div
      className={`absolute z-[1] overflow-hidden rounded-xl border p-2 transition ${style.block} ${
        muted ? 'opacity-45 saturate-50' : 'shadow-sm hover:shadow-md'
      }`}
      style={{ top, height, left: `${lane * width}%`, width: `calc(${width}% - 6px)` }}
      title={`${[entry.code, entry.title].filter(Boolean).join(' ')} • ${entry.room || 'Room TBA'} • ${time}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="truncate text-[12px] font-bold leading-tight">{entry.code || entry.title}</p>
        {entry.kind && (
          <span className={`chip shrink-0 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide ${style.chip}`}>
            {entry.kind.replace('Lecture & Laboratory', 'Lab / Lec')}
          </span>
        )}
      </div>
      {density !== 'compact' && entry.code && entry.title && (
        <p
          className={`mt-0.5 text-[11px] font-medium leading-tight opacity-90 ${
            density === 'full' ? 'line-clamp-2' : 'line-clamp-1'
          }`}
        >
          {entry.title}
        </p>
      )}
      <p className="mt-0.5 truncate text-[10px] font-semibold opacity-80">{entry.room || 'Room to be announced'}</p>
      {density === 'full' && <p className="truncate text-[10px] font-medium opacity-70">{time}</p>}
    </div>
  );
};

const DayColumn = ({
  day,
  dateLabel,
  isToday,
  entries,
  now,
  startHour,
  endHour,
}: {
  day: Day;
  dateLabel: string;
  isToday: boolean;
  entries: ScheduleEntry[];
  now: Date;
  startHour: number;
  endHour: number;
}) => {
  const { rows, lanes } = useMemo(() => pack(entries), [entries]);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
  return (
    <div className="min-w-[152px] flex-1 border-r border-line last:border-r-0">
      <div className={`border-b px-2 py-2.5 text-center ${isToday ? 'border-[#c7d2fe] bg-[#eaedff]' : 'border-line bg-white'}`}>
        <p className={`text-[11px] font-bold uppercase tracking-wide ${isToday ? 'text-[#00236f]' : 'text-slate-500'}`}>
          {day}
        </p>
        <p className={`text-[11px] font-medium ${isToday ? 'text-[#0058be]' : 'text-slate-400'}`}>
          {isToday ? `Today • ${dateLabel}` : dateLabel}
        </p>
      </div>
      <div className={`relative ${isToday ? 'bg-[#f6f8ff]' : 'bg-white'}`} style={{ height: (endHour - startHour) * HOUR_HEIGHT }}>
        {hours.map((hour) => (
          <div key={hour} className="absolute inset-x-0 border-t border-slate-100" style={{ top: (hour - startHour) * HOUR_HEIGHT }} />
        ))}
        {rows.map(({ entry, lane }) => (
          <Block
            key={entry.id}
            entry={entry}
            lane={lane}
            lanes={lanes}
            startHour={startHour}
            muted={isToday && toMinutes(entry.end) <= nowMinutes}
          />
        ))}
        {!rows.length && (
          <p className="absolute inset-x-0 top-4 text-center text-[11px] font-medium text-slate-300">No classes</p>
        )}
      </div>
    </div>
  );
};

const DailyList = ({ entries, now }: { entries: ScheduleEntry[]; now: Date }) => {
  if (!entries.length) {
    return (
      <div className="dashed-empty m-4">
        <span className="icon-chip bg-[#EFF6FF] text-[#2563EB]">
          <CalendarClock className="h-5 w-5" />
        </span>
        <p className="max-w-sm text-sm leading-relaxed text-slate-500">
          No classes are published for today. Switch to the weekly view to see the rest of the week.
        </p>
      </div>
    );
  }
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return (
    <div className="space-y-2.5 p-4">
      {entries.map((entry) => {
        const done = toMinutes(entry.end) <= nowMinutes;
        const live = !done && toMinutes(entry.start) <= nowMinutes;
        const style = CATEGORY_STYLE[categoryOf(entry.code)];
        return (
          <div
            key={entry.id}
            className={`flex flex-wrap items-center gap-3 rounded-xl border p-3.5 ${style.block} ${
              done ? 'opacity-50' : live ? 'ring-2 ring-[#0058be]/40' : ''
            }`}
          >
            <div className="w-20 shrink-0">
              <p className="text-[13px] font-bold">{formatTime(entry.start)}</p>
              <p className="text-[11px] font-medium opacity-80">{formatTime(entry.end)}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {entry.code || entry.title}
                {entry.code && entry.title ? <span className="font-medium opacity-90"> • {entry.title}</span> : null}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-medium opacity-80">
                <span className="inline-flex items-center gap-1">
                  <DoorOpen className="h-3.5 w-3.5" /> {entry.room || 'Room to be announced'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> {entry.instructor || 'Instructor to be announced'}
                </span>
              </p>
            </div>
            {entry.kind && <span className={`chip ${style.chip}`}>{entry.kind}</span>}
            {live && <span className="chip bg-[#0058be] text-white">Ongoing</span>}
          </div>
        );
      })}
    </div>
  );
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const TimetableGrid = ({
  item,
  entries,
  view,
  today,
}: {
  item: TimetableItem;
  entries: ScheduleEntry[];
  view: 'weekly' | 'daily';
  today: Day | null;
}) => {
  const now = useMemo(() => new Date(), []);
  const week = useMemo(() => weekDates(now), [now]);
  const categories = useMemo(() => [...new Set(entries.map((entry) => categoryOf(entry.code)))] as Category[], [entries]);

  /** Draw only the hours this section uses, so the matrix reads like a real day. */
  const axis = useMemo(() => {
    if (!entries.length) return { startHour: 8, endHour: 16 };
    const starts = entries.map((entry) => toMinutes(entry.start));
    const ends = entries.map((entry) => toMinutes(entry.end));
    const startHour = clamp(Math.floor(Math.min(...starts) / 60), FLOOR_HOUR, CEIL_HOUR - 2);
    const endHour = clamp(Math.ceil(Math.max(...ends) / 60), startHour + 2, CEIL_HOUR);
    return { startHour, endHour };
  }, [entries]);

  const breakTop = axis.startHour < 12 && axis.endHour > 12 ? (12 - axis.startHour) * HOUR_HEIGHT : null;

  return (
    <section className="card scroll-mt-24 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
        <div>
          <h2 className="card-title">{view === 'weekly' ? 'Weekly Timetable Grid' : 'Today’s Timetable'}</h2>
          <p className="card-sub">
            {item.section} • {entries.length} published meeting{entries.length === 1 ? '' : 's'} in the week
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {categories.map((category) => (
            <span key={category} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <span className={`h-2 w-2 rounded-full ${CATEGORY_STYLE[category].dot}`} />
              {CATEGORY_LABEL[category]}
            </span>
          ))}
        </div>
      </div>

      {view === 'daily' ? (
        <DailyList entries={today ? meetingsFor(entries, today) : []} now={now} />
      ) : (
        <div className="overflow-x-auto">
          <div className="flex min-w-[1050px]">
            <div className="w-16 shrink-0 border-r border-line bg-[#fbfcfe]">
              <div className="h-[53px] border-b border-line" />
              <div className="relative" style={{ height: (axis.endHour - axis.startHour) * HOUR_HEIGHT }}>
                {Array.from({ length: axis.endHour - axis.startHour }, (_, index) => (
                  <p
                    key={index}
                    className="absolute right-2 text-[10px] font-bold uppercase tracking-wide text-slate-400"
                    style={{ top: index * HOUR_HEIGHT, transform: index === 0 ? 'none' : 'translateY(-50%)' }}
                  >
                    {formatTime(`${String(axis.startHour + index).padStart(2, '0')}:00`)}
                  </p>
                ))}
              </div>
            </div>

            <div className="relative flex flex-1">
              {DAYS.map((day) => {
                const info = week.find((entry) => entry.day === day);
                return (
                  <DayColumn
                    key={day}
                    day={day}
                    dateLabel={info?.label ?? ''}
                    isToday={!!info?.isToday}
                    entries={meetingsFor(entries, day)}
                    now={now}
                    startHour={axis.startHour}
                    endHour={axis.endHour}
                  />
                );
              })}

              {breakTop !== null && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-0 flex h-6 items-center justify-center"
                  style={{ top: 53 + breakTop }}
                >
                  <span className="rounded-full border border-[#dbe4ff] bg-white/95 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00236f] shadow-sm">
                    Campus common break • 12:00 noon
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-[11px] font-medium text-slate-400">
        <span>
          Published by {item.publishedByName || 'the registrar'}
          {item.updatedAt ? ` • last updated ${new Date(item.updatedAt).toLocaleString()}` : ''}
        </span>
        <span>
          {axis.startHour < 12 && axis.endHour > 12 ? 'The band marks the 12:00 noon campus break.' : 'Times shown are school (local) time.'}
        </span>
      </div>
    </section>
  );
};
