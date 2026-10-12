import React, { useEffect, useState } from 'react';
import { fetchAnnouncements, type LiveAnnouncement } from '../../services/announcements';

const audienceFor = (role: string): string =>
  role === 'teacher' ? 'teachers' : role === 'admin' ? 'admins' : 'students';

/**
 * Critical announcements modal: shown once per session right after sign-in
 * when urgent campus-wide posts exist for the user's role.
 */
export const AnnouncementModal: React.FC<{ role: string }> = ({ role }) => {
  const [items, setItems] = useState<LiveAnnouncement[] | null>(null);

  useEffect(() => {
    let live = true;
    try {
      if (sessionStorage.getItem('cec:ann_modal_seen') === '1') {
        setItems([]);
        return;
      }
    } catch { /* ignore */ }
    fetchAnnouncements(audienceFor(role), 'Urgent')
      .then((rows) => { if (live) setItems(rows); })
      .catch(() => { if (live) setItems([]); });
    return () => { live = false; };
  }, [role]);

  if (!items || !items.length) return null;

  const close = () => {
    try { sessionStorage.setItem('cec:ann_modal_seen', '1'); } catch { /* ignore */ }
    setItems([]);
  };

  return (
    <div role="alertdialog" aria-modal="true" aria-label="Critical campus announcements"
      style={{ position: 'fixed', inset: 0, background: 'rgba(7,27,55,.6)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 95 }}
      onClick={close}>
      <section onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: 'min(520px,100%)', maxHeight: '80vh', overflowY: 'auto', padding: 26, boxShadow: '0 24px 70px rgba(7,27,55,.4)' }}>
        <div style={{ display: 'inline-block', background: '#fee2e2', color: '#b91c1c', borderRadius: 999, padding: '4px 14px', fontSize: 11, fontWeight: 800, letterSpacing: '.1em' }}>
          URGENT • {items.length}
        </div>
        <h2 style={{ margin: '10px 0 4px', fontSize: 20, color: '#0B3D91' }}>Campus announcements</h2>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748B' }}>Please read before continuing to your portal.</p>
        {items.map((a) => (
          <div key={a.id} style={{ borderTop: '1px solid #eef1f6', padding: '12px 0' }}>
            <strong style={{ fontSize: 15 }}>{a.title}</strong>
            <div style={{ fontSize: 13, color: '#33415c', marginTop: 4, whiteSpace: 'pre-wrap' }}>{a.content}</div>
            <div style={{ fontSize: 11, color: '#8a94a6', marginTop: 4 }}>
              {a.published_at ? new Date(a.published_at).toLocaleString() : ''}{a.published_by_name ? ` • ${a.published_by_name}` : ''}
            </div>
          </div>
        ))}
        <button type="button" onClick={close} autoFocus
          style={{ background: '#0B3D91', color: '#fff', border: 0, borderRadius: 10, padding: '12px 26px', fontWeight: 700, fontSize: 14, cursor: 'pointer', width: '100%', marginTop: 8 }}>
          Got it — enter portal
        </button>
      </section>
    </div>
  );
};

export default AnnouncementModal;
