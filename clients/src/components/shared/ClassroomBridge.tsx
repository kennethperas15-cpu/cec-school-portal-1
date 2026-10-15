import React, { useState } from 'react';

const CLASSROOM_KEY = 'cec:classroom_url';
const DEFAULT_URL = 'https://classroom.google.com/';

export const readClassroomUrl = (): string => {
  try {
    return localStorage.getItem(CLASSROOM_KEY) || DEFAULT_URL;
  } catch { return DEFAULT_URL; }
};

export const openClassroom = (): void => {
  try {
    window.open(readClassroomUrl().replace(/\/$/, ''), '_blank', 'noopener');
  } catch { /* ignore */ }
};

/** Subject cards with an explicit Classroom CTA (student enrolled / teacher handled). */
export const SubjectClassroomCards: React.FC<{ subjects: { id: string; title: string; detail: string }[] }> = ({ subjects }) => {
  if (!subjects.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 14 }}>
      {subjects.map((s) => (
        <div key={s.id} style={{ border: '1px solid #e6eaf1', borderRadius: 12, padding: 14, background: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#8a94a6', letterSpacing: '.06em' }}>{s.id}</div>
          <strong style={{ display: 'block', fontSize: 14, margin: '4px 0' }}>{s.title}</strong>
          <div style={{ fontSize: 12, color: '#6b7890', marginBottom: 10 }}>{s.detail}</div>
          <button
            type="button"
            onClick={openClassroom}
            style={{ background: '#0B3D91', color: '#fff', border: 0, borderRadius: 8, padding: '9px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', width: '100%' }}
          >
            Open in Google Classroom →
          </button>
        </div>
      ))}
    </div>
  );
};

interface ClassroomBridgeProps {
  mode: 'student' | 'teacher';
  onNotify?: (message: string) => void;
}

/**
 * Google Classroom bridge: quizzes, assignments, and materials live in
 * Classroom — teachers create work there, students do it there. The portal
 * keeps a local record and deep-links out. Full API sync (auto grade/roster
 * pull) needs a Google Cloud OAuth client and is intentionally not faked here.
 */
export const ClassroomBridge: React.FC<ClassroomBridgeProps> = ({ mode, onNotify }) => {
  const [url, setUrl] = useState(readClassroomUrl);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(url);

  const save = () => {
    const clean = draft.trim() || DEFAULT_URL;
    try { localStorage.setItem(CLASSROOM_KEY, clean); } catch { /* ignore */ }
    setUrl(clean);
    setEditing(false);
    if (onNotify) onNotify('Classroom link updated');
  };

  const open = (suffix = '') => {
    try { window.open(`${url.replace(/\/$/, '')}${suffix}`, '_blank', 'noopener'); } catch { /* ignore */ }
  };

  return (
    <section style={{ background: '#fff', border: '1px solid #e8ecf3', borderRadius: 16, padding: 20, maxWidth: 1120, margin: '0 auto 14px' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: '#e8f1ff', display: 'grid', placeItems: 'center', fontSize: 24 }} aria-hidden="true">🎓</span>
        <div style={{ flex: '1 1 220px' }}>
          <strong style={{ fontSize: 15 }}>Google Classroom {mode === 'teacher' ? '— create work here' : '— do your tasks here'}</strong>
          <div style={{ fontSize: 13, color: '#6b7890', marginTop: 2 }}>
            {mode === 'teacher'
              ? 'Create quizzes, assignments, and materials in Classroom. Scores you post there can be encoded into portal grades.'
              : 'Your teachers post quizzes, assignments, and materials in Classroom. Open it to answer and submit.'}
          </div>
          <div style={{ fontSize: 12, color: '#8a94a6', marginTop: 4, overflowWrap: 'anywhere' }}>Class link: {url}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => open()}
            style={{ background: '#0B3D91', color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Open Google Classroom →
          </button>
          <button type="button" onClick={() => { setDraft(url); setEditing((v) => !v); }}
            style={{ border: '1px solid #e2e7ef', background: '#fff', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {editing ? 'Cancel' : mode === 'teacher' ? 'Set class link' : 'Change link'}
          </button>
        </div>
      </div>
      {editing && (
        <form onSubmit={(e) => { e.preventDefault(); save(); }} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="https://classroom.google.com/c/…"
            aria-label="Google Classroom class link"
            style={{ flex: 1, border: '1px solid #e2e7ef', borderRadius: 8, padding: '10px 12px', fontSize: 13 }} />
          <button type="submit" style={{ background: '#0B3D91', color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>
        </form>
      )}
    </section>
  );
};

export default ClassroomBridge;
