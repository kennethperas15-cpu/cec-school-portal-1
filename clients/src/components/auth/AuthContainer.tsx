import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Login, type UserAuthData } from './Login';
import './Login.css';

const Register = lazy(() => import('./Register').then(({ Register: component }) => ({ default: component })));
const ForgotPassword = lazy(() => import('./ForgotPassword').then(({ ForgotPassword: component }) => ({ default: component })));

interface AuthContainerProps {
  onLoginSuccess: (user: UserAuthData) => void;
  onNotify?: (message: string) => void;
  initialTab?: 'login' | 'register' | 'forgot';
}

const campusSlides = [
  {
    src: '/cec-campus-collage.png',
    title: 'Modern Learning Facilities',
    subtitle: 'Equipped with contemporary tech labs, collaborative spaces, and modern classrooms.',
  },
  {
    src: '/cec-campus-group.png',
    title: 'Distinguished Faculty & Mentors',
    subtitle: 'Dedicated academic mentors inspiring excellence, character, and lifelong leadership.',
  },
  {
    src: '/cec-campus-front.png',
    title: 'Heritage of Excellence',
    subtitle: 'Serving students with pride, cultural heritage, and high standards of learning.',
  },
];

export const AuthContainer: React.FC<AuthContainerProps> = ({
  onLoginSuccess,
  onNotify,
  initialTab = 'login',
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>(initialTab);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [prefilledIdentifier, setPrefilledIdentifier] = useState('');
  const [prefilledPassword, setPrefilledPassword] = useState('');
  const activeSlide = campusSlides[currentSlide];

  // Auto-advance campus slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % campusSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleRegistrationComplete = (email?: string, password?: string) => {
    if (email) setPrefilledIdentifier(email);
    if (password) setPrefilledPassword(password);
    setActiveTab('login');
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        {/* Left Hero Column */}
        <aside className="auth-hero">
          <div className="auth-hero-header">
            <div className="auth-hero-brand">
              <img
                className="auth-hero-logo"
                src="/cec-logo.png"
                alt="Cebu Eastern College Official Crest"
                width="96"
                height="96"
                decoding="async"
              />
              <div>
                <span className="auth-hero-est">ESTABLISHED 1915</span>
                <h1 className="auth-hero-school">Cebu Eastern College</h1>
              </div>
            </div>
            <p className="auth-hero-tagline">
              Official Academic & Student Services Portal
            </p>
          </div>

          {/* Slideshow Showcase */}
          <div className="auth-slideshow" aria-label="Campus photography gallery">
            <div className="auth-slide-window">
              <div
                key={activeSlide.src}
                className="auth-slide-item active"
              >
                <img
                  src={activeSlide.src}
                  alt={activeSlide.title}
                  className="auth-slide-img"
                  width="1200"
                  height="675"
                  loading="eager"
                    decoding="async"
                />
                <div className="auth-slide-caption">
                  <span className="auth-slide-badge">Campus Life</span>
                  <h3>{activeSlide.title}</h3>
                  <p>{activeSlide.subtitle}</p>
                </div>
              </div>
            </div>

            {/* Slideshow Controls */}
            <div className="auth-slide-nav">
              <div className="auth-slide-dots">
                {campusSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`auth-dot ${idx === currentSlide ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Institutional Highlights */}
          <div className="auth-features">
            <div className="auth-feature-chip">
              <span className="chip-icon">🎓</span>
              <span>Online Enrollment</span>
            </div>
            <div className="auth-feature-chip">
              <span className="chip-icon">📊</span>
              <span>Real-Time Grades</span>
            </div>
            <div className="auth-feature-chip">
              <span className="chip-icon">🔒</span>
              <span>Secure Single Sign-On</span>
            </div>
            <div className="auth-feature-chip">
              <span className="chip-icon">📚</span>
              <span>Digital Library</span>
            </div>
          </div>

          <div className="auth-hero-footer">
            <span>Virtue • Knowledge • Service</span>
            <div className="auth-status-indicator">
              <span className="status-indicator-dot" />
              <span>Portal Systems Operational</span>
            </div>
          </div>
        </aside>

        {/* Right Form Column */}
        <section className="auth-form-column">
          {/* Modern Tab Bar */}
          <div className="auth-tabs" role="tablist" aria-label="Authentication modes">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'login'}
              className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span>Sign In</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'register'}
              className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              <span>Apply / Register</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'forgot'}
              className={`auth-tab ${activeTab === 'forgot' ? 'active' : ''}`}
              onClick={() => setActiveTab('forgot')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Recovery</span>
            </button>
          </div>

          {/* Active View */}
          <div className="auth-tab-body">
            <Suspense fallback={<div className="auth-loading">Loading...</div>}>
              {activeTab === 'login' && (
                <Login
                  onSuccess={onLoginSuccess}
                  onSwitchToRegister={() => setActiveTab('register')}
                  onSwitchToForgotPassword={() => setActiveTab('forgot')}
                  prefillIdentifier={prefilledIdentifier}
                  prefillPassword={prefilledPassword}
                  onNotify={onNotify}
                />
              )}

              {activeTab === 'register' && (
                <Register
                  onSwitchToLogin={(email, pass) => handleRegistrationComplete(email, pass)}
                  onNotify={onNotify}
                />
              )}

              {activeTab === 'forgot' && (
                <ForgotPassword
                  onSwitchToLogin={() => setActiveTab('login')}
                  onNotify={onNotify}
                />
              )}
            </Suspense>
          </div>

          <div className="auth-column-footer">
            <p>
              Need assistance?{' '}
              <a href="mailto:support@cec.edu.ph">Contact CEC Helpdesk</a> •{' '}
              <a href="tel:+63322551234">(032) 255-1234</a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default AuthContainer;
