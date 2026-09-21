import React, { useRef, useState } from 'react';
import { useTheme } from '../../services/theme';

type Props = {
  title: string;
  subtitle: string;
  accept?: string;
  onUpload: (file: File) => void;
  onClose: () => void;
};

export const FileUploadDialog: React.FC<Props> = ({ title, subtitle, accept = '.pdf,.jpg,.jpeg,.png', onUpload, onClose }) => {
  const { dark } = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | undefined) => {
    setError('');
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError('File must be 10MB or smaller.'); return; }
    setFile(f);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose}
      className={dark ? 'cec-invert-self' : undefined}
      style={{ position: 'fixed', inset: 0, background: 'rgba(7,27,55,.55)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 60 }}>
      <section onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: 'min(460px,100%)', padding: 28, boxShadow: '0 24px 70px rgba(7,27,55,.35)' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 19, color: '#0B3D91' }}>{title}</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>{subtitle}</p>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
          style={{ border: '2px dashed #bfdbfe', borderRadius: 14, padding: '28px 18px', textAlign: 'center', cursor: 'pointer', background: '#f8fbff' }}
        >
          <div style={{ fontSize: 30 }}>↥</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0B3D91' }}>{file ? file.name : 'Click to choose or drag a file here'}</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{file ? `${(file.size / 1024).toFixed(0)} KB • ready to upload` : 'PDF, JPG or PNG • max 10MB'}</div>
          <input ref={inputRef} type="file" accept={accept} hidden onChange={(e) => pick(e.target.files?.[0])} />
        </div>
        {error && <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 8 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, border: '1px solid #e2e7ef', background: '#fff', borderRadius: 10, padding: '12px 0', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button type="button" disabled={!file} onClick={() => { if (file) { onUpload(file); onClose(); } }}
            style={{ flex: 2, border: 0, background: file ? '#0B3D91' : '#cbd5e1', color: '#fff', borderRadius: 10, padding: '12px 0', fontWeight: 700, cursor: file ? 'pointer' : 'not-allowed' }}>Upload</button>
        </div>
      </section>
    </div>
  );
};
