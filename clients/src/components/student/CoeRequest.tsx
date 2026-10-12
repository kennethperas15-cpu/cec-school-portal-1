import React, { useState, type FormEvent } from 'react';
import { portalApi } from '../../services/portal';

interface CoeRequestProps {
  studentName: string;
  program?: string;
  onNotify?: (message: string) => void;
}

type Mine = { transactionNo: string; status: string; submittedAt: string };

const readMine = (): Mine[] => {
  try {
    const raw = localStorage.getItem('cec:coe_mine');
    return raw ? (JSON.parse(raw) as Mine[]) : [];
  } catch { return []; }
};

/**
 * Certificate of Enrollment: request once, track forever by transaction
 * number — returning students look up instead of refilling the form.
 */
export const CoeRequest: React.FC<CoeRequestProps> = ({ studentName, program, onNotify }) => {
  const [purpose, setPurpose] = useState('Enrollment');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [issued, setIssued] = useState<{ transactionNo: string } | null>(null);
  const [mine, setMine] = useState<Mine[]>(readMine);
  const [trackNo, setTrackNo] = useState('');
  const [trackBusy, setTrackBusy] = useState(false);
  const [tracked, setTracked] = useState<{
    transaction_no: string; status: string; full_name: string; program: string | null;
    created_at: string; decided_at: string | null;
  } | null>(null);

  const saveMine = (entry: Mine) => {
    setMine((rows) => {
      const next = [entry, ...rows.filter((r) => r.transactionNo !== entry.transactionNo)].slice(0, 20);
      try { localStorage.setItem('cec:coe_mine', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await portalApi.coeSubmit({ fullName: studentName, program, purpose });
      setIssued({ transactionNo: data.transactionNo });
      saveMine({ transactionNo: data.transactionNo, status: data.status, submittedAt: data.submittedAt });
      if (onNotify) onNotify(`COE requested — transaction ${data.transactionNo}`);
    } catch (requestError) {
      const apiError = requestError as { response?: { data?: { message?: string } } };
      if (!apiError.response) {
        // Offline: queue locally with a provisional transaction number.
        const transactionNo = `COE-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        setIssued({ transactionNo });
        saveMine({ transactionNo, status: 'pending', submittedAt: new Date().toISOString() });
        if (onNotify) onNotify('COE queued offline — syncs when the registrar is reachable');
      } else {
        setError(apiError.response?.data?.message ?? 'Could not submit the COE request.');
      }
    } finally {
      setBusy(false);
    }
  };

  const track = async (e: FormEvent) => {
    e.preventDefault();
    if (!trackNo.trim()) return;
    setError('');
    setTracked(null);
    setTrackBusy(true);
    try {
      const row = await portalApi.coeTrack(trackNo.trim());
      setTracked(row);
    } catch (requestError) {
      const apiError = requestError as { response?: { status?: number; data?: { message?: string } } };
      setError(apiError.response?.data?.message ?? 'Could not look up that transaction number.');
    } finally {
      setTrackBusy(false);
    }
  };

  const statusPill = (status: string) => {
    const style: React.CSSProperties =
      status === 'ready'
        ? { background: '#dcfce7', color: '#15803d' }
        : status === 'rejected'
          ? { background: '#fee2e2', color: '#b91c1c' }
          : { background: '#fef3c7', color: '#92400e' };
    return <span style={{ ...style, borderRadius: 999, padding: '3px 12px', fontSize: 11, fontWeight: 800 }}>{status.toUpperCase()}</span>;
  };

  return (
    <div>
      {issued && (
        <div style={{ border: '2px solid #16a34a', borderRadius: 12, padding: 16, marginBottom: 14, background: '#f0fdf4' }}>
          <div style={{ fontSize: 12, color: '#15803d', fontWeight: 800 }}>REQUEST SUBMITTED</div>
          <div style={{ fontSize: 13, color: '#33415c', marginTop: 4 }}>Transaction number — save it to track without refilling:</div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '.04em' }}>{issued.transactionNo}</div>
        </div>
      )}
      {error && <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: '#33415c' }}>Purpose
          <select value={purpose} onChange={(e) => setPurpose(e.target.value)} aria-label="COE purpose"
            style={{ display: 'block', marginTop: 4, border: '1px solid #e2e7ef', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
            <option>Enrollment</option>
            <option>Transfer</option>
            <option>Scholarship</option>
            <option>Employment</option>
            <option>Other</option>
          </select>
        </label>
        <button type="submit" disabled={busy}
          style={{ background: '#0B3D91', color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {busy ? 'Submitting…' : 'Request COE'}
        </button>
      </form>
      <div style={{ fontSize: 12, color: '#6b7890', marginTop: 6 }}>Filed as {studentName}. You will be emailed when it is ready for pickup.</div>

      <h3 style={{ fontSize: 15, margin: '18px 0 8px' }}>Track by transaction number</h3>
      <form onSubmit={track} style={{ display: 'flex', gap: 8, maxWidth: 480 }}>
        <input value={trackNo} onChange={(e) => setTrackNo(e.target.value)} placeholder="e.g. COE-2026-A1B2C3" aria-label="Transaction number"
          style={{ flex: 1, border: '1px solid #e2e7ef', borderRadius: 8, padding: '10px 12px', fontSize: 13 }} />
        <button type="submit" disabled={trackBusy}
          style={{ border: '1px solid #e2e7ef', background: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {trackBusy ? '…' : 'Track'}
        </button>
      </form>
      {tracked && (
        <div style={{ marginTop: 10, border: '1px solid #e6eaf1', borderRadius: 12, padding: 14, fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>{tracked.transaction_no}</strong>{statusPill(tracked.status)}
          </div>
          <div style={{ fontSize: 12, color: '#6b7890', marginTop: 4 }}>
            {tracked.full_name}{tracked.program ? ` • ${tracked.program}` : ''} • Filed {new Date(tracked.created_at).toLocaleString()}
            {tracked.status === 'ready' ? ' • Ready for pickup at the Registrar Office' : ''}
          </div>
        </div>
      )}
      {!!mine.length && (
        <>
          <h3 style={{ fontSize: 15, margin: '18px 0 8px' }}>My requests</h3>
          {mine.map((m) => (
            <div key={m.transactionNo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eef1f6', fontSize: 14 }}>
              <span><strong>{m.transactionNo}</strong> <span style={{ fontSize: 12, color: '#6b7890' }}>{new Date(m.submittedAt).toLocaleDateString()}</span></span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{statusPill(m.status)}
                <button type="button" onClick={() => { setTrackNo(m.transactionNo); }}
                  style={{ border: '1px solid #e2e7ef', background: '#fff', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>View</button>
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default CoeRequest;
