import { Bell, Calendar, ChevronDown, Menu, Search } from 'lucide-react';
import { AY_OPTIONS } from '../data/sample';
import type { Profile } from '../types';

type TopbarProps = {
  profile: Profile;
  ay: string;
  onAyChange: (value: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  notificationCount: number;
  onOpenMobile: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
};

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'ST';

export const Topbar = ({
  profile,
  ay,
  onAyChange,
  query,
  onQueryChange,
  notificationCount,
  onOpenMobile,
  onOpenProfile,
  onOpenNotifications,
}: TopbarProps) => (
  <header className="sticky top-0 z-30 border-b border-line bg-white">
    <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
      <button type="button" className="btn-soft px-2.5 py-2 lg:hidden" onClick={onOpenMobile} aria-label="Open navigation">
        <Menu className="h-4 w-4" />
      </button>

      <label className="relative hidden w-full max-w-md items-center sm:flex">
        <Search className="pointer-events-none absolute left-4 h-4 w-4 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full rounded-full border border-transparent bg-[#F1F5F9] py-2.5 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-soft focus:bg-white focus:ring-4 focus:ring-brand/10"
          placeholder="Search courses, instructors, grades..."
          aria-label="Search courses, instructors, grades"
        />
      </label>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="btn-soft px-2.5 py-2 sm:hidden"
          onClick={onOpenNotifications}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        <label className="relative hidden lg:block">
          <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={ay}
            onChange={(e) => onAyChange(e.target.value)}
            aria-label="Academic year and semester"
            className="appearance-none rounded-full border border-line bg-white py-2.5 pl-10 pr-9 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-brand-soft focus:ring-4 focus:ring-brand/10"
          >
            {AY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </label>

        <button
          type="button"
          className="relative rounded-full border border-line bg-white p-2.5 text-slate-500 transition hover:text-slate-800"
          onClick={onOpenNotifications}
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {notificationCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {notificationCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 text-left transition hover:bg-slate-100"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1B365D] text-sm font-bold text-white">
            {initials(profile.name)}
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block max-w-[150px] truncate text-sm font-semibold text-slate-800">
              {profile.name || 'Student Name'}
            </span>
            <span className="block max-w-[170px] truncate text-[11px] text-slate-400">
              {profile.program ? `${profile.program} • ${profile.year}` : 'Select Program • Year'}
            </span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
        </button>
      </div>
    </div>
  </header>
);
