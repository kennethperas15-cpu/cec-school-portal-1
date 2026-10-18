import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Clock,
  Plus,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { AttendanceSummary } from '../lib/metrics';

export type StatAction = 'schedule' | 'grade' | 'attendance' | 'course' | 'tasks';

/** The posted marks the faculty published — the dashboard reports these first. */
export type OfficialGrades = { average: number; letter: string; subjects: number };

type StatCardsProps = {
  courseCount: number;
  units: number;
  gpa: number | null;
  gpaDelta: number;
  rankLabel: string;
  attendance: AttendanceSummary;
  /** Posted by the instructors, when there are any: shown instead of the local log. */
  officialGrades?: OfficialGrades | null;
  officialAttendance?: AttendanceSummary | null;
  classesTodayCount: number;
  nextClassLabel: string;
  /** True when the student has any class on file (published or local). */
  hasLoad: boolean;
  taskCount: number;
  taskSummary: string;
  onAction: (action: StatAction) => void;
};

export const StatCards = ({
  courseCount,
  units,
  gpa,
  gpaDelta,
  rankLabel,
  attendance,
  officialGrades = null,
  officialAttendance = null,
  classesTodayCount,
  nextClassLabel,
  hasLoad,
  taskCount,
  taskSummary,
  onAction,
}: StatCardsProps) => {
  const attendanceFigures = officialAttendance?.total ? officialAttendance : attendance;
  const cards: {
    key: string;
    label: string;
    value: string;
    sub: ReactNode;
    icon: LucideIcon;
    action: StatAction;
  }[] = [
    {
      key: 'courses',
      label: 'Enrolled Courses',
      value: `${courseCount} Active`,
      sub: <span className="font-medium text-[#2563EB]">{units.toFixed(1)} Academic Units</span>,
      icon: BookOpen,
      action: 'course',
    },
    {
      key: 'gpa',
      label: officialGrades ? 'Posted Term Average' : 'Current Cumulative GPA',
      value:
        officialGrades
          ? `${officialGrades.average.toFixed(1)}% ${officialGrades.letter}`
          : `${gpa === null ? '--' : gpa.toFixed(2)} /4.00`,
      sub: officialGrades ? (
        <span className="font-medium text-[#2563EB]">
          {officialGrades.subjects} subject{officialGrades.subjects === 1 ? '' : 's'} with posted marks
        </span>
      ) : gpa === null ? (
        <span className="text-slate-400">No grade data recorded yet</span>
      ) : (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5" />
            {gpaDelta >= 0 ? '+' : ''}
            {gpaDelta.toFixed(2)}
          </span>
          {rankLabel && <span className="text-slate-400">•</span>}
          {rankLabel && <span className="font-medium text-slate-500">{rankLabel} Rank</span>}
        </span>
      ),
      icon: BarChart3,
      action: 'grade',
    },
    {
      key: 'attendance',
      label: officialAttendance?.total ? 'Posted Attendance Rate' : 'Attendance Rate',
      value: `${attendanceFigures.rate.toFixed(1)}%`,
      sub: attendanceFigures.total ? (
        <span className="font-medium text-slate-500">
          {attendanceFigures.present}/{attendanceFigures.total} sessions •{' '}
          {attendanceFigures.absent === 0 ? 'No unexcused absence' : `${attendanceFigures.absent} unexcused`}
        </span>
      ) : (
        <span className="text-slate-400">No sessions logged</span>
      ),
      icon: ShieldCheck,
      action: 'attendance',
    },
    {
      key: 'today',
      label: 'Classes Today',
      value: `${classesTodayCount} Lectures`,
      sub: (
        <span className="font-medium text-slate-500">
          {classesTodayCount ? nextClassLabel || 'On your timetable today' : hasLoad ? 'No classes today' : 'Schedule is empty'}
        </span>
      ),
      icon: Clock,
      action: 'schedule',
    },
    {
      key: 'tasks',
      label: 'Pending Tasks',
      value: `${taskCount} Tasks`,
      sub: (
        <span className="font-medium text-slate-500">
          {taskCount ? taskSummary : 'No active assignments'}
        </span>
      ),
      icon: ClipboardList,
      action: 'tasks',
    },
  ];

  return (
    <div className="animate-fade-in grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ key, label, value, sub, icon: Icon, action }) => (
        <div key={key} className="group rounded-xl border border-line bg-white p-4 transition hover:shadow-card">
          <div className="flex items-start justify-between gap-2">
            <p className="max-w-[68%] text-[10px] font-bold uppercase leading-tight tracking-wider text-slate-400">
              {label}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onAction(action)}
                className="rounded-md p-1 text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 focus:opacity-100 group-hover:opacity-100"
                aria-label={`Manage ${label}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                <Icon className="h-4 w-4" />
              </span>
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold leading-none tracking-tight text-slate-900">{value}</p>
          <div className="mt-2 text-xs">{sub}</div>
        </div>
      ))}
    </div>
  );
};
