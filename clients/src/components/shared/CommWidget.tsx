import React, { useEffect, useState } from 'react';
import { portalApi } from '../../services/portal';
import { useLiveAnnouncements } from '../../hooks/useLiveAnnouncements';

interface CommWidgetProps {
  role: 'student' | 'teacher';
  audience: string;
  boardTarget: string;
  onNavigate: (label: string) => void;
}

export const openChatDrawer = (): void => {
  try { window.dispatchEvent(new Event('cec:open-chat')); } catch { /* ignore */ }
};

/**
 * Bottom-of-dashboard communication layer: recent course conversations
 * beside live announcements, in two columns.
 */
export const CommWidget: React.FC<CommWidgetProps> = ({ role, audience, boardTarget, onNavigate }) => {
  const [convos, setConvos] = useState<{ id: string; peer_name: string | null; last_body: string | null }[]>([]);
  const { items: announcements } = useLiveAnnouncements(audience);

  useEffect(() => {
    let live = true;
    portalApi.conversations().then((rows) => { if (live) setConvos(rows.slice(0, 3)); }).catch(() => undefined);
    return () => { live = false; };
  }, []);

  const card: React.CSSProperties = { background: '#fff', border: '1px solid #e8ecf3', borderRadius: 16, padding: 20 };
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 14 }} aria-label="Communication">
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 15 }}>Recent conversations</strong>
          <button type="button" onClick={openChatDrawer}
            style={{ border: '1px solid #e2e7ef', background: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#0B3D91' }}>
            Open messages
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          {convos.map((c) => (
            <button key={c.id} type="button" onClick={openChatDrawer}
              style={{ display: 'block', width: '100%', textAlign: 'left', border: 0, background: 'transparent', padding: '8px 0', borderBottom: '1px solid #eef1f6', cursor: 'pointer' }}>
              <strong style={{ fontSize: 13 }}>{c.peer_name ?? 'Conversation'}</strong>
              <div style={{ fontSize: 12, color: '#6b7890', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last_body ?? 'No messages yet'}</div>
            </button>
          ))}
          {!convos.length && <div style={{ fontSize: 13, color: '#6b7890' }}>No conversations yet — message anyone by school ID or email.</div>}
        </div>
      </div>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 15 }}>Announcements</strong>
          <button type="button" onClick={() => onNavigate(boardTarget)}
            style={{ border: '1px solid #e2e7ef', background: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#0B3D91' }}>
            View board
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          {announcements.slice(0, 3).map((a) => (
            <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #eef1f6' }}>
              <strong style={{ fontSize: 13 }}>{a.title}</strong>
              {a.category && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, color: '#1d5fc2', background: '#e8f1ff', borderRadius: 999, padding: '2px 8px' }}>{String(a.category).toUpperCase()}</span>}
              <div style={{ fontSize: 12, color: '#6b7890', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.content}</div>
            </div>
          ))}
          {!announcements.length && <div style={{ fontSize: 13, color: '#6b7890' }}>No announcements right now.</div>}
        </div>
      </div>
    </section>
  );
};

export default CommWidget;
