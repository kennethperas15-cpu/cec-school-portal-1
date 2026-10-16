import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, animate } from 'framer-motion';
import type { UserAuthData } from '../auth/Login';
import { AuthModal } from './AuthModal';
import './website.css';

interface CecWebsiteProps {
  onLoginSuccess: (user: UserAuthData) => void;
  onNotify?: (message: string) => void;
}

const BASE = import.meta.env.BASE_URL || '/';

const LEVELS: [string, string, string][] = [
  ['01', 'Preschool', 'Foundational learning through play, care, and early literacy'],
  ['02', 'Grade School', 'A balanced curriculum building strong fundamentals in language, math, and science'],
  ['03', 'Junior High', 'Critical thinking and character development through an engaging, standards-based program'],
  ['04', 'Senior High', 'Specialized academic tracks in STEM, ABM, and humanities'],
  ['05', 'College', 'Degree programs in business, education, IT, and liberal arts'],
  ['06', 'Arts & Sports', 'Co-curricular programs in visual arts, music, and athletics'],
];

const AWARDS: [string, string, string][] = [
  ['2026', 'Regional Academic Excellence Award', 'DepEd Region VII'],
  ['2026', 'Champion — Regional Math Olympiad', 'Philippine Math Society'],
  ['2025', 'Top Performing School — Licensure Exam for Professional Teachers', 'Professional Regulation Commission'],
  ['2025', 'Outstanding Chinese-Filipino School', 'CFA Federation'],
  ['2024', 'Gold — International Science & Math Quiz', 'ICAS Assessment'],
  ['2024', 'Best School Athletics Program', 'Cebu City Sports Council'],
];

const TICKER = ['High STEM Fair 2026', 'CEC Intramurals Kickoff', 'SY 2027–2028 Enrollment Now Open', 'Founding Anniversary'];

const EVENTS: [string, string, string, string, string][] = [
  ['OCT', '20', 'Admissions', 'SY 2027-2028 Enrollment Now Open', 'Applications for preschool through college are now being accepted'],
  ['OCT', '15', 'Events', 'Founding Anniversary Celebration', 'Celebrating 88 years of Cebu Eastern College'],
  ['OCT', '10', 'Academics', 'Senior High STEM Fair 2026', 'Student research showcases and innovation exhibits'],
  ['OCT', '02', 'Athletics', 'CEC Intramurals Kickoff', 'Annual school sports festival opening ceremony'],
];

const STATS: [number, string, string][] = [
  [5000, '+', 'Students Enrolled'],
  [40, '+', 'Academic Programs'],
  [85, '+', 'Years of Excellence'],
  [98, '%', 'Graduation Rate'],
];

const StatCounter = ({ to, suffix }: { to: number; suffix: string }) => {
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
      {Math.round(val).toLocaleString('en-US')}
      {suffix}
    </strong>
  );
};

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-70px' },
  transition: { duration: 0.55, delay, ease: 'easeOut' as const },
});

export const CecWebsite: React.FC<CecWebsiteProps> = ({ onLoginSuccess, onNotify }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroMissing, setHeroMissing] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  // Auth popover: null = closed; otherwise the form shown beside the ad.
  // Tabs are Sign In / Recovery / Enroll Now — staff accounts are
  // provisioned by an administrator, never self-registered here.
  const [popTab, setPopTab] = useState<'signin' | 'recovery' | 'enroll' | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroBgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const heroBgScale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);
  const heroContentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => {
    const onScroll = () => {
      const heroH = heroRef.current?.offsetHeight ?? window.innerHeight;
      setPastHero(window.scrollY > heroH - 90);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen && !popTab) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); setPopTab(null); }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen, popTab]);

  const go = (fn: () => void) => () => { setMenuOpen(false); fn(); };

  return (
    <div className="cecweb">
      <header className={`cecweb-header${pastHero ? ' solid' : ''}`}>
        <div className="cecweb-brand">
          <span className="cecweb-brand-seal"><img src={`${BASE}cec-logo.png`} alt="Cebu Eastern College crest" /></span>
          <span><strong>Cebu Eastern College</strong><small>CEBU CITY</small></span>
        </div>
        <button type="button" className="cecweb-burger-circle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>☰</button>
      </header>
      <div
        className="cecweb-drawer-veil"
        aria-hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
        style={{ opacity: menuOpen ? 1 : 0, visibility: menuOpen ? 'visible' : 'hidden' }}
      />
      <nav
        className="cecweb-drawer"
        aria-label="Site menu"
        aria-hidden={!menuOpen}
        style={{ transform: menuOpen ? 'translateX(0)' : 'translateX(100%)', visibility: menuOpen ? 'visible' : 'hidden' }}
      >
        <button type="button" className="cecweb-drawer-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>×</button>
            {[['Home', '#top'], ['About', '#heritage'], ['Programs', '#programs'], ['Announcements', '#events'], ['Contact', '#contact']].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
            <button type="button" className="cecweb-drawer-login" onClick={go(() => setPopTab('signin'))}>👤 Login</button>
            <button type="button" className="cecweb-drawer-enroll" onClick={go(() => setPopTab('enroll'))}>Enroll Now</button>
      </nav>

      {popTab && (
        <AuthModal
          key={popTab}
          initialTab={popTab}
          onLoginSuccess={(u) => { setPopTab(null); onLoginSuccess(u); }}
          onNotify={onNotify}
          onClose={() => setPopTab(null)}
        />
      )}

      <section className="cecweb-hero" id="top" ref={heroRef}>
        {!heroMissing && (
          <motion.img
            className="cecweb-hero-bg"
            src={`${BASE}cec-building.png`}
            alt=""
            aria-hidden="true"
            onError={() => setHeroMissing(true)}
            style={{ y: heroBgY, scale: heroBgScale }}
          />
        )}
        <div className="cecweb-hero-veil" aria-hidden="true" />
        <motion.div className="cecweb-hero-inner" style={{ opacity: heroContentOpacity }}>
          <span className="cecweb-hero-est">EST. 1938 • CEBU CITY</span>
          <h1>The Future of Learning Starts Here</h1>
          <p>A tradition of excellence in education — nurturing minds, building character, and shaping leaders since 1938.</p>
          <div className="cecweb-hero-ctas">
            <a className="cecweb-pill cecweb-pill-gold" href="#programs">Explore Programs</a>
            <a className="cecweb-pill cecweb-pill-ghost" href="#heritage">Our Story</a>
          </div>
        </motion.div>
      </section>

      <section className="cecweb-heritage" id="heritage">
        <h2>A legacy of learning, character, and community.</h2>
        <p>For over 80 years, Cebu Eastern College has stood on Filipino-Chinese heritage — pairing academic rigor with value-driven education, and raising generations who lead with virtue, knowledge, and service.</p>
        <div className="cecweb-stats">
          {STATS.map(([n, suffix, l]) => (
            <motion.div key={l} className="cecweb-stat" {...reveal(0)}>
              <StatCounter to={n} suffix={suffix} />
              <span>{l}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="cecweb-programs" id="programs">
        <h2>From first steps to graduation.</h2>
        <p>Six levels, one standard of excellence.</p>
        <div className="cecweb-levels">
          {LEVELS.map(([n, t, d], i) => (
            <motion.div key={n} className="cecweb-level" {...reveal(i * 0.06)}><b>{n}</b><strong>{t}</strong><span>{d}</span></motion.div>
          ))}
        </div>
      </section>

      <section className="cecweb-awards">
        <h2>Pride &amp; Achievement</h2>
        <p>Institutional honors earned by our students and faculty.</p>
        <div className="cecweb-award-grid">
          {AWARDS.map(([y, t, by], i) => (
            <motion.div key={`${y}-${t}`} className="cecweb-award" {...reveal(i * 0.06)}><b>{y}</b><strong>{t}</strong><span>{by}</span></motion.div>
          ))}
        </div>
      </section>

      <div className="cecweb-ticker" aria-label="Latest updates">
        <span className="cecweb-ticker-track">
          {[0, 1].map((copy) => (
            <React.Fragment key={copy}>
              {TICKER.map((t) => <span key={`${copy}-${t}`}><span className="cecweb-ticker-live">LIVE</span>{t}</span>)}
            </React.Fragment>
          ))}
        </span>
      </div>

      <section className="cecweb-events" id="events">
        <h2>Announcements &amp; Events</h2>
        <div className="cecweb-event-grid">
          {EVENTS.map(([mon, day, cat, t, d], i) => (
            <motion.article key={t} className="cecweb-event" {...reveal(i * 0.05)}>
              <div className="cecweb-event-date"><span>{mon}<br />{day}</span></div>
              <div>
                <strong>{t}</strong>
                <p>{d}</p>
                <span className={`cecweb-cat cecweb-cat-${cat}`}>{cat}</span>
              </div>
              <span className="cecweb-event-arrow" aria-hidden="true">→</span>
            </motion.article>
          ))}
        </div>
      </section>

      <footer className="cecweb-footer" id="contact">
        <div className="cecweb-footer-grid">
          <div>
            <h4>Cebu Eastern College</h4>
            <p>A Filipino-Chinese institution in Cebu City nurturing minds, building character, and shaping leaders since 1938.</p>
          </div>
          <div>
            <h4>Quick Links</h4>
            {['About Us', 'Programs', 'Admissions', 'Announcements', 'Alumni'].map((l) => <a key={l} href="#top">{l}</a>)}
          </div>
          <div>
            <h4>Contact Information</h4>
            <p>Cebu City, Philippines<br />(032) 255-1234<br />info@cebueasterncollege.edu.ph</p>
          </div>
          <div>
            <h4>Follow Us</h4>
            <div className="cecweb-socials">
              <a href="#top" aria-label="Facebook">f</a>
              <a href="#top" aria-label="YouTube">▶</a>
              <a href="#top" aria-label="Instagram">◎</a>
            </div>
          </div>
        </div>
        <div className="cecweb-bottom">
          <span>Copyright © 2026 Cebu Eastern College. All rights reserved.</span>
          <span><a href="#top">Privacy</a> &nbsp;·&nbsp; <a href="#top">Terms</a></span>
        </div>
      </footer>
    </div>
  );
};

export default CecWebsite;
