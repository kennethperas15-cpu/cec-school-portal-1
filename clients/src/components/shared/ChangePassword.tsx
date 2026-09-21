import React, { useState } from 'react';
import api from '../../services/api';

type Props = { identifier: string; onNotify: (t: string) => void };

const inputStyle: React.CSSProperties = { border: '1px solid #e2e7ef', borderRadius: 10, padding: '12px 14px', fontSize: 14, width: '100%', background: '#fff' };
const btnStyle: React.CSSProperties = { background: '#0B3D91', color: '#fff', border: 0, borderRadius: 8, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' };

export const ChangePassword: React.FC<Props> = ({ identifier, onNotify }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (next !== confirm) { setError('New passwords do not match.'); return; }
    setBusy(true);
    try {
      await api.post('/auth/change-password', { identifier, currentPassword: current, newPassword: next });
      setCurrent(''); setNext(''); setConfirm('');
      onNotify('Password changed successfully — use it next time you sign in');
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } } };
      if (!apiError.response) {
        // Offline fallback: rotate the locally issued temporary password
        try {
          const raw = localStorage.getItem('cec:registrations');
          const regs = raw ? (JSON.parse(raw) as { schoolEmail?: string; id?: string; temporaryPassword?: string }[]) : [];
          const hit = regs.find((r) => r.schoolEmail?.toLowerCase() === identifier.toLowerCase() || r.id === identifier);
          if (hit && hit.temporaryPassword === current) {
            hit.temporaryPassword = next;
            localStorage.setItem('cec:registrations', JSON.stringify(regs));
            setCurrent(''); setNext(''); setConfirm('');
            onNotify('Password changed successfully (offline mode)');
            return;
          }
        } catch { /* fall through to error */ }
      }
      setError(apiError.response?.data?.message ?? 'Could not change password. Check the current password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 10, maxWidth: 480 }}>
      <strong style={{ fontSize: 15 }}>Change password</strong>
      <span style={{ fontSize: 12, color: '#6b7890' }}>Issued a temporary password? Replace it here — required after first login.</span>
      <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current / temporary password" autoComplete="current-password" style={inputStyle} aria-label="Current password" />
      <input type="password" required value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password (min 8 characters)" autoComplete="new-password" style={inputStyle} aria-label="New password" />
      <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" style={inputStyle} aria-label="Confirm new password" />
      {error && <div style={{ color: '#b91c1c', fontSize: 12 }}>{error}</div>}
      <div><button type="submit" disabled={busy} style={{ ...btnStyle, opacity: busy ? .6 : 1 }}>{busy ? 'Saving…' : 'Change password'}</button></div>
    </form>
  );
};
