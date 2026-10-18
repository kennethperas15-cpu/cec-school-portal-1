import { useCallback, useMemo, useState } from 'react';
import { Download, KeyRound, RefreshCw, Search, ShieldCheck, Undo2, UserCog, UserPlus } from 'lucide-react';
import { describeApiError } from '../../../services/api';
import { adminApi, formatStamp, fullName, type AdminAccount } from '../../../services/admin';
import { ChangePassword } from '../../shared/ChangePassword';
import { Badge, ConsolePage, EmptyState, ErrorNote, Kpi, Loading, Notes, PageHeader, Panel, Table, Toolbar } from './kit';
import { downloadCsv, humanise, matches, unique, useRegistry } from './registry';

type Props = { onNotify: (message: string) => void; onNavigate: (label: string) => void; identifier: string };

/** `Role name` from the roles table, with the fallback the console shows. */
const roleOf = (account: AdminAccount): string => account.role_name ?? 'unassigned';

/**
 * Every sign-in account, with the role it carries and the number that identifies
 * it. This is the same `users` table the sign-in route checks against — including
 * accounts that never enrolled anywhere, which is why it is a separate screen
 * from the student registry.
 *
 * Teacher and administrator accounts are provisioned here (the staff route hashes
 * a temporary password); student accounts are issued from Student Management,
 * where the school number is reserved. Any account can be switched off, and an
 * administrator can change their own password.
 */
export const AccountsPage = ({ onNotify, onNavigate, identifier }: Props) => {
  const load = useCallback(() => adminApi.accounts({ limit: 1000 }), []);
  const { rows, error, loading, reload } = useRegistry<AdminAccount>(load, 'Reading the account directory');
  const [term, setTerm] = useState('');
  const [role, setRole] = useState('');
  const [state, setState] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ fullName: '', personalEmail: '', phone: '', staffId: '', role: 'teacher', position: '' });
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState<{ email: string; password: string; role: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const roles = useMemo(() => unique((rows ?? []).map((row) => row.role_name)), [rows]);

  const shown = useMemo(
    () =>
      (rows ?? []).filter((row) => {
        const locked = Boolean(row.locked_until && new Date(row.locked_until).getTime() > Date.now());
        return (
          matches(term, fullName(row), row.email, row.student_number, row.employee_number, row.role_name) &&
          (role ? row.role_name === role : true) &&
          (state === 'active' ? row.is_active !== false && !locked : true) &&
          (state === 'inactive' ? row.is_active === false : true) &&
          (state === 'locked' ? locked : true)
        );
      }),
    [rows, term, role, state],
  );

  const count = (predicate: (account: AdminAccount) => boolean) => (rows ?? []).filter(predicate).length;
  const lockedCount = (rows ?? []).filter((row) => row.locked_until && new Date(row.locked_until).getTime() > Date.now()).length;

  const exportCsv = () => {
    downloadCsv(
      `cec-accounts-${new Date().toISOString().slice(0, 10)}.csv`,
      ['School / employee number', 'Last name', 'First name', 'Email', 'Role', 'Department', 'Account', 'Last sign-in', 'Created'],
      shown.map((row) => [
        row.student_number ?? row.employee_number,
        row.last_name,
        row.first_name,
        row.email,
        roleOf(row),
        row.department_code,
        row.is_active === false ? 'deactivated' : 'active',
        row.last_login_at,
        row.created_at,
      ]),
    );
    onNotify(`Exported ${shown.length} account${shown.length === 1 ? '' : 's'}`);
  };

  const create = async () => {
    const name = draft.fullName.trim();
    const staffId = draft.staffId.trim();
    if (!name || !draft.personalEmail.includes('@')) {
      onNotify('A full name and a valid email address are required');
      return;
    }
    if (!/^[34]\d{6}$/.test(staffId)) {
      onNotify(draft.role === 'admin' ? 'An administrator number is 7 digits and starts with 4' : 'A teacher number is 7 digits and starts with 3');
      return;
    }
    setSaving(true);
    try {
      const created = await adminApi.createStaff({
        fullName: name,
        personalEmail: draft.personalEmail.trim(),
        phone: draft.phone.trim() || undefined,
        staffId,
        role: draft.role as 'teacher' | 'admin',
        position: draft.position.trim() || undefined,
      });
      setIssued({ email: created?.schoolEmail ?? draft.personalEmail.trim(), password: created?.temporaryPassword ?? '', role: draft.role });
      onNotify(`${name} provisioned as ${draft.role}`);
      setDraft({ fullName: '', personalEmail: '', phone: '', staffId: '', role: 'teacher', position: '' });
      setAdding(false);
      await reload();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Creating the account'));
    } finally {
      setSaving(false);
    }
  };

  const toggleAccount = async (row: AdminAccount) => {
    setBusyId(row.id);
    try {
      const result = await adminApi.updateAccount(row.id, row.is_active === false);
      onNotify(result?.message ?? `${row.email} updated`);
      await reload();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Changing the account state'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ConsolePage>
      <PageHeader
        crumb={['Registrar console', 'Access control']}
        title="User Accounts"
        subtitle="Every account that can sign in to the portal, the role it carries, and the school number behind it."
        actions={
          <>
            <button type="button" className="ac-btn" onClick={() => { setAdding((value) => !value); setIssued(null); }}>
              <UserPlus aria-hidden="true" />
              {adding ? 'Close form' : 'Add account'}
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => setChangingPassword((value) => !value)}>
              <KeyRound aria-hidden="true" />
              {changingPassword ? 'Close password form' : 'Change my password'}
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={exportCsv} disabled={!shown.length}>
              <Download aria-hidden="true" />
              Export directory
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => void reload()} disabled={loading}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </button>
          </>
        }
      />

      {error ? <ErrorNote message={error} onRetry={() => void reload()} /> : null}

      {issued ? (
        <Notes>
          <strong>{humanise(issued.role)} account provisioned.</strong> Sign-in email <span className="ac-mono">{issued.email}</span>
          {issued.password ? (
            <>
              , temporary password <span className="ac-mono">{issued.password}</span>
            </>
          ) : null}
          . Hand these over; the account can sign in immediately.
        </Notes>
      ) : null}

      {adding ? (
        <Panel title="Create an account" subtitle="For teachers and administrators. Student accounts are issued from Student Management, where the school number is reserved.">
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label className="ac-field">
              <span>Full name</span>
              <input className="ac-input" value={draft.fullName} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })} aria-label="New account full name" />
            </label>
            <label className="ac-field">
              <span>Personal email</span>
              <input className="ac-input" value={draft.personalEmail} onChange={(event) => setDraft({ ...draft, personalEmail: event.target.value })} aria-label="New account email" />
            </label>
            <label className="ac-field">
              <span>Role</span>
              <select className="ac-select" value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value, staffId: '' })} aria-label="New account role">
                <option value="teacher">Teacher (3xxxxxx)</option>
                <option value="admin">Administrator (4xxxxxx)</option>
              </select>
            </label>
            <label className="ac-field">
              <span>Employee number</span>
              <input
                className="ac-input"
                value={draft.staffId}
                onChange={(event) => setDraft({ ...draft, staffId: event.target.value.replace(/\D/g, '').slice(0, 7) })}
                aria-label="New account employee number"
                inputMode="numeric"
              />
            </label>
            <label className="ac-field">
              <span>Contact number</span>
              <input className="ac-input" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} aria-label="New account phone" />
            </label>
            <label className="ac-field">
              <span>Position</span>
              <input className="ac-input" value={draft.position} onChange={(event) => setDraft({ ...draft, position: event.target.value })} aria-label="New account position" />
            </label>
          </div>
          <div className="ac-actions" style={{ marginTop: 14 }}>
            <button type="button" className="ac-btn" onClick={() => void create()} disabled={saving}>
              <UserPlus aria-hidden="true" />
              {saving ? 'Provisioning…' : 'Create account'}
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => setAdding(false)} disabled={saving}>
              Cancel
            </button>
          </div>
        </Panel>
      ) : null}

      {changingPassword ? (
        <Panel title="Change my password" subtitle="Your own sign-in password, changed from this device.">
          <ChangePassword identifier={identifier} onNotify={onNotify} />
        </Panel>
      ) : null}

      <div className="ac-kpis">
        <Kpi label="Accounts provisioned" value={rows === null ? '—' : rows.length.toLocaleString()} hint="sign-in identities" tone={rows && rows.length === 0 ? 'empty' : 'default'} />
        <Kpi label="Students" value={rows === null ? '—' : count((row) => row.role_name === 'student').toLocaleString()} hint="undergraduate accounts" tone="default" />
        <Kpi label="Faculty" value={rows === null ? '—' : count((row) => row.role_name === 'teacher').toLocaleString()} hint="teaching accounts" tone="default" />
        <Kpi label="Administrators" value={rows === null ? '—' : count((row) => row.role_name === 'admin').toLocaleString()} hint="console access" tone="default" />
        <Kpi
          label="Deactivated"
          value={rows === null ? '—' : count((row) => row.is_active === false).toLocaleString()}
          hint="cannot sign in"
          tone={rows && count((row) => row.is_active === false) > 0 ? 'attention' : 'empty'}
        />
        <Kpi label="Locked out" value={rows === null ? '—' : lockedCount.toLocaleString()} hint="wrong-password lock still running" tone={lockedCount ? 'attention' : 'empty'} />
      </div>

      <Panel title="Account directory" subtitle={`Showing ${shown.length} of ${rows?.length ?? 0} accounts.`} flush>
        <Toolbar>
          <label className="ac-field ac-search">
            <span className="ac-muted">
              <Search aria-hidden="true" style={{ width: 12, height: 12, verticalAlign: '-1px' }} /> Search
            </span>
            <input
              className="ac-input"
              placeholder="Name, institutional email or school number"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              aria-label="Search accounts"
            />
          </label>
          <label className="ac-field">
            <span>Role</span>
            <select className="ac-select" value={role} onChange={(event) => setRole(event.target.value)} aria-label="Filter by role">
              <option value="">Any assigned role</option>
              {roles.map((option) => (
                <option key={option} value={option}>
                  {humanise(option)}
                </option>
              ))}
            </select>
          </label>
          <label className="ac-field">
            <span>State</span>
            <select className="ac-select" value={state} onChange={(event) => setState(event.target.value)} aria-label="Filter by account state">
              <option value="">All states</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
              <option value="locked">Locked out</option>
            </select>
          </label>
          <div className="ac-actions" style={{ marginLeft: 'auto' }}>
            <span className="ac-muted">Switching an account off blocks sign-in immediately and is recorded in the audit trail.</span>
          </div>
        </Toolbar>

        {loading && !rows ? (
          <Loading label="Reading the account directory…" />
        ) : !rows ? (
          <EmptyState title="Directory unreadable" message="The account directory could not be read just now. Try again — nothing has been changed." />
        ) : shown.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? 'No accounts yet' : 'No accounts match these filters'}
            message={
              rows.length === 0
                ? 'Nobody can sign in yet. Accounts appear here as applicants are approved and staff are registered.'
                : 'Adjust the search or filters to widen the result set.'
            }
          />
        ) : (
          <Table head={['User identity', 'Institutional email', 'Role', 'Department', 'Account', 'Last sign-in', '']}>
            {shown.map((row) => {
              const locked = Boolean(row.locked_until && new Date(row.locked_until).getTime() > Date.now());
              const systemId = row.student_number ?? row.employee_number ?? '—';
              return (
                <tr key={row.id}>
                  <td>
                    <span className="ac-cell-stack">
                      <span className="ac-strong">{fullName(row)}</span>
                      <span className="ac-mono">{systemId}</span>
                    </span>
                  </td>
                  <td>{row.email}</td>
                  <td>
                    <Badge tone={row.role_name === 'admin' ? 'default' : 'muted'}>
                      <ShieldCheck aria-hidden="true" style={{ width: 12, height: 12 }} />
                      {humanise(roleOf(row))}
                    </Badge>
                  </td>
                  <td>{row.department_code ?? row.program ?? '—'}</td>
                  <td>
                    <Badge tone={row.is_active === false ? 'muted' : locked ? 'danger' : 'ok'}>
                      {row.is_active === false ? 'Deactivated' : locked ? 'Locked out' : 'Active'}
                    </Badge>
                  </td>
                  <td className="ac-muted">{formatStamp(row.last_login_at)}</td>
                  <td>
                    <div className="ac-actions">
                      <button
                        type="button"
                        className="ac-btn ac-btn--ghost"
                        disabled={busyId === row.id}
                        onClick={() => void toggleAccount(row)}
                      >
                        {row.is_active === false ? 'Activate' : 'Deactivate'}
                      </button>
                      <button
                        type="button"
                        className="ac-btn ac-btn--ghost"
                        onClick={() => setOpenId(openId === row.id ? null : row.id)}
                        aria-expanded={openId === row.id}
                      >
                        {openId === row.id ? <Undo2 aria-hidden="true" /> : <UserCog aria-hidden="true" />}
                        {openId === row.id ? 'Hide record' : 'Record'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {openId && shown.some((row) => row.id === openId) ? (
              <tr>
                <td colSpan={7} style={{ background: '#fbfdff' }}>
                  {(() => {
                    const row = shown.find((candidate) => candidate.id === openId);
                    if (!row) return null;
                    return (
                      <dl className="ac-dl">
                        <dt>Account name</dt>
                        <dd>{fullName(row)}</dd>
                        <dt>Institutional email</dt>
                        <dd>{row.email}</dd>
                        <dt>Role</dt>
                        <dd>{humanise(roleOf(row))}</dd>
                        <dt>School / employee number</dt>
                        <dd className="ac-mono">{row.student_number ?? row.employee_number ?? '—'}</dd>
                        <dt>Program & year</dt>
                        <dd>{row.program ? `${row.program}${row.year_level ? ` • Year ${row.year_level}` : ''}` : 'Not applicable'}</dd>
                        <dt>Specialization</dt>
                        <dd>{row.specialization ?? 'Not applicable'}</dd>
                        <dt>Department</dt>
                        <dd>{row.department_code ?? 'Not assigned'}</dd>
                        <dt>Account created</dt>
                        <dd>{formatStamp(row.created_at)}</dd>
                        <dt>Last sign-in</dt>
                        <dd>{formatStamp(row.last_login_at)}</dd>
                        <dt>Failed attempts</dt>
                        <dd>{row.failed_login_attempts ?? 0}</dd>
                        <dt>Locked until</dt>
                        <dd>{row.locked_until ? formatStamp(row.locked_until) : 'Not locked'}</dd>
                      </dl>
                    );
                  })()}
                </td>
              </tr>
            ) : null}
          </Table>
        )}
      </Panel>
    </ConsolePage>
  );
};
