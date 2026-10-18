import { useState, type ReactNode } from 'react';
import {
  retractAcademicRecord,
  useAcademicRecords,
  type AttendanceRow,
  type GradeEntryRow,
} from '../../services/records';
import { describeApiError } from '../../services/api';
import { box, card, ghost } from './adminUi';

/**
 * Academic Records — the registrar's view of what the faculty have posted.
 *
 * Grades and attendance belong to the instructor who teaches the subject, so the
 * registrar's office does not write them here. What it does own is oversight:
 * which students have a posted record, who posted it and when, and the ability
 * to retract a submission that was made in error. Both lists come from the
 * authenticated `/portal/records/*` routes, so an admin sees the whole school
 * while a student or teacher sees only their own.
 */

type Props = {
  onNotify: (message: string) => void;
  footer?: ReactNode;
};

const when = (value: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value;
};

/** The subject codes inside one grade document, deduplicated. */
const codesOf = (entries: GradeEntryRow[]): string[] =>
  [...new Set(entries.map((entry) => entry.code || entry.course).filter(Boolean))];

export const AcademicRecords = ({ onNotify, footer }: Props) => {
  const grades = useAcademicRecords<GradeEntryRow>('grades');
  const attendance = useAcademicRecords<AttendanceRow>('attendance');
  const [busy, setBusy] = useState('');

  const refresh = () => {
    void grades.refresh();
    void attendance.refresh();
  };

  const withdraw = (module: 'grades' | 'attendance', itemId: string, label: string) => {
    setBusy(itemId);
    void (async () => {
      try {
        await retractAcademicRecord(module, itemId);
        onNotify(`${label} retracted`);
      } catch (error) {
        onNotify(describeApiError(error, 'Retracting the record'));
      } finally {
        setBusy('');
        refresh();
      }
    })();
  };

  const studentsWithGrades = new Set(grades.records.map((record) => record.studentId)).size;
  const studentsWithAttendance = new Set(attendance.records.map((record) => record.studentId)).size;
  const postedSubjects = new Set(grades.records.flatMap((record) => codesOf(record.entries))).size;
  const sessions = attendance.records.reduce((total, record) => total + record.entries.length, 0);
  const loading = grades.loading || attendance.loading;

  return (
    <section style={card}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Academic Records</h1>
          <p style={{ color: '#6b7890', fontSize: 13, margin: '6px 0 0' }}>
            What the faculty have posted to the student portal: one official document per student and term. Marks stay
            the instructor&rsquo;s record — the registrar&rsquo;s office monitors coverage and can retract a submission
            that was made in error.
          </p>
        </div>
        <button style={ghost} onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {(grades.error || attendance.error) && (
        <p style={{ ...box, color: '#b91c1c', fontWeight: 700, fontSize: 13 }}>
          {grades.error || attendance.error}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginTop: 16 }}>
        <Tile label="Students with posted grades" value={studentsWithGrades} />
        <Tile label="Subjects covered" value={postedSubjects} />
        <Tile label="Students with posted attendance" value={studentsWithAttendance} />
        <Tile label="Sessions recorded" value={sessions} />
      </div>

      <div style={{ ...box, padding: 0, overflow: 'hidden' }} data-record-panel="grades">
        <div style={{ padding: '14px 18px 0' }}>
          <strong style={{ fontSize: 15 }}>Posted grades</strong>
          <div style={{ fontSize: 12, color: '#6b7890' }}>
            {studentsWithGrades} student document{studentsWithGrades === 1 ? '' : 's'} • {postedSubjects} subject
            {postedSubjects === 1 ? '' : 's'}
          </div>
        </div>
        <div style={{ padding: 0, overflow: 'hidden', marginTop: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: 10 }}>Student</th>
                <th style={{ padding: 10 }}>Term</th>
                <th style={{ padding: 10 }}>Subjects</th>
                <th style={{ padding: 10 }}>Posted by</th>
                <th style={{ padding: 10 }}>Last updated</th>
                <th style={{ padding: 10 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {grades.records.map((record) => (
                <tr key={record.itemId} style={{ borderTop: '1px solid #eef1f6' }}>
                  <td style={{ padding: 10 }}>
                    <strong>{record.studentName || 'Unnamed student'}</strong>
                    <div style={{ fontSize: 11, color: '#6b7890' }}>{record.studentId}</div>
                  </td>
                  <td style={{ padding: 10 }}>
                    {record.semester}
                    <div style={{ fontSize: 11, color: '#6b7890' }}>AY {record.schoolYear}</div>
                  </td>
                  <td style={{ padding: 10 }}>
                    {codesOf(record.entries).join(', ') || '—'}
                    <div style={{ fontSize: 11, color: '#6b7890' }}>
                      {record.entries.length} row{record.entries.length === 1 ? '' : 's'}
                    </div>
                  </td>
                  <td style={{ padding: 10 }}>{record.updatedByName || record.postedByName || record.postedBy || '—'}</td>
                  <td style={{ padding: 10 }}>{when(record.updatedAt || record.postedAt)}</td>
                  <td style={{ padding: 10 }}>
                    <button
                      style={{ ...ghost, color: '#b91c1c' }}
                      disabled={busy === record.itemId}
                      onClick={() => withdraw('grades', record.itemId, `Grades for ${record.studentName || record.studentId}`)}
                    >
                      Withdraw
                    </button>
                  </td>
                </tr>
              ))}
              {!grades.records.length && (
                <tr>
                  <td colSpan={6} style={{ padding: 16, color: '#6b7890' }}>
                    No grades posted yet. Faculty publish them from the teacher dashboard&rsquo;s Grade Encoding page — the
                    student portal shows nothing until they do.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...box, padding: 0, overflow: 'hidden' }} data-record-panel="attendance">
        <div style={{ padding: '14px 18px 0' }}>
          <strong style={{ fontSize: 15 }}>Posted attendance</strong>
          <div style={{ fontSize: 12, color: '#6b7890' }}>
            {studentsWithAttendance} student document{studentsWithAttendance === 1 ? '' : 's'} • {sessions} session
            {sessions === 1 ? '' : 's'} recorded
          </div>
        </div>
        <div style={{ padding: 0, overflow: 'hidden', marginTop: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: 10 }}>Student</th>
                <th style={{ padding: 10 }}>Term</th>
                <th style={{ padding: 10 }}>Sessions</th>
                <th style={{ padding: 10 }}>Posted by</th>
                <th style={{ padding: 10 }}>Last updated</th>
                <th style={{ padding: 10 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attendance.records.map((record) => {
                const present = record.entries.filter((entry) => entry.status === 'Present').length;
                return (
                  <tr key={record.itemId} style={{ borderTop: '1px solid #eef1f6' }}>
                    <td style={{ padding: 10 }}>
                      <strong>{record.studentName || 'Unnamed student'}</strong>
                      <div style={{ fontSize: 11, color: '#6b7890' }}>{record.studentId}</div>
                    </td>
                    <td style={{ padding: 10 }}>
                      {record.semester}
                      <div style={{ fontSize: 11, color: '#6b7890' }}>AY {record.schoolYear}</div>
                    </td>
                    <td style={{ padding: 10 }}>
                      {record.entries.length}
                      <div style={{ fontSize: 11, color: '#6b7890' }}>
                        {present} present
                        {record.entries.length ? ` • ${Math.round((present / record.entries.length) * 100)}%` : ''}
                      </div>
                    </td>
                    <td style={{ padding: 10 }}>{record.updatedByName || record.postedByName || record.postedBy || '—'}</td>
                    <td style={{ padding: 10 }}>{when(record.updatedAt || record.postedAt)}</td>
                    <td style={{ padding: 10 }}>
                      <button
                        style={{ ...ghost, color: '#b91c1c' }}
                        disabled={busy === record.itemId}
                        onClick={() =>
                          withdraw('attendance', record.itemId, `Attendance for ${record.studentName || record.studentId}`)
                        }
                      >
                        Withdraw
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!attendance.records.length && (
                <tr>
                  <td colSpan={6} style={{ padding: 16, color: '#6b7890' }}>
                    No attendance posted yet. Faculty record it from the teacher dashboard&rsquo;s Attendance Tracker.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ fontSize: 11, color: '#6b7890', marginTop: 12 }}>
        Withdrawing removes the document from the student portal immediately; the faculty member can post it again from
        their own screen. Every post, update and withdrawal is written to the audit log.
      </p>
      {footer}
    </section>
  );
};

const Tile = ({ label, value }: { label: string; value: number }) => (
  <div style={{ border: '1px solid #eef2f8', borderRadius: 14, padding: 16, background: '#fbfcfe' }}>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6b7890' }}>
      {label}
    </div>
    <div style={{ fontSize: 24, fontWeight: 800, color: '#0f1f38', marginTop: 6 }}>{value}</div>
  </div>
);
