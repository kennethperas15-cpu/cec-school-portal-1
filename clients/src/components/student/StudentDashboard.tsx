import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useCollection, uid, genSchoolId } from '../../services/crud';
import { useTheme } from '../../services/theme';
import { portalApi } from '../../services/portal';
import { percentToPoint, formatPoint, averagePercent, gwa } from '../../services/grading';
import { pushNotification } from '../../services/notify';
import { useLiveAnnouncements } from '../../hooks/useLiveAnnouncements';
import { refreshPipeline, readOfficialAssessment, parseAmount } from '../../services/pipeline';
import { setPhoto, readPhotoFile } from '../../services/photos';
import { ensureSchoolId } from '../../services/crud';
import { PhotoAvatar } from '../shared/PhotoAvatar';
import { PasswordRecovery } from '../shared/PasswordRecovery';
import { ChangePassword } from '../shared/ChangePassword';
import { AlertPopup } from '../shared/AlertPopup';
import { FileUploadDialog } from '../shared/FileUploadDialog';
import { SlideShow, REGISTRAR_SLIDES, FINANCE_SLIDES } from '../shared/SlideShow';
import { RoleDashboardHome } from '../shared/RoleDashboardHome';
import { DashboardCommandMenu } from '../shared/DashboardCommandMenu';
import { NotificationCenter } from '../shared/NotificationCenter';
import { openEditDialog } from '../shared/EditDialog';
import { DashboardShell } from '../shared/DashboardShell';
import { CommWidget } from '../shared/CommWidget';
import { ClassroomBridge, SubjectClassroomCards } from '../shared/ClassroomBridge';
import { WorkflowTracker, type WorkflowStep } from '../shared/WorkflowTracker';
import { readStage, DOC_STAGES, SUBMIT_STAGES, SUBMIT_STEPS, writeStage, autoVerifyDoc } from '../../services/docStages';
import { CoeRequest } from './CoeRequest';
import { semesterNo, useAcademicConfig } from '../../services/academicConfig';
import type { DashboardSection } from '../shared/RoleDashboardHome';

type Props = { currentUser: { firstName: string; lastName: string; role: string; id?: string; email?: string; schoolId?: string; program?: string } | null; onNotify: (t: string) => void; onLogout: () => void; };
type Rec = { id: string; name: string; role: string };
type Col = { list: Rec[]; create: (x: { id?: string; name: string; role: string }) => void; update: (id: string, p: Partial<Rec>) => void; remove: (id: string) => void; setList: (v: Rec[] | ((p: Rec[]) => Rec[])) => void };
const NAVY = '#0B3D91';
const BASE = import.meta.env.BASE_URL || '/';
type Group = { id: string; label: string; icon: string; items: { label: string; route: string }[] };
const GROUPS: Group[] = [
  { id: 'home', label: 'DASHBOARD', icon: '⌂', items: [{ label: 'Dashboard', route: 's_dashboard' }] },
  { id: 'auth', label: 'AUTHENTICATION', icon: '◈', items: [{ label: 'Profile Management', route: 's_auth_profile' }, { label: 'Registration / Enrollment', route: 's_auth_register' }, { label: 'Password Recovery', route: 's_auth_recovery' }] },
  { id: 'acad', label: 'ACADEMIC RECORDS', icon: '⍾', items: [{ label: 'Grades / Report Card', route: 's_acad_grades' }, { label: 'Class Schedule', route: 's_acad_schedule' }, { label: 'Enrolled Subjects', route: 's_acad_subjects' }, { label: 'Curriculum Checklist', route: 's_acad_checklist' }, { label: 'Attendance Records', route: 's_acad_attendance' }] },
  { id: 'enroll', label: 'ENROLLMENT', icon: '▤', items: [{ label: 'Online Enrollment', route: 's_enr_online' }, { label: 'Section Selection', route: 's_enr_sections' }, { label: 'Document Submission', route: 's_enr_docs' }, { label: 'Status Tracker', route: 's_enr_status' }] },
  { id: 'fin', label: 'FINANCIAL', icon: '▦', items: [{ label: 'Tuition Assessment', route: 's_fin_assess' }, { label: 'Payment Portal', route: 's_fin_pay' }, { label: 'Billing History', route: 's_fin_billing' }, { label: 'Scholarship Application', route: 's_fin_scholar' }] },
  { id: 'lms', label: 'LMS', icon: '▥', items: [{ label: 'Course Material', route: 's_lms_materials' }, { label: 'Assignments', route: 's_lms_assign' }, { label: 'Quiz / Exam', route: 's_lms_quiz' }, { label: 'Announcements', route: 's_lms_announce' }, { label: 'Discussion Forum', route: 's_lms_forum' }] },
  { id: 'comm', label: 'COMMUNICATION', icon: '✉', items: [{ label: 'Notification Center', route: 's_com_notif' }, { label: 'Announcement Board', route: 's_com_board' }, { label: 'Messaging', route: 's_com_msg' }] },
  { id: 'support', label: 'SUPPORT SERVICES', icon: '◫', items: [{ label: 'Guidance Appointment', route: 's_sup_guide' }, { label: 'Document Request', route: 's_sup_docs' }, { label: 'COE Request', route: 's_sup_coe' }, { label: 'Complaint / Feedback', route: 's_sup_feedback' }] },
];
const pill: React.CSSProperties = { border: '1px solid #e4ebf5', background: '#f8fbff', borderRadius: 999, padding: '6px 12px', fontSize: 12, color: '#5b6b82', fontWeight: 600 };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e8eef7', borderRadius: 20, padding: 28, maxWidth: 1120, margin: '0 auto', boxShadow: '0 12px 34px rgba(15,31,56,.05)' };
const box: React.CSSProperties = { border: '1px solid #eef2f8', borderRadius: 14, padding: 18, marginTop: 14, background: '#fbfcfe' };
const btn: React.CSSProperties = { background: 'linear-gradient(135deg, #0B3D91, #123f7d)', color: '#fff', border: 0, borderRadius: 12, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 10px 22px rgba(11,61,145,.22)' };
const ghost: React.CSSProperties = { border: '1px solid #e2e7ef', background: '#fff', borderRadius: 10, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#33415c' };
const inp: React.CSSProperties = { border: '1.5px solid #e4ebf5', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: '#f7f9fc', color: '#0f1f38' };
const lbl: React.CSSProperties = { fontSize: 11, color: '#5b6b82', fontWeight: 700, letterSpacing: '.05em', marginBottom: 6, display: 'block', textTransform: 'uppercase' };

const Footer = () => null;

const CrudSection = ({ title, col, onNotify, hint }: { title: string; col: Col; onNotify: (t: string) => void; hint: string }) => {
  const [v, setV] = useState('');
  return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>{title}</h1>
    <form style={{ display: 'flex', gap: 8, marginTop: 14, maxWidth: 640 }} onSubmit={(e) => { e.preventDefault(); if (!v.trim()) return; col.create({ id: uid('s'), name: v.trim(), role: hint }); setV(''); onNotify(`${title} created`); }}>
      <input style={inp} placeholder={`New ${title}`} value={v} onChange={(e) => setV(e.target.value)} aria-label={title} /><button style={btn} type="submit">Add</button>
    </form>
    <div style={box}>{col.list.map((r) => <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6', fontSize: 14 }}><div><strong>{r.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{r.id} • {r.role}</div></div><div style={{ display: 'flex', gap: 6 }}><button style={ghost} onClick={() => openEditDialog('Edit record', r.name, (nv) => { col.update(r.id, { name: nv }); onNotify('Updated'); })}>Edit</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { if (window.confirm('Delete this record?')) { col.remove(r.id); onNotify('Deleted'); } }}>Delete</button></div></div>)}{!col.list.length && <div style={{ color: '#6b7890' }}>No records yet — add one above.</div>}</div><Footer /></section>);
};

const LiveDocTracker = ({ docId, title, reference, steps }: { docId: string; title: string; reference: string; steps: WorkflowStep[] }) => {  const [stage, setStage] = useState(() => readStage(docId));
  useEffect(() => {
    const refresh = () => setStage(readStage(docId));
    const timer = window.setInterval(refresh, 4000);
    window.addEventListener('cec:doc-stages', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('cec:doc-stages', refresh); window.removeEventListener('storage', refresh); };
  }, [docId]);
  return (<>
    <WorkflowTracker title={title} reference={reference} steps={steps} currentIndex={stage} readOnly />
    <p style={{ margin: '10px 2px 0', fontSize: 12, color: '#64748B' }}>Status updates automatically after the registrar confirms your submission — no action needed from you.</p>
  </>);
};

const ENROLL_STEPS: WorkflowStep[] = [
  { label: 'Application Submitted', nextAction: 'Documents are checked automatically' },
  { label: 'Documents Verified', nextAction: 'Wait for the approval decision' },
  { label: 'Approved', nextAction: 'Proceed to assessment and payment' },
  { label: 'Enrolled', nextAction: 'You are officially enrolled' },
];

const enrollStageOf = (role: string): number => {
  const r = role.toLowerCase();
  if (r.includes('enroll')) return 3;
  if (r.includes('auto')) return 3;
  if (r.includes('approv')) return 2;
  if (r.includes('verif')) return 1;
  return 0;
};

const REQUIRED_DOCS = [
  { slug: 'school-assessment', title: 'School Assessment', hint: 'Report card / Form 138 / assessment of grades' },
  { slug: 'school-id-doc', title: 'School ID', hint: 'Valid school ID or government ID photo' },
];

const RequiredDocs = ({ col, onNotify, onUploaded }: { col: Col; onNotify: (t: string) => void; onUploaded?: () => void }) => {
  const [uploadFor, setUploadFor] = useState<string | null>(null);
  const [typedId, setTypedId] = useState('');
  const [idError, setIdError] = useState('');
  const entryFor = (slug: string) => col.list.find((r) => r.id === slug);
  const handleFile = (slug: string, title: string, file: File) => {
    const label = `${file.name} • ${(file.size / 1024).toFixed(0)} KB • Submitted ${new Date().toLocaleDateString()}`;
    const existing = entryFor(slug);
    // Keep a preview copy for small files so registrar can view it
    if (file.size < 300 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        try { localStorage.setItem(`cec:docfile:${slug}`, String(reader.result ?? '')); } catch { /* quota */ }
      };
      reader.readAsDataURL(file);
    }
    if (existing) col.update(slug, { name: title, role: label });
    else col.create({ id: slug, name: title, role: label });
    pushNotification(['admin'], { title: `Document submitted: ${title}`, detail: `${file.name} — ready for registrar verification.`, category: 'Enrollment', target: 'Document Verification' });
    onNotify(`${title} uploaded — sent for registrar verification`);
    onUploaded?.();
  };
  const saveTypedId = () => {
    const v = typedId.trim();
    if (!/^2\d{6}$/.test(v)) {
      setIdError('School ID must be 7 digits starting with 2 (e.g. 2414807).');
      return;
    }
    setIdError('');
    const label = `ID ${v} • Submitted ${new Date().toLocaleDateString()}`;
    if (entryFor('school-id-doc')) col.update('school-id-doc', { name: 'School ID', role: label });
    else col.create({ id: 'school-id-doc', name: 'School ID', role: label });
    setTypedId('');
    pushNotification(['admin'], { title: 'School ID submitted', detail: `Student entered ID ${v} — ready for registrar verification.`, category: 'Enrollment', target: 'Document Verification' });
    onNotify(`School ID ${v} saved — sent for registrar verification`);
    onUploaded?.();
  };
  const active = REQUIRED_DOCS.find((d) => d.slug === uploadFor);
  return (<>
    <div style={box}>
      {REQUIRED_DOCS.map((d) => {
        const entry = entryFor(d.slug);
        const done = !!entry;
        if (d.slug === 'school-id-doc') {
          return (
            <div key={d.slug} style={{ padding: '12px 0', borderBottom: '1px solid #eef1f6' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <strong>{d.title}</strong>
                  <div style={{ fontSize: 12, color: '#6b7890', marginTop: 2 }}>Type your 7-digit school ID (starts with 2) — no upload needed</div>
                  <div style={{ fontSize: 12, marginTop: 4, fontWeight: 700, color: done ? '#15803d' : '#b45309' }}>
                    {done ? `✓ ${entry?.role}` : '○ Missing — enter below'}
                  </div>
                </div>
              </div>
              <form style={{ display: 'flex', gap: 8, marginTop: 10, maxWidth: 480 }} onSubmit={(e) => { e.preventDefault(); saveTypedId(); }}>
                <input style={inp} placeholder="e.g. 2414807" value={typedId} onChange={(e) => { setTypedId(e.target.value.replace(/\D/g, '').slice(0, 7)); setIdError(''); }} inputMode="numeric" aria-label="School ID number" />
                <button style={btn} type="submit">{done ? 'Update' : 'Save'}</button>
              </form>
              {idError && <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>{idError}</div>}
            </div>
          );
        }
        return (
          <div key={d.slug} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eef1f6' }}>
            <div style={{ flex: 1 }}>
              <strong>{d.title}</strong>
              <div style={{ fontSize: 12, color: '#6b7890', marginTop: 2 }}>{d.hint}</div>
              <div style={{ fontSize: 12, marginTop: 4, fontWeight: 700, color: done ? '#15803d' : '#b45309' }}>
                {done ? `✓ ${entry?.role}` : '○ Missing — upload required'}
              </div>
            </div>
            <button style={btn} onClick={() => setUploadFor(d.slug)}>↥ {done ? 'Re-upload' : 'Upload'}</button>
          </div>
        );
      })}
    </div>
    {active && (
      <FileUploadDialog
        title={`Upload ${active.title}`}
        subtitle={`${active.hint}. PDF, JPG or PNG, max 10MB.`}
        onClose={() => setUploadFor(null)}
        onUpload={(f) => handleFile(active.slug, active.title, f)}
      />
    )}
  </>);
};
const SubmissionTracker = ({ slug, title, onNotify }: { slug: string; title: string; onNotify: (t: string) => void }) => {
  const [stage, setStage] = useState(() => readStage(slug));
  const [sentTick, setSentTick] = useState(0);
  const autoStarted = useRef(false);
  const autoAdvance = () => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    [1, 2, 3].forEach((s, i) => {
      window.setTimeout(() => {
        if (readStage(slug) >= s) { setStage(readStage(slug)); }
        else {
          writeStage(slug, s);
          setStage(s);
        }
        if (s === 3) {
          onNotify(`${title} verified and accepted automatically`);
          pushNotification(['student'], { title: `${title} accepted`, detail: 'Verification completed automatically — no registrar wait.', category: 'Enrollment', target: 'Document Submission' });
        }
      }, 2500 * (i + 1));
    });
  };
  useEffect(() => {
    const refresh = () => { setStage(readStage(slug)); setSentTick((t) => t + 1); };
    const timer = window.setInterval(refresh, 4000);
    window.addEventListener('cec:doc-stages', refresh);
    window.addEventListener('storage', refresh);
    // Recovery: a submission made before auto-verify existed still advances
    try {
      const raw = localStorage.getItem('cec:s_docs');
      const rows = raw ? (JSON.parse(raw) as { id: string }[]) : [];
      if (rows.some((r) => r.id === slug) && readStage(slug) < 3) autoAdvance();
    } catch { /* ignore */ }
    return () => { window.clearInterval(timer); window.removeEventListener('cec:doc-stages', refresh); window.removeEventListener('storage', refresh); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
  void sentTick;
  const uploaded = (() => {
    try {
      const raw = localStorage.getItem('cec:s_docs');
      const rows = raw ? (JSON.parse(raw) as { id: string }[]) : [];
      return rows.some((r) => r.id === slug);
    } catch { return false; }
  })();
  const sent = (() => {
    try {
      const raw = localStorage.getItem('cec:doc-sent');
      const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      return !!map[slug];
    } catch { return false; }
  })();
  const submit = () => {
    // No registrar wait: the submission verifies itself, advancing automatically.
    writeStage(slug, 0);
    autoAdvance();
    try {
      const raw = localStorage.getItem('cec:doc-sent');
      const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      localStorage.setItem('cec:doc-sent', JSON.stringify({ ...map, [slug]: true }));
    } catch { /* ignore */ }
    pushNotification(['admin'], { title: `${title} submitted (auto-verified)`, detail: 'Student submitted — system is verifying automatically.', category: 'Enrollment', target: 'Document Verification' });
    onNotify(`${title} submitted — verifying automatically`);
    setStage(0);
    setSentTick((t) => t + 1);
  };
  const done = sent || stage > 0;
  return (<>
    <WorkflowTracker title={`${title} — verification`} reference={`${slug} • stage ${stage + 1} of ${SUBMIT_STAGES.length} (${SUBMIT_STAGES[stage]})`} steps={SUBMIT_STEPS} currentIndex={stage} readOnly />
    <button
      type="button"
      disabled={!uploaded || done}
      onClick={submit}
      style={{ marginTop: 12, width: '100%', border: 0, borderRadius: 10, padding: '13px 0', fontWeight: 800, fontSize: 14, cursor: !uploaded || done ? 'not-allowed' : 'pointer', background: !uploaded || done ? '#cbd5e1' : '#0B3D91', color: '#fff' }}
    >
      {!uploaded ? 'Upload the document above first' : done ? 'Submitted ✓ — verifying automatically' : `Submit ${title} for verification`}
    </button>
    <p style={{ margin: '10px 2px 0', fontSize: 12, color: '#64748B' }}>After you submit, the tracker updates automatically when the registrar verifies this document — no further action needed.</p>
  </>);
};
const DocumentFlow = ({ col, onNotify }: { col: Col; onNotify: (t: string) => void }) => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [typedId, setTypedId] = useState('');
  const [idError, setIdError] = useState('');
  const [stage, setStage] = useState(() => readStage('school-assessment'));
  useEffect(() => {
    const refresh = () => setStage(readStage('school-assessment'));
    const timer = window.setInterval(refresh, 4000);
    window.addEventListener('cec:doc-stages', refresh);
    window.addEventListener('storage', refresh);
    // True empty state: no entries left behind → no progress shown
    try {
      const raw = localStorage.getItem('cec:s_docs');
      const rows = raw ? (JSON.parse(raw) as { id: string }[]) : [];
      if (!rows.some((r) => r.id === 'school-assessment' || r.id === 'school-id-doc') && readStage('school-assessment') > 0) {
        writeStage('school-assessment', 0);
        setStage(0);
      }
      if (rows.some((r) => r.id === 'school-assessment') && readStage('school-assessment') < 3) {
        autoVerifyDoc('school-assessment', setStage);
      }
    } catch { /* ignore */ }
    return () => { window.clearInterval(timer); window.removeEventListener('cec:doc-stages', refresh); window.removeEventListener('storage', refresh); };
  }, []);
  const removeEntry = (slug: string, label: string) => {
    col.remove(slug);
    try {
      const raw = localStorage.getItem('cec:doc-sent');
      const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      delete map[slug];
      localStorage.setItem('cec:doc-sent', JSON.stringify(map));
    } catch { /* ignore */ }
    if (slug === 'school-assessment') {
      writeStage(slug, 0);
      setStage(0);
    }
    onNotify(`${label} removed — progress cleared`);
  };
  const assessment = col.list.find((r) => r.id === 'school-assessment');
  const savedId = col.list.find((r) => r.id === 'school-id-doc');
  const started = !!assessment || stage > 0;
  const accepted = stage >= 3;

  const handleFile = (file: File) => {
    const label = `${file.name} • ${(file.size / 1024).toFixed(0)} KB • Submitted ${new Date().toLocaleDateString()}`;
    if (file.size < 300 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        try { localStorage.setItem('cec:docfile:school-assessment', String(reader.result ?? '')); } catch { /* quota */ }
      };
      reader.readAsDataURL(file);
    }
    if (assessment) col.update('school-assessment', { name: 'School Assessment', role: label });
    else col.create({ id: 'school-assessment', name: 'School Assessment', role: label });
    onNotify('School Assessment attached — add your School ID, then Submit below');
  };

  const submitAll = () => {
    if (!assessment) { onNotify('Upload the School Assessment first'); return; }
    const v = typedId.trim();
    if (!savedId && !/^2\d{6}$/.test(v)) {
      setIdError('Type your valid 7-digit school ID starting with 2.');
      return;
    }
    setIdError('');
    if (/^2\d{6}$/.test(v)) {
      const label = `ID ${v} • Submitted ${new Date().toLocaleDateString()}`;
      if (savedId) col.update('school-id-doc', { name: 'School ID', role: label });
      else col.create({ id: 'school-id-doc', name: 'School ID', role: label });
      setTypedId('');
    }
    pushNotification(['admin'], { title: 'Document package submitted (auto-verified)', detail: 'Assessment + School ID received — system is verifying automatically.', category: 'Enrollment', target: 'Document Verification' });
    autoVerifyDoc('school-assessment', setStage, () => {
      onNotify('Documents verified and accepted automatically');
      pushNotification(['student'], { title: 'Documents accepted', detail: 'Verification completed automatically — no registrar wait.', category: 'Enrollment', target: 'Document Submission' });
    });
    onNotify('Package submitted — verifying automatically');
  };

  return (<>
    <div style={box}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eef1f6' }}>
        <div style={{ flex: 1 }}>
          <strong>1 • School Assessment</strong>
          <div style={{ fontSize: 12, color: '#6b7890', marginTop: 2 }}>Report card / Form 138 / assessment of grades</div>
          <div style={{ fontSize: 12, marginTop: 4, fontWeight: 700, color: assessment ? '#15803d' : '#b45309' }}>
            {assessment ? `✓ ${assessment.role}` : '○ Missing — upload required'}
          </div>
        </div>
        <button style={btn} onClick={() => setUploadOpen(true)}>↥ {assessment ? 'Re-upload' : 'Upload'}</button>
          {assessment && <button style={{ ...ghost, color: '#b91c1c' }} onClick={() => removeEntry('school-assessment', 'School Assessment')}>Remove</button>}
      </div>
      <div style={{ padding: '12px 0' }}>
        <div style={{ flex: 1 }}>
          <strong>2 • School ID</strong>
          <div style={{ fontSize: 12, color: '#6b7890', marginTop: 2 }}>Type your 7-digit school ID (starts with 2) — no upload needed</div>
          {savedId && <div style={{ fontSize: 12, marginTop: 4, fontWeight: 700, color: '#15803d' }}>✓ {savedId.role}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, maxWidth: 480 }}>
          <input style={inp} placeholder={savedId ? savedId.role : 'e.g. 2414807'} value={typedId} onChange={(e) => { setTypedId(e.target.value.replace(/\D/g, '').slice(0, 7)); setIdError(''); }} inputMode="numeric" aria-label="School ID number" />
          {savedId && <button style={{ ...ghost, color: '#b91c1c' }} onClick={() => removeEntry('school-id-doc', 'School ID')}>Remove</button>}
        </div>
        {idError && <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>{idError}</div>}
      </div>
    </div>
    {uploadOpen && (
      <FileUploadDialog
        title="Upload School Assessment"
        subtitle="Report card / Form 138 / assessment of grades. PDF, JPG or PNG, max 10MB."
        onClose={() => setUploadOpen(false)}
        onUpload={(f) => { handleFile(f); setUploadOpen(false); }}
      />
    )}
    <div style={{ marginTop: 18 }}>
      {!started ? (
        <div style={box}>No submission yet — attach your School Assessment and type your School ID above, then press Submit. The verification tracker appears here automatically.</div>
      ) : (
        <WorkflowTracker title="Document package — verification" reference={`school-assessment • stage ${stage + 1} of ${SUBMIT_STAGES.length} (${SUBMIT_STAGES[stage]})`} steps={SUBMIT_STEPS} currentIndex={stage} readOnly />
      )}
      <button
        type="button"
        disabled={!assessment || accepted}
        onClick={submitAll}
        style={{ marginTop: 12, width: '100%', border: 0, borderRadius: 10, padding: '13px 0', fontWeight: 800, fontSize: 14, cursor: !assessment || accepted ? 'not-allowed' : 'pointer', background: !assessment || accepted ? '#cbd5e1' : '#0B3D91', color: '#fff' }}
      >
        {!assessment ? 'Upload the School Assessment first' : accepted ? 'Accepted ✓ — requirement complete' : 'Submit documents for verification'}
      </button>
      <p style={{ margin: '10px 2px 0', fontSize: 12, color: '#64748B' }}>One submit sends the whole package — the tracker then completes by itself, no registrar wait.</p>
    </div>
  </>);
};

const pesoOf = (s: string): number => {
  const t = s.trim();
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  const m = s.replace(/,/g, '').match(/₱\s*(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
};

const readVerifiedReceipts = (): string[] => {
  try {
    const raw = localStorage.getItem('cec:receipts_verified');
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
};

// 0 Assessment Created → 1 Payment Pending → 2 Partially Paid → 3 Fully Paid → 4 Receipt Issued (accounting verifies)
const payStageOf = (assessed: number, paid: number): number => {
  if (assessed <= 0) return 0;
  if (paid <= 0) return 1;
  if (paid < assessed) return 2;
  const verified = readVerifiedReceipts();
  let history: { id: string }[] = [];
  try {
    const raw = localStorage.getItem('cec:s_history_v2');
    history = raw ? JSON.parse(raw) : [];
  } catch { history = []; }
  return history.some((h) => verified.includes(h.id)) ? 4 : 3;
};

const LivePayTracker = ({ steps }: { steps: WorkflowStep[] }) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 4000);
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener('storage', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('storage', refresh); };
  }, []);
  let assessed = 0;
  let paid = 0;
  try {
    const cRaw = localStorage.getItem('cec:s_charges_v2');
    const charges = cRaw ? (JSON.parse(cRaw) as { name: string; role: string }[]) : [];
    assessed = charges.reduce((n, c) => n + pesoOf(`${c.name} ${c.role}`), 0);
    assessed += readOfficialAssessment().reduce((n, l) => n + l.amount, 0);
    const hRaw = localStorage.getItem('cec:s_history_v2');
    const history = hRaw ? (JSON.parse(hRaw) as { name: string; role: string }[]) : [];
    paid = history.reduce((n, h) => n + pesoOf(`${h.name} ${h.role}`), 0);
  } catch { /* ignore */ }
  const stage = payStageOf(assessed, paid);
  return (<>
    <WorkflowTracker title="Tuition payment" reference={`Assessment • AY 2026–2027 • BSIT • Paid ₱${paid.toLocaleString()} of ₱${assessed.toLocaleString()}`} steps={steps} currentIndex={stage} readOnly />
    <p style={{ margin: '10px 2px 0', fontSize: 12, color: '#64748B' }}>Moves on its own as you pay; Receipt Issued unlocks when accounting verifies a receipt — no clicks needed.</p>
  </>);
};

const LiveEnrollTracker = ({ apps }: { apps: { id: string; name: string; role: string }[] }) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    // Read-only polling: stages move ONLY when admin acts (queue decisions)
    const timer = window.setInterval(() => setTick((t) => t + 1), 4000);
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener('storage', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('storage', refresh); };
  }, []);
  // Fresh read every render so admin approvals appear automatically
  let live = apps;
  try {
    const raw = localStorage.getItem('cec:s_enroll_apps');
    if (raw) live = JSON.parse(raw);
  } catch { /* keep props */ }
  if (!live.length) return <p style={{ color: '#64748B', fontSize: 13 }}>No applications yet — submit one at Online Enrollment. It will advance here automatically after admin review.</p>;
  return (<div style={{ display: 'grid', gap: 18 }}>
    {live.map((a) => {
      const rejected = a.role.toLowerCase().includes('reject');
      return (
        <div key={a.id}>
          <WorkflowTracker title={`Enrollment — ${a.name}`} reference={`${a.id} • ${a.role}`} steps={ENROLL_STEPS} currentIndex={rejected ? 0 : enrollStageOf(a.role)} readOnly />
          {rejected
            ? <p style={{ margin: '10px 2px 0', fontSize: 12, color: '#b91c1c', fontWeight: 700 }}>Returned by registrar — please correct your application and resubmit.</p>
            : <p style={{ margin: '10px 2px 0', fontSize: 12, color: '#64748B' }}>Updates automatically after admin review — no action needed from you.</p>}
        </div>
      );
    })}
  </div>);
};
const TwoFieldForm = ({ title, col, onNotify, ph1, ph2 }: { title: string; col: Col; onNotify: (t: string) => void; ph1: string; ph2: string }) => {
  const [a, setA] = useState(''); const [b, setB] = useState('');
  return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>{title}</h1>
    <form style={{ display: 'flex', gap: 8, marginTop: 14, maxWidth: 720 }} onSubmit={(e) => { e.preventDefault(); if (!a.trim()) return; col.create({ id: uid('s'), name: a.trim(), role: b.trim() || 'New' }); setA(''); setB(''); onNotify(`${title} created`); }}>
      <input style={inp} placeholder={ph1} value={a} onChange={(e) => setA(e.target.value)} /><input style={inp} placeholder={ph2} value={b} onChange={(e) => setB(e.target.value)} /><button style={btn} type="submit">Add</button>
    </form>
    <div style={box}>{col.list.map((r) => <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><div><strong>{r.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{r.role}</div></div><div style={{ display: 'flex', gap: 6 }}><button style={ghost} onClick={() => openEditDialog('Update status/detail', r.role, (nv) => { col.update(r.id, { role: nv }); onNotify('Updated'); })}>Update</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { if (window.confirm('Delete this record?')) { col.remove(r.id); onNotify('Deleted'); } }}>Delete</button></div></div>)}</div><Footer /></section>);
};

type Offering = { edp: string; subject: string; descriptive: string; schedule: string; room: string; type: 'Lec' | 'Lab'; units: number; section: string; batch?: number; teacher?: string; cap?: number };

// Section Selection is driven entirely by registrar/admin-published study loads
// (see Admin → Study Load Builder → Submit batch). Nothing is shown until a
// batch is published, so students never plot sections that do not exist yet.

const readPicks = (): Offering[] => {
  try {
    const raw = localStorage.getItem('cec:s_picks');
    return raw ? (JSON.parse(raw) as Offering[]) : [];
  } catch { return []; }
};

// Admin-published study-load batches (Submit batch → plottable here).
const readPublishedLoads = (): Offering[] => {
  try {
    const raw = localStorage.getItem('cec:studyload_offerings');
    const rows = raw ? (JSON.parse(raw) as Offering[]) : [];
    return rows.filter((r) => r && r.edp && r.subject && r.schedule);
  } catch { return []; }
};

const offeringDays = (schedule: string): number[] => {
  const prefix = schedule.match(/^[a-z,\s/]+/i)?.[0]?.replace(/[\s,/]/g, '').toUpperCase() ?? '';
  const tokens = [{ code: 'TH', day: 4 }, { code: 'SU', day: 0 }, { code: 'M', day: 1 }, { code: 'T', day: 2 }, { code: 'W', day: 3 }, { code: 'F', day: 5 }, { code: 'S', day: 6 }];
  const days: number[] = [];
  let remaining = prefix;
  while (remaining) {
    const token = tokens.find((entry) => remaining.startsWith(entry.code));
    if (!token) return [];
    days.push(token.day);
    remaining = remaining.slice(token.code.length);
  }
  return days;
};

const nextOffering = (picks: Offering[], now: Date) => {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const candidates = picks.flatMap((offering) => {
    const time = offering.schedule.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!time) return [];
    const hour = Number(time[1]) % 12 + (time[3].toUpperCase() === 'PM' ? 12 : 0);
    const startMinutes = hour * 60 + Number(time[2]);
    return offeringDays(offering.schedule).map((day) => {
      let daysAway = (day - now.getDay() + 7) % 7;
      if (daysAway === 0 && startMinutes <= nowMinutes) daysAway = 7;
      return { offering, daysAway, startMinutes };
    });
  });
  candidates.sort((a, b) => a.daysAway - b.daysAway || a.startMinutes - b.startMinutes);
  const next = candidates[0];
  if (!next) return null;
  const date = new Date(now);
  date.setDate(date.getDate() + next.daysAway);
  return { ...next, dayLabel: next.daysAway === 0 ? 'Today' : new Intl.DateTimeFormat('en', { weekday: 'long' }).format(date) };
};

const sectionTagOf = (picks: Offering[]): string => {
  if (!picks.length) return '—';
  const secs = [...new Set(picks.map((p) => p.section))];
  return secs.length === 1 && secs[0] !== 'OPEN' ? `Regular (${secs[0]})` : 'Irregular (OPEN)';
};

// Bucket a schedule ("MWF 08:00 AM-09:30 AM") by start time for time filtering.
const scheduleBucket = (schedule: string): 'morning' | 'afternoon' | 'evening' | null => {
  const m = schedule.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  const hour = (Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

const readDayPreference = (): 'all' | 'morning' | 'afternoon' | 'evening' => {
  try {
    const raw = localStorage.getItem('cec:enroll_pref');
    const pref = raw ? (JSON.parse(raw) as { preference?: string }).preference : null;
    return pref === 'morning' || pref === 'afternoon' || pref === 'evening' ? pref : 'all';
  } catch { return 'all'; }
};
// Capacity is owned by the registrar/admin and travels with a published study
// load. When a load has no capacity set, we label it "Open" rather than
// inventing a slot count.
const capacityOf = (offering: Offering): number | null => {
  const cap = Number(offering.cap);
  return Number.isFinite(cap) && cap > 0 ? cap : null;
};

// Teacher-recorded attendance (cec:t_attend_v2), matched to the student by name.
const readTeacherAttendance = (names: string[]): { id: string; name: string; role: string }[] => {
  try {
    const raw = localStorage.getItem('cec:t_attend_v2');
    const rows = raw ? (JSON.parse(raw) as { id: string; student: string; date: string; status: string; section?: string }[]) : [];
    return rows
      .filter((r) => r.student && names.includes(r.student.trim().toLowerCase()))
      .map((r) => ({ id: r.id, name: `${r.date}${r.section ? ` • ${r.section}` : ''}`, role: r.status }));
  } catch { return []; }
};

export const StudentDashboard = ({ currentUser, onNotify, onLogout }: Props) => {
  const [active, setActive] = useState('Dashboard');
  const [expanded, setExpanded] = useState('home');
  const [collapsed, setCollapsed] = useState(false);
  const [, setTeacherRecordsRevision] = useState(0);
  useEffect(() => {
    const refreshTeacherRecords = (event: StorageEvent) => {
      if (event.key && ['cec:t_grades_v2', 'cec:t_attend_v2'].includes(event.key)) {
        setTeacherRecordsRevision((revision) => revision + 1);
      }
    };
    window.addEventListener('storage', refreshTeacherRecords);
    return () => window.removeEventListener('storage', refreshTeacherRecords);
  }, []);
  // Mobile: start shut, auto-close after each navigation so content is usable
  useEffect(() => {
    try {
      if (window.innerWidth < 800) setCollapsed(true);
    } catch { /* non-browser render */ }
  }, [active]);
  const { dark, toggle } = useTheme();
  const academicConfig = useAcademicConfig();
  // Identity comes straight from the signed-in school account; edits persist locally.
  const [profile, setProfile] = useState(() => {
    try {
      const raw = localStorage.getItem('cec:s_profile');
      if (raw) return JSON.parse(raw);
    } catch { /* fall through to the server identity */ }
    return {
      name: currentUser ? `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim() : '',
      id: currentUser?.schoolId || currentUser?.id || '',
      course: currentUser?.program || '',
      email: currentUser?.email || '',
      phone: '',
      address: '',
      guardian: '',
      emergency: '',
    };
  });
  // Pre-launch: nothing is seeded. Records appear only when the connected
  // systems (registrar, finance, faculty) actually create them for this student.
  const subjects = useCollection<Rec>('s_subjects_v2', []);
  const checklist = useCollection<Rec>('s_checklist', []);
  const attendance = useCollection<Rec>('s_attendance', []);
  const enrollApps = useCollection<Rec>('s_enroll_apps', []);
  const docs = useCollection<Rec>('s_docs', []);
  const charges = useCollection<Rec>('s_charges_v2', []);
  const history = useCollection<Rec>('s_history_v2', []);
  const scholar = useCollection<Rec>('s_scholar_v2', []);
  const materials = useCollection<Rec>('s_materials', []);
  const assigns = useCollection<Rec>('s_assigns', []);
  const quizzes = useCollection<Rec>('s_quiz', []);
  const notifs = useCollection<Rec>('s_notifs', []);
  const messages = useCollection<Rec>('s_messages', []);
  const guide = useCollection<Rec>('s_guide', []);
  const docreq = useCollection<Rec>('s_docreq', []);
  const feedback = useCollection<Rec>('s_feedback', []);
  const [attFilter, setAttFilter] = useState('');
  const [secSel, setSecSel] = useState<string[]>([]);
  const [schedMode, setSchedMode] = useState<'auto' | 'regular' | 'irregular'>('auto');
  const [schedFilter, setSchedFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening'>(readDayPreference);
  const [payAmt, setPayAmt] = useState('');
  const [scholarName, setScholarName] = useState('');
  const [cashReceipt, setCashReceipt] = useState<{ ref: string; amount: string; qr: string; at: string } | null>(null);
  const [catalogQuery, setCatalogQuery] = useState('');
  // Connected pipeline: registrar docs + accounting payment → EDP auto-enroll
  useEffect(() => {
    refreshPipeline({ name: profile.name, email: profile.email });
    const timer = window.setInterval(() => refreshPipeline({ name: profile.name, email: profile.email }), 8000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [popup, setPopup] = useState<{ title: string; message: string; lines?: string[] } | null>(null);
  // Live admin announcements: pop up the moment one is published.
  const { items: liveAnnouncements, live: announcementsLive } = useLiveAnnouncements('students', {
    onNew: (a) => {
      setPopup({ title: `New announcement: ${a.title}`, message: a.content, lines: a.published_by_name ? [`From ${a.published_by_name}`] : undefined });
      onNotify(`New announcement: ${a.title}`);
    },
  });
  const [photoTick, setPhotoTick] = useState(0);
  const [photoError, setPhotoError] = useState('');
  const myPhotoId = currentUser?.id || profile.id || 'student';

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

  const submitEnrollment = async (pg: string, yr: string, sm: string) => {
    const auto = (() => { try { return localStorage.getItem('cec:auto_approve') === '1'; } catch { return false; } })();
    // 1) MySQL first (shared enrollment_applications table)
    let remoteId: string | null = null;
    try {
      const r = await portalApi.enrollCreate({
        fullName: profile.name || 'Student Applicant',
        personalEmail: profile.email || 'student@cec.edu.ph',
        phone: profile.phone || '09170000000',
        program: pg,
        yearLevel: Number(yr.replace(/\D/g, '')) || 1,
        requestedRole: 'student',
        schoolYear: academicConfig.schoolYear,
        semester: semesterNo(academicConfig.semester),
      });
      remoteId = r.id;
      if (auto) { try { await portalApi.enrollDecide(r.id, 'approved'); } catch { /* keep pending */ } }
    } catch { /* backend offline — local fallback below */ }
    const id = remoteId ?? genSchoolId('student');
    const status = auto ? 'Approved (auto)' : 'Pending';
    enrollApps.create({ id, name: `${pg} • ${yr} • ${sm}`, role: remoteId ? `${status} • MySQL` : status });
    try {
      const raw = localStorage.getItem('cec:a_enroll_v2');
      const rows = raw ? (JSON.parse(raw) as { id: string; name: string; meta: string }[]) : [];
      if (!rows.some((x) => x.id === id)) {
        rows.push({ id, name: profile.name || 'Student Applicant', meta: `${pg} • ${yr} • ${sm} • ${remoteId ? 'MySQL' : 'local'} • ${auto ? 'Auto-approved' : 'Applied'}` });
        localStorage.setItem('cec:a_enroll_v2', JSON.stringify(rows));
      }
    } catch { /* ignore */ }
    onNotify(auto ? 'Enrollment auto-approved' : remoteId ? 'Enrollment saved to MySQL — pending admin review' : 'Backend offline — enrollment saved locally');
  };
  const [enrPg, setEnrPg] = useState('BSIT'); const [enrYr, setEnrYr] = useState('3rd Year'); const [enrSm, setEnrSm] = useState('1st Semester');
  const route = GROUPS.flatMap((g) => g.items).find((i) => i.label === active)?.route ?? 's_dashboard';
  const moduleItems = ['Dashboard', ...GROUPS.flatMap((g) => g.items.map((item) => item.label))];
  const navigate = (label: string) => setActive(moduleItems.includes(label) ? label : 'Dashboard');
  const profileMatchesAccount = !currentUser?.id || profile.id === currentUser.id;
  const identityNames = [currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : '', profileMatchesAccount ? profile.name : ''].filter(Boolean).map((value) => value.trim().toLowerCase());
  const identityIds = [currentUser?.id, profileMatchesAccount ? profile.id : ''].filter(Boolean).map((value) => String(value).trim().toLowerCase());
  // Attendance flows in from the teacher's Daily Attendance (cec:t_attend_v2),
  // matched to this student, alongside any records saved in the student layer.
  const scopedAttendance = [
    ...(attendance.list as Rec[]).map((a) => ({ id: a.id, name: a.name, role: a.role })),
    ...readTeacherAttendance(identityNames),
  ];
  const searchRecords = [
    { title: profile.name || 'My profile', detail: `${profile.id || 'No school ID yet'} • ${profile.course || 'Program not set'} • ${profile.email || '—'}`, target: 'Profile Management' },
    ...subjects.list.map((item) => ({ title: item.name, detail: item.role, target: 'Grades / Report Card' })),
    ...assigns.list.map((item) => ({ title: item.name, detail: item.role, target: 'Assignments' })),
    ...docs.list.map((item) => ({ title: item.name, detail: item.role, target: 'Document Submission' })),
    ...charges.list.map((item) => ({ title: item.name, detail: item.role, target: 'Payment Portal' })),
  ];
  const paymentSteps: WorkflowStep[] = [
    { label: 'Assessment Created', updatedAt: 'Sep 1, 2026', updatedBy: 'Finance Office', notes: 'Tuition and applicable fees assessed.', nextAction: 'Review balance and choose payment method', documents: ['Assessment statement'] },
    { label: 'Payment Pending', updatedAt: 'Sep 1, 2026', updatedBy: 'Finance Office', notes: 'No payment has been posted yet.', nextAction: 'Submit payment before the deadline', documents: ['Billing statement'] },
    { label: 'Partially Paid', nextAction: 'Settle the remaining balance' },
    { label: 'Fully Paid', nextAction: 'Wait for receipt issuance' },
    { label: 'Receipt Issued', nextAction: 'Download and retain your official receipt' },
  ];

  const render = () => {
    if (active === 'Dashboard') {
      let allOfficial: { id: string; student?: string; studentId?: string; prelim: string; midterm: string; final: string }[] = [];
      try {
        const raw = localStorage.getItem('cec:t_grades_v2');
        allOfficial = raw ? JSON.parse(raw) : [];
      } catch { allOfficial = []; }
      const official = allOfficial.filter((grade) => {
        if (grade.studentId && identityIds.includes(grade.studentId.trim().toLowerCase())) return true;
        return !!grade.student && identityNames.includes(grade.student.trim().toLowerCase());
      });
      const gradedPoints = official.map((g) => averagePercent([g.prelim, g.midterm, g.final])).filter((average): average is number => average !== null).map((average) => percentToPoint(average).point);
      const liveGwa = gwa(gradedPoints);
      const peso = (s: string) => parseAmount(s);
      const assessed = charges.list.reduce((sum, c) => sum + peso(`${c.name} ${c.role}`), 0)
        + readOfficialAssessment().reduce((sum, l) => sum + l.amount, 0);
      const paid = history.list.reduce((sum, h) => sum + peso(`${h.name} ${h.role}`), 0);
      const remaining = Math.max(0, assessed - paid);
      // Best status wins: a newer rejected/withdrawn form must not shadow an approval
      const rankOf = (role: string): number => {
        const r = role.toLowerCase();
        if (r.includes('enroll')) return 4;
        if (r.includes('approv')) return 3;
        if (r.includes('verif')) return 2;
        if (r.includes('reject')) return 0;
        return 1;
      };
      const bestApp = enrollApps.list.length
        ? enrollApps.list.reduce((best, a) => (rankOf(a.role) > rankOf(best.role) ? a : best))
        : undefined;
      const latestApp = bestApp;
      const enrolled = enrollApps.list.some((a) => ['approved', 'enrolled'].includes(a.role.toLowerCase()) || a.role.includes('Approved (auto)'));
      const pendingApplication = !!latestApp && !enrolled && !latestApp.role.toLowerCase().includes('reject');
      const missingDocuments = ['school-assessment', 'school-id-doc'].filter((id) => !docs.list.some((doc) => doc.id === id));
      const nextClass = nextOffering(readPicks(), new Date());
      const openAssignments = assigns.list.filter((item) => !/submitted|complete|graded/i.test(item.role));
      const nextQuiz = quizzes.list.find((item) => !/taken|complete|submitted/i.test(item.role));
      let upcomingExam: { title: string; date: string; items: string } | undefined;
      try {
        const raw = localStorage.getItem('cec:t_exams_v2');
        const exams = raw ? JSON.parse(raw) as { title: string; date: string; items: string }[] : [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        upcomingExam = exams.filter((exam) => {
          const date = new Date(`${exam.date}T00:00:00`);
          return !Number.isNaN(date.getTime()) && date >= today;
        }).sort((a, b) => a.date.localeCompare(b.date))[0];
      } catch { upcomingExam = undefined; }
      let latestAnnouncement: { title: string; detail: string } | undefined;
      try {
        const raw = localStorage.getItem('cec:t_posts_v2');
        const posts = raw ? JSON.parse(raw) as { title: string; body?: string }[] : [];
        if (posts[0]) latestAnnouncement = { title: posts[0].title, detail: posts[0].body || 'New faculty announcement' };
      } catch { latestAnnouncement = undefined; }
      const taskItems: DashboardSection['items'] = [];
      if (!latestApp) taskItems.push({ title: 'Start enrollment', detail: 'Submit an application to unlock your academic records.', status: 'Action needed', target: 'Online Enrollment' });
      else if (latestApp.role.toLowerCase().includes('reject')) taskItems.push({ title: 'Update your enrollment application', detail: 'Your application was returned. Review and submit it again.', status: 'Returned', target: 'Online Enrollment' });
      else if (pendingApplication && missingDocuments.length) taskItems.push({ title: 'Submit required enrollment documents', detail: `${missingDocuments.length} required item${missingDocuments.length === 1 ? '' : 's'} still missing: ${missingDocuments.join(', ')}.`, status: 'Action needed', target: 'Document Submission' });
      else if (pendingApplication) taskItems.push({ title: 'Track enrollment review', detail: `${latestApp.name} • ${latestApp.role}`, status: 'In review', target: 'Status Tracker' });
      if (assessed > 0 && remaining > 0) taskItems.push({ title: `Settle ₱${remaining.toLocaleString()} balance`, detail: `Paid ₱${paid.toLocaleString()} of ₱${assessed.toLocaleString()} in your billing records.`, status: 'Payment due', target: 'Payment Portal' });
      const todayItems: DashboardSection['items'] = [];
      if (nextClass) todayItems.push({ title: nextClass.offering.subject, detail: `${nextClass.dayLabel} • ${nextClass.offering.schedule} • ${nextClass.offering.room}`, status: nextClass.dayLabel, target: 'Class Schedule' });
      if (openAssignments[0]) todayItems.push({ title: openAssignments[0].name, detail: openAssignments[0].role || 'Assignment not submitted', status: 'Assignment', target: 'Assignments' });
      if (nextQuiz) todayItems.push({ title: nextQuiz.name, detail: nextQuiz.role || 'Quiz not completed', status: 'Quiz / exam', target: 'Quiz / Exam' });
      if (upcomingExam) todayItems.push({ title: upcomingExam.title, detail: `${upcomingExam.date} • ${upcomingExam.items} items`, status: 'Upcoming exam', target: 'Quiz / Exam' });
      if (latestAnnouncement) todayItems.push({ title: latestAnnouncement.title, detail: latestAnnouncement.detail, status: 'Announcement', target: 'Announcement Board' });
      const attendanceCount = scopedAttendance.length;
      const attendancePresent = scopedAttendance.filter((item) => /present/i.test(item.role)).length;
      const studentSections: DashboardSection[] = [
        { title: 'Today & next up', target: 'Class Schedule', emptyMessage: 'No class, assignment, quiz, or announcement is scheduled in your current records.', items: todayItems },
        { title: 'Enrollment & payments', target: 'Status Tracker', emptyMessage: 'No enrollment, document, or payment actions need attention.', items: taskItems },
        { title: 'Academic progress', target: 'Grades / Report Card', emptyMessage: enrolled ? 'Your grades and student-linked attendance will appear here as they are posted.' : 'Enroll online to unlock your academic records.', items: [
          ...(liveGwa === null ? [] : [{ title: `Current average: ${formatPoint(liveGwa)}`, detail: `PH grade point average from ${gradedPoints.length} grade record${gradedPoints.length === 1 ? '' : 's'} matched to your account.`, status: 'Grades', target: 'Grades / Report Card' }]),
          ...(attendanceCount ? [{ title: `Attendance: ${Math.round((attendancePresent / attendanceCount) * 100)}% present`, detail: `${attendancePresent} present out of ${attendanceCount} attendance records linked to your account.`, status: 'Attendance', target: 'Attendance Records' }] : []),
        ] },
      ];
      const priority = taskItems[0]
        ? { title: taskItems[0].title, detail: taskItems[0].detail, actionLabel: 'Take action', target: taskItems[0].target ?? 'Status Tracker' }
        : openAssignments[0]
          ? { title: `Next up: ${openAssignments[0].name}`, detail: openAssignments[0].role || 'Review and submit this assignment.', actionLabel: 'Open assignment', target: 'Assignments' }
          : { title: nextClass ? `Next class: ${nextClass.offering.subject}` : 'You are all caught up', detail: nextClass ? `${nextClass.dayLabel} • ${nextClass.offering.schedule} • ${nextClass.offering.room}` : 'No enrollment, document, payment, or assignment tasks are currently recorded.', actionLabel: nextClass ? 'View schedule' : 'View academic records', target: nextClass ? 'Class Schedule' : 'Grades / Report Card', tone: 'clear' as const };
      return (
        <>
        <RoleDashboardHome
          role="student"
          name={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Student'}
          onNavigate={navigate}
          dashboardSections={studentSections}
          priority={priority}
          liveMetrics={[
            { label: 'Enrollment status', value: latestApp ? latestApp.role.replace(/ •.*$/, '') : 'Application needed', detail: latestApp ? `${latestApp.name} • ${academicConfig.semester} ${academicConfig.schoolYear}` : 'Start an online application or visit the registrar' },
            { label: 'Current average', value: liveGwa === null ? '—' : formatPoint(liveGwa), detail: liveGwa === null ? 'No grade records match your student account yet' : `PH grade point average • ${gradedPoints.length} matched record${gradedPoints.length === 1 ? '' : 's'}` },
            { label: 'Attendance', value: attendanceCount ? `${Math.round((attendancePresent / attendanceCount) * 100)}%` : '—', detail: attendanceCount ? `${attendancePresent} present across ${attendanceCount} records linked to your account` : 'No student-linked attendance records yet' },
            { label: 'Outstanding balance', value: assessed <= 0 ? '—' : remaining <= 0 ? 'Fully paid' : `₱${remaining.toLocaleString()}`, detail: assessed <= 0 ? 'No assessment recorded for this student' : `Paid ₱${paid.toLocaleString()} of ₱${assessed.toLocaleString()} in student billing records` },
          ]}
        />
        <CommWidget role="student" audience="students" boardTarget="Announcement Board" onNavigate={navigate} />
        </>
      );
    }
    if (active === 'Profile Management') {
      const F = (k: keyof typeof profile, label: string) => (<div><span style={lbl}>{label}</span><input style={inp} value={profile[k]} onChange={(e) => setProfile({ ...profile, [k]: e.target.value })} aria-label={label} /></div>);
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>Profile Management</h1>
        <div style={{ ...box, display: 'flex', gap: 16, alignItems: 'center' }} key={photoTick}>
          <PhotoAvatar userId={myPhotoId} name={profile.name} size={72} />
          <div><strong>My profile photo</strong><div style={{ fontSize: 12, color: '#6b7890', margin: '4px 0 8px' }}>Visible to your teachers and the registrar. JPG/PNG under 2MB.</div>
            <label style={{ ...ghost, display: 'inline-block' }}>Upload photo<input type="file" accept="image/*" hidden onChange={(e) => uploadPhoto(e.target.files?.[0])} /></label>
            {photoError && <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>{photoError}</div>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>{F('name', 'NAME')}{F('id', 'ID')}{F('course', 'COURSE')}{F('email', 'EMAIL')}{F('phone', 'PHONE')}{F('address', 'ADDRESS')}{F('guardian', 'GUARDIAN')}{F('emergency', 'EMERGENCY')}</div><div style={{ marginTop: 18 }}><button style={{ ...btn, borderRadius: 10 }} onClick={() => { try { localStorage.setItem('cec:s_profile', JSON.stringify(profile)); } catch { /* ignore */ } onNotify('Profile changes saved'); }}>Save Changes</button></div><div style={{ marginTop: 22, borderTop: '1px solid #eef1f6', paddingTop: 18 }}><ChangePassword identifier={currentUser?.email || profile.email || profile.id} onNotify={onNotify} /></div><Footer /></section>);
    }
    if (active === 'Password Recovery') return <PasswordRecovery identifier={currentUser?.email || profile.id} email={profile.email} onNotify={onNotify} />;
    if (active === 'Grades / Report Card') {
      let allOfficial: { id: string; student?: string; studentId?: string; prelim: string; midterm: string; final: string }[] = [];
      try {
        const raw = localStorage.getItem('cec:t_grades_v2');
        allOfficial = raw ? JSON.parse(raw) : [];
      } catch { allOfficial = []; }
      const profileMatchesAccount = !currentUser?.id || profile.id === currentUser.id;
      const names = [currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : '', profileMatchesAccount ? profile.name : ''].filter(Boolean).map((value) => value.trim().toLowerCase());
      const ids = [currentUser?.id, profileMatchesAccount ? profile.id : ''].filter(Boolean).map((value) => String(value).trim().toLowerCase());
      const official = allOfficial.filter((grade) => (grade.studentId && ids.includes(grade.studentId.trim().toLowerCase())) || (grade.student && names.includes(grade.student.trim().toLowerCase())));
      const pts = official.map((g) => averagePercent([g.prelim, g.midterm, g.final])).filter((avg): avg is number => avg !== null).map((avg) => percentToPoint(avg).point);
      const myGwa = gwa(pts);
      return (<section style={card}><h1 style={{ margin: 0 }}>Grades / Report Card — PH 1.00–5.00{myGwa !== null && <span style={{ fontSize: 15 }}> • GWA: <strong>{formatPoint(myGwa)}</strong></span>}</h1>
        {!official.length && <div style={box}>No grades encoded yet — waiting for teacher grade encoding.</div>}
        {!!official.length && <div style={{ ...box, padding: 0 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 12 }}>Student</th><th style={{ padding: 12 }}>Average</th><th style={{ padding: 12 }}>Point</th><th style={{ padding: 12 }}>Equivalent</th><th style={{ padding: 12 }}>Remarks</th></tr></thead><tbody>{official.map((g) => { const avg = averagePercent([g.prelim, g.midterm, g.final]); const gp = avg === null ? null : percentToPoint(avg); return <tr key={g.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}>{g.student}</td><td style={{ padding: 12 }}>{avg === null ? '—' : `${avg.toFixed(1)}%`}</td><td style={{ padding: 12, fontWeight: 800 }}>{gp ? formatPoint(gp.point) : '—'}</td><td style={{ padding: 12 }}>{gp ? gp.equivalent : '—'}</td><td style={{ padding: 12 }}><span style={{ background: gp && gp.remarks === 'PASSED' ? '#dcfce7' : '#fee2e2', color: gp && gp.remarks === 'PASSED' ? '#15803d' : '#b91c1c', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>{gp ? gp.remarks : '—'}</span></td></tr>; })}</tbody></table></div>}
        <div style={{ ...box, padding: 0, marginTop: 14 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 12 }}>Code</th><th style={{ padding: 12 }}>Subject</th><th style={{ padding: 12 }}>Status</th><th style={{ padding: 12 }}>Actions</th></tr></thead><tbody>{subjects.list.map((s) => <tr key={s.id} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 12 }}>{s.id}</td><td style={{ padding: 12 }}>{s.name}</td><td style={{ padding: 12 }}>{s.role}</td><td style={{ padding: 12 }}><button style={ghost} onClick={() => onNotify(`${s.id} report viewed (Read)`)}>View</button> <button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { subjects.remove(s.id); onNotify('Subject dropped (Delete)'); }}>Drop</button></td></tr>)}</tbody></table></div><Footer /></section>);
    }
    if (active === 'Class Schedule') {
      const picks = readPicks();
      const tag = sectionTagOf(picks);
      const total = picks.reduce((n, o) => n + o.units, 0);
      if (!picks.length) {
        return (<section style={card}><h1 style={{ margin: 0 }}>Class Schedule (COR)</h1><div style={box}>No schedules yet — pick them at <strong>Section Selection</strong> and they appear here automatically with EDP codes.</div><Footer /></section>);
      }
      return (<section style={card}><h1 style={{ margin: 0 }}>Class Schedule (COR)</h1>
        <p style={{ color: '#6b7890', fontSize: 13 }}>Section: <strong>{tag}</strong> • {picks.length} subjects • {total} units • {academicConfig.semester} {academicConfig.schoolYear}</p>
        <div style={{ ...box, padding: 0, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 10 }}>EDP Code</th><th style={{ padding: 10 }}>Subject</th><th style={{ padding: 10 }}>Descriptive Title</th><th style={{ padding: 10 }}>Schedule</th><th style={{ padding: 10 }}>Room</th><th style={{ padding: 10 }}>Type</th><th style={{ padding: 10 }}>Units</th></tr></thead><tbody>
          {picks.map((o) => <tr key={o.edp} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 10 }}><strong>{o.edp}</strong></td><td style={{ padding: 10 }}>{o.subject}</td><td style={{ padding: 10 }}>{o.descriptive}</td><td style={{ padding: 10 }}>{o.schedule}</td><td style={{ padding: 10 }}>{o.room}</td><td style={{ padding: 10 }}>{o.type}</td><td style={{ padding: 10 }}>{o.units}</td></tr>)}
          <tr style={{ borderTop: '2px solid #0B3D91' }}><td colSpan={6} style={{ padding: 10, textAlign: 'right', fontWeight: 800 }}>Total units</td><td style={{ padding: 10, fontWeight: 800 }}>{total}</td></tr>
        </tbody></table></div><Footer /></section>);
    }
    if (active === 'Enrolled Subjects') {
      // Instructors come only from the live faculty / teacher accounts.
      const instructors: Record<string, { id: string; name: string }> = {};
      try {
        const fRaw = localStorage.getItem('cec:a_faculty_v2');
        (fRaw ? (JSON.parse(fRaw) as { id: string; name: string }[]) : []).forEach((f) => { instructors[f.id] = { id: f.id, name: f.name }; });
        const aRaw = localStorage.getItem('cec:a_accounts_v2');
        (aRaw ? (JSON.parse(aRaw) as { id: string; name: string; role: string }[]) : []).filter((a) => /teacher|faculty/i.test(a.role)).forEach((a) => { instructors[a.id] = { id: a.id, name: a.name }; });
      } catch { /* ignore */ }
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>Enrolled Subjects</h1>
        <div style={{ ...box }}><strong>My instructors</strong><div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>{Object.values(instructors).map((t) => <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><PhotoAvatar userId={t.id} name={t.name} size={40} /><div><div style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</div><div style={{ fontSize: 11, color: '#6b7890' }}>{t.id}</div></div></div>)}{!Object.keys(instructors).length && <span style={{ fontSize: 13, color: '#6b7890' }}>No instructors assigned yet.</span>}</div></div>
        <div style={box}>{subjects.list.length ? subjects.list.map((s) => { const inst = instructors[s.id]; return <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #eef1f6' }}>{inst ? <PhotoAvatar userId={inst.id} name={inst.name} size={32} /> : <span style={{ width: 32 }} />}<div style={{ flex: 1 }}><strong>{s.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{s.id} • {s.role}{inst ? ` • ${inst.name}` : ''}</div></div><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { subjects.remove(s.id); onNotify('Subject dropped'); }}>Drop</button></div>; }) : <div style={{ fontSize: 13, color: '#6b7890' }}>No enrolled subjects yet — they appear automatically once your enrollment is approved and schedules are set.</div>}</div><Footer /></section>);
    }
    if (active === 'Curriculum Checklist') {
      const done = checklist.list.filter((c) => c.role === 'done').length;
      return (<section style={card}><h1 style={{ margin: 0 }}>Curriculum Checklist — {done}/{checklist.list.length} done</h1><div style={{ height: 10, background: '#edf1f5', borderRadius: 8, marginTop: 12 }}><div style={{ width: `${checklist.list.length ? (done / checklist.list.length) * 100 : 0}%`, height: '100%', background: NAVY, borderRadius: 8 }} /></div><div style={box}>{checklist.list.map((c) => <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={c.role === 'done'} onChange={() => { checklist.update(c.id, { role: c.role === 'done' ? 'pending' : 'done' }); onNotify('Checklist updated'); }} />{c.name}</label><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { checklist.remove(c.id); onNotify('Checklist item deleted'); }}>Delete</button></div>)}</div><Footer /></section>);
    }
    if (active === 'Attendance Records') {
      const rows = scopedAttendance.filter((a) => a.name.toLowerCase().includes(attFilter.toLowerCase()));
      return (<section style={card}><h1 style={{ margin: 0 }}>Attendance Records</h1><input style={{ ...inp, marginTop: 14, maxWidth: 400 }} placeholder="Filter by date or section..." value={attFilter} onChange={(e) => setAttFilter(e.target.value)} /><div style={box}>{rows.length ? rows.map((a) => <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><span>{a.name}</span><strong>{a.role}</strong></div>) : <div style={{ fontSize: 13, color: '#6b7890' }}>No attendance records yet — your teachers record attendance in Daily Attendance and it appears here automatically.</div>}</div><Footer /></section>);
    }
    if (active === 'Online Enrollment') {
      return (<section style={card}><h1 style={{ margin: 0 }}>Online Enrollment</h1>
        <div style={{ marginTop: 14 }}><SlideShow slides={REGISTRAR_SLIDES} label="Registrar office slideshow" /></div>
        <p style={{ color: '#6b7890', fontSize: 13 }}>Applications go straight to Admin → Enrollment Approval. Turn on auto-approve there for instant approval.</p><form style={{ display: 'flex', gap: 8, marginTop: 14, maxWidth: 720 }} onSubmit={(e) => { e.preventDefault(); submitEnrollment(enrPg, enrYr, enrSm); }}><select style={inp} value={enrPg} onChange={(e) => setEnrPg(e.target.value)}><option>BSIT</option><option>BSCS</option><option>BEED</option></select><select style={inp} value={enrYr} onChange={(e) => setEnrYr(e.target.value)}><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select><select style={inp} value={enrSm} onChange={(e) => setEnrSm(e.target.value)}><option>1st Semester</option><option>2nd Semester</option></select><button style={btn} type="submit">Submit</button></form><Footer /></section>);
    }
    if (active === 'Section Selection') {
      // Registrar/admin-published study-load batches are the only source.
      const catalog = readPublishedLoads();
      const publishedBatches = [...new Set(catalog.map((o) => o.batch).filter((b): b is number => typeof b === 'number'))];
      const subjects8 = [...new Set(catalog.map((o) => o.subject))];
      const saved = readPicks();
      const tag = sectionTagOf(saved);
      const togglePick = (edp: string, subject: string) => {
        setSchedMode('auto');
        setSecSel((s) => {
          // Empty choice (or re-pick) removes a wrong choice
          if (!edp) return s.filter((e) => { const o = catalog.find((x) => x.edp === e); return !o || o.subject !== subject; });
          if (s.includes(edp)) return s.filter((e) => e !== edp);
          const without = s.filter((e) => { const o = catalog.find((x) => x.edp === e); return !o || o.subject !== subject; });
          return [...without, edp];
        });
      };
      const chosen: Offering[] = secSel.map((e) => catalog.find((o) => o.edp === e)).filter((o): o is Offering => !!o);
      const previewTag = sectionTagOf(chosen);
      const applyMode = (mode: 'auto' | 'regular' | 'irregular') => {
        setSchedMode(mode);
        if (mode === 'auto') return;
        const subjects8b = [...new Set(catalog.map((o) => o.subject))];
        const preset = subjects8b.map((subj) => {
          const opts = catalog.filter((o) => o.subject === subj);
          const pick = mode === 'regular'
            ? opts.find((o) => o.section !== 'OPEN') ?? opts[0]
            : opts.find((o) => o.section === 'OPEN') ?? opts[1] ?? opts[0];
          return pick.edp;
        });
        setSecSel(preset);
        onNotify(mode === 'regular' ? 'Regular preset applied — one section per subject' : 'Irregular preset applied — mixed schedules');
      };
      const savePicks = () => {
        const open = chosen;
        if (!open.length) { onNotify('Pick at least one schedule first'); return; }
        try { localStorage.setItem('cec:s_picks', JSON.stringify(open)); } catch { /* ignore */ }
        const label = sectionTagOf(open);
        // EDP sees the tag: update latest application + admin queue entry
        try {
          const raw = localStorage.getItem('cec:s_enroll_apps');
          if (raw) {
            const rows = JSON.parse(raw) as { id: string; name: string; role: string }[];
            const target = [...rows].reverse().find((r) => r.role.startsWith('Pending')) ?? rows[rows.length - 1];
            if (target && !/Regular|Irregular/.test(target.name)) {
              target.name = `${target.name} [${label}]`;
              localStorage.setItem('cec:s_enroll_apps', JSON.stringify(rows));
            }
          }
          const q = localStorage.getItem('cec:a_enroll_v2');
          if (q) {
            const rows = JSON.parse(q) as { id: string; name: string; meta: string }[];
            rows.forEach((r) => { if (!/Regular|Irregular/.test(r.meta)) r.meta = `${r.meta} • ${label}`; });
            localStorage.setItem('cec:a_enroll_v2', JSON.stringify(rows));
          }
        } catch { /* ignore */ }
        // Enrolled subjects follow the picks
        open.forEach((o) => {
          if (!subjects.list.some((s) => s.id === o.edp)) {
            subjects.create({ id: o.edp, name: `${o.subject} — ${o.descriptive}`, role: `${o.schedule} • ${o.room}` });
          }
        });
        pushNotification(['admin'], { title: `Schedules picked: ${label}`, detail: `${open.length} offerings • ${open.reduce((n, o) => n + o.units, 0)} units`, category: 'Enrollment', target: 'Section Assignment' });
        onNotify(`Schedules saved — EDP tagged: ${label}`);
      };
      return (<section style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>Schedule Selection (EDP)</h1>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#33415c' }}>Student type
            <select value={schedMode} onChange={(e) => applyMode(e.target.value as 'auto' | 'regular' | 'irregular')} aria-label="Student type" style={{ ...inp, width: 'auto', padding: '10px 12px' }}>
              <option value="auto">Auto-detect from picks</option>
              <option value="regular">Regular — full section</option>
              <option value="irregular">Irregular — OPEN</option>
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#33415c' }}>Class time
            <select value={schedFilter} onChange={(e) => setSchedFilter(e.target.value as 'all' | 'morning' | 'afternoon' | 'evening')} aria-label="Class time filter" style={{ ...inp, width: 'auto', padding: '10px 12px' }}>
              <option value="all">All day</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </label>
        </div>
        <p style={{ color: '#6b7890', fontSize: 13 }}>Pick <strong>one schedule per subject</strong> — not a section. All picks in one section → <strong>Regular</strong>; mixed/OPEN picks → <strong>Irregular (OPEN)</strong>. {publishedBatches.length ? <>Includes registrar-published {publishedBatches.map((b) => `Batch ${b}`).join(', ')}. </> : null}{saved.length ? <>Current EDP tag: <strong>{tag}</strong></> : 'No schedules saved yet.'} {chosen.length ? <>Picking now: <strong>{previewTag}</strong></> : null}</p>
        {!catalog.length ? <div style={box}><strong>No schedules published yet</strong><div style={{ fontSize: 13, color: '#6b7890', marginTop: 6 }}>The registrar builds study-load batches and submits them first — published schedules then appear here automatically.</div></div> : <div style={{ ...box, padding: 0, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 10 }}>Subject / Descriptive</th><th style={{ padding: 10 }}>Schedule (pick one)</th><th style={{ padding: 10 }}>EDP Code</th><th style={{ padding: 10 }}>Room</th><th style={{ padding: 10 }}>Type</th><th style={{ padding: 10 }}>Units</th><th style={{ padding: 10 }}>Availability</th></tr></thead><tbody>
          {subjects8.map((subj) => {
            const opts = catalog.filter((o) => o.subject === subj);
            const visibleOpts = schedFilter === 'all' ? opts : opts.filter((o) => scheduleBucket(o.schedule) === schedFilter);
            const picked = opts.find((o) => secSel.includes(o.edp)) ?? null;
            const shown = picked ?? visibleOpts[0] ?? null;
            if (!shown) return <tr key={subj} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 10 }}><strong>{subj}</strong></td><td colSpan={6} style={{ padding: 10, color: '#8a94a6', fontSize: 12 }}>No {schedFilter} schedules for this subject — switch Class time to All day.</td></tr>;
            return <tr key={subj} style={{ borderTop: '1px solid #eef1f6', background: picked ? '#eef4ff' : undefined }}><td style={{ padding: 10 }}><strong>{subj}</strong><br /><small style={{ color: '#6b7890' }}>{shown.descriptive}</small></td><td style={{ padding: 10 }}><div style={{ display: 'grid', gap: 6 }}>{visibleOpts.map((o) => { const cap = capacityOf(o); return <label key={o.edp} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="radio" name={`pick-${subj}`} checked={secSel.includes(o.edp)} onClick={() => togglePick(o.edp, subj)} onChange={() => undefined} aria-label={`${o.subject} ${o.schedule}`} /><span>{o.schedule}<br /><small style={{ color: '#6b7890' }}>{o.batch ? `Batch ${o.batch} • ` : ''}{cap ? `Capacity ${cap}` : 'Open'}</small></span></label>; })}</div></td><td style={{ padding: 10 }}><strong>{picked ? shown.edp : '—'}</strong></td><td style={{ padding: 10 }}>{picked ? shown.room : '—'}</td><td style={{ padding: 10 }}>{picked ? shown.type : '—'}</td><td style={{ padding: 10 }}>{picked ? shown.units : '—'}</td><td style={{ padding: 10 }}>{!picked ? <span style={{ color: '#8a94a6', fontSize: 11 }}>Not picked</span> : <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>Picked</span>}</td></tr>;
          })}
        </tbody></table></div>}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}><button style={btn} onClick={savePicks}>Save schedules ({chosen.length} picked • {chosen.reduce((n, o) => n + o.units, 0)} units)</button></div><Footer /></section>);
    }
    if (active === 'Status Tracker') return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>Enrollment Status Tracker</h1><div style={{ marginTop: 14 }}><LiveEnrollTracker apps={enrollApps.list} /></div><Footer /></section>);
    if (active === 'Document Submission') return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>Document Submission</h1>
      <p style={{ color: '#6b7890', fontSize: 13 }}>One connected flow: attach your <strong>School Assessment</strong>, type your <strong>School ID</strong>, press <strong>Submit</strong> — verification completes below by itself.</p>
      <DocumentFlow col={docs} onNotify={onNotify} />
      <Footer /></section>);
    if (active === 'Tuition Assessment') {
      const official = readOfficialAssessment();
      const mine = charges.list.map((c) => ({ id: c.id, label: `${c.name} — ${c.role}`, amount: parseAmount(`${c.name} ${c.role}`) }));
      const total = [...official, ...mine].reduce((n, l) => n + l.amount, 0);
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>Tuition Assessment — live from Finance Office</h1>
        <div style={box}>
          <strong>Official assessment ({official.length})</strong>
          {official.length ? official.map((l) => <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eef1f6', fontSize: 14 }}><span>{l.label}</span><strong>₱{l.amount.toLocaleString()}</strong></div>) : <div style={{ fontSize: 13, color: '#6b7890' }}>No official assessment issued yet — finance office publishes it here.</div>}
        </div>
        <div style={box}>
          <strong>My adjustments ({mine.length})</strong>
          {mine.map((l) => <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eef1f6', fontSize: 14 }}><span>{l.label}</span><span>₱{l.amount.toLocaleString()} <button style={{ ...ghost, color: '#b91c1c', marginLeft: 8 }} onClick={() => { charges.remove(l.id); onNotify('Adjustment removed'); }}>Remove</button></span></div>)}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: 15 }}><strong>Total assessed</strong><strong>₱{total.toLocaleString()}</strong></div>
        </div>
        <Footer /></section>);
    }
    if (active === 'Payment Portal') {
      // Cash-only: no online gateways. Generate a PLEASE PAY receipt, print it,
      // and settle cash at the EDP office. The balance clears only when staff verify.
      const generateReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = payAmt.trim().replace(/,/g, '');
        if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
          onNotify('Enter a valid amount');
          return;
        }
        const ref = `OR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        const at = new Date().toLocaleString();
        let qr = '';
        try {
          qr = await QRCode.toDataURL(ref, { width: 160, margin: 1 });
        } catch { /* printed reference number suffices */ }
        history.create({ id: uid('OR'), name: `OR — ₱${amount} • Cash (EDP) • Ref ${ref}`, role: 'PLEASE PAY • Unpaid • settle cash at EDP office' });
        try {
          void portalApi.itemCreate({ portal: 'student', module: 'receipt', title: `OR — ₱${amount} • Cash (EDP)`, detail: `Ref ${ref} • ${profile.name} • ${profile.id} • ${at}`, status: 'PLEASE PAY', owner: `${profile.name} (${profile.id})` }).catch(() => undefined);
        } catch { /* offline */ }
        pushNotification(['student', 'admin'], { title: 'Cash receipt issued — PLEASE PAY', detail: `₱${amount} • Ref ${ref} • present this receipt at the EDP office`, category: 'Finance', target: 'Payment Portal' });
        setCashReceipt({ ref, amount, qr, at });
        setPayAmt('');
        onNotify('Receipt issued — pay cash at the EDP office');
      };
      return (<><LivePayTracker steps={paymentSteps} /><section style={card}><h1 style={{ margin: 0 }}>Payment Portal — Cash Only</h1>
        <div style={{ marginTop: 14 }}><SlideShow slides={FINANCE_SLIDES} label="Cashier office" /></div>
        <div style={{ ...box, borderLeft: '4px solid #b91c1c' }}>
          <strong>Cash payments only — no online gateways.</strong>
          <div style={{ fontSize: 13, color: '#6b7890', marginTop: 6 }}>1. Enter the amount and generate your receipt. 2. Print it and bring it to the <strong>EDP office</strong> with your cash. 3. Staff clear the receipt — your balance updates after verification, not before.</div>
        </div>
        <form style={{ display: 'flex', gap: 8, marginTop: 12, maxWidth: 560 }} onSubmit={generateReceipt}>
          <input style={inp} placeholder="Amount e.g. 5000" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} inputMode="decimal" aria-label="Amount" />
          <button style={btn} type="submit">Generate receipt</button>
        </form>
        {cashReceipt && (
          <div style={box}>
            <style>{`@media print { body * { visibility: hidden; } #cec-cash-receipt, #cec-cash-receipt * { visibility: visible; } #cec-cash-receipt { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
            <div id="cec-cash-receipt" style={{ position: 'relative', border: '2px solid #0B3D91', borderRadius: 12, padding: 20, maxWidth: 460, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 18, right: -34, transform: 'rotate(35deg)', background: '#b91c1c', color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '.12em', padding: '6px 40px' }}>PLEASE PAY</div>
              <div style={{ fontWeight: 800, color: '#0B3D91' }}>Cebu Eastern College — Payment Receipt</div>
              <div style={{ fontSize: 13, color: '#6b7890', marginTop: 2 }}>Cash settlement at the EDP office • {cashReceipt.at}</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 14, alignItems: 'center' }}>
                {cashReceipt.qr && <img src={cashReceipt.qr} alt={`Receipt ${cashReceipt.ref} QR code`} width={120} height={120} style={{ width: 120, height: 120 }} />}
                <div>
                  <div style={{ fontSize: 12, color: '#6b7890' }}>Reference number</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{cashReceipt.ref}</div>
                  <div style={{ fontSize: 12, color: '#6b7890', marginTop: 6 }}>Amount due</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>₱{cashReceipt.amount}</div>
                  <div style={{ fontSize: 12, color: '#6b7890', marginTop: 6 }}>{profile.name} • {profile.id}</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button style={btn} type="button" onClick={() => window.print()}>Print receipt</button>
              <button style={ghost} type="button" onClick={() => { setCashReceipt(null); onNotify('Receipt closed — find it in Billing History'); }}>Done</button>
            </div>
          </div>
        )}
        <Footer /></section></>);
    }
    if (active === 'Billing History') return <CrudSection title="Billing History" col={history} onNotify={onNotify} hint="Tuition" />;
    if (active === 'Scholarship Application') {
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>Scholarship Application — live with Finance Office</h1>
        <form style={{ display: 'flex', gap: 8, marginTop: 14, maxWidth: 640 }} onSubmit={(e) => { e.preventDefault(); if (!scholarName.trim()) return; const sid = uid('sc'); scholar.create({ id: sid, name: scholarName.trim(), role: 'Submitted — awaiting finance decision' }); try { const raw = localStorage.getItem('cec:a_scholars_v2'); const rows = raw ? (JSON.parse(raw) as { id: string; name: string; role: string }[]) : [];
        rows.push({ id: sid, name: `${scholarName.trim()} — ${profile.name} (${profile.id})`, role: 'Submitted • Pending' });
        localStorage.setItem('cec:a_scholars_v2', JSON.stringify(rows));
      } catch { /* ignore */ } setScholarName(''); onNotify('Scholarship application sent to finance office'); }}>
          <input style={inp} placeholder="e.g. Academic Excellence" value={scholarName} onChange={(e) => setScholarName(e.target.value)} aria-label="Scholarship name" />
          <button style={btn} type="submit">Apply</button>
        </form>
        <div style={box}>{scholar.list.map((s) => <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eef1f6', fontSize: 14 }}><div><strong>{s.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{s.role}</div></div><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { scholar.remove(s.id); onNotify('Application withdrawn'); }}>Withdraw</button></div>)}{!scholar.list.length && <div style={{ color: '#6b7890', fontSize: 13 }}>No applications — decisions from the finance office appear here automatically.</div>}</div><Footer /></section>);
    }
    if (active === 'Course Material') return (<><ClassroomBridge mode="student" onNotify={onNotify} /><TwoFieldForm title="Course Material" col={materials} onNotify={onNotify} ph1="Material title" ph2="Type • Subject" /></>);
    if (active === 'Assignments') {
      return (<><ClassroomBridge mode="student" onNotify={onNotify} /><section style={card}><h1 style={{ margin: 0 }}>Assignments</h1><div style={box}>
        <SubjectClassroomCards subjects={subjects.list.map((s) => ({ id: s.id, title: s.name, detail: s.role }))} />
        {assigns.list.map((a) => <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><div><strong>{a.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{a.role}</div></div><div style={{ display: 'flex', gap: 6 }}><button style={btn} onClick={() => { assigns.update(a.id, { role: 'Submitted • For review' }); onNotify('Assignment submitted (Update)'); }}>Submit</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { assigns.remove(a.id); onNotify('Assignment deleted'); }}>Delete</button></div></div>)}</div><Footer /></section></>);
    }
    if (active === 'Quiz / Exam') {
      return (<><ClassroomBridge mode="student" onNotify={onNotify} /><section style={card}><h1 style={{ margin: 0 }}>Quiz / Exam</h1><div style={box}>{quizzes.list.map((qz) => <div key={qz.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><div><strong>{qz.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{qz.role}</div></div><div style={{ display: 'flex', gap: 6 }}><button style={btn} onClick={() => { const score = 7 + Math.floor(Math.random() * 4); quizzes.update(qz.id, { role: `Score ${score}/10 • Taken` }); onNotify(`Quiz submitted: ${score}/10`); }}>Take quiz</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { quizzes.remove(qz.id); onNotify('Quiz deleted'); }}>Delete</button></div></div>)}</div><Footer /></section></>);
    }
    if (active === 'Announcement Board') {
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>Announcement Board</h1>
        <p style={{ color: '#6b7890', fontSize: 13 }}>Live from the administration{announcementsLive ? ' • connected' : ' • offline — showing last synced'}.</p>
        <div style={box}>{liveAnnouncements.map((a) => <div key={a.id} style={{ padding: '12px 0', borderBottom: '1px solid #eef1f6' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}><strong style={{ fontSize: 14 }}>{a.title}</strong><span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 800 }}>NEW</span></div><div style={{ fontSize: 13, color: '#33415c', marginTop: 4, whiteSpace: 'pre-wrap' }}>{a.content}</div><div style={{ fontSize: 11, color: '#8a94a6', marginTop: 4 }}>{a.published_at ? new Date(a.published_at).toLocaleString() : ''}{a.published_by_name ? ` • ${a.published_by_name}` : ''}</div></div>)}
          {!liveAnnouncements.length && <div style={{ color: '#6b7890', fontSize: 13 }}>No announcements yet — new ones from the administration appear here automatically.</div>}</div><Footer /></section>);
    }
    if (active === 'Notification Center' || active === 'Announcements') return <CrudSection title={active} col={notifs} onNotify={onNotify} hint="General" />;
    if (active === 'Messaging' || active === 'Discussion Forum') return <TwoFieldForm title={active} col={messages} onNotify={onNotify} ph1="Message" ph2="To / Topic" />;
    if (active === 'Guidance Appointment') return <TwoFieldForm title="Guidance Appointment" col={guide} onNotify={onNotify} ph1="e.g. Advising — Oct 22 10AM" ph2="Status" />;
    if (active === 'Document Request') return <TwoFieldForm title="Document Request" col={docreq} onNotify={onNotify} ph1="Document type" ph2="Status" />;
    if (active === 'COE Request') {
      const studentName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : profile.name;
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>Certificate of Enrollment</h1>
        <p style={{ color: '#6b7890', fontSize: 13 }}>Request once, track by transaction number. You are emailed when it is ready for pickup at the Registrar Office.</p>
        <div style={box}><CoeRequest studentName={studentName || 'Student'} program={profile.course} onNotify={onNotify} /></div><Footer /></section>);
    }
    if (active === 'Complaint / Feedback') return <TwoFieldForm title="Complaint / Feedback" col={feedback} onNotify={onNotify} ph1="Subject" ph2="Details / Status" />;
    if (active === 'Registration / Enrollment') {
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>Registration / Enrollment</h1><div style={{ marginTop: 14 }}><SlideShow slides={REGISTRAR_SLIDES} label="Registrar office slideshow" /></div><p style={{ color: '#6b7890', fontSize: 13 }}>New applications are sent to Admin → Enrollment Approval (same queue as Online Enrollment).</p><form style={{ display: 'flex', gap: 8, marginTop: 14, maxWidth: 720 }} onSubmit={(e) => { e.preventDefault(); submitEnrollment(enrPg, enrYr, enrSm); }}><select style={inp} value={enrPg} onChange={(e) => setEnrPg(e.target.value)}><option>BSIT</option><option>BSCS</option><option>BEED</option></select><select style={inp} value={enrYr} onChange={(e) => setEnrYr(e.target.value)}><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select><button style={btn} type="submit">Submit application</button></form><div style={box}>{enrollApps.list.map((a) => <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><div><strong>{a.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{a.id} • {a.role}</div></div><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { enrollApps.remove(a.id); onNotify('Application withdrawn'); }}>Withdraw</button></div>)}</div><Footer /></section>);
    }
    return <CrudSection title={active} col={subjects} onNotify={onNotify} hint="General" />;
  };

  return (
    <DashboardShell
      role="student"
      groups={GROUPS}
      active={active}
      expanded={expanded}
      onExpand={setExpanded}
      onNavigate={navigate}
      onLogout={onLogout}
      userName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : profile.name}
      userIdLine={currentUser?.id ?? profile.id}
      photoUserId={currentUser?.id ?? profile.id}
      photoVersion={photoTick}
      moduleItems={moduleItems}
      searchRecords={searchRecords}
      popup={popup}
      onClosePopup={() => setPopup(null)}
    >
      {render()}
    </DashboardShell>
  );
};
