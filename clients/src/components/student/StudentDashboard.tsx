import { useEffect, useRef, useState } from 'react';
import { useCollection, uid, genSchoolId } from '../../services/crud';
import { useTheme } from '../../services/theme';
import { portalApi } from '../../services/portal';
import { percentToPoint, formatPoint, averagePercent, gwa } from '../../services/grading';
import { pushNotification } from '../../services/notify';
import { refreshPipeline, readOfficialAssessment, parseAmount } from '../../services/pipeline';
import { setPhoto, readPhotoFile } from '../../services/photos';
import { ensureSchoolId } from '../../services/crud';
import { PhotoAvatar } from '../shared/PhotoAvatar';
import { ChangePassword } from '../shared/ChangePassword';
import { AlertPopup } from '../shared/AlertPopup';
import { FileUploadDialog } from '../shared/FileUploadDialog';
import { SlideShow, REGISTRAR_SLIDES, FINANCE_SLIDES } from '../shared/SlideShow';
import { RoleDashboardHome } from '../shared/RoleDashboardHome';
import { DashboardCommandMenu } from '../shared/DashboardCommandMenu';
import { NotificationCenter } from '../shared/NotificationCenter';
import { openEditDialog } from '../shared/EditDialog';
import { WorkflowTracker, type WorkflowStep } from '../shared/WorkflowTracker';
import { readStage, DOC_STAGES, SUBMIT_STAGES, SUBMIT_STEPS, writeStage, autoVerifyDoc } from '../../services/docStages';

type Props = { currentUser: { firstName: string; lastName: string; role: string; id?: string; email?: string } | null; onNotify: (t: string) => void; onLogout: () => void; };
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
  { id: 'lib', label: 'LIBRARY', icon: '▧', items: [{ label: 'Book Catalog', route: 's_lib_catalog' }, { label: 'Borrowing Tracker', route: 's_lib_borrow' }, { label: 'Reservations', route: 's_lib_reserve' }, { label: 'Fines / Penalties', route: 's_lib_fines' }] },
  { id: 'comm', label: 'COMMUNICATION', icon: '✉', items: [{ label: 'Notification Center', route: 's_com_notif' }, { label: 'Announcement Board', route: 's_com_board' }, { label: 'Messaging', route: 's_com_msg' }] },
  { id: 'support', label: 'SUPPORT SERVICES', icon: '◫', items: [{ label: 'Guidance Appointment', route: 's_sup_guide' }, { label: 'Document Request', route: 's_sup_docs' }, { label: 'Complaint / Feedback', route: 's_sup_feedback' }] },
];
const pill: React.CSSProperties = { border: '1px solid #e2e7ef', background: '#fff', borderRadius: 999, padding: '6px 12px', fontSize: 12, color: '#6b7890' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e8ecf3', borderRadius: 16, padding: 32, maxWidth: 1120, margin: '0 auto' };
const box: React.CSSProperties = { border: '1px solid #e6eaf1', borderRadius: 12, padding: 18, marginTop: 14 };
const btn: React.CSSProperties = { background: NAVY, color: '#fff', border: 0, borderRadius: 8, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' };
const ghost: React.CSSProperties = { border: '1px solid #e2e7ef', background: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' };
const inp: React.CSSProperties = { border: '1px solid #e2e7ef', borderRadius: 10, padding: '12px 14px', fontSize: 14, width: '100%', background: '#fff' };
const lbl: React.CSSProperties = { fontSize: 12, color: '#6b7890', letterSpacing: '.04em', marginBottom: 6, display: 'block' };

const Footer = () => (<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}><span style={pill}>CEC Blue #0B3D91 • Gold #FFC928</span><span style={pill}>24 Subsystems • 31 Modules Functional</span><span style={pill}>Full CRUD • localStorage persisted</span></div>);

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

type Offering = { edp: string; subject: string; descriptive: string; schedule: string; room: string; type: 'Lec' | 'Lab'; units: number; section: string };

// EDP offerings (BSIT 3rd Year, 1st Sem) — pick ONE schedule per subject.
// Uniform section picks → Regular; mixed/OPEN picks → Irregular (OPEN).
const OFFERINGS: Offering[] = [
  { edp: '2611005', subject: 'GE ELEC 7', descriptive: 'LITERATURES OF THE WORLD', schedule: 'TTHS 02:30-03:30 PM', room: 'H 308', type: 'Lec', units: 3, section: 'BSIT-3A' },
  { edp: '2611006', subject: 'GE ELEC 7', descriptive: 'LITERATURES OF THE WORLD', schedule: 'TTHS 04:30-05:30 PM', room: 'H 308', type: 'Lec', units: 3, section: 'OPEN' },
  { edp: '2611118', subject: 'GE 8', descriptive: 'UNDERSTANDING THE SELF WITH MENTAL HEALTH', schedule: 'TTHS 03:30-04:30 PM', room: 'H 307', type: 'Lec', units: 3, section: 'BSIT-3A' },
  { edp: '2611119', subject: 'GE 8', descriptive: 'UNDERSTANDING THE SELF WITH MENTAL HEALTH', schedule: 'M 07:30-09:00 AM', room: 'H 307', type: 'Lec', units: 3, section: 'OPEN' },
  { edp: '2612213', subject: 'IT EVD31', descriptive: 'EVENT DRIVEN PROGRAMMING (LECTURE)', schedule: 'MW 01:00-02:00 PM', room: 'OL 107', type: 'Lec', units: 2, section: 'BSIT-3A' },
  { edp: '2611213', subject: 'IT EVD31', descriptive: 'EVENT DRIVEN PROGRAMMING (LECTURE)', schedule: 'TTH 01:00-02:00 PM', room: 'OL 107', type: 'Lec', units: 2, section: 'OPEN' },
  { edp: '2611891', subject: 'IT EVD31 LAB', descriptive: 'EVENT DRIVEN PROGRAMMING (LABORATORY)', schedule: 'FS 07:30-09:00 AM', room: 'OCL', type: 'Lab', units: 1, section: 'BSIT-3A' },
  { edp: '2611890', subject: 'IT EVD31 LAB', descriptive: 'EVENT DRIVEN PROGRAMMING (LABORATORY)', schedule: 'FS 09:00-10:30 AM', room: 'OCL', type: 'Lab', units: 1, section: 'OPEN' },
  { edp: '2612214', subject: 'IT IAS31', descriptive: 'INFORMATION ASSURANCE AND SECURITY 1 (LECTURE)', schedule: 'MW 02:00-03:00 PM', room: 'OL 108', type: 'Lec', units: 2, section: 'BSIT-3A' },
  { edp: '2611214', subject: 'IT IAS31', descriptive: 'INFORMATION ASSURANCE AND SECURITY 1 (LECTURE)', schedule: 'TTH 02:00-03:00 PM', room: 'OL 108', type: 'Lec', units: 2, section: 'OPEN' },
  { edp: '2612215', subject: 'IT NET31', descriptive: 'NETWORKING 1 (LECTURE)', schedule: 'MW 11:00-12:00 PM', room: 'OL 109', type: 'Lec', units: 2, section: 'BSIT-3A' },
  { edp: '2611215', subject: 'IT NET31', descriptive: 'NETWORKING 1 (LECTURE)', schedule: 'TTH 11:00-12:00 PM', room: 'OL 109', type: 'Lec', units: 2, section: 'OPEN' },
  { edp: '2611893', subject: 'IT NET31 LAB', descriptive: 'NETWORKING 1 (LABORATORY)', schedule: 'MW 06:00-07:30 PM', room: 'CL 3', type: 'Lab', units: 1, section: 'BSIT-3A' },
  { edp: '2611898', subject: 'IT NET31 LAB', descriptive: 'NETWORKING 1 (LABORATORY)', schedule: 'S 09:00-10:30 AM', room: 'CL 3', type: 'Lab', units: 1, section: 'OPEN' },
  { edp: '2612216', subject: 'IT SIA31', descriptive: 'SYSTEM INTEGRATION AND ARCHITECTURE 2 (LECTURE)', schedule: 'FS 11:00-12:00 PM', room: 'OL 110', type: 'Lec', units: 2, section: 'BSIT-3A' },
  { edp: '2611216', subject: 'IT SIA31', descriptive: 'SYSTEM INTEGRATION AND ARCHITECTURE 2 (LECTURE)', schedule: 'S 01:30-03:00 PM', room: 'CL 6', type: 'Lec', units: 2, section: 'OPEN' },
  { edp: '2611892', subject: 'IT IAS31 LAB', descriptive: 'INFORMATION ASSURANCE AND SECURITY 1 (LABORATORY)', schedule: 'MW 07:30-09:00 PM', room: 'CL 5', type: 'Lab', units: 1, section: 'BSIT-3A' },
  { edp: '2611897', subject: 'IT IAS31 LAB', descriptive: 'INFORMATION ASSURANCE AND SECURITY 1 (LABORATORY)', schedule: 'TTH 07:30-09:00 PM', room: 'CL 5', type: 'Lab', units: 1, section: 'OPEN' },
  { edp: '2611894', subject: 'IT SIA31 LAB', descriptive: 'SYSTEM INTEGRATION AND ARCHITECTURE 2 (LABORATORY)', schedule: 'FS 01:30-03:00 PM', room: 'CL 6', type: 'Lab', units: 1, section: 'BSIT-3A' },
  { edp: '2611899', subject: 'IT SIA31 LAB', descriptive: 'SYSTEM INTEGRATION AND ARCHITECTURE 2 (LABORATORY)', schedule: 'S 10:30-12:00 PM', room: 'CL 6', type: 'Lab', units: 1, section: 'OPEN' },
  { edp: '2611895', subject: 'IT SPI31', descriptive: 'SOCIAL AND PROFESSIONAL ISSUES 1', schedule: 'FS 03:00-04:30 PM', room: 'A 201', type: 'Lec', units: 3, section: 'BSIT-3A' },
  { edp: '2611896', subject: 'IT SPI31', descriptive: 'SOCIAL AND PROFESSIONAL ISSUES 1', schedule: 'MW 04:00-05:30 PM', room: 'A 201', type: 'Lec', units: 3, section: 'OPEN' },
];

const readPicks = (): Offering[] => {
  try {
    const raw = localStorage.getItem('cec:s_picks');
    return raw ? (JSON.parse(raw) as Offering[]) : [];
  } catch { return []; }
};

const sectionTagOf = (picks: Offering[]): string => {
  if (!picks.length) return '—';
  const secs = [...new Set(picks.map((p) => p.section))];
  return secs.length === 1 && secs[0] !== 'OPEN' ? `Regular (${secs[0]})` : 'Irregular (OPEN)';
};

// Stable pseudo-random remaining slots (1–60) per offering.
// Takes derive from saved picks: nothing saved yet → full availability;
// each taken subject is minus one slot.
const slotSeed = (edp: string): number => {
  let h = 0;
  for (const ch of edp) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (Math.abs(h) % 60) + 1;
};

const slotsLeft = (edp: string): number => {
  const taken = readPicks().some((p) => p.edp === edp) ? 1 : 0;
  return Math.max(0, slotSeed(edp) - taken);
};

export const StudentDashboard = ({ currentUser, onNotify, onLogout }: Props) => {
  const [active, setActive] = useState('Dashboard');
  const [expanded, setExpanded] = useState('home');
  const [collapsed, setCollapsed] = useState(false);
  const { dark, toggle } = useTheme();
  const [profile, setProfile] = useState(() => {
    try {
      const raw = localStorage.getItem('cec:s_profile');
      if (raw) return JSON.parse(raw);
    } catch { /* fall through to defaults */ }
    return { name: 'Juan Dela Cruz', id: 'CEC-2024-0015', course: 'BSIT - 3rd Year', email: 'juan.delacruz@cec.edu.ph', phone: '0917-123-4567', address: 'Colon St., Cebu City', guardian: 'Maria Dela Cruz - 0917-999-0000', emergency: 'Maria Dela Cruz (Mother) - 0917-999-0000 - Brgy. Tejero' };
  });
  const subjects = useCollection<Rec>('s_subjects_v2', []);
  const schedule = useCollection<Rec>('s_schedule', [{ id: 'sch1', name: 'Mon 8:00-9:30 AM — CS 301', role: 'Lab 3 • Prof. Santos' }, { id: 'sch2', name: 'Tue 10:00-11:30 AM — CS 302', role: 'Lab 2 • Prof. Reyes' }]);
  const checklist = useCollection<Rec>('s_checklist', [{ id: 'IT101', name: 'IT 101 - Intro to Computing', role: 'done' }, { id: 'IT102', name: 'IT 102 - Programming 1', role: 'done' }, { id: 'IT201', name: 'IT 201 - Data Structures', role: 'pending' }]);
  const attendance = useCollection<Rec>('s_attendance', [{ id: 'at1', name: 'CS 301 — Oct 10', role: 'Present' }, { id: 'at2', name: 'CS 302 — Oct 11', role: 'Late' }]);
  const enrollApps = useCollection<Rec>('s_enroll_apps', [{ id: 'ENR-1', name: 'BSIT • 3rd Year • 1st Sem', role: 'Pending' }]);
  const docs = useCollection<Rec>('s_docs', [{ id: 'd1', name: 'PSA Birth Certificate', role: 'Verified' }]);
  const charges = useCollection<Rec>('s_charges_v2', []);
  const history = useCollection<Rec>('s_history_v2', []);
  const scholar = useCollection<Rec>('s_scholar_v2', []);
  const materials = useCollection<Rec>('s_materials', [{ id: 'm1', name: 'Week 5 Slides - Normalization', role: 'PDF • CS 302' }]);
  const assigns = useCollection<Rec>('s_assigns', [{ id: 'a1', name: 'ER Diagram Project', role: 'Due Oct 20 • Not submitted' }]);
  const quizzes = useCollection<Rec>('s_quiz', [{ id: 'q1', name: 'Quiz 3 - SQL Joins', role: '10 items • Not taken' }]);
  const books = useCollection<Rec>('s_books', [{ id: 'b1', name: 'Database System Concepts', role: 'Available' }]);
  const borrows = useCollection<Rec>('s_borrows', [{ id: 'br1', name: 'Intro to Algorithms', role: 'Due Oct 25 • Borrowed' }]);
  const fines = useCollection<Rec>('s_fines', [{ id: 'f1', name: 'Overdue — Lab manual', role: '₱50 • Unpaid' }]);
  const notifs = useCollection<Rec>('s_notifs', [{ id: 'n1', name: 'Library extended hours', role: 'Open until 9PM exam week' }]);
  const messages = useCollection<Rec>('s_messages', [{ id: 'msg1', name: 'To adviser: midterm coverage?', role: 'Sent • Today' }]);
  const guide = useCollection<Rec>('s_guide', [{ id: 'g1', name: 'Academic advising — Oct 22 10AM', role: 'Requested' }]);
  const docreq = useCollection<Rec>('s_docreq', [{ id: 'dr1', name: 'Certificate of Enrollment', role: 'Processing' }]);
  const feedback = useCollection<Rec>('s_feedback', [{ id: 'fb1', name: 'Canteen queue feedback', role: 'Submitted' }]);
  const [attFilter, setAttFilter] = useState('');
  const [secSel, setSecSel] = useState<string[]>([]);
  const [schedMode, setSchedMode] = useState<'auto' | 'regular' | 'irregular'>('auto');
  const [payAmt, setPayAmt] = useState('');
  const [scholarName, setScholarName] = useState('');
  const [payMethod, setPayMethod] = useState('GCash');
  const [payRef, setPayRef] = useState('');
  // Connected pipeline: registrar docs + accounting payment → EDP auto-enroll
  useEffect(() => {
    refreshPipeline({ name: profile.name, email: profile.email });
    const timer = window.setInterval(() => refreshPipeline({ name: profile.name, email: profile.email }), 8000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [popup, setPopup] = useState<{ title: string; message: string; lines?: string[] } | null>(null);
  const [photoTick, setPhotoTick] = useState(0);
  const [photoError, setPhotoError] = useState('');
  const myPhotoId = profile.id || 'CEC-2024-0015';

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
  const searchRecords = [
    { title: 'Juan Dela Cruz', detail: 'CEC-2024-0015 • BSIT-3A • juan.delacruz@cec.edu.ph', target: 'Profile Management' },
    ...subjects.list.map((item) => ({ title: item.name, detail: item.role, target: 'Grades / Report Card' })),
    ...assigns.list.map((item) => ({ title: item.name, detail: item.role, target: 'Assignments' })),
    ...docs.list.map((item) => ({ title: item.name, detail: item.role, target: 'Document Submission' })),
    ...charges.list.map((item) => ({ title: item.name, detail: item.role, target: 'Payment Portal' })),
  ];
  const documentSteps: WorkflowStep[] = [
    { label: 'Request Submitted', updatedAt: 'Sep 8, 2026', updatedBy: 'Juan Dela Cruz', notes: 'Certificate of enrollment request submitted.', nextAction: 'Records office processing', documents: ['Request form'] },
    { label: 'Processing', updatedAt: 'Sep 9, 2026', updatedBy: 'Records Office', notes: 'Request is being prepared and verified.', nextAction: 'Wait for release notice', documents: ['Student record'] },
    { label: 'Ready for Pickup', nextAction: 'Bring a valid ID to the records office' },
    { label: 'Released', nextAction: 'Keep the released document safely' },
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
      // Live college-based GWA from official teacher-encoded grades
      let official: { prelim: string; midterm: string; final: string }[] = [];
      try {
        const raw = localStorage.getItem('cec:t_grades_v2');
        official = raw ? JSON.parse(raw) : [];
      } catch { official = []; }
      const liveGwa = gwa(official.map((g) => { const avg = averagePercent([g.prelim, g.midterm, g.final]); return avg === null ? 0 : percentToPoint(avg).point; }));
      // Live balance: official finance assessment + adjustments, minus recorded payments
      const peso = (s: string) => parseAmount(s);
      const assessed = charges.list.reduce((sum, c) => sum + peso(`${c.name} ${c.role}`), 0)
        + readOfficialAssessment().reduce((sum, l) => sum + l.amount, 0);
      const paid = history.list.reduce((sum, h) => sum + peso(`${h.name} ${h.role}`), 0);
      const remaining = Math.max(0, assessed - paid);
      const latestApp = enrollApps.list[enrollApps.list.length - 1];
      // Gate: only ADMIN-confirmed enrollment unlocks progress
      // (manual Approve or admin-enabled auto-approve — never pipeline auto-enroll)
      const enrolled = enrollApps.list.some((a) => a.role === 'Approved' || a.role.includes('Approved (auto)'));
      return (
        <RoleDashboardHome
          role="student"
          name={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Student'}
          onNavigate={navigate}
          blankSections
          liveMetrics={[
            { label: 'Enrollment status', value: latestApp ? latestApp.role.replace(/ •.*$/, '') : 'Not enrolled', detail: latestApp ? latestApp.name : 'Apply online or walk-in at the registrar' },
            { label: 'Current average', value: !enrolled ? 'Not enrolled' : liveGwa === null ? '—' : formatPoint(liveGwa), detail: !enrolled ? 'Enroll online or walk-in to unlock grades' : official.length ? `GWA across ${official.length} encoded subject${official.length === 1 ? '' : 's'}` : 'Awaiting teacher encoding' },
            ...(enrolled ? [] : [{ label: 'Attendance', value: 'Not enrolled', detail: 'Enroll to unlock attendance' }]),
            { label: 'Outstanding balance', value: !enrolled ? 'Not enrolled' : assessed <= 0 ? '—' : remaining <= 0 ? 'Fully Paid' : `₱${remaining.toLocaleString()}`, detail: !enrolled ? 'Enroll online or walk-in to see assessment' : assessed <= 0 ? 'No assessment yet' : `Paid ₱${paid.toLocaleString()} of ₱${assessed.toLocaleString()}` },
          ]}
        />
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
    if (active === 'Password Recovery') return (<section style={card}><h1 style={{ margin: 0 }}>Password Recovery</h1><form style={{ display: 'flex', gap: 10, marginTop: 14, maxWidth: 560 }} onSubmit={(e) => { e.preventDefault(); onNotify('Recovery link sent'); }}><input required style={inp} placeholder="student@cec.edu.ph" /><button style={btn} type="submit">Send Link</button></form><Footer /></section>);
    if (active === 'Grades / Report Card') {
      let official: { id: string; student: string; prelim: string; midterm: string; final: string }[] = [];
      try {
        const raw = localStorage.getItem('cec:t_grades_v2');
        official = raw ? JSON.parse(raw) : [];
      } catch { official = []; }
      const pts = official.map((g) => { const avg = averagePercent([g.prelim, g.midterm, g.final]); return avg === null ? 0 : percentToPoint(avg).point; });
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
        <p style={{ color: '#6b7890', fontSize: 13 }}>Section: <strong>{tag}</strong> • {picks.length} subjects • {total} units • 1st Semester 2026–2027</p>
        <div style={{ ...box, padding: 0, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 10 }}>EDP Code</th><th style={{ padding: 10 }}>Subject</th><th style={{ padding: 10 }}>Descriptive Title</th><th style={{ padding: 10 }}>Schedule</th><th style={{ padding: 10 }}>Room</th><th style={{ padding: 10 }}>Type</th><th style={{ padding: 10 }}>Units</th></tr></thead><tbody>
          {picks.map((o) => <tr key={o.edp} style={{ borderTop: '1px solid #eef1f6' }}><td style={{ padding: 10 }}><strong>{o.edp}</strong></td><td style={{ padding: 10 }}>{o.subject}</td><td style={{ padding: 10 }}>{o.descriptive}</td><td style={{ padding: 10 }}>{o.schedule}</td><td style={{ padding: 10 }}>{o.room}</td><td style={{ padding: 10 }}>{o.type}</td><td style={{ padding: 10 }}>{o.units}</td></tr>)}
          <tr style={{ borderTop: '2px solid #0B3D91' }}><td colSpan={6} style={{ padding: 10, textAlign: 'right', fontWeight: 800 }}>Total units</td><td style={{ padding: 10, fontWeight: 800 }}>{total}</td></tr>
        </tbody></table></div><Footer /></section>);
    }
    if (active === 'Enrolled Subjects') {
      const seeded: Record<string, { id: string; name: string }> = { CS301: { id: 'T-001', name: 'Prof. Santos' }, CS302: { id: 'T-002', name: 'Ms. Reyes' } };
      // Newly registered teachers surface automatically (faculty + teacher accounts)
      const registered: { id: string; name: string }[] = [];
      try {
        const fRaw = localStorage.getItem('cec:a_faculty_v2');
        (fRaw ? (JSON.parse(fRaw) as { id: string; name: string }[]) : []).forEach((f) => { if (!registered.some((r) => r.id === f.id)) registered.push({ id: f.id, name: f.name }); });
        const aRaw = localStorage.getItem('cec:a_accounts_v2');
        (aRaw ? (JSON.parse(aRaw) as { id: string; name: string; role: string }[]) : []).filter((a) => a.role === 'teacher').forEach((a) => { if (!registered.some((r) => r.id === a.id)) registered.push({ id: a.id, name: a.name }); });
      } catch { /* ignore */ }
      const instructors: Record<string, { id: string; name: string }> = { ...seeded };
      registered.forEach((t, i) => { instructors[`NEW${i}`] = t; });
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>Enrolled Subjects</h1>
        <div style={{ ...box }}><strong>My instructors</strong><div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>{Object.values(instructors).map((t) => <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><PhotoAvatar userId={t.id} name={t.name} size={40} /><div><div style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</div><div style={{ fontSize: 11, color: '#6b7890' }}>{t.id}</div></div></div>)}</div></div>
        <div style={box}>{subjects.list.map((s) => { const inst = instructors[s.id]; return <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #eef1f6' }}>{inst ? <PhotoAvatar userId={inst.id} name={inst.name} size={32} /> : <span style={{ width: 32 }} />}<div style={{ flex: 1 }}><strong>{s.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{s.id} • {s.role}{inst ? ` • ${inst.name}` : ''}</div></div><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { subjects.remove(s.id); onNotify('Subject dropped'); }}>Drop</button></div>; })}</div><Footer /></section>);
    }
    if (active === 'Curriculum Checklist') {
      const done = checklist.list.filter((c) => c.role === 'done').length;
      return (<section style={card}><h1 style={{ margin: 0 }}>Curriculum Checklist — {done}/{checklist.list.length} done</h1><div style={{ height: 10, background: '#edf1f5', borderRadius: 8, marginTop: 12 }}><div style={{ width: `${checklist.list.length ? (done / checklist.list.length) * 100 : 0}%`, height: '100%', background: NAVY, borderRadius: 8 }} /></div><div style={box}>{checklist.list.map((c) => <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={c.role === 'done'} onChange={() => { checklist.update(c.id, { role: c.role === 'done' ? 'pending' : 'done' }); onNotify('Checklist updated'); }} />{c.name}</label><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { checklist.remove(c.id); onNotify('Checklist item deleted'); }}>Delete</button></div>)}</div><Footer /></section>);
    }
    if (active === 'Attendance Records') {
      return (<section style={card}><h1 style={{ margin: 0 }}>Attendance Records</h1><input style={{ ...inp, marginTop: 14, maxWidth: 400 }} placeholder="Filter by subject..." value={attFilter} onChange={(e) => setAttFilter(e.target.value)} /><div style={box}>{attendance.list.filter((a) => a.name.toLowerCase().includes(attFilter.toLowerCase())).map((a) => <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><span>{a.name}</span><strong>{a.role}</strong></div>)}</div><Footer /></section>);
    }
    if (active === 'Online Enrollment') {
      return (<section style={card}><h1 style={{ margin: 0 }}>Online Enrollment</h1>
        <div style={{ marginTop: 14 }}><SlideShow slides={REGISTRAR_SLIDES} label="Registrar office slideshow" /></div>
        <p style={{ color: '#6b7890', fontSize: 13 }}>Applications go straight to Admin → Enrollment Approval. Turn on auto-approve there for instant approval.</p><form style={{ display: 'flex', gap: 8, marginTop: 14, maxWidth: 720 }} onSubmit={(e) => { e.preventDefault(); submitEnrollment(enrPg, enrYr, enrSm); }}><select style={inp} value={enrPg} onChange={(e) => setEnrPg(e.target.value)}><option>BSIT</option><option>BSCS</option><option>BEED</option></select><select style={inp} value={enrYr} onChange={(e) => setEnrYr(e.target.value)}><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select><select style={inp} value={enrSm} onChange={(e) => setEnrSm(e.target.value)}><option>1st Semester</option><option>2nd Semester</option></select><button style={btn} type="submit">Submit</button></form><Footer /></section>);
    }
    if (active === 'Section Selection') {
      const subjects8 = [...new Set(OFFERINGS.map((o) => o.subject))];
      const saved = readPicks();
      const tag = sectionTagOf(saved);
      const togglePick = (edp: string, subject: string) => {
        setSchedMode('auto');
        setSecSel((s) => {
          // Empty choice (or re-pick) removes a wrong choice
          if (!edp) return s.filter((e) => { const o = OFFERINGS.find((x) => x.edp === e); return !o || o.subject !== subject; });
          if (s.includes(edp)) return s.filter((e) => e !== edp);
          const without = s.filter((e) => { const o = OFFERINGS.find((x) => x.edp === e); return !o || o.subject !== subject; });
          return [...without, edp];
        });
      };
      const chosen: Offering[] = secSel.map((e) => OFFERINGS.find((o) => o.edp === e)).filter((o): o is Offering => !!o);
      const previewTag = sectionTagOf(chosen);
      const applyMode = (mode: 'auto' | 'regular' | 'irregular') => {
        setSchedMode(mode);
        if (mode === 'auto') return;
        const subjects8b = [...new Set(OFFERINGS.map((o) => o.subject))];
        const preset = subjects8b.map((subj) => {
          const opts = OFFERINGS.filter((o) => o.subject === subj);
          const pick = mode === 'regular'
            ? opts.find((o) => o.section !== 'OPEN') ?? opts[0]
            : opts.find((o) => o.section === 'OPEN') ?? opts[1] ?? opts[0];
          return pick.edp;
        });
        setSecSel(preset);
        onNotify(mode === 'regular' ? 'Regular preset: full BSIT-3A load' : 'Irregular preset: OPEN schedules');
      };
      const savePicks = () => {
        const open = chosen.filter((o) => slotsLeft(o.edp) > 0);
        if (!open.length) { onNotify(open.length === chosen.length ? 'Pick at least one schedule first' : 'Selected schedules are full — pick available ones'); return; }
        if (open.length < chosen.length) onNotify('Some picks were full and skipped');
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
        </div>
        <p style={{ color: '#6b7890', fontSize: 13 }}>Pick <strong>one schedule per subject</strong> — not a section. All picks in one section → <strong>Regular</strong>; mixed/OPEN picks → <strong>Irregular (OPEN)</strong>. {saved.length ? <>Current EDP tag: <strong>{tag}</strong></> : 'No schedules saved yet.'} {chosen.length ? <>Picking now: <strong>{previewTag}</strong></> : null}</p>
        <div style={{ ...box, padding: 0, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 10 }}>Subject / Descriptive</th><th style={{ padding: 10 }}>Schedule (pick one)</th><th style={{ padding: 10 }}>EDP Code</th><th style={{ padding: 10 }}>Room</th><th style={{ padding: 10 }}>Type</th><th style={{ padding: 10 }}>Units</th><th style={{ padding: 10 }}>Availability</th></tr></thead><tbody>
          {subjects8.map((subj) => {
            const opts = OFFERINGS.filter((o) => o.subject === subj);
            const picked = opts.find((o) => secSel.includes(o.edp)) ?? null;
            const shown = picked ?? opts[0];
            const left = slotsLeft(shown.edp);
            const full = left <= 0;
            return <tr key={subj} style={{ borderTop: '1px solid #eef1f6', background: picked ? '#eef4ff' : undefined }}><td style={{ padding: 10 }}><strong>{subj}</strong><br /><small style={{ color: '#6b7890' }}>{shown.descriptive}</small></td><td style={{ padding: 10 }}><div style={{ display: 'grid', gap: 6 }}>{opts.map((o) => { const l = slotsLeft(o.edp); const f = l <= 0; return <label key={o.edp} style={{ display: 'flex', gap: 8, alignItems: 'center', opacity: f ? .55 : undefined }}><input type="radio" name={`pick-${subj}`} checked={secSel.includes(o.edp)} disabled={f} onClick={() => togglePick(o.edp, subj)} onChange={() => undefined} aria-label={`${o.subject} ${o.schedule}`} /><span>{o.schedule}<br /><small style={{ color: '#6b7890' }}>{f ? 'Full' : `${l} left`}</small></span></label>; })}</div></td><td style={{ padding: 10 }}><strong>{picked ? shown.edp : '—'}</strong></td><td style={{ padding: 10 }}>{picked ? shown.room : '—'}</td><td style={{ padding: 10 }}>{picked ? shown.type : '—'}</td><td style={{ padding: 10 }}>{picked ? shown.units : '—'}</td><td style={{ padding: 10 }}>{!picked ? <span style={{ color: '#8a94a6', fontSize: 11 }}>Not picked</span> : full ? <span style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>Full</span> : <span style={{ background: left < 10 ? '#fef3c7' : '#dcfce7', color: left < 10 ? '#92400e' : '#15803d', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>Available • {left} left</span>}</td></tr>;
          })}
        </tbody></table></div>
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
      const methodHint: Record<string, string> = { GCash: 'GCash wallet • 0917-XXX-XXXX • reference no.', Maya: 'Maya wallet • reference no.', 'GoTyme Bank': 'GoTyme • account no. 0100-XXXX-XXXX', UnionBank: 'UnionBank • account no. 1093-XXXX-XXXX', Metrobank: 'Metrobank • account no. 305-XXXX-XXXX', BPI: 'BPI • account no. 1234-XXXX-XX', Cashier: 'Pay at CEC cashier • Window 3' };
      return (<><LivePayTracker steps={paymentSteps} /><section style={card}><h1 style={{ margin: 0 }}>Payment Portal</h1>
        <div style={{ marginTop: 14 }}><SlideShow slides={FINANCE_SLIDES} label="Cashier and online payment options" /></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>{['GCash', 'Maya', 'GoTyme Bank', 'UnionBank', 'Metrobank', 'BPI', 'Cashier'].map((m) => <button key={m} type="button" onClick={() => setPayMethod(m)} style={{ border: payMethod === m ? '2px solid #0B3D91' : '1px solid #e2e7ef', background: payMethod === m ? '#e8f1ff' : '#fff', borderRadius: 10, padding: '10px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{m}</button>)}</div>
        <div style={{ color: '#6b7890', fontSize: 13, marginTop: 10 }}>{methodHint[payMethod]}</div>
        <form style={{ display: 'flex', gap: 8, marginTop: 12, maxWidth: 720 }} onSubmit={(e) => { e.preventDefault(); if (!payAmt.trim()) return; const orId = uid('OR'); const ref = payRef.trim(); const amount = payAmt.trim(); const peso = (s: string) => { const m = s.replace(/,/g, '').match(/₱\s*(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : 0; }; history.create({ id: orId, name: `OR — ₱${amount} via ${payMethod}${ref ? ` • Ref ${ref}` : ''}`, role: 'Today • Tuition • Paid' }); try { void portalApi.itemCreate({ portal: 'student', module: 'receipt', title: `OR — ₱${amount} via ${payMethod}`, detail: `${ref ? `Ref ${ref} • ` : ''}${profile.name} • ${profile.id} • ${new Date().toLocaleString()}`, status: 'Posted', owner: `${profile.name} (${profile.id})` }).catch(() => undefined); } catch { /* offline */ } const assessed = charges.list.reduce((sum, c) => sum + peso(`${c.name} ${c.role}`), 0); const paid = history.list.reduce((sum, h) => sum + peso(`${h.name} ${h.role}`), 0) + peso(amount); const covered = assessed > 0 && paid >= assessed; charges.setList((rows) => rows.map((r) => ({ ...r, role: covered ? r.role.replace('Outstanding', 'Paid in full').replace('Partially paid', 'Paid in full') : r.role.includes('Paid in full') ? r.role : r.role.replace('Outstanding', 'Partially paid') }))); setPayAmt(''); setPayRef(''); pushNotification(['student', 'admin'], { title: covered ? 'Balance fully paid' : 'Payment received', detail: `₱${amount} via ${payMethod}${ref ? ` • Ref ${ref}` : ''} • ${orId}${covered ? ' • FULLY PAID' : ''}`, category: 'Finance', target: 'Billing History' }); setPopup({ title: covered ? 'Fully paid — thank you!' : 'Payment successful', message: covered ? 'Your balance is now fully paid.' : 'Your payment was recorded and a receipt notification was sent.', lines: [`Amount: ₱${amount}`, `Method: ${payMethod}`, ref ? `Reference: ${ref}` : 'Reference: —', `Receipt: ${orId}`] }); onNotify(covered ? 'Fully paid' : `Payment recorded via ${payMethod}`); }}>
          <input style={inp} placeholder="Amount e.g. 5000" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} aria-label="Amount" />
          <input style={inp} placeholder={payMethod === 'Cashier' ? 'OR number (optional)' : 'Reference / account no.'} value={payRef} onChange={(e) => setPayRef(e.target.value)} aria-label="Reference" />
          <select style={inp} value={payMethod} onChange={(e) => setPayMethod(e.target.value)} aria-label="Payment method"><option>GCash</option><option>Maya</option><option>GoTyme Bank</option><option>UnionBank</option><option>Metrobank</option><option>BPI</option><option>Cashier</option></select>
          <button style={btn} type="submit">Pay now</button>
        </form><Footer />        </section></>);
    }
    if (active === 'Billing History') return <CrudSection title="Billing History" col={history} onNotify={onNotify} hint="Tuition" />;
    if (active === 'Scholarship Application') {
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>Scholarship Application — live with Finance Office</h1>
        <form style={{ display: 'flex', gap: 8, marginTop: 14, maxWidth: 640 }} onSubmit={(e) => { e.preventDefault(); if (!scholarName.trim()) return; const sid = uid('sc'); scholar.create({ id: sid, name: scholarName.trim(), role: 'Submitted — awaiting finance decision' }); try { const raw = localStorage.getItem('cec:a_scholars_v2'); const rows = raw ? (JSON.parse(raw) as { id: string; name: string; role: string }[]) : []; rows.push({ id: sid, name: `${scholarName.trim()} — ${profile.name} (${profile.id})`, role: 'Submitted • Pending' }); localStorage.setItem('cec:a_scholars_v2', JSON.stringify(rows)); } catch { /* ignore */ } setScholarName(''); onNotify('Scholarship application sent to finance office'); }}>
          <input style={inp} placeholder="e.g. Academic Excellence" value={scholarName} onChange={(e) => setScholarName(e.target.value)} aria-label="Scholarship name" />
          <button style={btn} type="submit">Apply</button>
        </form>
        <div style={box}>{scholar.list.map((s) => <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eef1f6', fontSize: 14 }}><div><strong>{s.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{s.role}</div></div><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { scholar.remove(s.id); onNotify('Application withdrawn'); }}>Withdraw</button></div>)}{!scholar.list.length && <div style={{ color: '#6b7890', fontSize: 13 }}>No applications — decisions from the finance office appear here automatically.</div>}</div><Footer /></section>);
    }
    if (active === 'Course Material') return <TwoFieldForm title="Course Material" col={materials} onNotify={onNotify} ph1="Material title" ph2="Type • Subject" />;
    if (active === 'Assignments') {
      return (<section style={card}><h1 style={{ margin: 0 }}>Assignments</h1><div style={box}>{assigns.list.map((a) => <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><div><strong>{a.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{a.role}</div></div><div style={{ display: 'flex', gap: 6 }}><button style={btn} onClick={() => { assigns.update(a.id, { role: 'Submitted • For review' }); onNotify('Assignment submitted (Update)'); }}>Submit</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { assigns.remove(a.id); onNotify('Assignment deleted'); }}>Delete</button></div></div>)}</div><Footer /></section>);
    }
    if (active === 'Quiz / Exam') {
      return (<section style={card}><h1 style={{ margin: 0 }}>Quiz / Exam</h1><div style={box}>{quizzes.list.map((qz) => <div key={qz.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><div><strong>{qz.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{qz.role}</div></div><div style={{ display: 'flex', gap: 6 }}><button style={btn} onClick={() => { const score = 7 + Math.floor(Math.random() * 4); quizzes.update(qz.id, { role: `Score ${score}/10 • Taken` }); onNotify(`Quiz submitted: ${score}/10`); }}>Take quiz</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { quizzes.remove(qz.id); onNotify('Quiz deleted'); }}>Delete</button></div></div>)}</div><Footer /></section>);
    }
    if (active === 'Book Catalog') return <TwoFieldForm title="Book Catalog" col={books} onNotify={onNotify} ph1="Book title" ph2="Availability" />;
    if (active === 'Borrowing Tracker') {
      return (<section style={card}><h1 style={{ margin: 0 }}>Borrowing Tracker</h1><div style={box}>{borrows.list.map((b) => <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><div><strong>{b.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{b.role}</div></div><div style={{ display: 'flex', gap: 6 }}><button style={ghost} onClick={() => { borrows.update(b.id, { role: 'Returned' }); onNotify('Book returned (Update)'); }}>Return</button><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { borrows.remove(b.id); onNotify('Record deleted'); }}>Delete</button></div></div>)}</div><Footer /></section>);
    }
    if (active === 'Reservations') return <TwoFieldForm title="Reservations" col={books} onNotify={onNotify} ph1="Book title" ph2="Pickup date" />;
    if (active === 'Fines / Penalties') {
      return (<section style={card}><h1 style={{ margin: 0 }}>Fines / Penalties</h1><div style={box}>{fines.list.map((f) => <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><div><strong>{f.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{f.role}</div></div><button style={btn} onClick={() => { fines.update(f.id, { role: 'Paid' }); onNotify('Fine paid (Update)'); }}>Pay</button></div>)}</div><Footer /></section>);
    }
    if (active === 'Notification Center' || active === 'Announcement Board' || active === 'Announcements') return <CrudSection title={active} col={notifs} onNotify={onNotify} hint="General" />;
    if (active === 'Messaging' || active === 'Discussion Forum') return <TwoFieldForm title={active} col={messages} onNotify={onNotify} ph1="Message" ph2="To / Topic" />;
    if (active === 'Guidance Appointment') return <TwoFieldForm title="Guidance Appointment" col={guide} onNotify={onNotify} ph1="e.g. Advising — Oct 22 10AM" ph2="Status" />;
    if (active === 'Document Request') return <TwoFieldForm title="Document Request" col={docreq} onNotify={onNotify} ph1="Document type" ph2="Status" />;
    if (active === 'Complaint / Feedback') return <TwoFieldForm title="Complaint / Feedback" col={feedback} onNotify={onNotify} ph1="Subject" ph2="Details / Status" />;
    if (active === 'Registration / Enrollment') {
      return (<section style={card}><h1 style={{ margin: 0, fontSize: 23 }}>Registration / Enrollment</h1><div style={{ marginTop: 14 }}><SlideShow slides={REGISTRAR_SLIDES} label="Registrar office slideshow" /></div><p style={{ color: '#6b7890', fontSize: 13 }}>New applications are sent to Admin → Enrollment Approval (same queue as Online Enrollment).</p><form style={{ display: 'flex', gap: 8, marginTop: 14, maxWidth: 720 }} onSubmit={(e) => { e.preventDefault(); submitEnrollment(enrPg, enrYr, enrSm); }}><select style={inp} value={enrPg} onChange={(e) => setEnrPg(e.target.value)}><option>BSIT</option><option>BSCS</option><option>BEED</option></select><select style={inp} value={enrYr} onChange={(e) => setEnrYr(e.target.value)}><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select><button style={btn} type="submit">Submit application</button></form><div style={box}>{enrollApps.list.map((a) => <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eef1f6' }}><div><strong>{a.name}</strong><div style={{ fontSize: 12, color: '#6b7890' }}>{a.id} • {a.role}</div></div><button style={{ ...ghost, color: '#b91c1c' }} onClick={() => { enrollApps.remove(a.id); onNotify('Application withdrawn'); }}>Withdraw</button></div>)}</div><Footer /></section>);
    }
    return <CrudSection title={active} col={subjects} onNotify={onNotify} hint="General" />;
  };

  return (
    <div className={`role-dashboard${dark ? ' cec-dark' : ''}`} style={{ minHeight: '100vh', background: dark ? '#0b1220' : '#f3f5f9', fontFamily: 'Inter,system-ui,sans-serif' }}>
      <header className="dashboard-topbar" style={{ height: 68, background: '#fff', borderBottom: '1px solid #e5e9f0', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 270 }}><button onClick={() => setCollapsed((c) => !c)} style={{ border: '1px solid #e2e7ef', background: '#fff', borderRadius: 10, width: 38, height: 38, cursor: 'pointer', fontSize: 16 }} aria-label="Toggle sidebar">☰</button><img src={`${BASE}cec-logo.png`} alt="Cebu Eastern College crest" width={38} height={38} style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'contain', background: '#fff', padding: 2 }} /><div><div style={{ fontWeight: 800 }}>Cebu Eastern College</div><div style={{ fontSize: 10, color: '#8a94a6' }}>STUDENT PORTAL • 1ST SEM 2024-2025</div></div></div>
        <span style={{ background: '#e8f1ff', color: '#1d5fc2', fontSize: 12, fontWeight: 800, borderRadius: 8, padding: '5px 10px' }}>STUDENT</span><span style={{ color: '#8a94a6', fontSize: 13 }}>{active === 'Dashboard' ? 'Overview' : route}</span>
        <DashboardCommandMenu items={moduleItems} records={searchRecords} onNavigate={navigate} />
        <div className="dashboard-actions" style={{ marginLeft: 'auto' }}><NotificationCenter role="student" onNavigate={navigate} /><button type="button" className="theme-toggle" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>{dark ? '☀' : '🌙'}</button><span key={photoTick}><PhotoAvatar userId={myPhotoId} name={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : profile.name} size={36} /></span></div>
      </header>
      <div style={{ display: 'flex' }}>
        {!collapsed && (<aside className="dashboard-sidebar" style={{ width: 320, background: '#fff', borderRight: '1px solid #e5e9f0', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 'calc(100vh - 68px)' }}>{GROUPS.map((g) => { const open = expanded === g.id; return (<div className={`dashboard-nav-group ${open ? 'is-open' : ''}`} key={g.id} style={{ border: '1px solid #e8ecf3', borderRadius: 12, padding: 8 }}><button onClick={() => setExpanded(open ? '' : g.id)} style={{ width: '100%', display: 'flex', gap: 10, border: 0, background: 'transparent', padding: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13 }}><span>{g.icon}</span><span style={{ flex: 1, textAlign: 'left' }}>{g.label}</span><span>{open ? '⌄' : '›'}</span></button>{open && <div style={{ display: 'grid', gap: 4 }}>{g.items.map((it) => <button key={it.label} onClick={() => setActive(it.label)} style={{ textAlign: 'left', border: active === it.label ? '2px solid #111' : 0, borderRadius: 8, padding: '11px 14px', background: active === it.label ? NAVY : 'transparent', color: active === it.label ? '#fff' : '#4a5872', cursor: 'pointer', fontWeight: active === it.label ? 700 : 400 }}>{it.label}</button>)}</div>}</div>); })}<div style={{ marginTop: 'auto', borderTop: '1px solid #eef1f6', paddingTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}><span key={photoTick}><PhotoAvatar userId={currentUser?.id ?? profile.id} name={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : profile.name} size={34} /></span><div><div style={{ fontWeight: 700, fontSize: 13 }}>{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Demo Student'}</div><div style={{ fontSize: 12, color: '#8a94a6' }}>{currentUser?.id ?? profile.id}</div><div style={{ fontSize: 12, color: '#8a94a6' }}>student</div></div><button onClick={onLogout} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: '#8a94a6', cursor: 'pointer' }}>Log out</button></div></aside>)}
        <main className="dashboard-main" style={{ flex: 1, padding: 24, minWidth: 0 }}>{render()}</main>
      </div>
      {popup && <AlertPopup title={popup.title} message={popup.message} lines={popup.lines} onClose={() => setPopup(null)} />}
    </div>
  );
};
