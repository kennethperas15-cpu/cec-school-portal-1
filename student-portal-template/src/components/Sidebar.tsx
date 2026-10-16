import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Medal,
  Settings,
  X,
  type LucideIcon,
} from 'lucide-react';

export type NavKey = 'dashboard' | 'schedule' | 'courses' | 'grades' | 'attendance' | 'settings' | 'logout';

type NavItem = { key: NavKey; label: string; icon: LucideIcon; anchor?: string };

const ACADEMIC: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, anchor: 'top' },
  { key: 'schedule', label: 'Class Schedule', icon: CalendarDays, anchor: 'schedule' },
  { key: 'courses', label: 'Enrolled Courses', icon: BookOpen, anchor: 'courses' },
  { key: 'grades', label: 'Grades', icon: Medal, anchor: 'benchmark' },
  { key: 'attendance', label: 'Attendance', icon: CalendarCheck, anchor: 'attendance' },
];

const SYSTEM: NavItem[] = [
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'logout', label: 'Logout', icon: LogOut },
];

type SidebarProps = {
  active: NavKey;
  onNavigate: (item: NavItem) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

const NavButton = ({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) => {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
        active
          ? 'bg-[#1B365D] font-semibold text-white shadow-soft'
          : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className={`h-[18px] w-[18px] ${active ? 'text-white' : 'text-slate-400'}`} />
      {item.label}
    </button>
  );
};

export const Sidebar = ({ active, onNavigate, mobileOpen, onCloseMobile }: SidebarProps) => (
  <>
    {mobileOpen && (
      <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={onCloseMobile} aria-hidden="true" />
    )}
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-line bg-white transition-transform duration-300 lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1B365D] text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-[15px] font-bold text-slate-900">Student Portal</p>
            <p className="text-[11px] font-medium text-slate-400">University SIS</p>
          </div>
        </div>
        <button type="button" className="btn-ghost lg:hidden" onClick={onCloseMobile} aria-label="Close navigation">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-5">
        <span className="inline-flex items-center gap-2 rounded-lg bg-[#EEF2F7] px-3 py-1.5 text-[11px] font-semibold text-slate-700">
          <span className="h-2 w-2 rounded-full bg-[#1B365D]" />
          Active Student • AY 2025–2026
        </span>
      </div>

      <nav className="mt-6 flex flex-1 flex-col overflow-y-auto px-3">
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Academic Menu
        </p>
        <div className="space-y-1">
          {ACADEMIC.map((item) => (
            <NavButton key={item.key} item={item} active={active === item.key} onClick={() => onNavigate(item)} />
          ))}
        </div>

        <div className="mt-auto pb-6 pt-8">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">System</p>
          <div className="space-y-1">
            {SYSTEM.map((item) => (
              <NavButton key={item.key} item={item} active={active === item.key} onClick={() => onNavigate(item)} />
            ))}
          </div>
        </div>
      </nav>
    </aside>
  </>
);
