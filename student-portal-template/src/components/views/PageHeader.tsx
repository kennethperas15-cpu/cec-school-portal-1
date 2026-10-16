import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export const PageHeader = ({ icon: Icon, title, subtitle, action }: PageHeaderProps) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-2.5">
      <span className="icon-chip h-10 w-10 bg-[#EFF6FF] text-[#2563EB]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h1 className="card-title">{title}</h1>
        {subtitle && <p className="card-sub">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);
