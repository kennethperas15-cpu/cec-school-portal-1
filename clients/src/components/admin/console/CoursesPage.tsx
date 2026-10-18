import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, RefreshCw, Search, Trash2, Undo2 } from 'lucide-react';
import { describeApiError } from '../../../services/api';
import { adminApi, fullName, type AdminCourse, type AdminTeacher } from '../../../services/admin';
import { semesterNo, useAcademicConfig } from '../../../services/academicConfig';
import { Badge, ConsolePage, EmptyState, ErrorNote, Kpi, Loading, Notes, PageHeader, Panel, Table, Toolbar } from './kit';
import { downloadCsv, humanise, matches, unique, useRegistry } from './registry';

/**
 * The course catalog as the database holds it: an offering for a term, tied to
 * the subject it teaches and the instructor assigned to it. Opening a course
 * creates the subject when its code is new, closing it stops new enrollment, and
 * a course with no scheduled meetings can be removed outright.
 */
export const CoursesPage = ({ onNotify }: { onNotify: (message: string) => void }) => {
  const academic = useAcademicConfig();
  const load = useCallback(() => adminApi.courses({ limit: 1000 }), []);
  const { rows, error, loading, reload } = useRegistry<AdminCourse>(load, 'Reading the course catalog');
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('');
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState({ code: '', subjectName: '', units: '3', description: '', status: 'open', teacherId: '' });
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [faculty, setFaculty] = useState<AdminTeacher[]>([]);

  useEffect(() => {
    let live = true;
    adminApi
      .teachers({ limit: 500 })
      .then((rows) => {
        if (live) setFaculty(rows);
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);

  const statuses = useMemo(() => unique((rows ?? []).map((row) => row.status)), [rows]);
  const shown = useMemo(
    () =>
      (rows ?? []).filter(
        (row) =>
          matches(term, row.code, row.subject_code, row.subject_name, row.description, row.teacher_last_name) &&
          (status ? row.status === status : true),
      ),
    [rows, term, status],
  );

  const exportCsv = () => {
    downloadCsv(
      `cec-course-catalog-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Course code', 'Subject code', 'Subject title', 'Units', 'School year', 'Semester', 'Instructor', 'Status'],
      shown.map((row) => [
        row.code,
        row.subject_code,
        row.subject_name,
        row.units,
        row.school_year,
        row.semester,
        fullName({ first_name: row.teacher_first_name, last_name: row.teacher_last_name }),
        row.status,
      ]),
    );
    onNotify(`Exported ${shown.length} course${shown.length === 1 ? '' : 's'}`);
  };

  const open = shown.filter((row) => row.status === 'open').length;
  const units = shown.reduce((total, row) => total + (Number(row.units) || 0), 0);

  const create = async () => {
    if (!draft.code.trim() || !draft.subjectName.trim()) {
      onNotify('A course code and subject title are required');
      return;
    }
    setSaving(true);
    try {
      const created = await adminApi.createCourse({
        code: draft.code.trim(),
        subjectName: draft.subjectName.trim(),
        units: Number(draft.units) || 3,
        description: draft.description.trim() || undefined,
        schoolYear: academic.schoolYear,
        semester: semesterNo(academic.semester),
        status: draft.status,
        teacherId: draft.teacherId || undefined,
      });
      onNotify(`${draft.code.trim()} opened for ${academic.schoolYear} (course ${created?.id ?? 'created'})`);
      setDraft({ code: '', subjectName: '', units: '3', description: '', status: 'open', teacherId: '' });
      setComposing(false);
      await reload();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Opening the course'));
    } finally {
      setSaving(false);
    }
  };

  const setCourseStatus = async (row: AdminCourse, next: string) => {
    setBusy(row.id);
    try {
      await adminApi.updateCourse(row.id, { status: next });
      onNotify(`${row.code} ${next === 'open' ? 'reopened' : next}`);
      await reload();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Changing the course status'));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (row: AdminCourse) => {
    setBusy(row.id);
    try {
      const result = await adminApi.deleteCourse(row.id);
      onNotify(result?.message ?? `${row.code} removed`);
      setConfirming(null);
      await reload();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Removing the course'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ConsolePage>
      <PageHeader
        crumb={['Registrar console', 'Curriculum']}
        title="Course Management"
        subtitle="Course offerings for the term, the subject each one teaches, and the instructor assigned to it."
        actions={
          <>
            <button type="button" className="ac-btn" onClick={() => setComposing((value) => !value)}>
              <Plus aria-hidden="true" />
              {composing ? 'Close form' : 'Create Course'}
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={exportCsv} disabled={!shown.length}>
              <Download aria-hidden="true" />
              Export catalog
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => void reload()} disabled={loading}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </button>
          </>
        }
      />

      {error ? <ErrorNote message={error} onRetry={() => void reload()} /> : null}

      {composing ? (
        <Panel title="Open a course" subtitle={`Added to the catalog for ${academic.schoolYear}, ${academic.semester}.`}>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label className="ac-field">
              <span>Course code</span>
              <input className="ac-input" value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} aria-label="Course code" placeholder="e.g. CS 302" />
            </label>
            <label className="ac-field">
              <span>Subject title</span>
              <input className="ac-input" value={draft.subjectName} onChange={(event) => setDraft({ ...draft, subjectName: event.target.value })} aria-label="Subject title" placeholder="e.g. Database Systems" />
            </label>
            <label className="ac-field">
              <span>Units</span>
              <input className="ac-input" value={draft.units} onChange={(event) => setDraft({ ...draft, units: event.target.value })} aria-label="Course units" inputMode="decimal" />
            </label>
            <label className="ac-field">
              <span>Instructor</span>
              <select className="ac-select" value={draft.teacherId} onChange={(event) => setDraft({ ...draft, teacherId: event.target.value })} aria-label="Course instructor">
                <option value="">Unassigned</option>
                {faculty.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {fullName(teacher)}
                  </option>
                ))}
              </select>
            </label>
            <label className="ac-field">
              <span>Status</span>
              <select className="ac-select" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} aria-label="Course status">
                <option value="open">Open for enrollment</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <label className="ac-field">
              <span>Description</span>
              <input className="ac-input" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} aria-label="Course description" />
            </label>
          </div>
          <div className="ac-actions" style={{ marginTop: 14 }}>
            <button type="button" className="ac-btn" onClick={() => void create()} disabled={saving}>
              <Plus aria-hidden="true" />
              {saving ? 'Opening…' : 'Open course'}
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => setComposing(false)} disabled={saving}>
              Cancel
            </button>
            <span className="ac-muted">A subject code that is already catalogued keeps its record and takes the new term.</span>
          </div>
        </Panel>
      ) : null}

      <div className="ac-kpis">
        <Kpi label="Course offerings" value={rows === null ? '—' : rows.length.toLocaleString()} hint="courses on record" tone={rows && rows.length === 0 ? 'empty' : 'default'} />
        <Kpi label="Open this term" value={rows === null ? '—' : open.toLocaleString()} hint="accepting enrollment" tone={open ? 'default' : 'empty'} />
        <Kpi label="Catalogued subjects" value={rows === null ? '—' : unique((rows ?? []).map((row) => row.subject_code)).length.toLocaleString()} hint="distinct subject codes" tone="default" />
        <Kpi label="Total units offered" value={rows === null ? '—' : units.toLocaleString()} hint="sum of course units" tone="default" />
      </div>

      <Panel title="Course catalog" subtitle={`Showing ${shown.length} of ${rows?.length ?? 0} records.`} flush>
        <Toolbar>
          <label className="ac-field ac-search">
            <span className="ac-muted">
              <Search aria-hidden="true" style={{ width: 12, height: 12, verticalAlign: '-1px' }} /> Search
            </span>
            <input
              className="ac-input"
              placeholder="Course code, subject title or keywords"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              aria-label="Search courses"
            />
          </label>
          <label className="ac-field">
            <span>Status</span>
            <select className="ac-select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by course status">
              <option value="">All statuses</option>
              {statuses.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </Toolbar>

        {loading && !rows ? (
          <Loading label="Reading the course catalog…" />
        ) : !rows ? (
          <EmptyState title="Catalog unreadable" message="The course catalog could not be read just now. Try again — nothing has been changed." />
        ) : shown.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? 'No courses catalogued yet' : 'No courses match these filters'}
            message={
              rows.length === 0
                ? 'The catalog is empty. Offerings appear here once the registrar records a subject and opens a course for the term.'
                : 'Adjust the search or status filter to widen the result set.'
            }
          />
        ) : (
          <Table head={['Course code', 'Subject', 'Units', 'Term', 'Instructor', 'Status', 'Action']}>
            {shown.map((row) => (
              <tr key={row.id}>
                <td className="ac-mono ac-strong">{row.code}</td>
                <td>
                  <span className="ac-cell-stack">
                    <span className="ac-strong">
                      {row.subject_code ? `${row.subject_code} — ` : ''}
                      {row.subject_name ?? row.code}
                    </span>
                    {row.description ? <span className="ac-muted">{row.description}</span> : null}
                  </span>
                </td>
                <td>{row.units ?? '—'}</td>
                <td className="ac-muted">
                  {row.school_year ?? '—'}
                  {row.semester ? ` • Sem ${row.semester}` : ''}
                </td>
                <td>{row.teacher_email ? fullName({ first_name: row.teacher_first_name, last_name: row.teacher_last_name }) : 'Unassigned'}</td>
                <td>
                  <Badge tone={row.status === 'open' ? 'ok' : row.status === 'archived' ? 'muted' : 'warn'}>{humanise(row.status)}</Badge>
                </td>
                <td>
                  <div className="ac-actions">
                    <button
                      type="button"
                      className="ac-btn ac-btn--ghost"
                      disabled={busy === row.id}
                      onClick={() => void setCourseStatus(row, row.status === 'open' ? 'closed' : 'open')}
                    >
                      {humanise(row.status === 'open' ? 'Close' : 'Reopen')}
                    </button>
                    {confirming === row.id ? (
                      <>
                        <button type="button" className="ac-btn ac-btn--danger" disabled={busy === row.id} onClick={() => void remove(row)}>
                          <Trash2 aria-hidden="true" />
                          {busy === row.id ? 'Removing…' : 'Confirm remove'}
                        </button>
                        <button type="button" className="ac-btn ac-btn--ghost" onClick={() => setConfirming(null)} disabled={busy === row.id}>
                          <Undo2 aria-hidden="true" />
                          Keep
                        </button>
                      </>
                    ) : (
                      <button type="button" className="ac-btn ac-btn--danger" onClick={() => setConfirming(row.id)}>
                        <Trash2 aria-hidden="true" />
                        Remove
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </ConsolePage>
  );
};
