import React from 'react';
import { useTheme } from '../../services/theme';

type Props = {
  title: string;
  message: string;
  lines?: string[];
  tone?: 'success' | 'info';
  onClose: () => void;
};

export const AlertPopup: React.FC<Props> = ({ title, message, lines, tone = 'success', onClose }) => {
  const { dark } = useTheme();
  return (
  <div
    role="alertdialog"
    aria-modal="true"
    aria-label={title}
    onClick={onClose}
    className={dark ? 'cec-invert-self' : undefined}
    style={{ position: 'fixed', inset: 0, background: 'rgba(7,27,55,.55)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 60 }}
  >
    <section
      onClick={(e) => e.stopPropagation()}
      style={{ background: '#fff', borderRadius: 18, width: 'min(440px,100%)', padding: 28, boxShadow: '0 24px 70px rgba(7,27,55,.35)', textAlign: 'center' }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: '50%', margin: '0 auto 14px',
        background: tone === 'success' ? '#ECFDF5' : '#EFF6FF',
        color: tone === 'success' ? '#047857' : '#0B3D91',
        border: `2px solid ${tone === 'success' ? '#A7F3D0' : '#BFDBFE'}`,
        display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 800,
      }}>{tone === 'success' ? '✓' : '✦'}</div>
      <h2 style={{ margin: '0 0 6px', fontSize: 20, color: '#0B3D91' }}>{title}</h2>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{message}</p>
      {!!lines?.length && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14, textAlign: 'left', fontSize: 13, display: 'grid', gap: 6, marginBottom: 16 }}>
          {lines.map((l) => <div key={l} style={{ color: '#0F172A' }}>{l}</div>)}
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        autoFocus
        style={{ background: '#0B3D91', color: '#fff', border: 0, borderRadius: 10, padding: '12px 26px', fontWeight: 700, fontSize: 14, cursor: 'pointer', width: '100%' }}
      >Got it</button>
    </section>
  </div>
  );
};
