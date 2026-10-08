import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform, useInView, useReducedMotion, animate } from 'framer-motion';
import type { UserAuthData } from '../auth/Login';
import { AuthContainer } from '../auth/AuthContainer';
import { useLiveAnnouncements } from '../../hooks/useLiveAnnouncements';
import './landing.css';

interface LandingPageProps {
  onLoginSuccess: (user: UserAuthData) => void;
  onNotify?: (message: string) => void;
  onSwitchToRegister: () => void;
  onSwitchToEnroll: () => void;
}

const BASE = import.meta.env.BASE_URL || '/';

const fadeUp = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: 'easeOut' as const },
};

const Counter = ({ to, decimals = 0, suffix = '', prefix = '' }: { to: number; decimals?: number; suffix?: string; prefix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, { duration: 1.8, ease: 'easeOut', onUpdate: (v) => setVal(v) });
    return () => controls.stop();
  }, [inView, to]);
  return (
    <strong ref={ref}>
      {prefix}
      {val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </strong>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess, onNotify, onSwitchToRegister, onSwitchToEnroll }) => {
  // authView: null = marketing site; otherwise the auth tab to show.
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot' | 'enroll' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adMissing, setAdMissing] = useState(false);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [announcementsPaused, setAnnouncementsPaused] = useState(false);
  const { items: announcements, live: announcementsLive } = useLiveAnnouncements('all', { intervalMs: 30000 });
  const prefersReducedMotion = useReducedMotion();
  const activeAnnouncementIndex = announcements.length ? announcementIndex % announcements.length : 0;
  const activeAnnouncement = announcements[activeAnnouncementIndex];
  const openAuth = (tab: 'login' | 'register' | 'forgot' | 'enroll') => {
    if (tab === 'register') onSwitchToRegister();
    if (tab === 'enroll') onSwitchToEnroll();
    setAuthView(tab);
  };
  useEffect(() => {
    if (announcements.length < 2 || announcementsPaused) return;
    const timer = window.setInterval(() => {
      setAnnouncementIndex((index) => (index + 1) % announcements.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [announcements.length, announcementsPaused]);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const headLeftX = useTransform(scrollYProgress, [0, 0.6], [0, -120]);
  const headRightX = useTransform(scrollYProgress, [0, 0.6], [0, 120]);
  const headOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  if (authView) {
    return (
      <div className="landing-auth">
        <button type="button" className="landing-back" onClick={() => setAuthView(null)}>← Back to site</button>
        <AuthContainer
          key={authView}
          initialTab={authView}
          onLoginSuccess={onLoginSuccess}
          onNotify={onNotify}
        />
      </div>
    );
  }

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-brand">
          <img src={`${BASE}cec-logo.png`} alt="CEC crest" />
          <span>CEC Portal</span>
        </div>
        <button
          type="button"
          className={`landing-burger${menuOpen ? ' is-open' : ''}`}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="landing-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span /><span /><span />
        </button>
      </nav>
      {menuOpen && (
        <nav className="landing-menu" id="landing-menu" aria-label="Main navigation">
          {[
            ['#overview', 'Overview'],
            ['#records', 'Academic Records'],
            ['#campus', 'Campus Life'],
          ].map(([href, label]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
          ))}
          <div className="landing-menu-actions">
            <button type="button" className="landing-menu-signin" onClick={() => { setMenuOpen(false); openAuth('login'); }}>Sign in</button>
          </div>
        </nav>
      )}

      {/* Section 1: campus viewfinder zoom */}
      <section ref={heroRef} id="overview" className="landing-hero">
        <div className="landing-hero-pin">
        <div className="landing-hero-grid-bg" style={{ backgroundImage: `url("${BASE}cec-landing-banner.png")` }} aria-hidden="true" />
          <motion.h1 className="landing-headline left" style={{ x: headLeftX, opacity: headOpacity }}>
            <small>Cebu Eastern College</small>
            We shape tomorrow,
          </motion.h1>
          <motion.h1 className="landing-headline right" style={{ x: headRightX, opacity: headOpacity }}>
            <small>Est. 1915 • Cebu City</small>
            we empower excellence.
          </motion.h1>
          <motion.div className="landing-scroll-hint" style={{ opacity: hintOpacity }}>SCROLL TO ENTER ↓</motion.div>
        </div>
      </section>

      {/* Dashboard reveal */}
      <section id="records" className="landing-dash">
        <motion.div {...fadeUp}>
          <span className="landing-kicker">Academic Records</span>
          <h2 className="landing-h2">Your whole academic life, live.</h2>
          <p className="landing-sub">Enrollment, grades, schedules, and billing stream into one dashboard the moment offices act — no queues, no paper chasing.</p>
        </motion.div>
        <motion.div className="landing-dash-mock" initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.7 }}>
          <div className="landing-dash-bar" aria-hidden="true"><i /><i /><i /></div>
          <div className="landing-dash-grid">
            <div className="landing-metric"><span>Enrollment</span><Counter to={1248} suffix="" /><small>+8.4% this semester</small></div>
            <div className="landing-metric"><span>Average grade</span><Counter to={84.6} decimals={1} /><small>across active students</small></div>
            <div className="landing-metric"><span>Attendance</span><Counter to={94.2} decimals={1} suffix="%" /><small>this month</small></div>
            <div className="landing-metric"><span>System uptime</span><Counter to={99.8} decimals={1} suffix="%" /><small>portal availability</small></div>
          </div>
        </motion.div>
      </section>

      <section id="school-ad" className="landing-ad" aria-label="School advertisement">
        <div className="landing-ad-frame">
          {!adMissing ? (
            <video
              controls
              preload="metadata"
              aria-label="School advertisement video"
              onError={() => setAdMissing(true)}
            >
              <source src={`${BASE}cec-school-ad.mp4`} type="video/mp4" />
            </video>
          ) : (
            <div className="landing-ad-empty" aria-hidden="true" />
          )}
        </div>
      </section>

      {/* Section 2: mission */}
      <section id="campus" className="landing-mission">
        <motion.div {...fadeUp}>
          <span className="landing-kicker" style={{ color: '#FFCA28' }}>Campus Life</span>
          <h2>Empowering student success, from gate to graduation.</h2>
          <p>One portal for every office — registrar, accounting, library, and faculty — working in sync around the student.</p>
        </motion.div>
        <div className="landing-caps">
          {[
            ['Real-Time Grading & Analytics', 'Midterms to finals post straight to report cards and GWA.'],
            ['Over-the-Counter Enrollment', 'Pay at accounting, submit your reference, track verification live.'],
            ['Plottable Class Schedules', 'Registrar-built study loads flow into student schedule picking.'],
          ].map(([t, d], i) => (
            <motion.div key={t} className="landing-cap" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: i * 0.08 }}>
              <strong>{t}</strong>
              <span>{d}</span>
            </motion.div>
          ))}
        </div>
        <section
          className="landing-announcements"
          aria-label="Live announcements"
          onMouseEnter={() => setAnnouncementsPaused(true)}
          onMouseLeave={() => setAnnouncementsPaused(false)}
          onFocus={() => setAnnouncementsPaused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAnnouncementsPaused(false);
          }}
        >
          <div className="landing-announcements-heading">
            <div>
              <span className="landing-announcements-label"><i /> Live announcements</span>
              <span className="landing-announcements-status">{announcementsLive ? 'Latest campus updates' : 'Updates temporarily unavailable'}</span>
            </div>
            {announcements.length > 1 && (
              <div className="landing-announcements-controls">
                <button type="button" aria-label="Previous announcement" onClick={() => setAnnouncementIndex((index) => (index - 1 + announcements.length) % announcements.length)}>←</button>
                <span>{activeAnnouncementIndex + 1} / {announcements.length}</span>
                <button type="button" aria-label="Next announcement" onClick={() => setAnnouncementIndex((index) => (index + 1) % announcements.length)}>→</button>
              </div>
            )}
          </div>
          <div className="landing-announcements-window" aria-live="polite" aria-atomic="true">
            {activeAnnouncement ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.article
                  key={activeAnnouncement.id}
                  className="landing-announcement-slide"
                  initial={prefersReducedMotion ? false : { opacity: 0, x: 36 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -36 }}
                  transition={{ duration: prefersReducedMotion ? 0.1 : 0.35, ease: 'easeOut' }}
                >
                  <h3>{activeAnnouncement.title}</h3>
                  <p>{activeAnnouncement.content}</p>
                  {(activeAnnouncement.published_at || activeAnnouncement.published_by_name) && (
                    <small>
                      {activeAnnouncement.published_at ? new Date(activeAnnouncement.published_at).toLocaleDateString() : ''}
                      {activeAnnouncement.published_at && activeAnnouncement.published_by_name ? ' · ' : ''}
                      {activeAnnouncement.published_by_name ? `Posted by ${activeAnnouncement.published_by_name}` : ''}
                    </small>
                  )}
                </motion.article>
              </AnimatePresence>
            ) : (
              <p className="landing-announcements-empty">
                {announcementsLive ? 'There are no announcements right now. Check back for campus updates.' : 'Campus updates could not be loaded right now.'}
              </p>
            )}
          </div>
        </section>
      </section>

      {/* Section 3: split hub */}
      <section className="landing-hub">
        <motion.div {...fadeUp}>
          <span className="landing-kicker">Learn in Sync</span>
          <h2 className="landing-h2">One portal, two perspectives.</h2>
          <p className="landing-sub">Students plot schedules and track grades while faculty encode, monitor, and intervene — on the same live data.</p>
        </motion.div>
        <div className="landing-counters">
          <div className="landing-counter"><Counter to={99.8} decimals={1} suffix="%" /><span>System uptime</span></div>
          <div className="landing-counter"><Counter to={15} suffix="K+" /><span>Enrolled students</span></div>
          <div className="landing-counter"><Counter to={86} suffix="" /><span>Active faculty</span></div>
        </div>
      </section>

      <footer className="landing-footer">
        Cebu Eastern College • Virtue • Knowledge • Service — portal systems operational.
      </footer>

      <div className="landing-fab" role="toolbar" aria-label="Quick actions">
        <button type="button" className="landing-fab-enroll" onClick={() => openAuth('enroll')}>Enroll Now</button>
      </div>
    </div>
  );
};

export default LandingPage;
