import React, { useRef, useState } from 'react';
import { askAi } from '../../services/aiSupport';
import { useTheme } from '../../services/theme';

type Props = { role?: string };

type Msg = { from: 'user' | 'bot'; text: string; source?: 'ai' | 'local' };

const SUGGESTIONS = ['How do I enroll?', 'How do I pay with GCash?', 'Where are my grades?', 'What is my school ID format?'];

export const AISupport: React.FC<Props> = ({ role = 'student' }) => {
  const { dark } = useTheme();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { from: 'bot', text: `Hi! I'm the CEC AI Support. Ask me about enrollment, payments, grades, schedules, or IDs.`, source: 'local' },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { from: 'user', text: q }]);
    setInput('');
    setBusy(true);
    try {
      const r = await askAi(q, role);
      setMessages((m) => [...m, { from: 'bot', text: r.text, source: r.source }]);
    } finally {
      setBusy(false);
      window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  return (
    <div className={dark ? 'cec-invert-self' : undefined} style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 70, fontFamily: 'Inter,system-ui,sans-serif' }}>
      {open && (
        <section aria-label="AI support chat" style={{ width: 340, maxWidth: 'calc(100vw - 44px)', height: 460, maxHeight: '70vh', background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(7,27,55,.3)', border: '1px solid #e2e7ef', display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: 12 }}>
          <header style={{ background: '#0B3D91', color: '#fff', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#FFCA28', color: '#0B3D91', display: 'grid', placeItems: 'center', fontWeight: 800 }}>✦</span>
            <div style={{ flex: 1 }}><strong style={{ fontSize: 14 }}>CEC AI Support</strong><div style={{ fontSize: 11, opacity: .8 }}>Online • replies instantly</div></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close AI support" style={{ background: 'transparent', border: 0, color: '#fff', fontSize: 18, cursor: 'pointer' }}>×</button>
          </header>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, background: '#f6f8fc' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', background: m.from === 'user' ? '#0B3D91' : '#fff', color: m.from === 'user' ? '#fff' : '#0f1f38', border: m.from === 'user' ? 0 : '1px solid #e2e7ef', borderRadius: 12, padding: '8px 12px', fontSize: 13, lineHeight: 1.45 }}>
                {m.text}
                {m.from === 'bot' && m.source === 'local' && <div style={{ fontSize: 10, color: '#8a94a6', marginTop: 4 }}>Instant answer • configure AI API for live AI</div>}
              </div>
            ))}
            {busy && <div style={{ fontSize: 12, color: '#64748B' }}>Typing…</div>}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: 8, borderTop: '1px solid #eef1f6', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => send(s)} style={{ border: '1px solid #e2e7ef', background: '#fff', borderRadius: 999, padding: '5px 10px', fontSize: 11, cursor: 'pointer', color: '#0B3D91' }}>{s}</button>)}
          </div>
          <form style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #eef1f6' }} onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about the portal..." aria-label="Ask AI support" style={{ flex: 1, border: '1px solid #e2e7ef', borderRadius: 10, padding: '10px 12px', fontSize: 13 }} />
            <button type="submit" disabled={busy} style={{ background: '#0B3D91', color: '#fff', border: 0, borderRadius: 10, padding: '0 16px', fontWeight: 700, cursor: 'pointer' }}>➤</button>
          </form>
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close AI support' : 'Open AI support'}
        title="CEC AI Support"
        style={{ width: 56, height: 56, borderRadius: '50%', background: '#0B3D91', color: '#fff', border: '3px solid #FFCA28', boxShadow: '0 10px 26px rgba(11,61,145,.4)', fontSize: 24, cursor: 'pointer', display: 'grid', placeItems: 'center', marginLeft: 'auto' }}
      >{open ? '×' : '✦'}</button>
    </div>
  );
};
