import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface PasswordRecoveryProps {
  identifier?: string;
  email?: string;
  onNotify: (message: string) => void;
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e8eef7', borderRadius: 20, padding: 28, maxWidth: 1120, margin: '0 auto', boxShadow: '0 12px 34px rgba(15,31,56,.05)' };
const inp: React.CSSProperties = { border: '1.5px solid #e4ebf5', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: '#f7f9fc', color: '#0f1f38' };
const btn: React.CSSProperties = { background: 'linear-gradient(135deg, #0B3D91, #123f7d)', color: '#fff', border: 0, borderRadius: 12, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 10px 22px rgba(11,61,145,.22)' };

/**
 * Account recovery: submits a school ID/email plus the Gmail on record to
 * `POST /auth/forgot-password`. The API replies generically so it never
 * reveals whether an account exists.
 */
export const PasswordRecovery: React.FC<PasswordRecoveryProps> = ({ identifier = '', email = '', onNotify }) => {
  const [id, setId] = useState(identifier);
  const [gmail, setGmail] = useState(email);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setId(identifier); setGmail(email); }, [identifier, email]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMsg('');
    if (!id.trim()) { setError('Enter your school ID or school email.'); return; }
    setBusy(true);
    try {
      const r = await api.post('/auth/forgot-password', { identifier: id.trim(), email: gmail.trim() || undefined });
      setMsg(r.data?.message ?? 'If the details match our records, recovery instructions were sent.');
      onNotify(r.data?.data?.emailSent ? 'Recovery email sent to the Gmail on record' : 'Recovery request recorded');
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message ?? 'Could not submit the recovery request — check your connection.');
    } finally { setBusy(false); }
  };

  return (
    <section style={card}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Password Recovery</h1>
      <p style={{ color: '#6b7890', fontSize: 13, marginTop: 8 }}>Recovery needs your school ID or school email <strong>plus the Gmail address on record</strong>. When both match, we email a reset link.</p>
      <form style={{ display: 'grid', gap: 10, marginTop: 14, maxWidth: 520 }} onSubmit={submit}>
        <input style={inp} placeholder="School ID or school email" value={id} onChange={(e) => setId(e.target.value)} aria-label="School ID or school email" />
        <input style={inp} placeholder="Gmail address on record" value={gmail} onChange={(e) => setGmail(e.target.value)} aria-label="Gmail address on record" />
        {error && <div style={{ color: '#b91c1c', fontSize: 12 }}>{error}</div>}
        {msg && <div style={{ color: '#15803d', fontSize: 12 }}>{msg}</div>}
        <div><button style={{ ...btn, opacity: busy ? 0.6 : 1 }} type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send recovery link'}</button></div>
      </form>
    </section>
  );
};
