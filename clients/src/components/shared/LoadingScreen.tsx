import React, { useEffect, useState } from 'react';

type Props = {
  name: string;
  role: string;
  onDone: () => void;
};

const STAGES = ['Verifying credentials…', 'Opening the gates…', 'Preparing dashboard…'];
const BASE = import.meta.env.BASE_URL || '/';

// Original CEC dragon motif, posed like the reference: rearing body,
// open jaw, raised forelimb, flame-spiked ridge, curled tail.
const DragonMark = () => (
  <svg
    viewBox="0 0 340 210"
    width="320"
    height="198"
    role="img"
    aria-label="CEC Chinese dragon mark"
    style={{ overflow: 'visible', filter: 'drop-shadow(0 14px 26px rgba(11,61,145,.28))' }}
  >
    <defs>
      <linearGradient id="cecBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5B9BF5" />
        <stop offset=".45" stopColor="#1E63C8" />
        <stop offset="1" stopColor="#0B3D91" />
      </linearGradient>
      <linearGradient id="cecBelly" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#CFE3FF" />
        <stop offset="1" stopColor="#7FA8E0" />
      </linearGradient>
      <linearGradient id="cecFin" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#0B3D91" />
        <stop offset="1" stopColor="#5B9BF5" />
      </linearGradient>
    </defs>
    {/* backdrop ring */}
    <circle cx="170" cy="108" r="96" fill="none" stroke="#FFCA28" strokeWidth="3" opacity=".85" className="cec-dragon-ring" />
    <circle cx="170" cy="108" r="86" fill="none" stroke="#0B3D91" strokeWidth="1.5" opacity=".3" />
    <g className="cec-dragon-float">
      {/* tail curl (right) */}
      <path
        d="M268 150 C 296 148, 306 124, 292 110 C 282 100, 268 104, 270 116"
        fill="none" stroke="url(#cecBody)" strokeWidth="15" strokeLinecap="round"
      />
      {/* main torso S-curve */}
      <path
        d="M96 148 C 130 150, 148 128, 182 128 C 214 128, 226 146, 262 148"
        fill="none" stroke="url(#cecBody)" strokeWidth="30" strokeLinecap="round"
      />
      {/* belly highlight */}
      <path
        d="M100 156 C 134 158, 150 138, 184 138 C 214 138, 228 154, 260 155"
        fill="none" stroke="url(#cecBelly)" strokeWidth="6" strokeLinecap="round" opacity=".85"
        className="cec-dragon-shimmer" strokeDasharray="3 14"
      />
      {/* rising neck to head (upper left) */}
      <path
        d="M100 146 C 82 128, 74 102, 84 78"
        fill="none" stroke="url(#cecBody)" strokeWidth="24" strokeLinecap="round"
      />
      {/* dorsal flame spikes along the back */}
      <g fill="url(#cecFin)">
        <path d="M128 116 l 4 -18 l 10 15 Z" />
        <path d="M152 112 l 5 -20 l 10 17 Z" />
        <path d="M178 112 l 5 -20 l 10 17 Z" />
        <path d="M204 116 l 5 -18 l 10 15 Z" />
        <path d="M228 124 l 5 -16 l 9 14 Z" />
        <path d="M78 108 l -2 -18 l 12 12 Z" />
        <path d="M282 132 l 12 -8 l -2 16 Z" />
      </g>
      {/* scale rows */}
      {[120, 140, 160, 180, 200, 220, 240].map((x) => (
        <g key={x} stroke="#9CC2F2" strokeWidth="1.6" opacity=".85" fill="none">
          <path d={`M${x} 132 q 6 -8 12 0`} />
          <path d={`M${x + 3} 142 q 6 -8 12 0`} />
        </g>
      ))}
      {/* raised forelimb (left) */}
      <path d="M118 140 C 100 132, 84 132, 70 120" fill="none" stroke="url(#cecBody)" strokeWidth="9" strokeLinecap="round" />
      <g stroke="#0B3D91" strokeWidth="2.6" strokeLinecap="round">
        <line x1="70" y1="120" x2="58" y2="112" />
        <line x1="70" y1="120" x2="60" y2="122" />
        <line x1="70" y1="120" x2="62" y2="130" />
      </g>
      {/* planted hind limb */}
      <path d="M236 150 C 240 162, 250 168, 262 168" fill="none" stroke="url(#cecBody)" strokeWidth="10" strokeLinecap="round" />
      <g stroke="#0B3D91" strokeWidth="2.6" strokeLinecap="round">
        <line x1="262" y1="168" x2="272" y2="164" />
        <line x1="262" y1="168" x2="273" y2="172" />
        <line x1="262" y1="168" x2="270" y2="179" />
      </g>
      {/* head: open jaw, horns, mane, whiskers */}
      <g>
        <ellipse cx="72" cy="66" rx="19" ry="15" fill="url(#cecBody)" transform="rotate(-24 72 66)" />
        <path d="M58 62 L34 54 L40 66 Z" fill="url(#cecBody)" />
        <path d="M60 72 L38 78 L52 84 Z" fill="#0B3D91" />
        <circle cx="68" cy="60" r="3" fill="#FFCA28" className="cec-dragon-eye" />
        <circle cx="68" cy="60" r="1.1" fill="#0B254E" />
        <path d="M74 52 L84 36 M80 44 L90 40 M78 48 L70 36" stroke="#0B3D91" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M84 58 q 16 -2 22 -14 q 2 14 -8 20 q 12 0 14 -10 q 4 14 -10 18 q -10 4 -18 -2 Z" fill="url(#cecFin)" opacity=".95" />
        <path d="M40 64 q -16 0 -24 10 M42 70 q -12 6 -14 16" fill="none" stroke="#0B3D91" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M44 60 l 3 5 l 3 -5 M52 58 l 3 5 l 3 -5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
      {/* tail flame tuft */}
      <path d="M270 116 q -12 -2 -16 -14 q 8 2 10 -8 q 6 8 2 16 q 10 -2 12 -12 q 4 14 -8 18 Z" fill="#FFCA28" opacity=".9" className="cec-dragon-flame" />
    </g>
    {/* clouds */}
    <g fill="#DCE8FA" opacity=".9">
      <ellipse cx="250" cy="44" rx="22" ry="7" className="cec-dragon-cloud" />
      <ellipse cx="90" cy="176" rx="24" ry="8" className="cec-dragon-cloud cec-dragon-cloud-late" />
    </g>
  </svg>
);

export const LoadingScreen: React.FC<Props> = ({ name, role, onDone }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(1), 800),
      window.setTimeout(() => setStage(2), 1600),
      window.setTimeout(onDone, 2600),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = [34, 67, 100][stage];

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
        padding: 24,
        backgroundColor: '#eef2f8',
        backgroundImage: `url('${BASE}cec-dragons-bg.png')`,
        backgroundSize: 'min(980px, 94vw) auto',
        backgroundPosition: 'center 30%',
        backgroundRepeat: 'no-repeat',
        fontFamily: 'Inter,system-ui,sans-serif',
      }}
    >
      <DragonMark />
      {/* Centered school crest */}
      <img
        src={`${BASE}cec-logo.png`}
        alt="Cebu Eastern College official crest"
        width={84}
        height={84}
        decoding="async"
        style={{ width: 84, height: 84, objectFit: 'contain', marginTop: 6, animation: 'cecCrestIn .6s ease-out' }}
      />
      <h1 style={{ margin: '14px 0 2px', fontSize: 22, fontWeight: 800, color: '#0B3D91', textAlign: 'center', letterSpacing: '-.01em' }}>
        Cebu Eastern College
      </h1>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 800, letterSpacing: '.14em', color: '#64748B', textTransform: 'uppercase', textAlign: 'center' }}>
        {role} Portal • 1st Sem 2026–2027
      </p>
      <p style={{ margin: '0 0 14px', fontSize: 14, color: '#334155', textAlign: 'center' }}>
        Welcome, <strong>{name}</strong>
      </p>

      {/* Staged progress */}
      <div style={{ width: 'min(320px, 80vw)', marginBottom: 8 }} role="status" aria-live="polite">
        <div style={{ height: 8, background: 'rgba(11,61,145,.14)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#0B3D91,#FFCA28)', transition: 'width .5s ease' }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: '#0B3D91', fontWeight: 600, textAlign: 'center' }}>{STAGES[stage]}</div>
      </div>

      {/* Skeleton preview of the dashboard */}
      <div aria-hidden="true" style={{ width: 'min(560px, 92vw)', display: 'grid', gap: 10, marginTop: 14 }}>
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
        @keyframes cecFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        @keyframes cecDash { to { stroke-dashoffset: -60; } }
        @keyframes cecPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        @keyframes cecFlicker { 0%,100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.12); opacity: 1; } }
        @keyframes cecDrift { 0%,100% { transform: translateX(0); } 50% { transform: translateX(10px); } }
        @keyframes cecSpinRing { to { transform: rotate(360deg); } }
        .cec-dragon-float { animation: cecFloat 3.2s ease-in-out infinite; transform-box: fill-box; }
        .cec-dragon-shimmer { animation: cecDash 2.4s linear infinite; }
        .cec-dragon-eye { animation: cecPulse 1.8s ease-in-out infinite; }
        .cec-dragon-flame { animation: cecFlicker 1.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .cec-dragon-cloud { animation: cecDrift 5s ease-in-out infinite; }
        .cec-dragon-cloud-late { animation-delay: -2.5s; }
        .cec-dragon-ring { animation: cecSpinRing 24s linear infinite; transform-box: fill-box; transform-origin: center; }
        .cec-shimmer { background: linear-gradient(90deg, rgba(255,255,255,.85) 25%, rgba(226,232,240,.9) 50%, rgba(255,255,255,.85) 75%); background-size: 800px 100%; animation: cecShimmer 1.4s linear infinite; border: 1px solid rgba(226,232,240,.9); }
      `}</style>
    </main>
  );
};
