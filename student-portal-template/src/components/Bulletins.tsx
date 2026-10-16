import { Megaphone } from 'lucide-react';
import type { Bulletin, BulletinCategory } from '../types';

type BulletinsProps = {
  bulletins: Bulletin[];
  onOpenAll: () => void;
};

const CATEGORY_STYLES: Record<BulletinCategory, string> = {
  'Academic Affairs': 'bg-[#DBEAFE] text-[#2563EB]',
  Department: 'bg-[#EDE9FE] text-[#7C3AED]',
  Facilities: 'bg-[#DCFCE7] text-[#059669]',
  Finance: 'bg-[#FEF3C7] text-[#B45309]',
  System: 'bg-slate-100 text-slate-600',
};

export const Bulletins = ({ bulletins, onOpenAll }: BulletinsProps) => (
  <section className="card p-6">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="icon-chip h-9 w-9 bg-[#EFF6FF] text-[#2563EB]">
          <Megaphone className="h-[18px] w-[18px]" />
        </span>
        <h2 className="card-title">University Bulletins</h2>
      </div>
      <button
        type="button"
        onClick={onOpenAll}
        className="shrink-0 text-xs font-semibold text-[#2563EB] transition hover:underline"
      >
        All Notices
      </button>
    </div>

    <ul className="mt-4 space-y-3">
      {bulletins.length === 0 && (
        <li className="rounded-xl bg-[#F4F7FB] px-4 py-6 text-center text-sm text-slate-500">
          No bulletins published right now.
        </li>
      )}
      {bulletins.map((bulletin) => (
        <li key={bulletin.id} className="rounded-xl bg-[#F4F7FB] p-4 transition hover:bg-[#EDF2F9]">
          <div className="flex items-center justify-between gap-2">
            <span className={`chip ${CATEGORY_STYLES[bulletin.category]}`}>{bulletin.category}</span>
            <span className="shrink-0 text-[11px] font-medium text-slate-400">{bulletin.relative}</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-[#1B365D]">{bulletin.title}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{bulletin.body}</p>
        </li>
      ))}
    </ul>
  </section>
);
