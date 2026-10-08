import React, { useState, useEffect, type FormEvent } from 'react';
import api, { setTokens, isRemembered } from '../../services/api';

interface LoginPopupProps {
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
  onNotify?: (message: string) => void;
  onSwitchToRegister?: () => void;
}

export interface UserAuthData {
  firstName: string;
  lastName: string;
  role: string;
  id?: string;
  email?: string;
  program?: string;
  picture?: string;
  schoolId?: string;
}

export const LoginPopup: React.FC<LoginPopupProps> = ({
  onClose,
  onLoginSuccess,
  onNotify,
  onSwitchToRegister,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        role: 'student',
      };
      const token = response.data?.data?.token ?? response.data?.data?.accessToken;
      const refreshToken = response.data?.data?.refreshToken;
      setTokens(token, refreshToken, rememberMe);
      if (rememberMe) localStorage.setItem('cec_remember_identifier', identifier.trim());
      else localStorage.removeItem('cec_remember_identifier');
      if (onNotify) onNotify(`Welcome back, ${user.firstName}!`);
      onLoginSuccess(user);
    } catch (requestError) {
      try {
        const raw = localStorage.getItem('cec:registrations');
        const registrations = raw ? (JSON.parse(raw) as { id?: string; fullName?: string; schoolEmail?: string; temporaryPassword?: string; password?: string; requestedRole?: string }[]) : [];
        const registration = registrations.find((item) =>
          (item.schoolEmail ?? '').toLowerCase() === identifier.trim().toLowerCase() || item.id === identifier.trim()
        );
        if (registration && (registration.temporaryPassword === password || registration.password === password)) {
          const nameParts = (registration.fullName ?? 'CEC User').trim().split(/\s+/);
          const localUser: UserAuthData = {
            firstName: nameParts[0] ?? 'CEC',
            lastName: nameParts.slice(1).join(' '),
            role: registration.requestedRole ?? 'student',
            id: registration.id,
            email: registration.schoolEmail,
          };
          if (onNotify) onNotify(`Welcome back, ${localUser.firstName}!`);
          onLoginSuccess(localUser);
          return;
        }
      } catch { /* ignore */ }
      const apiError = requestError as { response?: { status?: number; data?: { message?: string } } };
      if (!apiError.response) setError('Cannot reach the portal server — wait and try again.');
      else if (apiError.response.status === 401) setError('Invalid credentials.');
      else setError(apiError.response.data?.message ?? 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-popup-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Sign in">
      <div className="login-popup-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="login-popup-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="login-popup-brand">
          <img src="/cec-school-portal-1/cec-logo.png" alt="CEC" className="login-popup-logo" />
          <span>Sign in to CEC Portal</span>
        </div>
        {error && <div className="auth-alert auth-alert-error" role="alert"><span>{error}</span></div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="popup-identifier">School ID / Email</label>
            <div className="auth-input-wrap">
              <input id="popup-identifier" type="text" required value={identifier}
                onChange={(e) => setIdentifier(e.target.value)} placeholder="e.g. 7-digit school ID or email" autoComplete="username" />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="popup-password">Password</label>
            <div className="auth-input-wrap">
              <input id="popup-password" type={showPassword ? 'text' : 'password'} required value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
              <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide' : 'Show'}>
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          <div className="auth-checkbox-row">
            <label className="auth-checkbox-label">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              <span>Remember this device</span>
            </label>
          </div>
          <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
            {loading ? <span className="auth-btn-loading"><span className="auth-spinner" />Signing in...</span> : 'Sign In'}
          </button>
          <div className="auth-form-footer">
            <span>New here?</span>{' '}
            <button type="button" className="auth-link-btn" onClick={onSwitchToRegister}>Apply / Register</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPopup;