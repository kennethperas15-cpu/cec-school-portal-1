import { Fragment, useCallback, useMemo, useState } from 'react';
import { Download, RefreshCw, Search, ScrollText, Trash2, Undo2 } from 'lucide-react';
import { describeApiError } from '../../../services/api';
import { retractAcademicRecord, useAcademicRecords, type AcademicRecord, type GradeEntryRow } from '../../../services/records';
import { Badge, ConsolePage, EmptyState, ErrorNote, Kpi, Loading, Notes, PageHeader, Panel, Table, Toolbar } from './kit';
import { downloadCsv, matches, unique } from './registry';

const termOf = (record: AcademicRecord<GradeEntryRow>): string => `${record.schoolYear} • ${record.semester}`;

/**
 * The master gradebook, as the registrar sees it: every grade record a faculty
 * member has posted, one row per student and term, expandable to the marks it
 * contains. The portal owns no calculations here beyond what is stored, so the
 * table shows the encoded marks verbatim.
 */
export const GradesPage = ({ onNotify }: { onNotify: (message: string) => void }) => {
  const { records, loading, error, refresh } = useAcademicRecords<GradeEntryRow>('grades');
  const [term, setTerm] = useState('');
  const [section, setSection] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const sections = useMemo(() => unique(records.map((record) => record.section)), [records]);
  const terms = useMemo(() => unique(records.map(termOf)), [records]);

  const shown = useMemo(
    () =>
      records.filter(
        (record) =>
          matches(term, record.studentName, record.studentId, record.section, record.program, record.postedByName, ...record.entries.map((entry) => entry.code)) &&
          (section ? record.section === section : true),
      ),
    [records, term, section],
  );

  const entryCount = records.reduce((total, record) => total + record.entries.length, 0);
  const subjectCodes = unique(records.flatMap((record) => record.entries.map((entry) => entry.code)));

  const exportCsv = () => {
    downloadCsv(
      `cec-master-gradebook-${new Date().toISOString().slice(0, 10)}.csv`,
      ['School ID', 'Student', 'Section', 'Program', 'School year', 'Semester', 'Subject code', 'Subject', 'Prelim', 'Midterm', 'Final', 'Posted by', 'Posted at'],
      shown.flatMap((record) =>
        record.entries.map((entry) => [
          record.studentId,
          record.studentName,
          record.section,
          record.program,
          record.schoolYear,
          record.semester,
          entry.code,
          entry.course,
          entry.prelim,
          entry.midterm,
          entry.final,
          record.postedByName,
          record.postedAt,
        ]),
      ),
    );
    onNotify(`Exported the master gradebook (${shown.length} record${shown.length === 1 ? '' : 's'})`);
  };

  const retract = async (record: AcademicRecord<GradeEntryRow>) => {
    setBusy(record.itemId);
    try {
      await retractAcademicRecord('grades', record.itemId);
      onNotify(`Retracted the grade record for ${record.studentName || record.studentId}`);
      setConfirming(null);
      setExpanded(null);
      await refresh();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Retracting the grade record'));
    } finally {
      setBusy(null);
    }
  };

  const reload = useCallback(() => {
    void refresh();
  }, [refresh]);

  return (
    <ConsolePage>
      <PageHeader
        crumb={['Registrar console', 'Evaluation & registry']}
        title="Grades Management"
        subtitle="Every grade record posted by faculty, one row per student and term. Opening a row shows the exact marks that were encoded."
        actions={
          <>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={exportCsv} disabled={!shown.length}>
              <Download aria-hidden="true" />
              Export gradebook
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={reload} disabled={loading}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </button>
          </>
        }
      />

      {error ? <ErrorNote message={error} onRetry={reload} /> : null}

      <div className="ac-kpis">
        <Kpi label="Grade records posted" value={loading ? '—' : records.length.toLocaleString()} hint="student × term documents" tone={!loading && records.length === 0 ? 'empty' : 'default'} />
        <Kpi label="Students covered" value={loading ? '—' : unique(records.map((record) => record.studentId)).length.toLocaleString()} hint="school numbers with marks" tone="default" />
        <Kpi label="Subject entries" value={loading ? '—' : entryCount.toLocaleString()} hint="rows of encoded marks" tone="default" />
        <Kpi label="Subjects covered" value={loading ? '—' : subjectCodes.length.toLocaleString()} hint="distinct subject codes" tone="default" />
      </div>

      <Panel title="Master gradebook" subtitle={`Showing ${shown.length} of ${records.length} posted records.`} flush>
        <Toolbar>
          <label className="ac-field ac-search">
            <span className="ac-muted">
              <Search aria-hidden="true" style={{ width: 12, height: 12, verticalAlign: '-1px' }} /> Search
            </span>
            <input
              className="ac-input"
              placeholder="School ID, learner name, subject or faculty"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              aria-label="Search grade records"
            />
          </label>
          <label className="ac-field">
            <span>Section</span>
            <select className="ac-select" value={section} onChange={(event) => setSection(event.target.value)} aria-label="Filter by section">
              <option value="">All sections</option>
              {sections.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <span className="ac-muted" style={{ marginLeft: 'auto' }}>
            Terms on file: {terms.length ? terms.join(' · ') : 'none'}
          </span>
        </Toolbar>

        {loading ? (
          <Loading label="Reading the posted grade records…" />
        ) : shown.length === 0 ? (
          <EmptyState
            title={records.length === 0 ? 'No grade records posted yet' : 'No records match these filters'}
            message={
              records.length === 0
                ? 'Nothing has been posted. A record appears here the moment a faculty member publishes marks for a student, and it is the registrar who can retract it.'
                : 'Adjust the search or section filter to widen the result set.'
            }
          />
        ) : (
          <Table head={['Student', 'Section', 'Subjects', 'Posted by', 'Term', 'Posted', '']}>
            {shown.map((record) => (
              <Fragment key={record.itemId}>
                <tr>
                  <td>
                    <span className="ac-cell-stack">
                      <span className="ac-strong">{record.studentName || 'Unnamed student'}</span>
                      <span className="ac-mono">{record.studentId}</span>
                    </span>
                  </td>
                  <td>
                    <span className="ac-cell-stack">
                      <span>{record.section || '—'}</span>
                      <span className="ac-muted">{record.program || '—'}</span>
                    </span>
                  </td>
                  <td>{record.entries.length}</td>
                  <td>{record.postedByName || record.postedBy || '—'}</td>
                  <td className="ac-muted">{termOf(record)}</td>
                  <td className="ac-muted">
                    {record.postedAt ? new Date(record.postedAt).toLocaleString() : '—'}
                    <div>
                      <Badge tone={record.status === 'Posted' ? 'ok' : 'muted'}>{record.status || 'Posted'}</Badge>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ac-btn ac-btn--ghost"
                      onClick={() => setExpanded(expanded === record.itemId ? null : record.itemId)}
                      aria-expanded={expanded === record.itemId}
                    >
                      <ScrollText aria-hidden="true" />
                      {expanded === record.itemId ? 'Close' : 'Marks'}
                    </button>
                  </td>
                </tr>
                {expanded === record.itemId ? (
                  <tr>
                    <td colSpan={7} style={{ background: '#fbfdff' }}>
                      <div style={{ display: 'grid', gap: 12 }}>
                        {record.entries.length === 0 ? (
                          <span className="ac-muted">This record carries no subject entries.</span>
                        ) : (
                          <table className="ac-table">
                            <thead>
                              <tr>
                                <th scope="col">Subject code</th>
                                <th scope="col">Subject as encoded</th>
                                <th scope="col">Prelim</th>
                                <th scope="col">Midterm</th>
                                <th scope="col">Final</th>
                              </tr>
                            </thead>
                            <tbody>
                              {record.entries.map((entry) => (
                                <tr key={`${entry.code}-${entry.course}`}>
                                  <td className="ac-mono ac-strong">{entry.code || '—'}</td>
                                  <td>{entry.course || '—'}</td>
                                  <td>{entry.prelim || '—'}</td>
                                  <td>{entry.midterm || '—'}</td>
                                  <td>{entry.final || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        <div className="ac-actions">
                          {confirming === record.itemId ? (
                            <>
                              <span className="ac-muted">
                                Retracting removes this record for {record.studentName || record.studentId}. The student stops seeing it and the
                                audit trail keeps the deletion.
                              </span>
                              <button type="button" className="ac-btn ac-btn--danger" disabled={busy === record.itemId} onClick={() => void retract(record)}>
                                <Trash2 aria-hidden="true" />
                                {busy === record.itemId ? 'Retracting…' : 'Confirm retract'}
                              </button>
                              <button type="button" className="ac-btn ac-btn--ghost" onClick={() => setConfirming(null)}>
                                <Undo2 aria-hidden="true" />
                                Keep record
                              </button>
                            </>
                          ) : (
                            <button type="button" className="ac-btn ac-btn--danger" onClick={() => setConfirming(record.itemId)}>
                              <Trash2 aria-hidden="true" />
                              Retract record
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </Table>
        )}
      </Panel>

      <Notes>
        <strong>Where these rows come from.</strong> Faculty publish one document per student and term; the registrar reads all of them and
        is the only role besides the author who can retract one. Nothing is recalculated here — the marks shown are the marks encoded.
      </Notes>
    </ConsolePage>
  );
};
