import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import api, { describeApiError } from '../../../services/api';
import { adminApi, formatStamp, fullName, type AdminAccount } from '../../../services/admin';
import { Badge, ConsolePage, EmptyState, ErrorNote, Kpi, Loading, Notes, PageHeader, Panel, Table, Toolbar } from './kit';
import { downloadCsv, matches, unique } from './registry';

type AuditRow = {
  id: number;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

const PERIODS: { label: string; hours: number | null }[] = [
  { label: 'All recorded events', hours: null },
  { label: 'Last 24 hours', hours: 24 },
  { label: 'Last 7 days', hours: 24 * 7 },
  { label: 'Last 30 days', hours: 24 * 30 },
];

/**
 * `Portal item updated` on `PortalItem` means little on its own; the diff the
 * server stored alongside it is what a registrar actually has to read.
 */
const describeChange = (metadata: Record<string, unknown> | null): string => {
  if (!metadata) return '—';
  const next = metadata.newValue as Record<string, unknown> | string | null | undefined;
  const previous = metadata.previousValue as Record<string, unknown> | string | null | undefined;
  const text = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const keys = ['title', 'status', 'section', 'semester', 'schoolYear'].filter((key) => record[key] !== undefined);
      if (keys.length) return keys.map((key) => `${key}: ${String(record[key])}`).join(' • ');
      const detail = typeof record.detail === 'string' ? record.detail : '';
      if (detail) {
        try {
          const parsed = JSON.parse(detail) as { section?: string; schoolYear?: string; entries?: unknown[] };
          return [parsed.section, parsed.schoolYear, parsed.entries ? `${parsed.entries.length} entries` : null].filter(Boolean).join(' • ') || `${Object.keys(record).length} fields`;
        } catch {
          return `${detail.slice(0, 60)}…`;
        }
      }
      return `${Object.keys(record).length} fields`;
    }
    return String(value).slice(0, 90);
  };
  const short = (value: string) => value.replace(/\s+/g, ' ').trim();

  const actors = [previous, next].filter((value) => value !== undefined && value !== null && value !== '');
  if (actors.length === 2) return short(`${text(previous)}  →  ${text(next)}`);
  const role = typeof metadata.role === 'string' ? `by ${metadata.role} role` : '';
  const target = text(next ?? previous);
  return short([target === '—' ? '' : target, role].filter(Boolean).join(' • ')) || 'No field detail recorded';
};

/** `::ffff:127.0.0.1` is how an IPv4 client arrives on a dual-stack socket. */
const origin = (value: string | null): string => (value ? value.replace(/^::ffff:/, '') : '—');

const device = (metadata: Record<string, unknown> | null): string => {
  const agent = metadata && typeof metadata.userAgent === 'string' ? metadata.userAgent : '';
  if (!agent) return '—';
  const browser = /HeadlessChrome/.test(agent) ? 'Headless Chrome' : /Chrome\//.test(agent) ? 'Chrome' : /Firefox\//.test(agent) ? 'Firefox' : /Safari\//.test(agent) ? 'Safari' : 'Client';
  const platform = /Windows/.test(agent) ? 'Windows' : /Mac OS X/.test(agent) ? 'macOS' : /Android/.test(agent) ? 'Android' : /Linux/.test(agent) ? 'Linux' : 'node';
  return `${browser} · ${platform}`;
};

/**
 * The audit trail, read straight from `audit_logs`. The design shows a
 * cryptographic hash and a "verified" stamp per row; this portal does not hash
 * its audit rows, so those two columns are absent rather than faked.
 */
export const ActivityLogsPage = ({ onNotify }: { onNotify: (message: string) => void }) => {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [period, setPeriod] = useState(PERIODS[0].label);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [log, directory] = await Promise.allSettled([api.get('/audit-logs', { params: { limit: 500 } }), adminApi.accounts({ limit: 1000 })]);
    if (log.status === 'fulfilled') {
      setRows((log.value.data?.data ?? []) as AuditRow[]);
    } else {
      setRows(null);
      setError(describeApiError(log.reason, 'Reading the audit trail'));
    }
    setAccounts(directory.status === 'fulfilled' ? directory.value : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const actors = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const actionNames = useMemo(() => unique((rows ?? []).map((row) => row.action)), [rows]);
  const entityNames = useMemo(() => unique((rows ?? []).map((row) => row.entity_type)), [rows]);

  const shown = useMemo(() => {
    const hours = PERIODS.find((entry) => entry.label === period)?.hours ?? null;
    const cutoff = hours ? Date.now() - hours * 3600 * 1000 : null;
    return (rows ?? []).filter((row) => {
      const account = row.user_id ? actors.get(row.user_id) : undefined;
      const actor = account ? `${fullName(account)} ${account.email}` : row.user_id ?? '';
      return (
        matches(term, row.action, row.entity_type, row.entity_id, row.ip_address, actor, describeChange(row.metadata)) &&
        (action ? row.action === action : true) &&
        (entity ? row.entity_type === entity : true) &&
        (cutoff ? new Date(row.created_at).getTime() >= cutoff : true)
      );
    });
  }, [rows, actors, term, action, entity, period]);

  const exportCsv = () => {
    downloadCsv(
      `cec-activity-log-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Timestamp', 'Actor', 'Role', 'Action', 'Target type', 'Target id', 'Change', 'IP address', 'Client'],
      shown.map((row) => {
        const account = row.user_id ? actors.get(row.user_id) : undefined;
        return [
          row.created_at,
          account ? fullName(account) : row.user_id,
          (row.metadata?.role as string) ?? account?.role_name ?? '',
          row.action,
          row.entity_type,
          row.entity_id,
          describeChange(row.metadata),
          origin(row.ip_address),
          device(row.metadata),
        ];
      }),
    );
    onNotify(`Exported ${shown.length} audit event${shown.length === 1 ? '' : 's'}`);
  };

  return (
    <ConsolePage>
      <PageHeader
        crumb={['Registrar console', 'Security & compliance']}
        title="Activity Logs"
        subtitle="Every administrative action the portal recorded: who acted, on which record, from where, and when. Written by the server at the moment of the change."
        actions={
          <>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={exportCsv} disabled={!shown.length}>
              <Download aria-hidden="true" />
              Export log
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => void load()} disabled={loading}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </button>
          </>
        }
      />

      {error ? <ErrorNote message={error} onRetry={() => void load()} /> : null}

      <div className="ac-kpis">
        <Kpi label="Events recorded" value={rows === null ? '—' : rows.length.toLocaleString()} hint="newest 500 kept in view" tone={rows && rows.length === 0 ? 'empty' : 'default'} />
        <Kpi label="Distinct actions" value={rows === null ? '—' : actionNames.length.toLocaleString()} hint="kinds of change logged" tone="default" />
        <Kpi label="Acting accounts" value={rows === null ? '—' : unique((rows ?? []).map((row) => row.user_id)).length.toLocaleString()} hint="identities behind the events" tone="default" />
        <Kpi label="Record types touched" value={rows === null ? '—' : entityNames.length.toLocaleString()} hint="entity kinds affected" tone="default" />
      </div>

      <Panel title="Audit trail" subtitle={`Showing ${shown.length} of ${rows?.length ?? 0} events.`} flush>
        <Toolbar>
          <label className="ac-field ac-search">
            <span className="ac-muted">
              <Search aria-hidden="true" style={{ width: 12, height: 12, verticalAlign: '-1px' }} /> Search
            </span>
            <input
              className="ac-input"
              placeholder="Administrator, action, record id or IP address"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              aria-label="Search audit events"
            />
          </label>
          <label className="ac-field">
            <span>Action</span>
            <select className="ac-select" value={action} onChange={(event) => setAction(event.target.value)} aria-label="Filter by action">
              <option value="">All actions</option>
              {actionNames.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="ac-field">
            <span>Target</span>
            <select className="ac-select" value={entity} onChange={(event) => setEntity(event.target.value)} aria-label="Filter by target type">
              <option value="">All record types</option>
              {entityNames.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="ac-field">
            <span>Period</span>
            <select className="ac-select" value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Filter by period">
              {PERIODS.map((option) => (
                <option key={option.label} value={option.label}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </Toolbar>

        {loading && !rows ? (
          <Loading label="Reading the audit trail…" />
        ) : !rows ? (
          <EmptyState title="Trail unreadable" message="The audit trail could not be read just now. Try again — the record itself is untouched." />
        ) : shown.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? 'Nothing has been recorded yet' : 'No events match these filters'}
            message={
              rows.length === 0
                ? 'The trail fills the moment an administrator, registrar or faculty member acts in the portal.'
                : 'Adjust the search, action or period to widen the result set.'
            }
          />
        ) : (
          <Table head={['Timestamp', 'Acting user', 'Action', 'Target record', 'Change recorded', 'Origin', '']}>
            {shown.map((row) => {
              const account = row.user_id ? actors.get(row.user_id) : undefined;
              const role = (row.metadata?.role as string) ?? account?.role_name ?? null;
              return (
                <tr key={row.id}>
                  <td className="ac-muted">{formatStamp(row.created_at)}</td>
                  <td>
                    <span className="ac-cell-stack">
                      <span className="ac-strong">{account ? fullName(account) : row.user_id ? 'Unknown account' : 'System'}</span>
                      <span className="ac-muted">
                        {role ? `${role} • ` : ''}
                        {account?.email ?? row.user_id?.slice(0, 8) ?? 'server'}
                      </span>
                    </span>
                  </td>
                  <td>
                    <Badge tone={/delete|reject|remove/i.test(row.action) ? 'danger' : /create|publish|approve|post/i.test(row.action) ? 'ok' : 'muted'}>
                      {row.action}
                    </Badge>
                  </td>
                  <td>
                    <span className="ac-cell-stack">
                      <span>{row.entity_type ?? '—'}</span>
                      <span className="ac-mono">{row.entity_id ? row.entity_id.slice(0, 18) : '—'}</span>
                    </span>
                  </td>
                  <td>{describeChange(row.metadata)}</td>
                  <td className="ac-muted">
                    {origin(row.ip_address)}
                    <div>{device(row.metadata)}</div>
                  </td>
                  <td>
                    <span className="ac-mono">#{row.id}</span>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Panel>

      <Notes>
        <strong>On the design's hash column.</strong> The design shows a Merkle SHA-256 digest and a verification stamp per event. These rows
        are not hashed or chained by this portal, so the column is absent — an attestation that does not exist would be worse than a gap.
        Each row is written once by the server and carries the actor, the target and the before/after values shown above.
      </Notes>
    </ConsolePage>
  );
};
