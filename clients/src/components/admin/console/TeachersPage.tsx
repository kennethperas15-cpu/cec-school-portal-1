import { useCallback, useMemo, useState } from 'react';
import { BadgeCheck, Download, RefreshCw, Search, Undo2 } from 'lucide-react';
import { adminApi, formatStamp, fullName, type AdminTeacher } from '../../../services/admin';
import { Badge, ConsolePage, EmptyState, ErrorNote, Kpi, Loading, PageHeader, Panel, Table, Toolbar } from './kit';
import { downloadCsv, humanise, matches, unique, useRegistry } from './registry';

/**
 * The faculty roster. Employee numbers, departments and specializations are the
 * registrar's records — the portal shows them, it does not invent them.
 */
export const TeachersPage = ({ onNotify }: { onNotify: (message: string) => void }) => {
  const load = useCallback(() => adminApi.teachers({ limit: 1000 }), []);
  const { rows, error, loading, reload } = useRegistry<AdminTeacher>(load, 'Reading the faculty roster');
  const [term, setTerm] = useState('');
  const [department, setDepartment] = useState('');
  const [employment, setEmployment] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const departments = useMemo(() => unique((rows ?? []).map((row) => row.department_code)), [rows]);
  const statuses = useMemo(() => unique((rows ?? []).map((row) => row.employment_status)), [rows]);

  const shown = useMemo(
    () =>
      (rows ?? []).filter(
        (row) =>
          matches(term, fullName(row), row.employee_number, row.email, row.specialization, row.department_name) &&
          (department ? row.department_code === department : true) &&
          (employment ? row.employment_status === employment : true),
      ),
    [rows, term, department, employment],
  );

  const active = shown.filter((row) => row.is_active !== false).length;

  const exportCsv = () => {
    downloadCsv(
      `cec-faculty-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Employee number', 'Last name', 'First name', 'Email', 'Specialization', 'Department', 'Employment', 'Account', 'Last sign-in'],
      shown.map((row) => [
        row.employee_number,
        row.last_name,
        row.first_name,
        row.email,
        row.specialization,
        row.department_name ?? row.department_code,
        row.employment_status,
        row.is_active === false ? 'deactivated' : 'active',
        row.last_login_at,
      ]),
    );
    onNotify(`Exported ${shown.length} faculty record${shown.length === 1 ? '' : 's'}`);
  };

  return (
    <ConsolePage>
      <PageHeader
        crumb={['Registrar console', 'Faculty roster']}
        title="Teacher Management"
        subtitle="The teaching staff on record, with the department, specialization and account each one signs in with."
        actions={
          <>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={exportCsv} disabled={!shown.length}>
              <Download aria-hidden="true" />
              Export roster
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => void reload()} disabled={loading}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </button>
          </>
        }
      />

      {error ? <ErrorNote message={error} onRetry={() => void reload()} /> : null}

      <div className="ac-kpis">
        <Kpi label="Faculty on file" value={rows === null ? '—' : rows.length.toLocaleString()} hint="teaching staff records" tone={rows && rows.length === 0 ? 'empty' : 'default'} />
        <Kpi label="Active accounts" value={rows === null ? '—' : active.toLocaleString()} hint="can sign in to the portal" tone={rows && active === 0 ? 'empty' : 'default'} />
        <Kpi label="Departments" value={rows === null ? '—' : departments.length.toLocaleString()} hint="represented on the roster" tone={departments.length ? 'default' : 'empty'} />
        <Kpi
          label="Specializations"
          value={rows === null ? '—' : unique((rows ?? []).map((row) => row.specialization)).length.toLocaleString()}
          hint="declared teaching fields"
          tone="default"
        />
      </div>

      <Panel title="Faculty roster" subtitle={`Showing ${shown.length} of ${rows?.length ?? 0} records.`} flush>
        <Toolbar>
          <label className="ac-field ac-search">
            <span className="ac-muted">
              <Search aria-hidden="true" style={{ width: 12, height: 12, verticalAlign: '-1px' }} /> Search
            </span>
            <input
              className="ac-input"
              placeholder="Name, employee number or email"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              aria-label="Search faculty"
            />
          </label>
          <label className="ac-field">
            <span>Department</span>
            <select className="ac-select" value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Filter by department">
              <option value="">All departments</option>
              {departments.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="ac-field">
            <span>Employment</span>
            <select className="ac-select" value={employment} onChange={(event) => setEmployment(event.target.value)} aria-label="Filter by employment status">
              <option value="">All employment types</option>
              {statuses.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </Toolbar>

        {loading && !rows ? (
          <Loading label="Reading the faculty roster…" />
        ) : !rows ? (
          <EmptyState title="Roster unreadable" message="The faculty roster could not be read just now. Try again — nothing has been changed." />
        ) : shown.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? 'No faculty recorded yet' : 'No faculty match these filters'}
            message={
              rows.length === 0
                ? 'The roster is empty. Teachers appear here when the registrar creates a staff account with a 3xxxxxx employee number.'
                : 'Adjust the search or filters to widen the result set.'
            }
          />
        ) : (
          <Table head={['Faculty member', 'Employee number', 'Department', 'Specialization', 'Employment', 'Account', 'Last sign-in', '']}>
            {shown.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="ac-cell-stack">
                    <span className="ac-strong">{fullName(row)}</span>
                    <span className="ac-muted">{row.email}</span>
                  </span>
                </td>
                <td className="ac-mono">{row.employee_number}</td>
                <td>{row.department_code ?? '—'}</td>
                <td>{row.specialization ?? '—'}</td>
                <td>{humanise(row.employment_status)}</td>
                <td>
                  <Badge tone={row.is_active === false ? 'muted' : 'ok'}>{row.is_active === false ? 'Deactivated' : 'Active'}</Badge>
                </td>
                <td className="ac-muted">{formatStamp(row.last_login_at)}</td>
                <td>
                  <button
                    type="button"
                    className="ac-btn ac-btn--ghost"
                    onClick={() => setOpenId(openId === row.id ? null : row.id)}
                    aria-expanded={openId === row.id}
                  >
                    {openId === row.id ? <Undo2 aria-hidden="true" /> : <BadgeCheck aria-hidden="true" />}
                    {openId === row.id ? 'Close' : 'Record'}
                  </button>
                </td>
              </tr>
            ))}
            {openId && shown.some((row) => row.id === openId) ? (
              <tr>
                <td colSpan={8} style={{ background: '#fbfdff' }}>
                  {(() => {
                    const row = shown.find((candidate) => candidate.id === openId);
                    if (!row) return null;
                    return (
                      <dl className="ac-dl">
                        <dt>Full name</dt>
                        <dd>{fullName(row)}</dd>
                        <dt>Employee number</dt>
                        <dd className="ac-mono">{row.employee_number}</dd>
                        <dt>Institutional email</dt>
                        <dd>{row.email}</dd>
                        <dt>Department</dt>
                        <dd>{row.department_name ?? row.department_code ?? 'Not assigned'}</dd>
                        <dt>Specialization</dt>
                        <dd>{row.specialization ?? 'Not on file'}</dd>
                        <dt>Employment</dt>
                        <dd>{row.employment_status ?? '—'}</dd>
                        <dt>Account created</dt>
                        <dd>{formatStamp(row.created_at)}</dd>
                        <dt>Last sign-in</dt>
                        <dd>{formatStamp(row.last_login_at)}</dd>
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
