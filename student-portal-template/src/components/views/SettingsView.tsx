import { BadgeCheck, LogOut, Radio, Settings, ShieldAlert, Trash2, UserCog } from 'lucide-react';
import { CEC_API_URL, CEC_WEBSITE_URL } from '../../lib/api';
import { useStore } from '../../store';
import { PageHeader } from './PageHeader';

export const SettingsView = ({ onEditProfile }: { onEditProfile: () => void }) => {
  const {
    profile,
    user,
    period,
    courses,
    grades,
    attendance,
    tasks,
    signOut,
    resetAll,
  } = useStore();

  const initials =
    (user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}` : profile.name.trim().slice(0, 2)).toUpperCase() || 'ST';

  const identity = [
    ['Program', profile.program],
    ['Year level', profile.year],
    ['Section', profile.section],
    ['Major', profile.major],
    ['Honor standing', profile.honor],
  ] as const;

  return (
    <div className="space-y-5">
      <PageHeader icon={Settings} title="Settings" subtitle="Your account, academic identity and local data" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="card-title">CEC account</h2>
          <p className="card-sub">Issued by the registrar — managed in the CEC system, not here</p>

          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1B365D] text-base font-bold text-white">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{profile.name || 'Not provided'}</p>
              <p className="truncate text-xs text-slate-500">{profile.email || '—'}</p>
            </div>
          </div>

          <dl className="mt-5 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-2.5">
              <dt className="text-slate-500">School ID</dt>
              <dd className="font-semibold text-slate-800">{user?.schoolId ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-line pb-2.5">
              <dt className="text-slate-500">Portal role</dt>
              <dd className="font-semibold capitalize text-slate-800">{user?.role ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Academic period</dt>
              <dd className="font-semibold text-slate-800">
                {period ? `AY ${period.schoolYear} • ${period.semester}` : 'Unavailable'}
              </dd>
            </div>
          </dl>

          <button type="button" className="btn-soft mt-5 w-full" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </section>

        <section className="card p-6">
          <h2 className="card-title">Academic identity</h2>
          <p className="card-sub">Shown on your header, welcome banner and printed records</p>

          <dl className="mt-4 space-y-2.5 text-sm">
            {identity.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 border-b border-line pb-2.5 last:border-0 last:pb-0">
                <dt className="text-slate-500">{label}</dt>
                <dd className="truncate font-semibold text-slate-800">{value || '—'}</dd>
              </div>
            ))}
          </dl>

          <button type="button" className="btn-primary mt-5 w-full" onClick={onEditProfile}>
            <UserCog className="h-4 w-4" /> Edit academic profile
          </button>
        </section>

        <section className="card p-6">
          <h2 className="card-title">System connection</h2>
          <p className="card-sub">Where this portal reads live data from</p>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-xl bg-[#F4F7FB] p-3.5">
              <Radio className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">CEC Portal API</p>
                <p className="truncate text-xs text-slate-500">{CEC_API_URL || 'same origin (local proxy)'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-[#F4F7FB] p-3.5">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">Signed in with a school account</p>
                <p className="text-xs text-slate-500">
                  Authentication, notices and the academic calendar are served by the live CEC system.
                </p>
              </div>
            </div>
            <a
              href={CEC_WEBSITE_URL}
              className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-3 font-semibold text-[#2563EB] transition hover:bg-slate-50"
            >
              Open the CEC website
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        <section className="card border-rose-100 p-6">
          <h2 className="card-title flex items-center gap-2 text-rose-700">
            <ShieldAlert className="h-4 w-4" /> Local records
          </h2>
          <p className="card-sub">
            Courses, timetable, grades, attendance and tasks you entered in this browser
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ['Courses', courses.length],
              ['Grades', grades.length],
              ['Sessions', attendance.length],
              ['Tasks', tasks.length],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-[#F4F7FB] p-3 text-center">
                <p className="text-lg font-bold leading-none text-slate-900">{value}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn mt-5 w-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            onClick={resetAll}
          >
            <Trash2 className="h-4 w-4" /> Clear all local records
          </button>
        </section>
      </div>
    </div>
  );
};
