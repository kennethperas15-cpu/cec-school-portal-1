import React, { useEffect, useState } from 'react';

export type Slide = { src: string; title: string; subtitle: string };

type Props = { slides: Slide[]; label: string; intervalMs?: number };

export const SlideShow: React.FC<Props> = ({ slides, label, intervalMs = 5000 }) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), intervalMs);
    return () => window.clearInterval(timer);
  }, [slides.length, intervalMs]);
  const slide = slides[index % slides.length];
  return (
    <div aria-label={label} style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e7ef', background: '#061D40', position: 'relative' }}>
      <div style={{ position: 'relative', width: '100%', height: 210 }}>
        <img src={slide.src} alt={slide.title} width="1200" height="675" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '34px 18px 34px', background: 'linear-gradient(to top, rgba(5,24,56,.92), rgba(5,24,56,.55) 70%, transparent)', color: '#fff' }}>
          <h3 style={{ margin: '0 0 2px', fontSize: 15 }}>{slide.title}</h3>
          <p style={{ margin: 0, fontSize: 12, color: '#CBD5E1' }}>{slide.subtitle}</p>
        </div>
        <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 7 }}>
          {slides.map((s, i) => (
            <button key={s.src} type="button" onClick={() => setIndex(i)} aria-label={`Go to slide ${i + 1}: ${s.title}`}
              style={{ width: i === index ? 22 : 8, height: 8, borderRadius: 999, border: '1px solid rgba(255,255,255,.8)', background: i === index ? '#FFCA28' : 'rgba(255,255,255,.4)', cursor: 'pointer', padding: 0 }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export const REGISTRAR_SLIDES: Slide[] = [
  { src: '/cec-campus-front.png', title: 'Office of the Registrar', subtitle: 'Window 1–3 • Enrollment verification and records release.' },
  { src: '/cec-campus-group.png', title: 'Registrar Services Team', subtitle: 'Assistance with COR, TOR, and certifications.' },
  { src: '/cec-campus-collage.png', title: 'Enrollment Made Easy', subtitle: 'Apply online, verify documents, get approved.' },
];

export const FINANCE_SLIDES: Slide[] = [
  { src: '/cec-building.png', title: 'CEC Cashier — Window 3', subtitle: 'On-site payments • GCash, Maya, bank transfer accepted.' },
  { src: '/cec-login-banner.png', title: 'Pay Online, Anytime', subtitle: 'GoTyme, UnionBank, Metrobank, BPI supported.' },
];
