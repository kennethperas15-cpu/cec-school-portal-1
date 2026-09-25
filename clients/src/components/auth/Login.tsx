import React, { useState, useEffect, type FormEvent } from 'react';
import api from '@/services/api';

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

export const Login: React.FC<LoginProps> = ({
  className = '',
  onSuccess,
  onSwitchToRegister,
  onSwitchToForgotPassword,
  prefillIdentifier = '',
  prefillPassword = '',
  onNotify,
}) => {
  const [identifier, setIdentifier] = useState(prefillIdentifier);
  const [password, setPassword] = useState(prefillPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Single school-account sign-in: teachers and admins use the personal
  // school account issued by admin — role always comes from the server
  // (or the stored registration offline), never from a tab choice.
  const role = 'Student';

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

      const token = response.data?.data?.token ?? response.data?.data?.accessToken;
      const refreshToken = response.data?.data?.refreshToken;
      if (token) sessionStorage.setItem('cec_access_token', token);
      if (refreshToken) sessionStorage.setItem('cec_refresh_token', refreshToken);
      if (rememberMe) {
        localStorage.setItem('cec_remember_identifier', identifier.trim());
      } else {
        localStorage.removeItem('cec_remember_identifier');
      }

      if (onNotify) onNotify(`Welcome back, ${user.firstName}!`);
      if (onSuccess) onSuccess(user);
    } catch (requestError) {
      // Registration can intentionally run without the API for static demos.
      // Authenticate credentials issued by that same local registration store.
      try {
        const raw = localStorage.getItem('cec:registrations');
        const registrations = raw ? JSON.parse(raw) as {
          id?: string; fullName?: string; schoolEmail?: string; temporaryPassword?: string; requestedRole?: string;
        }[] : [];
        const registration = registrations.find((item) =>
          (item.schoolEmail ?? '').toLowerCase() === identifier.trim().toLowerCase() || item.id === identifier.trim()
        );
        if (registration && registration.temporaryPassword === password) {
          const nameParts = (registration.fullName ?? 'CEC User').trim().split(/\s+/);
          const localUser: UserAuthData = {
            firstName: nameParts[0] ?? 'CEC',
            lastName: nameParts.slice(1).join(' '),
            role: registration.requestedRole ?? role.toLowerCase(),
            id: registration.id,
            email: registration.schoolEmail,
          };
          if (onNotify) onNotify(`Welcome back, ${localUser.firstName}!`);
          if (onSuccess) onSuccess(localUser);
          return;
        }
      } catch {
        // Storage is optional; preserve the normal API error below.
      }
      const apiError = requestError as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message ?? 'Invalid credentials. Please check your school ID/email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-panel-content ${className}`}>
      <div className="auth-heading">
        <h2 className="auth-title">Sign In to CEC Portal</h2>
        <p className="auth-subtitle">
          Sign in with your school ID or school email and password.
        </p>
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
              placeholder="e.g. 7-digit school ID or school email"
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
            'Sign In'
          )}
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