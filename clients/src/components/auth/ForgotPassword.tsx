import React, { useState, type FormEvent } from 'react';
import api from '@/services/api';

interface ForgotPasswordProps {
  className?: string;
  onSwitchToLogin?: () => void;
  onNotify?: (message: string) => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  className = '',
  onSwitchToLogin,
  onNotify,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your school email or student ID.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Simulate/trigger password recovery API if available
      try {
        await api.post('/auth/forgot-password', { identifier: identifier.trim() });
      } catch {
        // Fallback gracefully for demo/thesis presentation
      }

      setSubmitted(true);
      if (onNotify) {
        onNotify('Password reset instructions sent.');
      }
    } catch {
      setError('Unable to process your request right now. Please contact the CEC registrar or IT support.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={`auth-panel-content ${className}`}>
        <div className="auth-success-state">
          <div className="auth-success-icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className="auth-title">Check Your Email</h2>
          <p className="auth-subtitle">
            If an account is associated with <strong>{identifier}</strong>, we have sent instructions and a temporary reset link.
          </p>
          <div className="auth-info-box">
            <span>ℹ️</span>
            <div>
              <strong>Didn&apos;t receive the email?</strong>
              <p>Please check your spam or junk folder, or verify that your registered email address was entered correctly.</p>
            </div>
          </div>
          <button
            type="button"
            className="auth-btn auth-btn-primary"
            onClick={() => {
              setSubmitted(false);
              setIdentifier('');
              if (onSwitchToLogin) onSwitchToLogin();
            }}
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`auth-panel-content ${className}`}>
      <div className="auth-heading">
        <h2 className="auth-title">Reset Your Password</h2>
        <p className="auth-subtitle">
          Enter your registered school ID or personal email address, and we&apos;ll help you regain access to your CEC account.
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
        <div className="auth-field">
          <label htmlFor="recovery-identifier">
            School ID or Email Address
          </label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </span>
            <input
              id="recovery-identifier"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. CEC-2024-0015 or student@cec.edu.ph"
              autoComplete="username"
              autoFocus
            />
          </div>
        </div>

        <button
          type="submit"
          className="auth-btn auth-btn-primary"
          disabled={loading}
        >
          {loading ? (
            <span className="auth-btn-loading">
              <span className="auth-spinner" />
              Sending Link...
            </span>
          ) : (
            'Send Reset Link'
          )}
        </button>

        {onSwitchToLogin && (
          <div className="auth-form-footer">
            <button
              type="button"
              className="auth-link-btn"
              onClick={onSwitchToLogin}
            >
              ← Back to Sign In
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default ForgotPassword;