import { BookOpen, CalendarCheck2, UserRound } from 'lucide-react';
import { subjectsOf, totalUnitsOf, type ScheduleEntry, type TimetableItem } from '../../lib/schedule';

/**
 * "Registered Courses & Venues" — one row per published subject.
 *
 * Every column is filled from the published document. Where the registrar has not
 * supplied a value (units, for instance) the cell shows a dash rather than a
 * plausible-looking guess.
 */

const initials = (name: string): string => {
  const words = name.replace(/[^A-Za-z\s.]/g, ' ').split(/\s+/).filter((word) => word && !/^[A-Za-z]\.$/.test(word));
  const letters = words.slice(0, 2).map((word) => word[0]);
  return letters.join('').toUpperCase() || '?';
};

export const CoursesTable = ({ item, entries }: { item: TimetableItem; entries: ScheduleEntry[] }) => {
  const subjects = subjectsOf(entries);
  const units = totalUnitsOf(entries);
  const unitsLabel = units.missing && !units.known
    ? 'Not yet recorded'
    : `${units.units.toFixed(1)}${units.missing ? ' (partial)' : ''} Units`;

  return (
    <section className="card scroll-mt-24 overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line p-5">
        <div>
          <h2 className="card-title">Registered Courses &amp; Venues</h2>
          <p className="card-sub">
            Complete breakdown of the subjects and instructors on your published timetable.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total courses</p>
            <p className="text-lg font-bold text-[#00236f]">
              {subjects.length} Course{subjects.length === 1 ? '' : 's'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cumulative units</p>
            <p className="text-lg font-bold text-[#00236f]">{unitsLabel}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Section</p>
            <p className="text-lg font-bold text-[#00236f]">{item.section}</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="bg-[#fbfcfe] text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Subject code</th>
              <th className="px-4 py-3">Descriptive title</th>
              <th className="px-4 py-3">Units</th>
              <th className="px-4 py-3">Days &amp; time</th>
              <th className="px-4 py-3">Room / mode</th>
              <th className="px-4 py-3">Instructor</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.key} className="border-t border-line align-top">
                <td className="px-4 py-3">
                  <span className="rounded-lg bg-[#eaedff] px-2 py-1 text-[11px] font-bold text-[#00236f]">
                    {subject.code || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">{subject.title || 'Untitled subject'}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> {item.section}
                    </span>
                    {subject.kinds.map((kind) => (
                      <span key={kind} className="chip border border-line bg-white text-slate-500">
                        {kind}
                      </span>
                    ))}
                  </p>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                  {subject.units === null ? '—' : subject.units.toFixed(1)}
                </td>
                <td className="px-4 py-3">
                  <ul className="space-y-0.5">
                    {subject.scheduleText.split('  |  ').map((line) => (
                      <li key={line} className="text-[12px] font-semibold text-slate-700">
                        {line}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-3">
                  <p className="text-[12px] font-semibold text-slate-700">
                    {subject.rooms.length ? subject.rooms.join(' • ') : 'Room to be announced'}
                  </p>
                  <p className="text-[11px] text-slate-400">{subject.kinds.join(' • ') || 'Mode not specified'}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {subject.instructors.map((name) => (
                      <span key={name} className="inline-flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eaedff] text-[10px] font-bold text-[#00236f]">
                          {initials(name)}
                        </span>
                        <span className="text-[12px] font-semibold text-slate-700">{name}</span>
                      </span>
                    ))}
                    {!subject.instructors.length && (
                      <span className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-400">
                        <UserRound className="h-3.5 w-3.5" /> To be announced
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-[11px] font-medium text-slate-400">
        <span>
          {item.publishedByName ? `Published by ${item.publishedByName}` : 'Published by the registrar office'}
          {item.publishedAt ? ` • ${new Date(item.publishedAt).toLocaleDateString()}` : ''}
          {item.updatedAt ? ` • last corrected ${new Date(item.updatedAt).toLocaleDateString()}` : ''}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarCheck2 className="h-3.5 w-3.5" />
          {entries.length} meeting{entries.length === 1 ? '' : 's'} across the published timetable
        </span>
      </div>
    </section>
  );
};
