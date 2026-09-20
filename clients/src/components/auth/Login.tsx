import React, { useState, useEffect, type FormEvent } from 'react';
import api from '@/services/api';

export interface UserAuthData {
  firstName: string;
  lastName: string;
  role: string;
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
    if (prefillIdentifier) {
      setIdentifier(prefillIdentifier);
    }
    if (prefillPassword) {
      setPassword(prefillPassword);
    }
  }, [prefillIdentifier, prefillPassword]);

  const handleDemoFill = (selectedRole: 'Student' | 'Teacher' | 'Admin') => {
    setRole(selectedRole);
    setIdentifier(DEMO_ACCOUNTS[selectedRole].identifier);
    setPassword(DEMO_ACCOUNTS[selectedRole].password);
    setError('');
    if (onNotify) {
      onNotify(`Filled demo credentials for ${selectedRole}`);
    }
  };

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
      if (onNotify) onNotify(`Welcome back, ${userData.firstName}!`);
      if (onSuccess) onSuccess(userData);
      return;
    }
    const demo = DEMO_ACCOUNTS[role];

    // Offline-issued accounts (Apply/Register without backend) — check localStorage first
    try {
      const raw = localStorage.getItem('cec:registrations');
      const regs = raw ? (JSON.parse(raw) as { schoolEmail?: string; temporaryPassword?: string; fullName?: string; id?: string }[]) : [];
      const hit = regs.find(
        (r) =>
          (r.schoolEmail?.toLowerCase() === identifier.trim().toLowerCase() ||
            r.id?.toUpperCase() === identifier.trim().toUpperCase()) &&
          r.temporaryPassword === password
      );
      if (hit) {
        const parts = (hit.fullName ?? 'New Student').trim().split(/\s+/);
        const offlineUser: UserAuthData = {
          firstName: parts[0] ?? 'New',
          lastName: parts.slice(1).join(' ') || 'Student',
          role: 'student',
        };
        setLoading(false);
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

      if (rememberMe) {
        localStorage.setItem('cec_remember_identifier', identifier.trim());
      } else {
        localStorage.removeItem('cec_remember_identifier');
      }

      if (onNotify) onNotify(`Welcome back, ${user.firstName}!`);
      if (onSuccess) onSuccess(user);
    } catch (requestError) {
      const apiError = requestError as { response?: { data?: { message?: string } } };
      setError(
        apiError.response?.data?.message ??
          `Invalid credentials. Quick test with Demo ${role}: ID "${demo?.identifier}" and Password "${demo?.password}".`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
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
      setError(apiError.response?.data?.message ?? 'Google Login is not configured on this server.');
    } finally {
      setGoogleLoading(false);
    }
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

      {/* Quick Demo Autofill Bar */}
      <div className="demo-chips-bar">
        <span className="demo-label">Quick Demo Fill:</span>
        <button
          type="button"
          className="demo-chip"
          onClick={() => handleDemoFill('Student')}
          title="Fill Student Demo Account"
        >
          Student
        </button>
        <button
          type="button"
          className="demo-chip"
          onClick={() => handleDemoFill('Teacher')}
          title="Fill Faculty Demo Account"
        >
          Faculty
        </button>
        <button
          type="button"
          className="demo-chip"
          onClick={() => handleDemoFill('Admin')}
          title="Fill Admin Demo Account"
        >
          Admin
        </button>
      </div>

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

        <button
          type="button"
          className="auth-btn auth-btn-google"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
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