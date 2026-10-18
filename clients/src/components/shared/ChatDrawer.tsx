import React, { useCallback, useEffect, useRef, useState } from 'react';
import { portalApi } from '../../services/portal';
import { getSocket, isChatConfigured, type ChatMessage } from '../../services/socket';

type Convo = {
  id: string; created_at: string; peer_name: string | null; last_body: string | null; last_at: string | null;
};

interface ChatDrawerProps {
  userId: string;
  onNotify?: (message: string) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({ userId, onNotify }) => {
  const [open, setOpen] = useState(false);
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [peer, setPeer] = useState('');
  const [connected, setConnected] = useState(false);
  const [unread, setUnread] = useState(0);
  const chatConfigured = isChatConfigured();
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConvos = useCallback(async () => {
    try { setConvos(await portalApi.conversations()); } catch { /* offline */ }
  }, []);

  const loadThread = useCallback(async (id: string) => {
    try {
      const rows = await portalApi.conversationMessages(id);
      setMessages(rows.map((m) => ({
        id: m.id, conversationId: id, senderId: m.sender_id,
        senderName: m.sender_name, body: m.body, createdAt: m.created_at,
      })));
    } catch { /* offline */ }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadConvos();
    let socket: ReturnType<typeof getSocket> | null = null;
    try {
      socket = getSocket();
      const onConnect = () => setConnected(true);
      const onDisconnect = () => setConnected(false);
      const onMessage = (msg: ChatMessage) => {
        if (!msg || typeof msg.conversationId !== 'string') return;
        if (msg.conversationId === activeId) {
          setMessages((rows) => (rows.some((r) => String(r.id) === String(msg.id)) ? rows : [...rows, msg]));
        } else {
          setUnread((n) => n + 1);
          if (onNotify) onNotify(`New message from ${msg.senderName}`);
        }
        void loadConvos();
      };
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('chat:message', onMessage);
      setConnected(socket.connected);
      if (activeId) {
        socket.emit('chat:join', activeId);
        void loadThread(activeId);
      }
      const poll = window.setInterval(() => {
        void loadConvos();
        if (activeId) void loadThread(activeId);
      }, 15000);
      return () => {
        window.clearInterval(poll);
        socket?.off('connect', onConnect);
        socket?.off('disconnect', onDisconnect);
        socket?.off('chat:message', onMessage);
      };
    } catch { return undefined; }
  }, [open, activeId, loadConvos, loadThread, onNotify]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, activeId]);

  useEffect(() => {
    const opener = () => setOpen(true);
    window.addEventListener('cec:open-chat', opener);
    return () => window.removeEventListener('cec:open-chat', opener);
  }, []);

  const openThread = (id: string) => {
    setActiveId(id);
    setUnread(0);
    try { getSocket().emit('chat:join', id); } catch { /* offline */ }
    void loadThread(id);
  };

  const startConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peer.trim()) return;
    try {
      const convo = await portalApi.conversationCreate(peer.trim());
      setPeer('');
      void loadConvos();
      openThread(convo.id);
    } catch (requestError) {
      const apiError = requestError as { response?: { data?: { message?: string } } };
      if (onNotify) onNotify(apiError.response?.data?.message ?? 'Could not start conversation');
    }
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !activeId || !connected) return;
    try {
      getSocket().emit('chat:message', { conversationId: activeId, body: draft.trim() });
      setDraft('');
    } catch { /* offline */ }
  };

  return (
    <div style={{ position: 'fixed', right: 22, bottom: 92, zIndex: 69, fontFamily: 'Inter,system-ui,sans-serif' }}>
      {open && (
        <section aria-label="Messages" style={{ width: 360, maxWidth: 'calc(100vw - 44px)', height: 480, maxHeight: '72vh', background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(7,27,55,.3)', border: '1px solid #e2e7ef', display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: 12 }}>
          <header style={{ background: '#0B3D91', color: '#fff', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            {activeId && <button type="button" onClick={() => setActiveId(null)} aria-label="Back to conversations" style={{ background: 'transparent', border: 0, color: '#fff', fontSize: 16, cursor: 'pointer' }}>←</button>}
            <div style={{ flex: 1 }}><strong style={{ fontSize: 14 }}>Messages</strong><div style={{ fontSize: 11, opacity: .8 }}>{connected ? 'Live • real-time' : chatConfigured ? 'Offline • retrying' : 'Read-only • live messaging unavailable'}</div></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close messages" style={{ background: 'transparent', border: 0, color: '#fff', fontSize: 18, cursor: 'pointer' }}>×</button>
          </header>
          {!activeId ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <form onSubmit={startConversation} style={{ display: 'flex', gap: 6 }}>
                <input value={peer} onChange={(e) => setPeer(e.target.value)} placeholder="School ID or email…" aria-label="Start conversation with"
                  style={{ flex: 1, border: '1px solid #e2e7ef', borderRadius: 10, padding: '9px 12px', fontSize: 13 }} />
                <button type="submit" style={{ background: '#0B3D91', color: '#fff', border: 0, borderRadius: 10, padding: '0 14px', fontWeight: 700, cursor: 'pointer' }}>+</button>
              </form>
              {convos.map((c) => (
                <button key={c.id} type="button" onClick={() => openThread(c.id)}
                  style={{ textAlign: 'left', border: '1px solid #eef1f6', background: '#fff', borderRadius: 12, padding: '10px 12px', cursor: 'pointer' }}>
                  <strong style={{ fontSize: 13 }}>{c.peer_name ?? 'Conversation'}</strong>
                  <div style={{ fontSize: 12, color: '#6b7890', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last_body ?? 'No messages yet'}</div>
                </button>
              ))}
              {!convos.length && <div style={{ fontSize: 13, color: '#6b7890' }}>No conversations — start one with a school ID or email above.</div>}
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, background: '#f6f8fc' }}>
                {messages.map((m) => (
                  <div key={m.id} style={{ alignSelf: m.senderId === userId ? 'flex-end' : 'flex-start', maxWidth: '85%', background: m.senderId === userId ? '#0B3D91' : '#fff', color: m.senderId === userId ? '#fff' : '#0f1f38', border: m.senderId === userId ? 0 : '1px solid #e2e7ef', borderRadius: 12, padding: '8px 12px', fontSize: 13, lineHeight: 1.45 }}>
                    {m.senderId !== userId && <div style={{ fontSize: 10, fontWeight: 800, color: '#1d5fc2' }}>{m.senderName}</div>}
                    {m.body}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #eef1f6' }} onSubmit={send}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={connected ? 'Type a message…' : chatConfigured ? 'Connecting…' : 'Live messaging is unavailable on this deployment'} disabled={!connected} aria-label="Type a message"
                  style={{ flex: 1, border: '1px solid #e2e7ef', borderRadius: 10, padding: '10px 12px', fontSize: 13 }} />
                <button type="submit" disabled={!connected || !draft.trim()} style={{ background: '#0B3D91', color: '#fff', border: 0, borderRadius: 10, padding: '0 16px', fontWeight: 700, cursor: 'pointer' }}>➤</button>
              </form>
            </>
          )}
        </section>
      )}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setUnread(0); }}
        aria-label={open ? 'Close messages' : 'Open messages'}
        title="Messages"
        style={{ width: 56, height: 56, borderRadius: '50%', background: '#16a34a', color: '#fff', border: '3px solid #fff', boxShadow: '0 10px 26px rgba(22,163,74,.4)', fontSize: 24, cursor: 'pointer', display: 'grid', placeItems: 'center', position: 'relative' }}
      >{open ? '×' : '✉'}
        {!!unread && !open && <span style={{ position: 'absolute', top: -2, right: -2, background: '#b91c1c', color: '#fff', borderRadius: 999, minWidth: 22, height: 22, fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center', padding: '0 5px' }}>{unread}</span>}
      </button>
    </div>
  );
};

export default ChatDrawer;
