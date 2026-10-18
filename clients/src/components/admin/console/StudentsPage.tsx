import { useCallback, useMemo, useState } from 'react';
import { BadgeCheck, Download, RefreshCw, Search, Undo2, UserPlus } from 'lucide-react';
import { describeApiError } from '../../../services/api';
import { adminApi, formatDay, formatStamp, fullName, type AdminStudent } from '../../../services/admin';
import { levelsOf, PROGRAMS } from '../../enrollment/EnrollmentLanding';
import { Badge, ConsolePage, EmptyState, ErrorNote, Kpi, Loading, Notes, PageHeader, Panel, Table, Toolbar } from './kit';
import { downloadCsv, matches, unique, useRegistry } from './registry';

type Issued = { studentNumber: string; schoolEmail: string; temporaryPassword: string; firstName: string; lastName: string };

const EMPTY_DRAFT = {
  firstName: '',
  middleName: '',
  lastName: '',
  personalEmail: '',
  phone: '',
  program: PROGRAMS[0].name,
  yearLevel: '1',
  educationLevel: 'college',
  guardianName: '',
  guardianPhone: '',
  dateOfBirth: '',
  address: '',
};

/**
 * The matriculation index. Every row is a real `students` record joined to the
 * account that signs in with it — the school number, the program, the year level
 * and the account state all come from the database.
 *
 * Registering a student and correcting a record both write to the database: the
 * registrar reserves the 2xxxxxx number, the account is issued against it, and
 * the change is recorded in the audit trail.
 */
export const StudentsPage = ({ onNotify }: { onNotify: (message: string) => void }) => {
  const load = useCallback(() => adminApi.students({ limit: 1000 }), []);
  const { rows, error, loading, reload } = useRegistry<AdminStudent>(load, 'Reading the student registry');
  const [term, setTerm] = useState('');
  const [program, setProgram] = useState('');
  const [year, setYear] = useState('');
  const [account, setAccount] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [editing, setEditing] = useState<{ id: string; program: string; yearLevel: string; status: string; guardianName: string; guardianPhone: string; dateOfBirth: string; address: string } | null>(null);

  const programs = useMemo(() => unique((rows ?? []).map((row) => row.program)), [rows]);
  const years = useMemo(
    () => unique((rows ?? []).map((row) => (row.year_level ? `Year ${row.year_level}` : null))).sort(),
    [rows],
  );

  const shown = useMemo(
    () =>
      (rows ?? []).filter(
        (row) =>
          matches(term, fullName(row), row.student_number, row.email, row.program, row.department_name) &&
          (program ? row.program === program : true) &&
          (year ? `Year ${row.year_level}` === year : true) &&
          (account === 'active' ? row.is_active !== false : true) &&
          (account === 'inactive' ? row.is_active === false : true),
      ),
    [rows, term, program, year, account],
  );

  const active = shown.filter((row) => row.is_active !== false).length;

  const exportCsv = () => {
    downloadCsv(
      `cec-students-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Student number', 'Last name', 'First name', 'Middle name', 'Email', 'Program', 'Year level', 'Department', 'Status', 'Account', 'Last sign-in', 'Registered'],
      shown.map((row) => [
        row.student_number,
        row.last_name,
        row.first_name,
        row.middle_name,
        row.email,
        row.program,
        row.year_level,
        row.department_name ?? row.department_code,
        row.status,
        row.is_active === false ? 'deactivated' : 'active',
        row.last_login_at,
        row.created_at,
      ]),
    );
    onNotify(`Exported ${shown.length} student record${shown.length === 1 ? '' : 's'}`);
  };

  const register = async () => {
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      onNotify('A first and last name are required');
      return;
    }
    if (!draft.personalEmail.includes('@')) {
      onNotify('A valid personal email address is required');
      return;
    }
    setSaving(true);
    try {
      const result = await adminApi.registerStudent({
        firstName: draft.firstName.trim(),
        middleName: draft.middleName.trim() || undefined,
        lastName: draft.lastName.trim(),
        personalEmail: draft.personalEmail.trim(),
        phone: draft.phone.trim() || undefined,
        program: draft.program,
        yearLevel: Number(draft.yearLevel),
        educationLevel: draft.educationLevel,
        guardianName: draft.guardianName.trim() || undefined,
        guardianPhone: draft.guardianPhone.trim() || undefined,
        dateOfBirth: draft.dateOfBirth || undefined,
        address: draft.address.trim() || undefined,
      });
      setIssued(result);
      setDraft({ ...EMPTY_DRAFT });
      setRegistering(false);
      onNotify(`${result.firstName} ${result.lastName} registered as ${result.studentNumber}`);
      await reload();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Registering the student'));
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminApi.updateStudent(editing.id, {
        program: editing.program,
        yearLevel: Number(editing.yearLevel),
        status: editing.status,
        guardianName: editing.guardianName,
        guardianPhone: editing.guardianPhone,
        dateOfBirth: editing.dateOfBirth || undefined,
        address: editing.address,
      });
      onNotify('Student record updated');
      setEditing(null);
      await reload();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Saving the student record'));
    } finally {
      setSaving(false);
    }
  };

  const toggleAccount = async (row: AdminStudent) => {
    try {
      await adminApi.updateStudent(row.id, { isActive: row.is_active === false });
      onNotify(`${fullName(row)} — account ${row.is_active === false ? 'reactivated' : 'deactivated'}`);
      await reload();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Changing the account state'));
    }
  };

  return (
    <ConsolePage>
      <PageHeader
        crumb={['Registrar console', 'Matriculation index']}
        title="Student Management"
        subtitle="Every student in the institutional registry, with the sign-in account behind each record. Numbers are assigned by the registrar, never generated by the portal."
        actions={
          <>
            <button type="button" className="ac-btn" onClick={() => { setRegistering((value) => !value); setIssued(null); }}>
              <UserPlus aria-hidden="true" />
              {registering ? 'Close form' : 'Add Student'}
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={exportCsv} disabled={!shown.length}>
              <Download aria-hidden="true" />
              Export records
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
          <strong>{issued.firstName} {issued.lastName} is on the register.</strong> School number <span className="ac-mono">{issued.studentNumber}</span>,
          sign-in email <span className="ac-mono">{issued.schoolEmail}</span>, temporary password{' '}
          <span className="ac-mono">{issued.temporaryPassword}</span>. Hand these over, and the student can sign in immediately — email
          delivery is not configured on this deployment.
        </Notes>
      ) : null}

      {registering ? (
        <Panel title="Register a student" subtitle="Records the student and issues the account in one step.">
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label className="ac-field">
              <span>First name</span>
              <input className="ac-input" value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} aria-label="Student first name" />
            </label>
            <label className="ac-field">
              <span>Middle name</span>
              <input className="ac-input" value={draft.middleName} onChange={(event) => setDraft({ ...draft, middleName: event.target.value })} aria-label="Student middle name" />
            </label>
            <label className="ac-field">
              <span>Last name</span>
              <input className="ac-input" value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} aria-label="Student last name" />
            </label>
            <label className="ac-field">
              <span>Personal email</span>
              <input className="ac-input" value={draft.personalEmail} onChange={(event) => setDraft({ ...draft, personalEmail: event.target.value })} aria-label="Student personal email" />
            </label>
            <label className="ac-field">
              <span>Contact number</span>
              <input className="ac-input" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} aria-label="Student contact number" />
            </label>
            <label className="ac-field">
              <span>Program</span>
              <select
                className="ac-select"
                value={draft.program}
                onChange={(event) => setDraft({ ...draft, program: event.target.value, yearLevel: '1' })}
                aria-label="Student program"
              >
                {PROGRAMS.map((entry) => (
                  <option key={entry.name} value={entry.name}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="ac-field">
              <span>Year level</span>
              <select className="ac-select" value={draft.yearLevel} onChange={(event) => setDraft({ ...draft, yearLevel: event.target.value })} aria-label="Student year level">
                {levelsOf(draft.program).map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="ac-field">
              <span>Guardian</span>
              <input className="ac-input" value={draft.guardianName} onChange={(event) => setDraft({ ...draft, guardianName: event.target.value })} aria-label="Student guardian" />
            </label>
            <label className="ac-field">
              <span>Guardian number</span>
              <input className="ac-input" value={draft.guardianPhone} onChange={(event) => setDraft({ ...draft, guardianPhone: event.target.value })} aria-label="Student guardian number" />
            </label>
            <label className="ac-field">
              <span>Date of birth</span>
              <input className="ac-input" type="date" value={draft.dateOfBirth} onChange={(event) => setDraft({ ...draft, dateOfBirth: event.target.value })} aria-label="Student date of birth" />
            </label>
            <label className="ac-field">
              <span>Home address</span>
              <input className="ac-input" value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} aria-label="Student address" />
            </label>
          </div>
          <div className="ac-actions" style={{ marginTop: 14 }}>
            <button type="button" className="ac-btn" onClick={() => void register()} disabled={saving}>
              <UserPlus aria-hidden="true" />
              {saving ? 'Registering…' : 'Register and issue account'}
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => { setRegistering(false); setDraft({ ...EMPTY_DRAFT }); }} disabled={saving}>
              Cancel
            </button>
            <span className="ac-muted">The registrar does not type a school number — the next 2xxxxxx number is reserved from the registry.</span>
          </div>
        </Panel>
      ) : null}

      <div className="ac-kpis">
        <Kpi label="Students on file" value={rows === null ? '—' : rows.length.toLocaleString()} hint="matriculated records" tone={rows && rows.length === 0 ? 'empty' : 'default'} />
        <Kpi label="Active accounts" value={rows === null ? '—' : active.toLocaleString()} hint="able to sign in today" tone={rows && active === 0 ? 'empty' : 'default'} />
        <Kpi
          label="Deactivated"
          value={rows === null ? '—' : (rows.length - active).toLocaleString()}
          hint="suspended or graduated"
          tone={rows && rows.length - active > 0 ? 'attention' : 'empty'}
        />
        <Kpi label="Programs represented" value={rows === null ? '—' : programs.length.toLocaleString()} hint="distinct degree programs" tone={programs.length ? 'default' : 'empty'} />
      </div>

      <Panel title="Matriculation index" subtitle={`Showing ${shown.length} of ${rows?.length ?? 0} records.`} flush>
        <Toolbar>
          <label className="ac-field ac-search">
            <span className="ac-muted">
              <Search aria-hidden="true" style={{ width: 12, height: 12, verticalAlign: '-1px' }} /> Search
            </span>
            <input
              className="ac-input"
              placeholder="Name, school number or institutional email"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              aria-label="Search students"
            />
          </label>
          <label className="ac-field">
            <span>Program</span>
            <select className="ac-select" value={program} onChange={(event) => setProgram(event.target.value)} aria-label="Filter by program">
              <option value="">All programs</option>
              {programs.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="ac-field">
            <span>Year level</span>
            <select className="ac-select" value={year} onChange={(event) => setYear(event.target.value)} aria-label="Filter by year level">
              <option value="">All year levels</option>
              {years.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="ac-field">
            <span>Account</span>
            <select className="ac-select" value={account} onChange={(event) => setAccount(event.target.value)} aria-label="Filter by account state">
              <option value="">All accounts</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
            </select>
          </label>
        </Toolbar>

        {loading && !rows ? (
          <Loading label="Reading the matriculation index…" />
        ) : !rows ? (
          <EmptyState title="Registry unreadable" message="The student registry could not be read just now. Try again — nothing has been changed." />
        ) : shown.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? 'No students recorded yet' : 'No students match these filters'}
            message={
              rows.length === 0
                ? 'The registry is empty. Students appear here when the registrar approves an enrollment application or creates an account directly.'
                : 'Adjust the search or filters to widen the result set.'
            }
          />
        ) : (
          <Table head={['Student', 'School number', 'Program', 'Year level', 'Department', 'Account', 'Last sign-in', '']}>
            {shown.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="ac-cell-stack">
                    <span className="ac-strong">{fullName(row)}</span>
                    <span className="ac-muted">{row.email}</span>
                  </span>
                </td>
                <td className="ac-mono">{row.student_number}</td>
                <td>{row.program ?? '—'}</td>
                <td>{row.year_level ? `Year ${row.year_level}` : '—'}</td>
                <td>{row.department_code ?? '—'}</td>
                <td>
                  <Badge tone={row.is_active === false ? 'muted' : 'ok'}>{row.is_active === false ? 'Deactivated' : 'Active'}</Badge>
                </td>
                <td className="ac-muted">{formatStamp(row.last_login_at)}</td>
                <td>
                  <div className="ac-actions">
                    <button
                      type="button"
                      className="ac-btn ac-btn--ghost"
                      onClick={() =>
                        setEditing(
                          editing?.id === row.id
                            ? null
                            : {
                                id: row.id,
                                program: row.program ?? '',
                                yearLevel: row.year_level ? String(row.year_level) : '1',
                                status: row.status ?? 'active',
                                guardianName: row.guardian_name ?? '',
                                guardianPhone: row.guardian_phone ?? '',
                                dateOfBirth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : '',
                                address: '',
                              },
                        )
                      }
                      aria-expanded={editing?.id === row.id}
                    >
                      {editing?.id === row.id ? <Undo2 aria-hidden="true" /> : <BadgeCheck aria-hidden="true" />}
                      {editing?.id === row.id ? 'Close' : 'Edit'}
                    </button>
                    <button type="button" className="ac-btn ac-btn--ghost" onClick={() => void toggleAccount(row)}>
                      {row.is_active === false ? 'Reactivate' : 'Deactivate'}
                    </button>
                    <button
                      type="button"
                      className="ac-btn ac-btn--ghost"
                      onClick={() => setOpenId(openId === row.id ? null : row.id)}
                      aria-expanded={openId === row.id}
                    >
                      {openId === row.id ? 'Hide record' : 'Record'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {editing ? (
              <tr>
                <td colSpan={8} style={{ background: '#fbfdff' }}>
                  <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <label className="ac-field">
                      <span>Program</span>
                      <select className="ac-select" value={editing.program} onChange={(event) => setEditing({ ...editing, program: event.target.value })} aria-label="Edit program">
                        {unique([...PROGRAMS.map((entry) => entry.name), editing.program]).map((entry) => (
                          <option key={entry} value={entry}>
                            {entry}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="ac-field">
                      <span>Year level</span>
                      <select className="ac-select" value={editing.yearLevel} onChange={(event) => setEditing({ ...editing, yearLevel: event.target.value })} aria-label="Edit year level">
                        {levelsOf(editing.program).map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="ac-field">
                      <span>Registry status</span>
                      <select className="ac-select" value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value })} aria-label="Edit registry status">
                        {['active', 'inactive', 'graduated', 'transferred'].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="ac-field">
                      <span>Guardian</span>
                      <input className="ac-input" value={editing.guardianName} onChange={(event) => setEditing({ ...editing, guardianName: event.target.value })} aria-label="Edit guardian" />
                    </label>
                    <label className="ac-field">
                      <span>Guardian number</span>
                      <input className="ac-input" value={editing.guardianPhone} onChange={(event) => setEditing({ ...editing, guardianPhone: event.target.value })} aria-label="Edit guardian number" />
                    </label>
                    <label className="ac-field">
                      <span>Date of birth</span>
                      <input className="ac-input" type="date" value={editing.dateOfBirth} onChange={(event) => setEditing({ ...editing, dateOfBirth: event.target.value })} aria-label="Edit date of birth" />
                    </label>
                  </div>
                  <div className="ac-actions" style={{ marginTop: 12 }}>
                    <button type="button" className="ac-btn" onClick={() => void saveEdit()} disabled={saving}>
                      {saving ? 'Saving…' : 'Save record'}
                    </button>
                    <button type="button" className="ac-btn ac-btn--ghost" onClick={() => setEditing(null)} disabled={saving}>
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ) : null}
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
                        <dt>School number</dt>
                        <dd className="ac-mono">{row.student_number}</dd>
                        <dt>Institutional email</dt>
                        <dd>{row.email}</dd>
                        <dt>Program & year</dt>
                        <dd>
                          {row.program ?? '—'} {row.year_level ? `• Year ${row.year_level}` : ''}
                        </dd>
                        <dt>Department</dt>
                        <dd>{row.department_name ?? row.department_code ?? 'Not assigned'}</dd>
                        <dt>Registry status</dt>
                        <dd>{row.status ?? '—'}</dd>
                        <dt>Date of birth</dt>
                        <dd>{formatDay(row.date_of_birth)}</dd>
                        <dt>Guardian</dt>
                        <dd>
                          {row.guardian_name ?? 'Not on file'}
                          {row.guardian_phone ? ` • ${row.guardian_phone}` : ''}
                        </dd>
                        <dt>Registered</dt>
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
