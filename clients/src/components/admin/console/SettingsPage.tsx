import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, Download, Lock, RefreshCw, Settings as SettingsIcon } from 'lucide-react';
import api, { describeApiError } from '../../../services/api';
import { adminApi, formatStamp, type AdminConfigEntry, type AdminOverview } from '../../../services/admin';
import { useAcademicConfig } from '../../../services/academicConfig';
import { Badge, ConsolePage, EmptyState, ErrorNote, Kpi, Loading, Notes, PageHeader, Panel, Table, Toolbar } from './kit';
import { downloadCsv, matches } from './registry';

type Snapshot = { overview: AdminOverview | null; config: AdminConfigEntry[] | null; database: boolean | null; error: string | null };

/**
 * Institutional configuration and the live system state.
 *
 * The values are read from `system_config` — the same rows the portal reads for
 * the active school year and semester — so what is on screen is the configuration
 * in force, not a form that pretends to save one. Writing configuration is not
 * wired yet; the note at the foot of the screen says so rather than offering a
 * save button that quietly does nothing.
 */
export const SettingsPage = ({ onNotify }: { onNotify: (message: string) => void }) => {
  const academic = useAcademicConfig();
  const [snapshot, setSnapshot] = useState<Snapshot>({ overview: null, config: null, database: null, error: null });
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('');
  const [editing, setEditing] = useState<{ key: string; value: string; isPublic: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [config, overview, health] = await Promise.allSettled([adminApi.config(), adminApi.overview(), api.get('/portal/health')]);
    setSnapshot({
      config: config.status === 'fulfilled' ? config.value : null,
      overview: overview.status === 'fulfilled' ? overview.value.data : null,
      database: health.status === 'fulfilled' ? Boolean(health.value.data?.success) : false,
      error: config.status === 'fulfilled' ? null : describeApiError(config.reason, 'Reading the stored configuration'),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => (snapshot.config ?? []).filter((entry) => matches(term, entry.config_key, entry.config_value)), [snapshot.config, term]);
  const publicCount = (snapshot.config ?? []).filter((entry) => entry.is_public).length;
  const internalCount = (snapshot.config ?? []).filter((entry) => !entry.is_public).length;
  const lastUpdated = (snapshot.config ?? []).map((entry) => entry.updated_at).filter(Boolean).sort().pop() ?? null;

  const exportCsv = () => {
    downloadCsv(
      `cec-system-configuration-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Key', 'Value', 'Visibility', 'Updated'],
      shown.map((entry) => [entry.config_key, entry.config_value, entry.is_public ? 'public' : 'internal', entry.updated_at]),
    );
    onNotify(`Exported ${shown.length} configuration entr${shown.length === 1 ? 'y' : 'ies'}`);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.value.trim()) {
      onNotify('A configuration value is required');
      return;
    }
    setSaving(true);
    try {
      const result = await adminApi.updateConfig(editing.key, { value: editing.value.trim(), isPublic: editing.isPublic });
      onNotify(result?.message ?? `${editing.key} updated`);
      setEditing(null);
      await load();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Saving the configuration'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConsolePage>
      <PageHeader
        crumb={['Registrar console', 'Configuration']}
        title="Institutional System Settings"
        subtitle="The term parameters and stored configuration the whole portal reads — the same rows that decide the active school year, semester and published defaults."
        actions={
          <>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={exportCsv} disabled={!shown.length}>
              <Download aria-hidden="true" />
              Export configuration
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => void load()} disabled={loading}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </button>
          </>
        }
      />

      {snapshot.error ? <ErrorNote message={snapshot.error} onRetry={() => void load()} /> : null}

      <div className="ac-kpis">
        <Kpi label="Configuration entries" value={snapshot.config === null ? '—' : snapshot.config.length.toLocaleString()} hint="stored keys" tone={snapshot.config && snapshot.config.length === 0 ? 'empty' : 'default'} />
        <Kpi label="Public entries" value={snapshot.config === null ? '—' : publicCount.toLocaleString()} hint="readable by every portal" tone="default" />
        <Kpi label="Internal entries" value={snapshot.config === null ? '—' : internalCount.toLocaleString()} hint="administrative only" tone="default" />
        <Kpi label="Last updated" value={<span style={{ fontSize: 16 }}>{formatStamp(lastUpdated)}</span>} hint="most recent change to a key" tone="default" />
      </div>

      <div className="ac-grid-2">
        <Panel title="System state" subtitle="What the portal is running right now.">
          <dl className="ac-dl">
            <dt>Active school year</dt>
            <dd>{academic.schoolYear}</dd>
            <dt>Active semester</dt>
            <dd>{academic.semester}</dd>
            <dt>Database</dt>
            <dd>
              <Badge tone={snapshot.database === null ? 'muted' : snapshot.database ? 'ok' : 'danger'}>
                <Database aria-hidden="true" style={{ width: 12, height: 12 }} />
                {snapshot.database === null ? 'checking' : snapshot.database ? 'reachable' : 'unreachable'}
              </Badge>
            </dd>
            <dt>Students on record</dt>
            <dd>{snapshot.overview ? snapshot.overview.students.toLocaleString() : '—'}</dd>
            <dt>Accounts provisioned</dt>
            <dd>{snapshot.overview ? snapshot.overview.accounts.toLocaleString() : '—'}</dd>
            <dt>Published timetables</dt>
            <dd>{snapshot.overview ? snapshot.overview.publishedTimetables.toLocaleString() : '—'}</dd>
            <dt>Posted grade records</dt>
            <dd>{snapshot.overview ? snapshot.overview.postedGrades.toLocaleString() : '—'}</dd>
            <dt>Audit events</dt>
            <dd>{snapshot.overview ? snapshot.overview.auditEvents.toLocaleString() : '—'}</dd>
          </dl>
        </Panel>

        <Panel title="Term parameters" subtitle="Values that drive every date and term label in the portals.">
          {(snapshot.config ?? []).filter((entry) => /school_year|semester|term|year/i.test(entry.config_key)).length === 0 ? (
            <EmptyState title="No term parameters stored" message="The portal is running on its built-in defaults for the school year and semester." />
          ) : (
            <dl className="ac-dl">
              {(snapshot.config ?? [])
                .filter((entry) => /school_year|semester|term|year/i.test(entry.config_key))
                .map((entry) => (
                  <span key={entry.config_key} style={{ display: 'contents' }}>
                    <dt className="ac-mono">{entry.config_key}</dt>
                    <dd>{entry.config_value ?? '—'}</dd>
                  </span>
                ))}
            </dl>
          )}
        </Panel>
      </div>

      <Panel
        title="Stored configuration"
        subtitle={`Showing ${shown.length} of ${snapshot.config?.length ?? 0} entries.`}
        flush
      >
        <Toolbar>
          <label className="ac-field ac-search">
            <span className="ac-muted">Search</span>
            <input
              className="ac-input"
              placeholder="Key or value"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              aria-label="Search configuration"
            />
          </label>
          <div className="ac-actions" style={{ marginLeft: 'auto' }}>
            <span className="ac-muted">Changes are stored centrally and written to the audit trail.</span>
          </div>
        </Toolbar>

        {loading && snapshot.config === null ? (
          <Loading label="Reading the stored configuration…" />
        ) : snapshot.config === null ? (
          <EmptyState title="Configuration unreadable" message="The stored configuration could not be read just now. Try again — nothing has been changed." />
        ) : shown.length === 0 ? (
          <EmptyState
            title={snapshot.config.length === 0 ? 'No configuration stored' : 'No entries match that search'}
            message={
              snapshot.config.length === 0
                ? 'The configuration table is empty, so the portal is running entirely on its built-in defaults.'
                : 'Clear the search to see every stored key.'
            }
          />
        ) : (
          <Table head={['Key', 'Value', 'Visibility', 'Last updated', 'Action']}>
            {shown.map((entry) => (
              <tr key={entry.config_key}>
                <td className="ac-mono ac-strong">{entry.config_key}</td>
                <td>
                  {editing?.key === entry.config_key ? (
                    <input
                      className="ac-input"
                      value={editing.value}
                      onChange={(event) => setEditing({ ...editing, value: event.target.value })}
                      aria-label={`New value for ${entry.config_key}`}
                    />
                  ) : (
                    (entry.config_value ?? '—')
                  )}
                </td>
                <td>
                  {editing?.key === entry.config_key ? (
                    <label className="ac-field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={editing.isPublic}
                        onChange={(event) => setEditing({ ...editing, isPublic: event.target.checked })}
                        aria-label={`Public for ${entry.config_key}`}
                      />
                      <span>Public</span>
                    </label>
                  ) : (
                    <Badge tone={entry.is_public ? 'ok' : 'muted'}>{entry.is_public ? 'Public' : 'Internal'}</Badge>
                  )}
                </td>
                <td className="ac-muted">{formatStamp(entry.updated_at)}</td>
                <td>
                  <div className="ac-actions">
                    {editing?.key === entry.config_key ? (
                      <>
                        <button type="button" className="ac-btn" onClick={() => void save()} disabled={saving}>
                          {saving ? 'Saving…' : 'Save value'}
                        </button>
                        <button type="button" className="ac-btn ac-btn--ghost" onClick={() => setEditing(null)} disabled={saving}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="ac-btn ac-btn--ghost"
                        onClick={() => setEditing({ key: entry.config_key, value: entry.config_value ?? '', isPublic: Boolean(entry.is_public) })}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Notes>
        <strong>What these keys drive.</strong> The active school year and semester in every portal header come from here, so a change
        here is a change the whole school sees on its next page load. Each edit is written to the audit trail with its previous value.
      </Notes>

      <Notes>
        <SettingsIcon aria-hidden="true" />
        <span>
          Grading weights, attendance thresholds and security policy from the design are not modelled in the database, so they are not
          shown here. The portal keeps its own documented grading bands and the 80% attendance rule instead of inventing stored values.
        </span>
      </Notes>
    </ConsolePage>
  );
};
