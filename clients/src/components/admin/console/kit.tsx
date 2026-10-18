import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import './console.css';

/**
 * The admin console's shared surface. Pages compose these so the twelve screens
 * stay visually identical, and so loading, empty and error states read the same
 * everywhere — an empty registrar table has to look deliberate, not broken.
 */

export type Tone = 'default' | 'ok' | 'warn' | 'danger' | 'muted';

export const ConsolePage = ({ children }: { children: ReactNode }) => <div className="admin-console">{children}</div>;

export const PageHeader = ({
  crumb,
  title,
  subtitle,
  actions,
}: {
  crumb?: string[];
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) => (
  <header className="ac-header">
    <div>
      {crumb?.length ? (
        <div className="ac-crumb">
          {crumb.map((part, index) => (
            <span key={part}>
              {part}
              {index < crumb.length - 1 ? <span aria-hidden="true"> / </span> : null}
            </span>
          ))}
        </div>
      ) : null}
      <h1 className="ac-title">{title}</h1>
      {subtitle ? <p className="ac-sub">{subtitle}</p> : null}
    </div>
    {actions ? <div className="ac-actions">{actions}</div> : null}
  </header>
);

export const Panel = ({
  title,
  subtitle,
  actions,
  children,
  flush = false,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) => (
  <section className="ac-panel">
    {title || actions ? (
      <div className="ac-panel-head">
        <div>
          {title ? <h2>{title}</h2> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="ac-actions">{actions}</div> : null}
      </div>
    ) : null}
    <div className={flush ? 'ac-panel-body ac-panel-body--flush' : 'ac-panel-body'}>{children}</div>
  </section>
);

export const Toolbar = ({ children }: { children: ReactNode }) => <div className="ac-toolbar">{children}</div>;

export const Kpi = ({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'default' | 'attention' | 'empty';
}) => (
  <article className={`ac-kpi${tone === 'attention' ? ' ac-kpi--attention' : ''}${tone === 'empty' ? ' ac-kpi--empty' : ''}`}>
    <span className="ac-kpi-label">{label}</span>
    <strong className="ac-kpi-value">{value}</strong>
    {hint ? <span className="ac-kpi-hint">{hint}</span> : null}
  </article>
);

export const Badge = ({ children, tone = 'default' }: { children: ReactNode; tone?: Tone }) => (
  <span className={`ac-badge${tone === 'default' ? '' : ` ac-badge--${tone}`}`}>{children}</span>
);

export const Notes = ({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'warn' | 'danger' }) => (
  <div className={`ac-note${tone === 'default' ? '' : ` ac-note--${tone}`}`}>
    <AlertTriangle aria-hidden="true" />
    <div>{children}</div>
  </div>
);

export const EmptyState = ({ title, message }: { title: string; message: string }) => (
  <div className="ac-empty">
    <Inbox aria-hidden="true" />
    <strong>{title}</strong>
    <p>{message}</p>
  </div>
);

export const ErrorNote = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="ac-error">
    <span>{message}</span>
    {onRetry ? (
      <button type="button" className="ac-btn ac-btn--ghost" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        Try again
      </button>
    ) : null}
  </div>
);

export const Loading = ({ label = 'Loading registry…' }: { label?: string }) => (
  <div className="ac-loading" role="status">
    <div className="ac-bar" aria-hidden="true">
      <span style={{ width: '38%' }} />
    </div>
    {label}
  </div>
);

export const Table = ({ head, children }: { head: string[]; children: ReactNode }) => (
  <div className="ac-table-wrap">
    <table className="ac-table">
      <thead>
        <tr>
          {head.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export const Identity = ({ name, secondary }: { name: string; secondary?: string }) => (
  <div className="ac-identity">
    <span className="ac-avatar" aria-hidden="true">
      {name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || '·'}
    </span>
    <span className="ac-cell-stack">
      <span className="ac-strong">{name}</span>
      {secondary ? <span className="ac-muted">{secondary}</span> : null}
    </span>
  </div>
);
