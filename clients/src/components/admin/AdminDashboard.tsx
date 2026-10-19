import { Fragment, useEffect, useState, type ReactNode } from 'react';

import { useCollection, uid } from '../../services/crud';
import { useTheme } from '../../services/theme';
import { portalApi } from '../../services/portal';
import { adminApi, fullName } from '../../services/admin';
import api, { clearTokens, describeApiError } from '../../services/api';
import {
  DELIVERY_MODES,
  daysOfStudyLoad,
  entriesFromStudyLoad,
  fetchTimetables,
  normalizeSection,
  publishTimetable,
  timetableKey,
  unpublishTimetable,
  type TimetableRecord,
} from '../../services/schedule';
import { pushNotification } from '../../services/notify';
import { setPhoto, readPhotoFile } from '../../services/photos';
import { AlertPopup } from '../shared/AlertPopup';
import { DashboardCommandMenu } from '../shared/DashboardCommandMenu';
import { NotificationCenter } from '../shared/NotificationCenter';
import { openEditDialog } from '../shared/EditDialog';
import { DashboardShell } from '../shared/DashboardShell';
import { semesterNo, useAcademicConfig } from '../../services/academicConfig';
import { box, btn, card, ghost, inp } from './adminUi';
import { DashboardPage } from './console/DashboardPage';
import { StudentsPage } from './console/StudentsPage';
import { TeachersPage } from './console/TeachersPage';
import { CoursesPage } from './console/CoursesPage';
import { AccountsPage } from './console/AccountsPage';
import { ActivityLogsPage } from './console/ActivityLogsPage';
import { SettingsPage } from './console/SettingsPage';
import { AnnouncementsPage } from './console/AnnouncementsPage';
import { GradesPage } from './console/GradesPage';
import { AttendancePage } from './console/AttendancePage';
import { EnrollmentPage } from './console/EnrollmentPage';
import { ClassSchedulePage } from './console/ClassSchedulePage';

type Props = { currentUser: { firstName: string; lastName: string; role: string; id?: string; email?: string; schoolId?: string } | null; onNotify: (t: string) => void; onLogout: () => void; };
const NAVY = '#0B3D91';
const BASE = import.meta.env.BASE_URL || '/';
type Group = { id: string; label: string; icon: string; items: { label: string; route: string }[] };
/**
 * The console's navigation, exactly as the institutional design lays it out: the
 * registrar's twelve screens, flat, and nothing else. Screens the design does not
 * list are still reachable from where they belong (the study load builder from
 * Class Schedule, the financial desk from a student's own finance pages) but they
 * are not navigation modules and do not appear here.
 */
const GROUPS: Group[] = [
  {
    id: 'console',
    label: '',
    icon: '',
    items: [
      { label: 'Dashboard', route: 'a_dashboard' },
      { label: 'Student Management', route: 'a_students' },
      { label: 'Teacher Management', route: 'a_teachers' },
      { label: 'Course Management', route: 'a_courses' },
      { label: 'Class Schedule', route: 'a_class_schedule' },
      { label: 'Enrollment Management', route: 'a_enrollments' },
      { label: 'Grades Management', route: 'a_grades' },
      { label: 'Attendance Management', route: 'a_attendance' },
      { label: 'User Accounts', route: 'a_user_accounts' },
      { label: 'Announcements', route: 'a_announcements' },
      { label: 'Settings', route: 'a_settings' },
      { label: 'Activity Logs', route: 'a_activity_logs' },
    ],
  },
];
/**
 * Screens the design leaves out of the navigation but that still hold real
 * functionality: they stay reachable through the links that belong to them, so a
 * registrar is never sent to a blank route.
 */
const OFF_NAV_SCREENS = [
  'Study Load Builder',
  'Document Verification',
  'Status Monitoring',
  'Account Creation',
  'Password Reset',
  'Teacher Records',
  'Load Assignment',
  'Credentials',
  'Broadcast Messaging',
  'Backup & Restore',
  'Security',
  'Billing & Invoices',
  'Fee Structure',
  'Payment Monitoring',
  'Scholarships',
];
const pill: React.CSSProperties = { border: '1px solid #e4ebf5', background: '#f8fbff', borderRadius: 999, padding: '6px 12px', fontSize: 12, color: '#5b6b82', fontWeight: 600 };
type Rec3 = { id: string; name: string; role: string };
type Col3 = { list: Rec3[]; create: (x: { id?: string; name: string; role: string }) => void; update: (id: string, p: Partial<Rec3>) => void; remove: (id: string) => void };

const AdminTable = ({ title, col, colA, colB, phA, phB, onNotify, footer }: { title: string; col: Col3; colA: string; colB: string; phA: string; phB: string; onNotify: (t: string) => void; footer: ReactNode }) => {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  return (<section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>{title}</h1>
    <form style={{ display: 'flex', gap: 8, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (!a.trim()) return; col.create({ id: uid('x'), name: a.trim(), role: b.trim() || '—' }); setA(''); setB(''); onNotify(`${title} record created`); }}>
      <input style={inp} placeholder={phA} value={a} onChange={(e) => setA(e.target.value)} aria-label={phA} />
      <input style={inp} placeholder={phB} value={b} onChange={(e) => setB(e.target.value)} aria-label={phB} />
      <button style={btn} type="submit">Add</button>
    </form>
    <div style={{ ...box, padding: 0, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 12 }}>{colA}</th><th style={{ padding: 12 }}>{colB}</th><th style={{ padding: 12 }}>Actions</th></tr></thead><tbody>{col.list.map((r) => <tr key={r.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><strong>{r.name}</strong><div style={{ fontSize: 11, color: '#6b7890' }}>{r.id}</div></td><td style={{ padding: 12 }}>{r.role}</td><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 6 }}><button style={ghost} onClick={() => { openEditDialog(`Edit ${colB}`, r.role, (v) => { col.update(r.id, { role: v }); onNotify('Updated'); }); }}>Edit</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { col.remove(r.id); onNotify('Deleted'); }}>Delete</button></div></td></tr>)}{!col.list.length && <tr><td colSpan={3} style={{ padding: 16, color: '#6b7890' }}>No records yet.</td></tr>}</tbody></table></div>{footer}</section>);
};



export const AdminDashboard = ({ currentUser, onNotify, onLogout }: Props) => {
  const [active, setActive] = useState('Dashboard');
  const [expanded, setExpanded] = useState('home');
  const [collapsed, setCollapsed] = useState(false);
  // Mobile: start shut, auto-close after each navigation so content is usable
  useEffect(() => {
    try {
      if (window.innerWidth < 800) setCollapsed(true);
    } catch { /* non-browser render */ }
  }, [active]);
  const { dark, toggle } = useTheme();
  const academicConfig = useAcademicConfig();
  // v2 stores: pre-launch — no demo students, teachers, or payments (all start empty)
  const rooms = useCollection<{ id: string; name: string; role: string }>('a_rooms_v2', []);
  const offers = useCollection<{ id: string; name: string; role: string }>('a_offers_v2', []);
  const loads = useCollection<{ id: string; name: string; role: string }>('a_loads_v2', []);
  const [perms, setPerms] = useState<Record<string, boolean>>({ 'Teacher-Students': true, 'Teacher-Teachers': true, 'Admin-Students': true, 'Admin-Teachers': true, 'Admin-Finance': true, 'Admin-Admin': true });
  const [fn, setFn] = useState(''); const [fi, setFi] = useState(''); const [fr, setFr] = useState('student');
  const [enrN, setEnrN] = useState(''); const [enrM, setEnrM] = useState('BSIT • Applied');
  const [walkN, setWalkN] = useState(''); const [walkE, setWalkE] = useState(''); const [walkP, setWalkP] = useState('');
  const [autoApprove, setAutoApprove] = useState(() => { try { return localStorage.getItem('cec:auto_approve') === '1'; } catch { return false; } });
  const [boxVal, setBoxVal] = useState('');
  // Study-load builder draft (unified subject + teacher + room + schedule)
  const [slSubject, setSlSubject] = useState('');
  const [slTeacher, setSlTeacher] = useState('');
  /** The faculty roster the builder's teacher field suggests, read from the registry. */
  const [teacherOptions, setTeacherOptions] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    let live = true;
    adminApi
      .teachers({ limit: 500 })
      .then((rows) => {
        if (live) setTeacherOptions(rows.map((row) => ({ id: row.id, name: fullName(row) })));
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);
  const [slRoom, setSlRoom] = useState('');
  const [slDays, setSlDays] = useState<string[]>(['M', 'W', 'F']);
  const [slStart, setSlStart] = useState('08:00');
  const [slEnd, setSlEnd] = useState('09:30');
  const [slSection, setSlSection] = useState('');
  const [slCap, setSlCap] = useState('40');
  const studyloads = useCollection<{ id: string; name: string; role: string; meta: string; subject: string; teacher: string; room: string; days: string[]; start: string; end: string; section: string; cap: string; batch: number; code?: string; units?: string; kind?: string }>('a_studyloads_v2', []);
  // Publishing the batch builds the official timetable students see.
  const [slCode, setSlCode] = useState('');
  const [slUnits, setSlUnits] = useState('');
  const [slKind, setSlKind] = useState<string>(DELIVERY_MODES[0]);
  const [published, setPublished] = useState<TimetableRecord[]>([]);
  const [publishing, setPublishing] = useState(false);
  const loadPublished = () => {
    fetchTimetables().then(setPublished).catch(() => undefined);
  };
  useEffect(() => {
    loadPublished();
  }, []);
  const [slMax, setSlMax] = useState(() => {
    try {
      return Math.max(1, Number(localStorage.getItem('cec:sl_batch_max')) || 8);
    } catch {
      return 8;
    }
  });
  const [slSubmitted, setSlSubmitted] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cec:sl_submitted') ?? '[]') as number[];
    } catch {
      return [];
    }
  });
  const setBatchMax = (v: number) => {
    const max = Math.max(1, Math.min(99, Math.floor(v) || 8));
    setSlMax(max);
    try {
      localStorage.setItem('cec:sl_batch_max', String(max));
    } catch { /* ignore */ }
  };
  const [boxDetail, setBoxDetail] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState<'all' | 'students' | 'teachers'>('all');
  const [broadcastCategory, setBroadcastCategory] = useState<'General' | 'Urgent' | 'Events'>('General');
  const [facId, setFacId] = useState('');
  const [remoteReceipts, setRemoteReceipts] = useState<{ id: string; title: string; detail?: string | null; status?: string | null }[]>([]);
  useEffect(() => {
    portalApi.items(undefined, 'receipt').then((rows) => setRemoteReceipts(rows)).catch(() => undefined);
  }, []);
  const [resetWho, setResetWho] = useState('');
  const [docTick, setDocTick] = useState(0);
  const bumpDocs = () => setDocTick((t) => t + 1);
  const [popup, setPopup] = useState<{ title: string; message: string; lines?: string[] } | null>(null);
  const [photoTick, setPhotoTick] = useState(0);
  const [photoError, setPhotoError] = useState('');
  const myPhotoId = currentUser?.schoolId || currentUser?.id || 'admin';

  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError('');
    try {
      const url = await readPhotoFile(file);
      setPhoto(myPhotoId, url);
      setPhotoTick((t) => t + 1);
      onNotify('Profile photo updated');
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Could not read that image.');
    }
  };


  // Explicit registrar stepping stones — the ONLY way stages advance:
  // Docs ✓ → Approve → Enroll (row leaves the queue only when Enrolled/Rejected)
  const toggleAuto = () => {
    setAutoApprove((v) => {
      try { localStorage.setItem('cec:auto_approve', v ? '0' : '1'); } catch { /* ignore */ }
      onNotify(v ? 'Auto-approve OFF — applications need admin review' : 'Auto-approve ON — new applications approved automatically');
      return !v;
    });
  };
  const route = GROUPS.flatMap((g) => g.items).find((i) => i.label === active)?.route ?? 'a_dashboard';
  const moduleItems = ['Dashboard', ...GROUPS.flatMap((g) => g.items.map((item) => item.label)), ...OFF_NAV_SCREENS];
  const navigate = (label: string) => setActive(moduleItems.includes(label) ? label : 'Dashboard');
  // The command menu searches the console's own screens: the registry lists live
  // on their pages, and a stale local copy must never be what a search returns.
  const searchRecords = GROUPS.flatMap((group) => group.items).map((item) => ({
    title: item.label,
    detail: 'Administrator screen',
    target: item.label,
  }));

  const footer = null;

  const table = (title: string, cols: string[], rows: React.ReactNode, form?: React.ReactNode) => (
    <section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>{title}</h1>{form}<div style={{ ...box, padding: 0, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>{cols.map((c) => <th key={c} style={{ padding: 12 }}>{c}</th>)}</tr></thead><tbody>{rows}</tbody></table></div>{footer}</section>
  );

  const render = () => {
    // Registrar console: rebuilt against the institutional design.
    if (active === 'Dashboard') return <DashboardPage firstName={currentUser?.firstName} onNotify={onNotify} onNavigate={navigate} />;
    if (active === 'Student Management') return <StudentsPage onNotify={onNotify} />;
    if (active === 'Teacher Management') return <TeachersPage onNotify={onNotify} />;
    if (active === 'Course Management') return <CoursesPage onNotify={onNotify} />;
    if (active === 'User Accounts') return <AccountsPage onNotify={onNotify} onNavigate={navigate} identifier={currentUser?.email ?? ''} />;
    if (active === 'Activity Logs') return <ActivityLogsPage onNotify={onNotify} />;
    if (active === 'Settings') return <SettingsPage onNotify={onNotify} />;
    if (active === 'Announcements') return <AnnouncementsPage onNotify={onNotify} />;
    if (active === 'Grades Management') return <GradesPage onNotify={onNotify} />;
    if (active === 'Attendance Management') return <AttendancePage onNotify={onNotify} />;
    if (active === 'Enrollment Management') return <EnrollmentPage onNotify={onNotify} onNavigate={navigate} />;
    if (active === 'Class Schedule') return <ClassSchedulePage onNotify={onNotify} onNavigate={navigate} />;
    if (active === 'Study Load Builder') {
      const DAYS = ['M', 'T', 'W', 'TH', 'F', 'S'];
      const toggleDay = (d: string) => setSlDays((days) => (days.includes(d) ? days.filter((x) => x !== d) : [...days, d]));
      const to12h = (t: string) => {
        const [hh, mm] = t.split(':').map(Number);
        if (!Number.isFinite(hh) || !Number.isFinite(mm)) return t;
        const suffix = hh >= 12 ? 'PM' : 'AM';
        const h12 = hh % 12 === 0 ? 12 : hh % 12;
        return `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${suffix}`;
      };
      // Publish a completed batch so students can plot it in Section Selection,
      // and push the same timetable to the live portal so it appears in the
      // student's Class Schedule on any device. One published document per
      // section; publishing again updates it in place.
      const submitBatch = async (batch: number) => {
        const rows = studyloads.list.filter((s) => (s.batch ?? 1) === batch);
        if (!rows.length) return;
        try {
          const offerings = rows.map((s) => {
            const [code, ...rest] = (s.subject ?? s.name).split('—');
            return {
              edp: s.id,
              subject: (code ?? s.name).trim(),
              descriptive: (rest.join('—') || s.name).trim(),
              schedule: `${(s.days ?? []).join('')} ${to12h(s.start ?? '')}-${to12h(s.end ?? '')}`,
              room: s.room ?? '',
              teacher: s.teacher ?? '',
              type: (s.kind ?? '').trim() || 'Lec',
              units: s.units?.trim() ? Number(s.units) : 3,
              section: s.section ?? '',
              batch,
              cap: Number(s.cap) || undefined,
            };
          });
          const raw = localStorage.getItem('cec:studyload_offerings');
          const existing = raw ? (JSON.parse(raw) as { edp: string; batch?: number }[]) : [];
          const kept = existing.filter((o) => o.batch !== batch);
          localStorage.setItem('cec:studyload_offerings', JSON.stringify([...kept, ...offerings]));
        } catch {
          onNotify('Could not submit batch — storage unavailable');
          return;
        }

        // Group the batch by section: each section becomes one published document.
        const bySection = new Map<string, typeof rows>();
        rows.forEach((row) => {
          const section = normalizeSection(row.section ?? '');
          if (!section) return;
          bySection.set(section, [...(bySection.get(section) ?? []), row]);
        });
        if (!bySection.size) {
          onNotify('Give every study load a section code, then publish again');
          return;
        }

        // A class with no resolvable day would publish a section that is missing a
        // subject — students would read an incomplete timetable as official. Refuse
        // the batch instead, and name what has to be fixed.
        const unresolved = rows.filter((row) => !daysOfStudyLoad(row).length);
        if (unresolved.length) {
          const names = unresolved.map((row) => row.name || row.id).slice(0, 2).join(', ');
          onNotify(
            `${unresolved.length} class${unresolved.length === 1 ? '' : 'es'} in this batch has no class day (${names}). Nothing was published — pick the day${unresolved.length === 1 ? '' : 's'} and press publish again.`,
          );
          return;
        }

        setPublishing(true);
        let created = 0;
        let updated = 0;
        const failures: string[] = [];
        try {
          for (const [section, list] of bySection) {
            const entries = list
              .flatMap((row, index) => entriesFromStudyLoad(row, index))
              .filter((entry) => /^\d{2}:\d{2}$/.test(entry.start) && /^\d{2}:\d{2}$/.test(entry.end));
            if (!entries.length) {
              failures.push(`${section}: no class with a valid day and time`);
              continue;
            }
            const current = published.find(
              (item) =>
                timetableKey(item.schoolYear, item.semester, item.section) ===
                timetableKey(academicConfig.schoolYear, academicConfig.semester, section),
            ) ?? null;
            try {
              const result = await publishTimetable({
                schoolYear: academicConfig.schoolYear,
                semester: academicConfig.semester,
                section,
                entries,
                publishedBy: currentUser?.email ?? '',
                publishedByName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Registrar',
                existing: current,
              });
              if (result.created) created += 1;
              else updated += 1;
            } catch (error) {
              failures.push(`${section}: ${describeApiError(error, 'Publishing')}`);
            }
          }
        } finally {
          setPublishing(false);
          loadPublished();
        }

        const done = [...new Set([...slSubmitted, batch])];
        setSlSubmitted(done);
        try {
          localStorage.setItem('cec:sl_submitted', JSON.stringify(done));
        } catch { /* ignore */ }

        if (failures.length) {
          onNotify(
            `${failures.length} section${failures.length === 1 ? '' : 's'} failed — ${failures[0]}`,
          );
          return;
        }
        pushNotification(['student'], {
          title: `New schedules published: Batch ${batch}`,
          detail: `${bySection.size} section${bySection.size === 1 ? '' : 's'} (${rows.length} classes) are now live in the student portal.`,
          category: 'Academic',
          target: 'Class Schedule',
        });
        onNotify(
          `Batch ${batch} published — ${created} new section${created === 1 ? '' : 's'}, ${updated} updated. Students can see it now.`,
        );
      };
      const addStudyLoad = (e: React.FormEvent) => {
        e.preventDefault();
        if (!slSubject.trim() || !slTeacher.trim() || !slRoom.trim() || !slSection.trim()) {
          onNotify('Fill in subject, teacher, room, and section');
          return;
        }
        if (!slDays.length) {
          onNotify('Pick at least one class day');
          return;
        }
        if (!slStart || !slEnd || slStart >= slEnd) {
          onNotify('Set a valid time range (start before end)');
          return;
        }
        const cap = Math.max(1, Number(slCap) || 0);
        const sched = `${slDays.join('')} ${slStart}–${slEnd}`;
        // Normalize every field so cosmetic differences (case, spacing, day
        // order) can never slip past as a "different" load.
        const norm = (s: string) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
        const normDays = (days: string[] = []) => [...days].map((d) => d.trim().toUpperCase()).sort().join('');
        const capOf = (s: { cap?: string; meta: string }) =>
          (s.cap ?? '').trim() || (/capacity\s+(\d+)/i.exec(s.meta ?? '')?.[1] ?? '');
        const signature = (s: { subject?: string; teacher?: string; room?: string; section?: string; days?: string[]; start?: string; end?: string; cap?: string; meta: string; name: string; role: string }) => {
          // Legacy rows (saved before structured fields) fall back to parsed display text.
          const subject = norm(s.subject ?? s.name.split('•')[0] ?? '');
          const section = norm(s.section ?? s.name.split('•')[1] ?? '').toUpperCase();
          const parts = (s.role ?? '').split('•').map((p) => p.trim());
          const teacher = norm(s.teacher ?? parts[0] ?? '');
          const room = norm(s.room ?? parts[1] ?? '');
          return [subject, teacher, room, section, normDays(s.days), (s.start ?? '').trim(), (s.end ?? '').trim(), capOf(s)].join('|');
        };
        const draftSig = [
          norm(slSubject), norm(slTeacher), norm(slRoom), norm(slSection).toUpperCase(),
          normDays(slDays), slStart.trim(), slEnd.trim(), String(cap),
        ].join('|');
        // 1) Identical inputs to a previous load — blocked, no exceptions.
        const identical = studyloads.list.find((s) => signature(s) === draftSig);
        if (identical) {
          onNotify(`Identical study load already exists — "${identical.name}" (${identical.id}). Nothing was created.`);
          return;
        }
        const daysOverlap = (a: string[] = [], b: string[] = []) => a.some((d) => b.includes(d));
        const timeOverlap = (aStart: string, aEnd: string, bStart = '', bEnd = '') =>
          !!bStart && !!bEnd && aStart < bEnd && bStart < aEnd;
        // 2) Same subject + section at an overlapping time.
        const duplicate = studyloads.list.find((s) =>
          norm(s.subject ?? '') === norm(slSubject) &&
          norm(s.section ?? '') === norm(slSection) &&
          daysOverlap(s.days, slDays) && timeOverlap(slStart, slEnd, s.start, s.end));
        if (duplicate) {
          onNotify(`Duplicate blocked — "${duplicate.name}" already runs at ${duplicate.role.split('•').slice(-1)[0].trim()}`);
          return;
        }
        const roomClash = studyloads.list.find((s) =>
          norm(s.room ?? '') === norm(slRoom) &&
          daysOverlap(s.days, slDays) && timeOverlap(slStart, slEnd, s.start, s.end));
        if (roomClash) {
          onNotify(`Room clash — ${slRoom.trim()} is already booked by "${roomClash.name}" (${roomClash.role})`);
          return;
        }
        const teacherClash = studyloads.list.find((s) =>
          norm(s.teacher ?? '') === norm(slTeacher) &&
          daysOverlap(s.days, slDays) && timeOverlap(slStart, slEnd, s.start, s.end));
        if (teacherClash) {
          onNotify(`Schedule clash — ${slTeacher.trim()} already teaches "${teacherClash.name}" (${teacherClash.role})`);
          return;
        }
        // Batch rollover: cap loads per batch, open a new batch when full.
        const batchOf = (s: { batch?: number }) => s.batch ?? 1;
        const topBatch = studyloads.list.reduce((m, s) => Math.max(m, batchOf(s)), 0);
        const activeBatch = topBatch === 0 ? 1 : topBatch;
        const activeCount = studyloads.list.filter((s) => batchOf(s) === activeBatch).length;
        const targetBatch = activeCount >= slMax ? activeBatch + 1 : activeBatch;
        studyloads.create({
          id: uid('LD'),
          name: `${slSubject.trim()} • ${slSection.trim().toUpperCase()}`,
          role: `${slTeacher.trim()} • ${slRoom.trim()} • ${sched}`,
          meta: `Capacity ${cap} • Enrolled 0`,
          subject: slSubject.trim(),
          code: slCode.trim(),
          units: slUnits.trim(),
          kind: slKind,
          teacher: slTeacher.trim(),
          room: slRoom.trim(),
          days: [...slDays],
          start: slStart,
          end: slEnd,
          section: slSection.trim().toUpperCase(),
          cap: String(cap),
          batch: targetBatch,
        });
        const roomLabel = slRoom.trim();
        if (!rooms.list.some((r) => r.name.toLowerCase() === roomLabel.toLowerCase())) {
          rooms.create({ id: uid('rm'), name: roomLabel, role: `Capacity ${cap}` });
        }
        if (!offers.list.some((o) => o.name.toLowerCase() === slSubject.trim().toLowerCase())) {
          offers.create({ id: uid('of'), name: slSubject.trim(), role: `${slSection.trim().toUpperCase()} • ${sched}` });
        }
        setSlSubject(''); setSlTeacher(''); setSlRoom(''); setSlSection(''); setSlCap('40'); setSlCode(''); setSlUnits('');
        onNotify(targetBatch > activeBatch
          ? `Batch ${activeBatch} completed (${slMax}/${slMax}) — new Batch ${targetBatch} opened`
          : `Study load created in Batch ${targetBatch} (${activeCount + 1}/${slMax})`);
      };
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 22 }}>Study Load Builder</h1>
        <p style={{ color: '#6b7890', fontSize: 13 }}>One form builds a complete class: subject + teacher + room + days and time + section + capacity. Loads are grouped into batches of <strong>{slMax}</strong> — a new batch opens automatically when one fills up. Rooms and subjects are remembered for reuse.</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
          <label htmlFor="sl-max" style={{ fontSize: 13, fontWeight: 700, color: '#33415c' }}>Max loads per batch:</label>
          <input id="sl-max" style={{ ...inp, width: 90, flex: 'none' }} type="number" min={1} max={99} value={slMax} onChange={(e) => setBatchMax(Number(e.target.value))} aria-label="Maximum loads per batch" />
        </div>
        <form style={{ display: 'grid', gap: 10, marginTop: 14 }} onSubmit={addStudyLoad}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input style={{ ...inp, flex: '0 1 140px', width: 140 }} placeholder="Subject code" value={slCode} onChange={(e) => setSlCode(e.target.value.toUpperCase().replace(/[^A-Z0-9 -]/g, '').slice(0, 12))} aria-label="Subject code" />
            <input style={{ ...inp, flex: '2 1 220px' }} placeholder="Subject title" value={slSubject} onChange={(e) => setSlSubject(e.target.value)} aria-label="Subject" list="sl-subjects" />
            <datalist id="sl-subjects">{offers.list.map((o) => <option key={o.id} value={o.name} />)}</datalist>
            <input style={{ ...inp, flex: '1 1 160px' }} placeholder="Section code" value={slSection} onChange={(e) => setSlSection(e.target.value)} aria-label="Section" />
            <input style={{ ...inp, flex: '0 1 120px', width: 120 }} placeholder="Capacity" value={slCap} onChange={(e) => setSlCap(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" aria-label="Capacity" />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input style={{ ...inp, flex: '0 1 110px', width: 110 }} placeholder="Units" value={slUnits} onChange={(e) => setSlUnits(e.target.value.replace(/[^\d.]/g, '').slice(0, 4))} inputMode="decimal" aria-label="Units" />
            <select style={{ ...inp, flex: '0 1 240px' }} value={slKind} onChange={(e) => setSlKind(e.target.value)} aria-label="Class type">
              {DELIVERY_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
            </select>
            <span style={{ flex: '1 1 260px', fontSize: 12, color: '#6b7890' }}>
              The subject code, units and class type are printed on the student&rsquo;s timetable exactly as typed. Leave units empty if the registrar has not fixed them — students then see a dash instead of a guess.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input style={{ ...inp, flex: '1 1 200px' }} placeholder="Teacher name" value={slTeacher} onChange={(e) => setSlTeacher(e.target.value)} aria-label="Teacher" list="sl-teachers" />
            <datalist id="sl-teachers">{teacherOptions.map((t) => <option key={t.id} value={t.name} />)}</datalist>
            <input style={{ ...inp, flex: '1 1 200px' }} placeholder="Room" value={slRoom} onChange={(e) => setSlRoom(e.target.value)} aria-label="Room" list="sl-rooms" />
            <datalist id="sl-rooms">{rooms.list.map((r) => <option key={r.id} value={r.name} />)}</datalist>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#33415c' }}>Days:</span>
            <div style={{ display: 'flex', gap: 4 }} role="group" aria-label="Class days">
              {DAYS.map((d) => <button key={d} type="button" onClick={() => toggleDay(d)} aria-pressed={slDays.includes(d)} style={{ border: slDays.includes(d) ? '2px solid #0B3D91' : '1px solid #e2e7ef', background: slDays.includes(d) ? '#e8f1ff' : '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: '#0B3D91' }}>{d}</button>)}
            </div>
            <input style={{ ...inp, flex: '0 1 130px', width: 130 }} type="time" value={slStart} onChange={(e) => setSlStart(e.target.value)} aria-label="Start time" />
            <span style={{ color: '#6b7890' }}>–</span>
            <input style={{ ...inp, flex: '0 1 130px', width: 130 }} type="time" value={slEnd} onChange={(e) => setSlEnd(e.target.value)} aria-label="End time" />
            <button style={btn} type="submit">Create study load</button>
          </div>
        </form>
        <div style={{ ...box, padding: 0, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 12 }}>Subject • Section</th><th style={{ padding: 12 }}>Teacher • Room • Schedule</th><th style={{ padding: 12 }}>Load</th><th style={{ padding: 12 }}>Actions</th></tr></thead><tbody>
          {[...new Set(studyloads.list.map((s) => s.batch ?? 1))].sort((a, b) => a - b).map((batch) => {
            const rows = studyloads.list.filter((s) => (s.batch ?? 1) === batch);
            const full = rows.length >= slMax;
            return (<Fragment key={batch}>
              <tr style={{ background: '#eef4ff' }}><td colSpan={4} style={{ padding: '10px 12px', fontSize: 13, fontWeight: 800, color: '#0B3D91' }}>
                <span>Batch {batch} • {rows.length}/{slMax}</span>
                {full
                  ? <span style={{ background: '#16a34a', color: '#fff', borderRadius: 999, padding: '2px 10px', fontSize: 10, marginLeft: 8 }}>COMPLETED</span>
                  : <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 999, padding: '2px 10px', fontSize: 10, marginLeft: 8 }}>OPEN</span>}
                {full && (
                  <button style={{ ...btn, marginLeft: 12, padding: '6px 14px' }} disabled={publishing} onClick={() => { void submitBatch(batch); }}>
                    {publishing ? 'Publishing…' : slSubmitted.includes(batch) ? 'Re-publish to students' : 'Publish to students'}
                  </button>
                )}
                {slSubmitted.includes(batch) && (
                  <span style={{ background: '#0B3D91', color: '#fff', borderRadius: 999, padding: '2px 10px', fontSize: 10, marginLeft: 8 }}>PUBLISHED ✓</span>
                )}
                {!full && (
                  <span style={{ marginLeft: 10, fontSize: 11, color: '#6b7890' }}>{slMax - rows.length} more class{slMax - rows.length === 1 ? '' : 'es'} to fill this batch</span>
                )}
              </td></tr>
              {rows.map((s) => <tr key={s.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}><strong>{s.name}</strong><div style={{ fontSize: 11, color: '#6b7890' }}>{[s.code, s.units ? `${s.units} units` : ''].filter(Boolean).join(' • ') || s.id}</div></td><td style={{ padding: 12 }}>{s.role}</td><td style={{ padding: 12 }}>{s.meta}</td><td style={{ padding: 12 }}><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { studyloads.remove(s.id); onNotify('Study load deleted'); }}>Delete</button></td></tr>)}
            </Fragment>);
          })}
          {!studyloads.list.length && <tr><td colSpan={4} style={{ padding: 16, color: '#6b7890' }}>No study loads yet — build the first class above.</td></tr>}
        </tbody></table></div>
        <div style={box}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <strong style={{ fontSize: 15 }}>Published to students</strong>
              <div style={{ fontSize: 12, color: '#6b7890' }}>
                {academicConfig.schoolYear} • {academicConfig.semester} — what the student portal shows right now.
              </div>
            </div>
            <button style={ghost} onClick={loadPublished}>Refresh</button>
          </div>
          <div style={{ padding: 0, overflow: 'hidden', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 10 }}>Section</th><th style={{ padding: 10 }}>Classes</th><th style={{ padding: 10 }}>Published by</th><th style={{ padding: 10 }}>Last synchronized</th><th style={{ padding: 10 }}>Actions</th></tr></thead>
              <tbody>
                {published.map((item) => (
                  <tr key={item.itemId} style={{ borderTop: '1px solid #eef1f6' }}>
                    <td style={{ padding: 10 }}><strong>{item.section}</strong>{item.program ? <div style={{ fontSize: 11, color: '#6b7890' }}>{item.program}</div> : null}</td>
                    <td style={{ padding: 10 }}>{item.entries.length}</td>
                    <td style={{ padding: 10 }}>{item.publishedByName || item.publishedBy || '—'}</td>
                    <td style={{ padding: 10 }}>{new Date(item.updatedAt || item.publishedAt || item.rowCreatedAt || Date.now()).toLocaleString()}</td>
                    <td style={{ padding: 10 }}>
                      <button
                        style={{ ...ghost, color: '#b91c1c' }}
                        onClick={() => {
                          void (async () => {
                            try {
                              await unpublishTimetable(item.itemId);
                              onNotify(`${item.section} withdrawn from the student portal`);
                            } catch (error) {
                              onNotify(describeApiError(error, 'Withdrawing the timetable'));
                            } finally {
                              loadPublished();
                            }
                          })();
                        }}
                      >
                        Withdraw
                      </button>
                    </td>
                  </tr>
                ))}
                {!published.length && (
                  <tr><td colSpan={5} style={{ padding: 16, color: '#6b7890' }}>Nothing published yet. Fill a batch and press <strong>Publish to students</strong> — the student portal stays empty until then.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>{footer}</section>);
    }
    return (<section style={card}><h1 style={{ margin: 0 }}>{active}</h1><div style={box}>Route <strong>{route}</strong> ready.</div>{footer}</section>);
  };

  return (
    <DashboardShell
      role="admin"
      groups={GROUPS}
      active={active}
      expanded={expanded}
      onExpand={setExpanded}
      onNavigate={navigate}
      onLogout={onLogout}
      userName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Admin'}
      userIdLine={myPhotoId}
      photoUserId={myPhotoId}
      photoVersion={photoTick}
      moduleItems={moduleItems}
      searchRecords={searchRecords}
      routeCrumb={active === 'Dashboard' ? 'Overview' : active}
      popup={popup}
      onClosePopup={() => setPopup(null)}
    >
      {render()}
    </DashboardShell>
  );
};
