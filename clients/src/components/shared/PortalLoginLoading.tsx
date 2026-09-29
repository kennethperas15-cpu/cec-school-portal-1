import React, { useEffect, useState } from 'react';
import { AzureDragon } from './AzureDragon';

type Props = {
  name: string;
  role: string;
  onDone: () => void;
};

const STAGES = ['Authenticating…', 'Loading Portal Dashboard…'];
const BASE = import.meta.env.BASE_URL || '/';

/**
 * Full-screen portal login loading overlay.
 * Shows immediately after valid credentials are submitted: dark blurred
 * overlay, azure dragon looping an infinity path, then gliding to center to
 * face the viewer over the glowing school crest, with staged status text.
 */
export const PortalLoginLoading: React.FC<Props> = ({ name, role, onDone }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(1), 1100),
      window.setTimeout(onDone, 2600),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = [38, 92][stage];

  return (
    <main
      aria-label="Loading your portal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#0B1226',
        fontFamily: 'Inter,system-ui,sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Full-screen AI dragon loop. Overscaled ~12% and shifted up-left so the
          generator's corner bug stays outside the visible frame. Hides itself
          on error so the canvas dragon always remains. */}
      <video
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', transform: 'scale(1.12) translate(-2%,-3%)',
        }}
      >
        <source src={`${BASE}cec-dragon-loop.webm`} type="video/webm" />
      </video>
      {/* Dim veil for legibility */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 42%, rgba(11,18,38,.18) 0%, rgba(11,18,38,.72) 78%)' }} />

      {/* Center stage: canvas dragon + crest over the film */}
      <div style={{ position: 'relative', width: 'min(420px, 88vw)', height: 'min(320px, 52vw)' }}>
        <img
          src={`${BASE}cec-logo.png`}
          alt="Cebu Eastern College official crest"
          width={92}
          height={92}
          decoding="async"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 92,
            height: 92,
            objectFit: 'contain',
            transform: 'translate(-50%,-50%)',
            filter: 'drop-shadow(0 0 26px rgba(91,155,245,.85))',
          }}
        />
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 150, height: 150, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,.35) 0%, rgba(59,130,246,0) 70%)' }} aria-hidden="true" />
        <div style={{ position: 'absolute', inset: 0 }}>
          <AzureDragon loops={1} loopDurationMs={1500} swoopDurationMs={800} />
        </div>
      </div>

      <h1 style={{ position: 'relative', margin: '10px 0 2px', fontSize: 22, fontWeight: 800, color: '#fff', textAlign: 'center', letterSpacing: '-.01em', textShadow: '0 2px 14px rgba(0,0,0,.6)' }}>
        Cebu Eastern College
      </h1>
      <p style={{ position: 'relative', margin: '0 0 6px', fontSize: 12, fontWeight: 800, letterSpacing: '.14em', color: '#93C5FD', textTransform: 'uppercase', textAlign: 'center', textShadow: '0 1px 8px rgba(0,0,0,.6)' }}>
        {role} Portal • 1st Sem 2026–2027
      </p>
      <p style={{ position: 'relative', margin: '0 0 16px', fontSize: 14, color: '#CBD5E1', textAlign: 'center', textShadow: '0 1px 8px rgba(0,0,0,.6)' }}>
        Welcome, <strong style={{ color: '#fff' }}>{name}</strong>
      </p>

      <div style={{ position: 'relative', width: 'min(320px, 80vw)' }} role="status" aria-live="polite">
        <div style={{ height: 8, background: 'rgba(148,163,184,.25)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#3B82F6,#5B9BF5,#FFCA28)', transition: 'width .6s ease', boxShadow: '0 0 12px rgba(91,155,245,.8)' }} />
        </div>
        <div className="cec-load-pulse" style={{ marginTop: 10, fontSize: 13, color: '#BFDBFE', fontWeight: 600, textAlign: 'center', textShadow: '0 1px 8px rgba(0,0,0,.6)' }}>{STAGES[stage]}</div>
      </div>

      <style>{`
        @keyframes cecLoadPulse { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
        .cec-load-pulse { animation: cecLoadPulse 1.2s ease-in-out infinite; }
      `}</style>
    </main>
  );
};

export default PortalLoginLoading;
