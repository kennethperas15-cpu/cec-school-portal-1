import React, { useEffect, useRef } from 'react';

interface AzureDragonProps {
  /** Number of infinity loops before the center swoop. Defaults to 1. */
  loops?: number;
  /** Duration of one infinity loop in ms. Defaults to 1500. */
  loopDurationMs?: number;
  /** Swoop-to-center duration in ms. Defaults to 800. */
  swoopDurationMs?: number;
  className?: string;
  style?: React.CSSProperties;
}

type Phase = 'infinity' | 'swoop' | 'reveal';

const HEAD = '#5B9BF5';
const MID = '#1E63C8';
const DEEP = '#0B3D91';
const BELLY = '#CFE3FF';
const GOLD = '#FFCA28';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const mix = (a: string, b: string, t: number): string => {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return `rgb(${Math.round(lerp(ca[0], cb[0], t))},${Math.round(lerp(ca[1], cb[1], t))},${Math.round(lerp(ca[2], cb[2], t))})`;
};

/**
 * Majestic azure-blue Chinese dragon on HTML5 canvas.
 * Animation: infinity (figure-eight) loop -> swoop to center -> faces viewer
 * hovering over the school logo. Dependency-free, DPR-aware, capped at ~60fps.
 */
export const AzureDragon: React.FC<AzureDragonProps> = ({
  loops = 1,
  loopDurationMs = 1500,
  swoopDurationMs = 800,
  className,
  style,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let w = 0;
    let h = 0;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(rect.width, 10);
      h = Math.max(rect.height, 10);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // ---- rig ----
    const SEGMENTS = 44;
    const spacing = () => Math.max(w, h) * 0.016;
    const pts: { x: number; y: number }[] = [];
    const palette: string[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      pts.push({ x: w / 2, y: h / 2 });
      const t = i / (SEGMENTS - 1);
      palette.push(t < 0.5 ? mix(HEAD, MID, t * 2) : mix(MID, DEEP, (t - 0.5) * 2));
    }
    const maxW = () => Math.max(w, h) * 0.052;
    const particles: { x: number; y: number; vx: number; vy: number; life: number; gold: boolean; size: number }[] = [];

    let phase: Phase = reduced ? 'reveal' : 'infinity';
    let phaseStart = performance.now();
    const startTime = phaseStart;
    let revealT = reduced ? 1 : 0;
    let heading = 0;
    let swoopFrom = { x: w / 2, y: h / 2 };
    let headX = w / 2;
    let headY = h / 2;
    let raf = 0;
    let last = startTime;

    const center = () => ({ x: w / 2, y: h / 2 });

    // Horizontal figure-eight (lemniscate of Gerono) around the center.
    const infinityPoint = (elapsed: number) => {
      const t = ((elapsed / loopDurationMs) * Math.PI * 2) % (Math.PI * 2);
      const c = center();
      const a = w * 0.36;
      const b = h * 0.3;
      return { x: c.x + a * Math.cos(t), y: c.y + b * Math.sin(t) * Math.cos(t) };
    };

    const drawScales = (time: number) => {
      ctx.lineWidth = 1.4;
      for (let i = 4; i < SEGMENTS - 2; i += 3) {
        const p = pts[i];
        const q = pts[Math.min(i + 1, SEGMENTS - 1)];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const pulse = 0.45 + 0.4 * Math.sin(time * 0.006 + i * 0.55);
        ctx.strokeStyle = `rgba(156,194,242,${pulse.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x + nx * 3, p.y + ny * 3, maxW() * 0.22, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const drawSpikes = () => {
      ctx.fillStyle = MID;
      for (let i = 6; i < SEGMENTS - 2; i += 5) {
        const p = pts[i];
        const q = pts[Math.min(i + 1, SEGMENTS - 1)];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const s = maxW() * 0.34;
        ctx.beginPath();
        ctx.moveTo(p.x - nx * 2, p.y - ny * 2);
        ctx.lineTo(p.x + nx * (s + 2), p.y + ny * (s + 2));
        ctx.lineTo(p.x - dx / len * s, p.y - dy / len * s);
        ctx.closePath();
        ctx.fill();
      }
    };

    const drawWhiskers = (hx: number, hy: number, dir: number, time: number, frontal: boolean) => {
      ctx.strokeStyle = DEEP;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      const wave = Math.sin(time * 0.008) * 5;
      const sides = frontal ? [-1, 1] : [1];
      for (const s of sides) {
        const baseAng = frontal ? Math.PI / 2 + s * 0.5 : dir + s * 0.9;
        const bx = hx + Math.cos(baseAng) * 10;
        const by = hy + Math.sin(baseAng) * 10;
        const cxp = bx + Math.cos(baseAng + s * 0.5) * 22;
        const cyp = by + Math.sin(baseAng + s * 0.5) * 22 + wave * s;
        const ex = cxp + Math.cos(baseAng + s * 0.9) * 20;
        const ey = cyp + Math.sin(baseAng + s * 0.9) * 20 + wave;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(cxp, cyp, ex, ey);
        ctx.stroke();
      }
    };

    const drawHead = (time: number) => {
      const p = pts[0];
      const frontal = revealT;
      const size = maxW() * 0.78;
      ctx.save();
      ctx.translate(p.x, p.y);
      if (frontal < 0.5) ctx.rotate(heading);
      else ctx.rotate(heading * (1 - frontal));
      // Glow halo behind the head.
      const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 2.4);
      halo.addColorStop(0, 'rgba(91,155,245,.5)');
      halo.addColorStop(1, 'rgba(91,155,245,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, size * 2.4, 0, Math.PI * 2);
      ctx.fill();
      // Skull.
      ctx.fillStyle = HEAD;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 1.15, size * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      // Snout + open jaw (profile projection blends to frontal).
      const jawOpen = 4 + 2 * Math.sin(time * 0.005);
      ctx.fillStyle = MID;
      ctx.beginPath();
      ctx.ellipse(size * 0.9, size * 0.28 * (1 - frontal * 0.4), size * 0.62, size * 0.34, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = DEEP;
      ctx.beginPath();
      ctx.ellipse(size * 0.95, size * 0.28 * (1 - frontal * 0.4) + jawOpen, size * 0.5, size * 0.2, 0.25, 0, Math.PI * 2);
      ctx.fill();
      // Fangs.
      ctx.fillStyle = '#fff';
      const fx = size * 0.95;
      const fy = size * 0.28 * (1 - frontal * 0.4) + 2;
      ctx.beginPath();
      ctx.moveTo(fx - 5, fy);
      ctx.lineTo(fx - 3, fy + 7);
      ctx.lineTo(fx - 1, fy);
      ctx.moveTo(fx + 3, fy);
      ctx.lineTo(fx + 5, fy + 7);
      ctx.lineTo(fx + 7, fy);
      ctx.fill();
      // Horns.
      ctx.strokeStyle = DEEP;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const hornSpread = lerp(0.5, 1, frontal);
      ctx.beginPath();
      ctx.moveTo(-size * 0.3, -size * 0.55);
      ctx.lineTo(-size * 0.3 - size * 0.5 * hornSpread, -size * 1.25);
      ctx.moveTo(size * 0.25, -size * 0.55);
      ctx.lineTo(size * 0.25 + size * 0.5 * hornSpread, -size * 1.25);
      ctx.stroke();
      // Mane fins.
      ctx.fillStyle = MID;
      ctx.beginPath();
      ctx.moveTo(-size * 0.7, -size * 0.2);
      ctx.quadraticCurveTo(-size * 1.7, -size * 0.3, -size * 1.5, -size * 1);
      ctx.quadraticCurveTo(-size * 1, -size * 0.5, -size * 0.7, -size * 0.4);
      ctx.closePath();
      ctx.fill();
      // Eyes: single profile eye blends into a forward-facing pair.
      const eyeY = -size * 0.18;
      const drawEye = (ex: number) => {
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(ex, eyeY, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0B254E';
        ctx.beginPath();
        ctx.arc(ex + size * 0.05 * frontal, eyeY, size * 0.09, 0, Math.PI * 2);
        ctx.fill();
      };
      if (frontal < 0.5) drawEye(size * 0.3);
      else {
        ctx.globalAlpha = frontal;
        drawEye(-size * 0.38);
        drawEye(size * 0.38);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      drawWhiskers(p.x, p.y, heading, time, frontal >= 0.5);
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const elapsed = now - startTime;
      const c = center();

      // ---- phase machine ----
      let target = { x: headX, y: headY };
      if (phase === 'infinity') {
        target = infinityPoint(elapsed);
        if (elapsed >= loops * loopDurationMs) {
          phase = 'swoop';
          phaseStart = now;
          swoopFrom = { x: headX, y: headY };
        }
      } else if (phase === 'swoop') {
        const u = Math.min((now - phaseStart) / swoopDurationMs, 1);
        const e = easeInOutCubic(u);
        target = { x: lerp(swoopFrom.x, c.x, e), y: lerp(swoopFrom.y, c.y, e) };
        if (u >= 1) {
          phase = 'reveal';
          phaseStart = now;
        }
      } else {
        revealT = Math.min(revealT + dt * 1.8, 1);
        target = { x: c.x, y: c.y + Math.sin(now * 0.0022) * h * 0.02 };
      }

      // ---- follow-the-leader serpentine ----
      const prevX = headX;
      const prevY = headY;
      const k = 1 - Math.exp(-dt * 9);
      headX += (target.x - headX) * k;
      headY += (target.y - headY) * k;
      const vx = headX - prevX;
      const vy = headY - prevY;
      if (Math.hypot(vx, vy) > 0.02 && phase !== 'reveal') {
        const want = Math.atan2(vy, vx);
        let diff = want - heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        heading += diff * Math.min(1, dt * 10);
      }
      pts[0] = { x: headX, y: headY };
      const d = spacing();
      for (let i = 1; i < SEGMENTS; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        dx /= dist;
        dy /= dist;
        // Slither: lateral sine wave grows toward the tail.
        const sway = Math.sin(now * 0.009 - i * 0.42) * d * 0.28 * (i / SEGMENTS);
        pts[i] = { x: a.x - dx * d - dy * sway, y: a.y - dy * d + dx * sway };
      }

      // ---- particles from the tail ----
      const tail = pts[SEGMENTS - 1];
      for (let s = 0; s < 2; s++) {
        if (particles.length > 140) break;
        particles.push({
          x: tail.x + (Math.random() - 0.5) * 8,
          y: tail.y + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 24,
          vy: (Math.random() - 0.5) * 24 - 12,
          life: 1,
          gold: Math.random() < 0.18,
          size: 1.5 + Math.random() * 2.5,
        });
      }

      // ---- draw ----
      ctx.clearRect(0, 0, w, h);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt * 1.4;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.globalAlpha = Math.max(p.life, 0) * 0.8;
        ctx.fillStyle = p.gold ? GOLD : HEAD;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Glow underlay (single wide translucent pass).
      ctx.strokeStyle = 'rgba(91,155,245,.22)';
      ctx.lineWidth = maxW() + 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < SEGMENTS; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();

      // Tapered body, head to tail.
      ctx.lineCap = 'round';
      for (let i = SEGMENTS - 1; i >= 1; i--) {
        const t = i / (SEGMENTS - 1);
        ctx.strokeStyle = palette[i];
        ctx.lineWidth = Math.max(maxW() * (1 - t * 0.82), 1.5);
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[i - 1].x, pts[i - 1].y);
        ctx.stroke();
      }
      // Belly highlight.
      ctx.strokeStyle = 'rgba(207,227,255,.75)';
      ctx.lineWidth = Math.max(maxW() * 0.16, 1);
      ctx.beginPath();
      ctx.moveTo(pts[2].x, pts[2].y + maxW() * 0.22);
      for (let i = 3; i < SEGMENTS - 4; i++) ctx.lineTo(pts[i].x, pts[i].y + maxW() * 0.22);
      ctx.stroke();

      drawSpikes();
      drawScales(now);
      drawHead(now);

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [loops, loopDurationMs, swoopDurationMs]);

  return (
    <div ref={wrapRef} className={className} style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <canvas ref={canvasRef} aria-label="Azure Chinese dragon animation" role="img" style={{ display: 'block' }} />
    </div>
  );
};

export default AzureDragon;
