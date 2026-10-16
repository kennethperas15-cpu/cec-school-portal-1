import React, { useEffect, useState, type FormEvent } from 'react';
import { X, User, Lock, Mail } from 'lucide-react';
import api, { describeApiError, setTokens } from '../../services/api';
import type { UserAuthData } from '../auth/Login';
import { EnrollmentLanding } from '../enrollment/EnrollmentLanding';
import './AuthModal.css';

const BASE = import.meta.env.BASE_URL || '/';

type Tab = 'signin' | 'recovery' | 'enroll';

interface AuthModalProps {
  initialTab?: Tab;
  onLoginSuccess: (user: UserAuthData) => void;
  onNotify?: (message: string) => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialTab = 'signin', onLoginSuccess, onNotify, onClose }) => {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [identifier, setIdentifier] = useState('');
  const [gmail, setGmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);

  // Wake the API while the student is still typing. It sleeps after ~15 minutes
  // idle, so without this the first submit of the day arrives at a server that
  // is still booting and fails.
  useEffect(() => {
    api.get('/portal/health').catch(() => { /* the sign-in retry covers a cold server */ });
  }, []);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please provide both your ID / email and password.');
      return;
    }
    setError('');
    setLoading(true);
    const credentials = { identifier: identifier.trim(), password };
    try {
      let response;
      try {
        response = await api.post('/auth/login', credentials, { timeout: 20000 });
      } catch (firstError) {
        // A broken connection is how a sleeping server answers: it cannot reply
        // until it has booted. Retry once and give that attempt the full
        // cold-start budget, rather than reporting a failure the student can
        // do nothing about.
        if ((firstError as { response?: unknown }).response) throw firstError;
        setError('Waking the portal server — the first sign-in of the day can take up to a minute.');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        response = await api.post('/auth/login', credentials, { timeout: 90000 });
      }
      const user = response.data?.data?.user;
      if (!user) throw new Error('Unexpected server response');
      const token = response.data?.data?.token ?? response.data?.data?.accessToken;
      const refreshToken = response.data?.data?.refreshToken;
      setTokens(token, refreshToken, rememberMe);
      if (rememberMe) {
        try { localStorage.setItem('cec_remember_identifier', identifier.trim()); } catch { /* ignore */ }
      } else {
        try { localStorage.removeItem('cec_remember_identifier'); } catch { /* ignore */ }
      }
      if (onNotify) onNotify(`Welcome back, ${user.firstName ?? 'CECian'}!`);
      onLoginSuccess(user);
    } catch (requestError) {
      setError(describeApiError(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your school ID.');
      return;
    }
    if (!gmail.includes('@')) {
      setError('Please enter your Gmail address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      try {
        await api.post('/auth/forgot-password', { identifier: identifier.trim(), email: gmail.trim() });
      } catch { /* offline-safe: still confirm below */ }
      setRecoverySent(true);
      if (onNotify) onNotify('Password reset instructions sent.');
    } catch {
      setError('Unable to process your request right now. Please contact the registrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authm-veil" onClick={onClose}>
      <div className="authm-panel" role="dialog" aria-modal="true" aria-label="Authentication" onClick={(e) => e.stopPropagation()}>
        <div className="authm-ad">
          <video className="authm-ad-film" autoPlay muted loop playsInline aria-hidden="true">
            <source src={`${BASE}cec-school-ad.mp4`} type="video/mp4" />
          </video>
          <div className="authm-ad-veil" aria-hidden="true" />
          <div className="relative z-10">
            <span className="authm-ad-badge">Campus Ad</span>
          </div>
          <div className="relative z-10">
            <h3>Welcome to CEC Portal</h3>
            <p>Excellence and Quality Education for Every Learner.</p>
          </div>
        </div>

        <div className="authm-form">
          <button type="button" onClick={onClose} className="authm-close" aria-label="Close">
            <X className="h-5 w-5" />
          </button>

          <div>
            <div className="authm-tabs" role="tablist" aria-label="Authentication modes">
              {([['signin', 'Sign In'], ['recovery', 'Recovery'], ['enroll', 'Enroll Now']] as const).map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => { setTab(t); setError(''); }}
                  className={`authm-tab${tab === t ? ' authm-tab-active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'signin' && (
              <div>
                <div>
                  <h2 className="authm-title">Sign In to CEC Portal</h2>
                  <p className="authm-sub">Sign in with your 7-digit student ID or your CEC email (firstname.lastname.id@cec.edu.ph).</p>
                </div>
                <form onSubmit={handleSignIn}>
                  <div className="authm-field">
                    <label className="authm-label" htmlFor="authm-identifier">School ID / Email Address</label>
                    <div className="authm-input-wrap">
                      <User className="authm-icon" />
                      <input
                        id="authm-identifier"
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="2212779 or juan.delacruz.307588@cec.edu.ph"
                        autoComplete="username"
                        className="authm-input"
                      />
                    </div>
                  </div>
                  <div className="authm-field">
                    <div className="authm-row-between">
                      <label className="authm-label" htmlFor="authm-password" style={{ marginBottom: 0 }}>Password</label>
                      <button type="button" onClick={() => setTab('recovery')} className="authm-link">Forgot Password?</button>
                    </div>
                    <div className="authm-input-wrap">
                      <Lock className="authm-icon" />
                      <input
                        id="authm-password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        autoComplete="current-password"
                        className="authm-input"
                      />
                    </div>
                  </div>
                  <div className="authm-checkrow">
                    <input type="checkbox" id="authm-remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                    <label htmlFor="authm-remember">Remember this device</label>
                  </div>
                  {error && <div className="authm-error" role="alert">{error}</div>}
                  <button type="submit" disabled={loading} className="authm-primary">
                    {loading ? 'Signing In…' : 'Sign In'}
                  </button>
                  <div className="authm-notice">
                    <span className="font-bold" style={{ fontWeight: 800 }}>Newly Enrolled?</span> After completing onsite or online enrollment, your official Student ID and Portal Password will be automatically sent to your registered email address.
                  </div>
                </form>
              </div>
            )}

            {tab === 'recovery' && (
              <div>
                <div>
                  <h2 className="authm-title">Password Recovery</h2>
                  <p className="authm-sub">Enter your 7-digit school ID or your CEC email plus your Gmail — instructions are emailed directly there.</p>
                </div>
                {recoverySent ? (
                  <div className="authm-success" role="status">
                    <Mail className="h-5 w-5" style={{ flexShrink: 0 }} />
                    <span>If the details match our records, instructions were emailed to <strong>{gmail.trim()}</strong>. Check inbox and spam.</span>
                  </div>
                ) : (
                  <form onSubmit={handleRecovery}>
                    <div className="authm-field">
                      <label className="authm-label" htmlFor="authm-rec-id">School ID / CEC email</label>
                      <div className="authm-input-wrap">
                        <User className="authm-icon" />
                        <input
                          id="authm-rec-id"
                          type="text"
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value.replace(/[^A-Za-z0-9@._-]/g, '').slice(0, 64))}
                          placeholder="e.g. 2414807 or juan.delacruz.307588@cec.edu.ph"
                          autoComplete="username"
                          className="authm-input"
                        />
                      </div>
                    </div>
                    <div className="authm-field">
                      <label className="authm-label" htmlFor="authm-rec-gmail">Gmail Address</label>
                      <div className="authm-input-wrap">
                        <Mail className="authm-icon" />
                        <input
                          id="authm-rec-gmail"
                          type="email"
                          required
                          value={gmail}
                          onChange={(e) => setGmail(e.target.value)}
                          placeholder="your.email@gmail.com"
                          autoComplete="email"
                          className="authm-input"
                        />
                      </div>
                    </div>
                    {error && <div className="authm-error" role="alert">{error}</div>}
                    <button type="submit" disabled={loading} className="authm-primary">
                      {loading ? 'Sending…' : 'Send Reset Link'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {tab === 'enroll' && (
              <div className="authm-enroll">
                <EnrollmentLanding onSwitchToLogin={() => setTab('signin')} onNotify={onNotify} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
