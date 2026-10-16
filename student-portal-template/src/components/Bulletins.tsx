import { Megaphone, RefreshCw } from 'lucide-react';
import type { Bulletin } from '../types';

type BulletinsProps = {
  bulletins: Bulletin[];
  loading?: boolean;
  onOpenAll: () => void;
  onRefresh?: () => void;
};

/** Categories come from the live announcements table, so unknown keys fall back gracefully. */
const CATEGORY_STYLES: Record<string, string> = {
  General: 'bg-[#DBEAFE] text-[#2563EB]',
  Urgent: 'bg-[#FEE2E2] text-[#DC2626]',
  Events: 'bg-[#EDE9FE] text-[#7C3AED]',
};

const categoryClass = (category: string) => CATEGORY_STYLES[category] ?? 'bg-slate-100 text-slate-600';

export const Bulletins = ({ bulletins, loading, onOpenAll, onRefresh }: BulletinsProps) => (
  <section className="card p-6">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="icon-chip h-9 w-9 bg-[#EFF6FF] text-[#2563EB]">
          <Megaphone className="h-[18px] w-[18px]" />
        </span>
        <h2 className="card-title">University Bulletins</h2>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="text-slate-400 transition hover:text-slate-700"
            aria-label="Reload bulletins"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
        <button
          type="button"
          onClick={onOpenAll}
          className="text-xs font-semibold text-[#2563EB] transition hover:underline"
        >
          All Notices
        </button>
      </div>
    </div>

    <ul className="mt-4 space-y-3">
      {bulletins.length === 0 && (
        <li className="rounded-xl bg-[#F4F7FB] px-4 py-6 text-center text-sm text-slate-500">
          {loading ? 'Loading notices from the CEC portal…' : 'No bulletins published right now.'}
        </li>
      )}
      {bulletins.map((bulletin) => (
        <li key={bulletin.id} className="rounded-xl bg-[#F4F7FB] p-4 transition hover:bg-[#EDF2F9]">
          <div className="flex items-center justify-between gap-2">
            <span className={`chip ${categoryClass(bulletin.category)}`}>{bulletin.category}</span>
            <span className="shrink-0 text-[11px] font-medium text-slate-400">{bulletin.relative}</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-[#1B365D]">{bulletin.title}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{bulletin.body}</p>
          {bulletin.author && (
            <p className="mt-2 text-[11px] font-medium text-slate-400">Posted by {bulletin.author}</p>
          )}
        </li>
      ))}
    </ul>
  </section>
);
