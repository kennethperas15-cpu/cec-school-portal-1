import { BookMarked, MapPin, Timer } from 'lucide-react';
import type { AttendanceRecord } from '../../types';
import { formatTime, toMinutes } from '../../lib/metrics';
import { buildingsOf, type ScheduleEntry } from '../../lib/schedule';

/**
 * The complementary widget beside the table: where the classes physically are,
 * which one is next, and where the student stands against the attendance rule.
 *
 * The building list is rolled up from the published rooms, the countdown uses the
 * current clock, and the attendance figure comes from the student's own logged
 * sessions — nothing on this card is decorative copy.
 */

const buildSentence = (buildings: { building: string; meetings: number }[]): string => {
  if (!buildings.length) return 'No venue has been published for your classes yet.';
  const named = buildings.map((entry) => entry.building);
  if (named.length === 1) return `All of your published classes are held in ${named[0]}.`;
  const top = named.slice(0, 2).join(' and ');
  return `Your classes are concentrated in ${top}${named.length > 2 ? `, across ${named.length} venues` : ''}.`;
};

const countdown = (entries: ScheduleEntry[], now: Date): string => {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const next = entries.find((entry) => toMinutes(entry.end) > nowMinutes);
  if (!next) return entries.length ? 'All of today’s classes are done.' : 'No class is scheduled for today.';
  const start = toMinutes(next.start);
  if (start <= nowMinutes) return `In progress: ${next.code || next.title} until ${formatTime(next.end)}.`;
  const minutes = start - nowMinutes;
  const label = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
  return `Next class ${next.code || next.title} in ${label} (${next.room || 'room to be announced'}).`;
};

export const CampusPanel = ({
  entries,
  todayEntries,
  attendance,
}: {
  entries: ScheduleEntry[];
  todayEntries: ScheduleEntry[];
  attendance: AttendanceRecord[];
}) => {
  const buildings = buildingsOf(entries);
  const now = new Date();

  const sessions = attendance.length;
  const absences = attendance.filter((record) => record.status === 'Absent').length;
  const allowed = Math.floor(sessions * 0.2);
  const remaining = allowed - absences;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="card p-5">
        <div className="flex items-center gap-2">
          <span className="icon-chip h-8 w-8 bg-[#eaedff] text-[#00236f]">
            <MapPin className="h-4 w-4" />
          </span>
          <h2 className="card-title">Building Locations &amp; Class Nav</h2>
        </div>
        <p className="mt-2 text-[12px] font-medium text-slate-500">{buildSentence(buildings)}</p>

        <ul className="mt-3 space-y-2">
          {buildings.map((building) => (
            <li key={building.building} className="rounded-xl border border-line bg-[#fbfcfe] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-bold text-slate-800">{building.building}</p>
                <span className="chip border border-line bg-white text-slate-500">
                  {building.meetings} class{building.meetings === 1 ? '' : 'es'}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-400">{building.rooms.join(' • ')}</p>
            </li>
          ))}
          {!buildings.length && (
            <li className="text-[12px] font-medium text-slate-400">
              Rooms appear here once the registrar publishes them.
            </li>
          )}
        </ul>

        <p className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#eaedff] px-3 py-2 text-[12px] font-semibold text-[#00236f]">
          <Timer className="h-3.5 w-3.5" />
          {countdown(todayEntries, now)}
        </p>
      </section>

      <section className="card p-5">
        <div className="flex items-center gap-2">
          <span className="icon-chip h-8 w-8 bg-[#e8f7f4] text-[#0f766e]">
            <BookMarked className="h-4 w-4" />
          </span>
          <h2 className="card-title">Attendance Protocol</h2>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
          Institutional requirement dictates at least 80% attendance in lectures and laboratory sessions to qualify for
          final term evaluations.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-[#fbfcfe] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Permissible absences</p>
            <p className="mt-1 text-lg font-bold text-[#00236f]">
              {sessions ? `${Math.max(remaining, 0)} of ${allowed}` : '—'}
            </p>
            <p className="text-[11px] font-medium text-slate-400">
              {sessions
                ? `From the ${sessions} session${sessions === 1 ? '' : 's'} in your attendance log`
                : 'No attendance logged yet'}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-[#fbfcfe] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sessions logged</p>
            <p className="mt-1 text-lg font-bold text-[#00236f]">{sessions}</p>
            <p className="text-[11px] font-medium text-slate-400">
              {sessions ? `${absences} marked absent` : 'Your teacher’s records are the official count'}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[11px] font-medium text-slate-400">
          The full policy — including Add / Drop deadlines for the term — is in the CEC Student Handbook.
        </p>
      </section>
    </div>
  );
};
