import React, { useEffect, useState } from 'react';

type Props = {
  name: string;
  role: string;
  onDone: () => void;
};

const STAGES = ['Verifying credentials…', 'Loading your portal…', 'Preparing dashboard…'];
const BASE = import.meta.env.BASE_URL || '/';

export const LoadingScreen: React.FC<Props> = ({ name, role, onDone }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(1), 800),
      window.setTimeout(() => setStage(2), 1600),
      window.setTimeout(onDone, 2500),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      className="cec-loading-screen"
      aria-label="Loading your portal"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        padding: 24,
        backgroundColor: '#eef2f8',
        backgroundImage: `url('${BASE}cec-dragons-bg.png')`,
        backgroundSize: 'min(980px, 94vw) auto',
        backgroundPosition: 'center 30%',
        backgroundRepeat: 'no-repeat',
        fontFamily: 'Inter,system-ui,sans-serif',
      }}
    >
      {/* Centered school crest */}
      <img
        src={`${BASE}cec-logo.png`}
        alt="Cebu Eastern College official crest"
        width={148}
        height={148}
        decoding="async"
        style={{
          width: 148,
          height: 148,
          objectFit: 'contain',
          filter: 'drop-shadow(0 10px 24px rgba(11,61,145,.25))',
          animation: 'cecCrestIn .6s ease-out',
        }}
      />
      <h1 style={{ margin: '18px 0 2px', fontSize: 22, fontWeight: 800, color: '#0B3D91', textAlign: 'center', letterSpacing: '-.01em' }}>
        Cebu Eastern College
      </h1>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 800, letterSpacing: '.14em', color: '#64748B', textTransform: 'uppercase', textAlign: 'center' }}>
        {role} Portal • 1st Sem 2024–2025
      </p>
      <p style={{ margin: '0 0 14px', fontSize: 14, color: '#334155', textAlign: 'center' }}>
        Welcome, <strong>{name}</strong>
      </p>

      {/* Spinner + staged status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }} role="status" aria-live="polite">
        <span className="cec-spinner" aria-hidden="true" />
        <span style={{ fontSize: 13, color: '#0B3D91', fontWeight: 600 }}>{STAGES[stage]}</span>
      </div>

      {/* Skeleton preview of the dashboard */}
      <div aria-hidden="true" style={{ width: 'min(560px, 92vw)', display: 'grid', gap: 10 }}>
        <div className="cec-shimmer" style={{ height: 56, borderRadius: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div className="cec-shimmer" style={{ height: 74, borderRadius: 12 }} />
          <div className="cec-shimmer" style={{ height: 74, borderRadius: 12 }} />
          <div className="cec-shimmer" style={{ height: 74, borderRadius: 12 }} />
        </div>
        <div className="cec-shimmer" style={{ height: 88, borderRadius: 12 }} />
      </div>

      <style>{`
        @keyframes cecCrestIn { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes cecShimmer { from { background-position: -400px 0; } to { background-position: 400px 0; } }
        .cec-spinner { width: 20px; height: 20px; border-radius: 50%; border: 3px solid #BFDBFE; border-top-color: #0B3D91; animation: cecSpin .8s linear infinite; }
        @keyframes cecSpin { to { transform: rotate(360deg); } }
        .cec-shimmer { background: linear-gradient(90deg, rgba(255,255,255,.85) 25%, rgba(226,232,240,.9) 50%, rgba(255,255,255,.85) 75%); background-size: 800px 100%; animation: cecShimmer 1.4s linear infinite; border: 1px solid rgba(226,232,240,.9); }
      `}</style>
    </main>
  );
};
