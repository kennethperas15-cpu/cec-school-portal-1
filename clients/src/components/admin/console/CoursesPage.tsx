import { useCallback, useMemo, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import { adminApi, fullName, type AdminCourse } from '../../../services/admin';
import { Badge, ConsolePage, EmptyState, ErrorNote, Kpi, Loading, PageHeader, Panel, Table, Toolbar } from './kit';
import { downloadCsv, humanise, matches, unique, useRegistry } from './registry';

/**
 * The course catalog as the database holds it: an offering for a term, tied to
 * the subject it teaches and the instructor assigned to it. Prerequisites and
 * demand figures live in the curriculum tables, which are empty — so they are
 * absent here rather than invented.
 */
export const CoursesPage = ({ onNotify }: { onNotify: (message: string) => void }) => {
  const load = useCallback(() => adminApi.courses({ limit: 1000 }), []);
  const { rows, error, loading, reload } = useRegistry<AdminCourse>(load, 'Reading the course catalog');
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('');

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

  return (
    <ConsolePage>
      <PageHeader
        crumb={['Registrar console', 'Curriculum']}
        title="Course Management"
        subtitle="Course offerings for the term, the subject each one teaches, and the instructor assigned to it."
        actions={
          <>
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
          <Table head={['Course code', 'Subject', 'Units', 'Term', 'Instructor', 'Status']}>
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
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </ConsolePage>
  );
};
