import React, { useState, useEffect, useRef, type FormEvent } from 'react';
import api from '@/services/api';
import { ensureSchoolId } from '@/services/crud';
import { setPhoto as saveProfilePhoto, getPhoto as readProfilePhoto } from '@/services/photos';

const GOOGLE_CLIENT_ID = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_CLIENT_ID ?? '')
  // Public identifier (safe to ship): lets production builds render the Google button.
  || '955227893108-jhsaaq79ko2jck7i91mcehpp6b3na6jl.apps.googleusercontent.com';

export interface UserAuthData {
  firstName: string;
  lastName: string;
  role: string;
  id?: string;
  email?: string;
  program?: string;
  picture?: string;
}

interface LoginProps {
  className?: string;
  onSuccess?: (user: UserAuthData) => void;
  onSwitchToRegister?: () => void;
  onSwitchToForgotPassword?: () => void;
  prefillIdentifier?: string;
  prefillPassword?: string;
  onNotify?: (message: string) => void;
}

const DEMO_ACCOUNTS: Record<string, { identifier: string; password: string; name: string }> = {
  Student: { identifier: 'CEC-2024-0015', password: 'student123', name: 'Demo Student' },
  Teacher: { identifier: 'T-001', password: 'teacher123', name: 'Faculty Member' },
  Admin: { identifier: 'ADMIN', password: 'admin123', name: 'Administrator' },
};

export const Login: React.FC<LoginProps> = ({
  className = '',
  onSuccess,
  onSwitchToRegister,
  onSwitchToForgotPassword,
  prefillIdentifier = '',
  prefillPassword = '',
  onNotify,
}) => {
  const [role, setRole] = useState<'Student' | 'Teacher' | 'Admin'>('Student');
  const [identifier, setIdentifier] = useState(prefillIdentifier);
  const [password, setPassword] = useState(prefillPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const savedIdentifier = localStorage.getItem('cec_remember_identifier');
      if (savedIdentifier && !prefillIdentifier) setIdentifier(savedIdentifier);
      setRememberMe(Boolean(savedIdentifier));
    } catch {
      // Storage is optional; the form remains usable when it is unavailable.
    }
  }, [prefillIdentifier]);

  useEffect(() => {
    if (prefillIdentifier) {
      setIdentifier(prefillIdentifier);
    }
    if (prefillPassword) {
      setPassword(prefillPassword);
    }
  }, [prefillIdentifier, prefillPassword]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please provide both your ID / email and password.');
      return;
    }

    setError('');
    setLoading(true);

    // Check demo match first (role-agnostic: accept any demo ID regardless of selected tab)
    const demoEntries = Object.entries(DEMO_ACCOUNTS) as ['Student' | 'Teacher' | 'Admin', { identifier: string; password: string; name: string }][];
    const anyDemo = demoEntries.find(
      ([, d]) => identifier.trim().toUpperCase() === d.identifier.toUpperCase() && password === d.password
    );
    if (anyDemo) {
      const [demoRole] = anyDemo;
      const names =
        demoRole === 'Student'
          ? { firstName: 'Demo', lastName: 'Student' }
          : { firstName: demoRole, lastName: 'User' };
      const userData: UserAuthData = { ...names, role: demoRole.toLowerCase() };

      if (rememberMe) {
        localStorage.setItem('cec_remember_identifier', identifier.trim());
      } else {
        localStorage.removeItem('cec_remember_identifier');
      }

      setLoading(false);
      localStorage.setItem('cec_session_user', JSON.stringify(userData));
      if (onNotify) onNotify(`Welcome back, ${userData.firstName}!`);
      if (onSuccess) onSuccess(userData);
      return;
    }
    // Offline-issued accounts (Apply/Register without backend) — check localStorage first
    try {
      const raw = localStorage.getItem('cec:registrations');
      const regs = raw ? (JSON.parse(raw) as { schoolEmail?: string; temporaryPassword?: string; fullName?: string; id?: string; requestedRole?: string }[]) : [];
      const hit = regs.find(
        (r) =>
          (r.schoolEmail?.toLowerCase() === identifier.trim().toLowerCase() ||
            r.id?.toUpperCase() === identifier.trim().toUpperCase()) &&
          r.temporaryPassword === password
      );
      if (hit) {
        const parts = (hit.fullName ?? 'New Student').trim().split(/\s+/);
        const hitRole = hit.requestedRole === 'teacher' ? 'teacher' : hit.requestedRole === 'admin' ? 'admin' : 'student';
        const sid = ensureSchoolId(hit.id, hitRole);
        const offlineUser: UserAuthData = {
          firstName: parts[0] ?? 'New',
          lastName: parts.slice(1).join(' ') || (hitRole === 'student' ? 'Student' : 'User'),
          role: hitRole,
          id: sid,
          email: hit.schoolEmail,
        };
        setLoading(false);
        localStorage.setItem('cec_session_user', JSON.stringify(offlineUser));
        if (onNotify) onNotify(`Welcome back, ${offlineUser.firstName}!`);
        if (onSuccess) onSuccess(offlineUser);
        return;
      }
    } catch { /* ignore storage errors, fall through to API */ }

    try {
      const response = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });

      const user = response.data?.data?.user || {
        firstName: identifier.split('@')[0] || 'User',
        lastName: '',
        role: role.toLowerCase(),
      };

      if (response.data?.data?.token) {
        localStorage.setItem('cec_access_token', response.data.data.token);
      }
      localStorage.setItem('cec_session_user', JSON.stringify(user));

      if (rememberMe) {
        localStorage.setItem('cec_remember_identifier', identifier.trim());
      } else {
        localStorage.removeItem('cec_remember_identifier');
      }

      if (onNotify) onNotify(`Welcome back, ${user.firstName}!`);
      if (onSuccess) onSuccess(user);
    } catch (requestError) {
      const apiError = requestError as { response?: { data?: { message?: string } } };
      setError('Invalid credentials. Please check your school ID/email and password — or Apply for an account, or sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credentialResponse: { credential?: string }) => {
    const idToken = credentialResponse?.credential;
    if (!idToken) {
      setError('Google sign-in was cancelled. Please try again.');
      return;
    }
    setGoogleLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/google/id-token', { idToken });
      const user = response.data?.data?.user;
      const token = response.data?.data?.token ?? response.data?.data?.accessToken;
      if (!user) throw new Error('Google sign-in did not return an account.');
      if (token) localStorage.setItem('cec_access_token', token);
      // Same person, same school ID: if this Gmail already has a school
      // account (applied/registered), reuse its ID and role instead of the new UUID.
      let googleId = user.id as string | undefined;
      let googleRole: 'student' | 'teacher' | 'admin' = user.role === 'teacher' || user.role === 'admin' ? user.role : 'student';
      try {
        const raw = localStorage.getItem('cec:registrations');
        const regs = raw ? (JSON.parse(raw) as { id?: string; personalEmail?: string; requestedRole?: string }[]) : [];
        const match = regs.find((r) => r.personalEmail?.toLowerCase() === String(user.email ?? '').toLowerCase());
        if (match?.id) {
          googleId = match.id;
          if (match.requestedRole === 'teacher' || match.requestedRole === 'admin') googleRole = match.requestedRole;
        }
      } catch { /* ignore — fall through to UUID */ }
      googleId = ensureSchoolId(googleId, googleRole);
      // Show the Google account picture everywhere avatars appear
      // (manual uploads take precedence — only fill when empty)
      if (user.picture && googleId && !readProfilePhoto(googleId)) saveProfilePhoto(googleId, user.picture);
      if (onNotify) onNotify(`Welcome back, ${user.firstName}!`);
      if (onSuccess) onSuccess({ firstName: user.firstName, lastName: user.lastName, role: googleRole, id: googleId, email: user.email, picture: user.picture });
    } catch (err) {
      const apiError = err as { response?: { data?: unknown; status?: number } };
      const data = apiError.response?.data as { message?: string } | undefined;
      // Static hosting (GitHub Pages) has no API: 404 HTML, empty, or unreachable
      const needsServer = !apiError.response || typeof apiError.response.data === 'string' || apiError.response.status === 404;
      setError(needsServer
        ? 'Google sign-in needs the portal API server (port 4000) running — it cannot verify on the static GitHub Pages site. Use the localhost setup for the Google demo.'
        : data?.message ?? 'Google sign-in failed. The server may need GOOGLE_CLIENT_ID configured.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) return;
    let cancelled = false;
    const renderButton = () => {
      const g = (window as unknown as { google?: { accounts?: { id?: { initialize: (o: object) => void; renderButton: (el: HTMLElement, o: object) => void } } } }).google;
      if (!g?.accounts?.id || !googleButtonRef.current || cancelled) return false;
      g.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential, auto_select: false });
      googleButtonRef.current.innerHTML = '';
      g.accounts.id.renderButton(googleButtonRef.current, { theme: 'outline', size: 'large', width: 300, text: 'signin_with' });
      return true;
    };
    if (renderButton()) return () => { cancelled = true; };
    const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') ?? (() => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
      return s;
    })();
    script.addEventListener('load', renderButton, { once: true });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [GOOGLE_CLIENT_ID]);

  const handleGoogleLogin = async () => {
    // No Google Client ID configured → fall back to server OAuth URL flow (shows setup error gracefully)
    if (!GOOGLE_CLIENT_ID) {
      setGoogleLoading(true);
      setError('');
      try {
        const response = await api.post('/auth/google/login-url');
        if (response.data?.url) {
          window.location.assign(response.data.url);
        } else {
          setError('Google Login service is currently unavailable.');
        }
      } catch (err) {
        const apiError = err as { response?: { data?: { message?: string } } };
        setError(apiError.response?.data?.message ?? 'Google Login needs the portal API server (port 4000) running — unavailable on the static site.');
      } finally {
        setGoogleLoading(false);
      }
      return;
    }
    // GIS button is rendered below; this fallback triggers One Tap prompt
    const g = (window as unknown as { google?: { accounts?: { id?: { prompt: () => void } } } }).google;
    if (g?.accounts?.id) g.accounts.id.prompt();
    else setError('Google script is still loading. Please wait a moment and try again.');
  };

  return (
    <div className={`auth-panel-content ${className}`}>
      <div className="auth-heading">
        <h2 className="auth-title">Sign In to CEC Portal</h2>
        <p className="auth-subtitle">
          Access your grades, enrollment records, class schedules, and institutional services.
        </p>
      </div>

      {/* Role Tabs */}
      <div className="role-pills" role="tablist" aria-label="Sign-in role">
        {(['Student', 'Teacher', 'Admin'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={role === item}
            className={`role-pill ${role === item ? 'active' : ''}`}
            onClick={() => {
              setRole(item);
              setError('');
            }}
          >
            {item === 'Student' && (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            )}
            {item === 'Teacher' && (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            )}
            {item === 'Admin' && (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            )}
            <span>{item === 'Teacher' ? 'Faculty' : item}</span>
          </button>
        ))}
      </div>

      {/* Quick Demo Autofill removed — sign in with an issued school account or Google. */}

      {error && (
        <div className="auth-alert auth-alert-error" role="alert">
          <svg className="auth-alert-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        {/* Identifier Field */}
        <div className="auth-field">
          <label htmlFor="login-identifier">
            School ID / Email Address
          </label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <input
              id="login-identifier"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={
                role === 'Student'
                  ? 'e.g. CEC-2024-0015 or student@cec.edu.ph'
                  : role === 'Teacher'
                  ? 'e.g. T-001 or faculty@cec.edu.ph'
                  : 'e.g. ADMIN or admin@cec.edu.ph'
              }
              autoComplete="username"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="auth-field">
          <div className="auth-field-header">
            <label htmlFor="login-password">Password</label>
            {onSwitchToForgotPassword && (
              <button
                type="button"
                className="auth-text-link"
                onClick={onSwitchToForgotPassword}
              >
                Forgot Password?
              </button>
            )}
          </div>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="auth-checkbox-row">
          <label className="auth-checkbox-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember this device</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="auth-btn auth-btn-primary"
          disabled={loading}
        >
          {loading ? (
            <span className="auth-btn-loading">
              <span className="auth-spinner" />
              Authenticating...
            </span>
          ) : (
            `Sign In as ${role}`
          )}
        </button>

        {/* Google SSO Divider & Button */}
        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        {GOOGLE_CLIENT_ID ? (
          <div style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
            <div ref={googleButtonRef} aria-label="Sign in with Google" style={{ minHeight: 40 }} />
            {googleLoading && <span style={{ fontSize: 12, color: '#64748B' }}>Verifying Google account...</span>}
          </div>
        ) : (
          <button
            type="button"
            className="auth-btn auth-btn-google"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            title="Admin setup required: VITE_GOOGLE_CLIENT_ID"
          >
          <svg className="google-icon" width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>{googleLoading ? 'Connecting...' : 'Sign in with Google Account'}</span>
        </button>
        )}
        {!GOOGLE_CLIENT_ID && (
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
            Google button activates after admin adds <code>VITE_GOOGLE_CLIENT_ID</code> — see <code>docs/Google_Login_Setup.md</code>
          </p>
        )}

        {/* Footer switch to Register */}
        {onSwitchToRegister && (
          <div className="auth-form-footer">
            <span>New student at CEC?</span>{' '}
            <button
              type="button"
              className="auth-link-btn"
              onClick={onSwitchToRegister}
            >
              Apply / Register Here →
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Login;