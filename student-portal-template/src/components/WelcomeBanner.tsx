import { Award, BarChart3, BookOpen, CalendarDays, ClipboardCheck, GraduationCap } from 'lucide-react';
import type { Profile } from '../types';

export type BannerAction = 'schedule' | 'grade' | 'attendance' | 'course';

type WelcomeBannerProps = {
  profile: Profile;
  ay: string;
  /** True until the portal answers with the academic period. */
  periodLoading?: boolean;
  lecturesToday: number;
  /** Official standing from the registrar, empty until grades are posted. */
  standing: string;
  onOpenProfile: () => void;
  onAction: (action: BannerAction) => void;
};

const ACTIONS: { key: BannerAction; label: string; icon: typeof CalendarDays }[] = [
  { key: 'schedule', label: 'Class Schedule', icon: CalendarDays },
  { key: 'grade', label: 'View Grades', icon: BarChart3 },
  { key: 'attendance', label: 'Check Attendance', icon: ClipboardCheck },
  { key: 'course', label: 'Enrolled Courses', icon: BookOpen },
];

export const WelcomeBanner = ({ profile, ay, periodLoading = false, lecturesToday, standing, onOpenProfile, onAction }: WelcomeBannerProps) => {
  const identity = [profile.program, profile.year, profile.section && `Section ${profile.section}`]
    .filter(Boolean)
    .join(' • ');
  const firstName = (profile.name || 'Student').split(/\s+/)[0];
  const yearLabel = ay.split('•')[0]?.trim() || (periodLoading ? 'Loading period…' : 'Academic period');

  return (
    <section className="animate-fade-in relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B365D] to-[#1E3A8A] p-6 text-white shadow-navy sm:p-7">
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-white/[0.07] blur-2xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenProfile}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              {identity || 'Select Major • Year • Section'}
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white">
              <Award className="h-3.5 w-3.5" />
              {profile.honor || 'Honor Status (Pending)'} • {yearLabel}
            </span>
          </div>

          <h1 className="mt-5 font-serif text-[30px] font-semibold leading-tight sm:text-[34px]">
            Welcome back, {firstName}!
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100">
            {lecturesToday > 0 ? (
              <>
                You have <span className="font-semibold text-white">{lecturesToday} lectures</span> scheduled today.
              </>
            ) : (
              <>
                <span className="font-semibold text-white">No lectures are scheduled today</span> — enjoy the quiet.
              </>
            )}{' '}
            {standing ? (
              <>
                Your official standing is{' '}
                <span className="font-semibold text-white">{standing}</span>.
              </>
            ) : profile.program ? (
              <>Grades and standing appear here once your instructors post them.</>
            ) : (
              <>Finish your academic profile to unlock grades, attendance and standing.</>
            )}
          </p>
        </div>

        <div className="grid w-full shrink-0 grid-cols-2 gap-3 lg:w-[380px]">
          {ACTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onAction(key)}
              className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-left text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
