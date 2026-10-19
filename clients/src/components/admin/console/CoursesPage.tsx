import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, PencilLine, Plus, RefreshCw, Search, Trash2, Undo2 } from 'lucide-react';
import { describeApiError } from '../../../services/api';
import { adminApi, fullName, type AdminCourse, type AdminMeeting, type AdminTeacher } from '../../../services/admin';
import { semesterNo, useAcademicConfig } from '../../../services/academicConfig';
import { Badge, ConsolePage, EmptyState, ErrorNote, Kpi, Loading, Notes, PageHeader, Panel, Table, Toolbar } from './kit';
import { downloadCsv, humanise, matches, unique, useRegistry } from './registry';

/**
 * The course catalog as the database holds it: an offering for a term, tied to
 * the subject it teaches, the instructor assigned to it and the weekly meetings
 * it runs. Opening a course creates the subject when its code is new, closing it
 * stops new enrollment, and a course with no scheduled meetings can be removed
 * outright.
 *
 * The meetings matter beyond this screen: they are the schedule a student picks
 * the course by in their own portal, so the same offering is what the registrar
 * opens here and what a student enrolls in there.
 */

/** A meeting while it is being typed, before it is sent. */
type MeetingDraft = { dayOfWeek: number; startTime: string; endTime: string; room: string };

const WEEKDAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const DAY_SHORT = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const blankMeeting = (): MeetingDraft => ({ dayOfWeek: 1, startTime: '08:00', endTime: '09:00', room: '' });

/** `"08:00"` -> `"08:00 AM"`, the way the timetable columns read. */
const clock = (value: string): string => {
  const match = /^(\d{2}):(\d{2})/.exec(value ?? '');
  if (!match) return value || '—';
  const hour = Number(match[1]);
  return `${String(hour % 12 === 0 ? 12 : hour % 12).padStart(2, '0')}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`;
};

/** Days that share a time and room read as one line: "Mon / Wed 08:00 AM – 09:00 AM · Room 204". */
const meetingSummary = (meetings: AdminMeeting[]): string => {
  if (!meetings?.length) return '';
  const groups = new Map<string, string[]>();
  for (const meeting of meetings) {
    const day = DAY_SHORT[Number(meeting.dayOfWeek)] ?? '';
    if (!day) continue;
    const key = `${meeting.startTime}|${meeting.endTime}|${meeting.room ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), day]);
  }
  return [...groups.entries()]
    .map(([key, days]) => {
      const [start, end, room] = key.split('|');
      return `${days.join(' / ')} ${clock(start)} – ${clock(end)}${room ? ` · ${room}` : ''}`;
    })
    .join('   |   ');
};

const asPayload = (meetings: MeetingDraft[]) =>
  meetings.map((meeting) => ({
    dayOfWeek: Number(meeting.dayOfWeek),
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    room: meeting.room.trim(),
  }));

/** The meeting editor, shared by the create and the edit panels. */
const MeetingFields = ({ meetings, onChange }: { meetings: MeetingDraft[]; onChange: (next: MeetingDraft[]) => void }) => {
  const patch = (index: number, change: Partial<MeetingDraft>) =>
    onChange(meetings.map((meeting, position) => (position === index ? { ...meeting, ...change } : meeting)));
  return (
    <div className="ac-field" style={{ gridColumn: '1 / -1' }}>
      <span>Weekly meetings — the schedule a student picks this course by</span>
      {meetings.map((meeting, index) => (
        <div className="ac-actions" key={index}>
          <select
            className="ac-select"
            style={{ maxWidth: 160 }}
            value={meeting.dayOfWeek}
            onChange={(event) => patch(index, { dayOfWeek: Number(event.target.value) })}
            aria-label={`Meeting ${index + 1} day`}
          >
            {WEEKDAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
          <input
            className="ac-input"
            style={{ maxWidth: 150 }}
            type="time"
            value={meeting.startTime}
            onChange={(event) => patch(index, { startTime: event.target.value })}
            aria-label={`Meeting ${index + 1} start time`}
          />
          <input
            className="ac-input"
            style={{ maxWidth: 150 }}
            type="time"
            value={meeting.endTime}
            onChange={(event) => patch(index, { endTime: event.target.value })}
            aria-label={`Meeting ${index + 1} end time`}
          />
          <input
            className="ac-input"
            style={{ maxWidth: 220 }}
            value={meeting.room}
            onChange={(event) => patch(index, { room: event.target.value })}
            aria-label={`Meeting ${index + 1} room`}
            placeholder="Room (optional)"
          />
          <button
            type="button"
            className="ac-btn ac-btn--ghost"
            onClick={() => onChange(meetings.filter((_, position) => position !== index))}
            aria-label={`Remove meeting ${index + 1}`}
          >
            <Trash2 aria-hidden="true" />
            Remove
          </button>
        </div>
      ))}
      <div className="ac-actions">
        <button type="button" className="ac-btn ac-btn--ghost" onClick={() => onChange([...meetings, blankMeeting()])}>
          <Plus aria-hidden="true" />
          {meetings.length ? 'Add another day' : 'Add a weekly meeting'}
        </button>
        <span className="ac-muted">
          Leaving this empty is fine: the course is still offered, and students see “Schedule to be announced” until a meeting is set.
        </span>
      </div>
    </div>
  );
};

export const CoursesPage = ({ onNotify }: { onNotify: (message: string) => void }) => {
  const academic = useAcademicConfig();
  const load = useCallback(() => adminApi.courses({ limit: 1000 }), []);
  const { rows, error, loading, reload } = useRegistry<AdminCourse>(load, 'Reading the course catalog');
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('');
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState({ code: '', subjectName: '', units: '3', description: '', status: 'open', teacherId: '', meetings: [] as MeetingDraft[] });
  const [editing, setEditing] = useState<AdminCourse | null>(null);
  const [editDraft, setEditDraft] = useState({ subjectName: '', units: '3', teacherId: '', status: 'open', meetings: [] as MeetingDraft[] });
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
      ['Course code', 'Subject code', 'Subject title', 'Units', 'School year', 'Semester', 'Instructor', 'Status', 'Weekly meetings'],
      shown.map((row) => [
        row.code,
        row.subject_code,
        row.subject_name,
        row.units,
        row.school_year,
        row.semester,
        fullName({ first_name: row.teacher_first_name, last_name: row.teacher_last_name }),
        row.status,
        meetingSummary(row.meetings),
      ]),
    );
    onNotify(`Exported ${shown.length} course${shown.length === 1 ? '' : 's'}`);
  };

  const open = shown.filter((row) => row.status === 'open').length;
  const units = shown.reduce((total, row) => total + (Number(row.units) || 0), 0);
  const scheduled = shown.filter((row) => (row.meetings ?? []).length > 0).length;

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
        meetings: asPayload(draft.meetings),
      });
      onNotify(`${draft.code.trim()} opened for ${academic.schoolYear} (course ${created?.id ?? 'created'})`);
      setDraft({ code: '', subjectName: '', units: '3', description: '', status: 'open', teacherId: '', meetings: [] });
      setComposing(false);
      await reload();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Opening the course'));
    } finally {
      setSaving(false);
    }
  };

  /** Open the edit form with the course and its meetings exactly as they are. */
  const startEdit = (row: AdminCourse) => {
    setComposing(false);
    setEditing(row);
    setEditDraft({
      subjectName: row.subject_name ?? row.code,
      units: String(row.units ?? 3),
      teacherId: row.teacher_id ?? '',
      status: row.status ?? 'open',
      meetings: (row.meetings ?? []).map((meeting) => ({
        dayOfWeek: Number(meeting.dayOfWeek),
        startTime: (meeting.startTime ?? '').slice(0, 5),
        endTime: (meeting.endTime ?? '').slice(0, 5),
        room: meeting.room ?? '',
      })),
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editDraft.subjectName.trim()) {
      onNotify('A subject title is required');
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateCourse(editing.id, {
        subjectName: editDraft.subjectName.trim(),
        units: Number(editDraft.units) || 0,
        teacherId: editDraft.teacherId,
        status: editDraft.status,
        meetings: asPayload(editDraft.meetings),
      });
      onNotify(`${editing.code} updated`);
      setEditing(null);
      await reload();
    } catch (failure) {
      onNotify(describeApiError(failure, 'Saving the course'));
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
      // The course is still there, so stop asking: the reason is the message.
      setConfirming(null);
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
            <button
              type="button"
              className="ac-btn"
              onClick={() => {
                setEditing(null);
                setComposing((value) => !value);
              }}
            >
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
            <MeetingFields meetings={draft.meetings} onChange={(meetings) => setDraft({ ...draft, meetings })} />
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

      {editing ? (
        <Panel title={`Edit ${editing.code}`} subtitle={`Offered for ${editing.school_year ?? '—'}${editing.semester ? `, semester ${editing.semester}` : ''}. Students see these changes on the course they pick.`}>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label className="ac-field">
              <span>Subject title</span>
              <input
                className="ac-input"
                value={editDraft.subjectName}
                onChange={(event) => setEditDraft({ ...editDraft, subjectName: event.target.value })}
                aria-label="Subject title"
              />
            </label>
            <label className="ac-field">
              <span>Units</span>
              <input
                className="ac-input"
                value={editDraft.units}
                onChange={(event) => setEditDraft({ ...editDraft, units: event.target.value })}
                aria-label="Course units"
                inputMode="decimal"
              />
            </label>
            <label className="ac-field">
              <span>Instructor</span>
              <select className="ac-select" value={editDraft.teacherId} onChange={(event) => setEditDraft({ ...editDraft, teacherId: event.target.value })} aria-label="Course instructor">
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
              <select className="ac-select" value={editDraft.status} onChange={(event) => setEditDraft({ ...editDraft, status: event.target.value })} aria-label="Course status">
                <option value="open">Open for enrollment</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <MeetingFields meetings={editDraft.meetings} onChange={(meetings) => setEditDraft({ ...editDraft, meetings })} />
          </div>
          <div className="ac-actions" style={{ marginTop: 14 }}>
            <button type="button" className="ac-btn" onClick={() => void saveEdit()} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="ac-btn ac-btn--ghost" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </button>
            <span className="ac-muted">A student already enrolled stays enrolled if the course closes; the course is only hidden from new picks.</span>
          </div>
        </Panel>
      ) : null}

      <div className="ac-kpis">
        <Kpi label="Course offerings" value={rows === null ? '—' : rows.length.toLocaleString()} hint="courses on record" tone={rows && rows.length === 0 ? 'empty' : 'default'} />
        <Kpi label="Open this term" value={rows === null ? '—' : open.toLocaleString()} hint="accepting enrollment" tone={open ? 'default' : 'empty'} />
        <Kpi label="Scheduled" value={rows === null ? '—' : scheduled.toLocaleString()} hint="with weekly meetings set" tone={scheduled ? 'default' : 'empty'} />
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
          <Table head={['Course code', 'Subject', 'Units', 'Term', 'Instructor', 'Weekly meetings', 'Status', 'Action']}>
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
                <td className="ac-muted">{row.meetings?.length ? meetingSummary(row.meetings) : 'Not scheduled'}</td>
                <td>
                  <Badge tone={row.status === 'open' ? 'ok' : row.status === 'archived' ? 'muted' : 'warn'}>{humanise(row.status)}</Badge>
                </td>
                <td>
                  <div className="ac-actions">
                    <button type="button" className="ac-btn ac-btn--ghost" disabled={busy === row.id} onClick={() => startEdit(row)}>
                      <PencilLine aria-hidden="true" />
                      Edit
                    </button>
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

      <Notes>
        <strong>What students see.</strong> Every course left <em>open</em> for the live term appears in the student portal as an
        offering they can enroll in, with the weekly meetings listed above as its schedule — so the meetings entered here are the
        schedule a student picks the course by. A course with no meeting still appears, marked “Schedule to be announced”.
        Closing a course takes it out of the portal's list but keeps the students already enrolled in it, and a course that has
        meetings can be closed but not removed until those meetings are cleared.
      </Notes>
    </ConsolePage>
  );
};
