import React, { useState, type FormEvent } from 'react';
import api from '@/services/api';

// Public registration is STUDENT-ONLY. Staff (teacher/admin) accounts are
// provisioned by an administrator through the internal staff endpoint —
// there is intentionally no role picker on this page.
const ACCOUNT_ROLE = 'student' as const;

type EducationLevel = 'college' | 'shs' | 'hs' | 'elementary';

const EDUCATION_LEVELS: { value: EducationLevel; label: string; hint: string }[] = [
  { value: 'college', label: 'College', hint: 'Tertiary / degree programs' },
  { value: 'shs', label: 'Senior High School', hint: 'Grades 11–12' },
  { value: 'hs', label: 'High School', hint: 'Junior high • Grades 7–10' },
  { value: 'elementary', label: 'Elementary', hint: 'Grades 1–6' },
];

interface IssuedAccount {
  schoolEmail: string;
  schoolId?: string;
  fullName?: string;
  emailSent?: boolean;
}

interface RegisterProps {
  className?: string;
  onSuccess?: (account: IssuedAccount) => void;
  onSwitchToLogin?: (prefillEmail?: string, prefillPassword?: string) => void;
  onNotify?: (message: string) => void;
  embedded?: boolean;
}

const validate = (schoolId: string, password: string, confirmPassword: string): string => {
  if (!/^2\d{6}$/.test(schoolId.trim())) {
    return 'Enter your assigned 7-digit student school ID (starts with 2). No ID yet? Please contact the registrar.';
  }
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return '';
};

export const Register: React.FC<RegisterProps> = ({
  className = '',
  onSuccess,
  onSwitchToLogin,
  onNotify,
  embedded = false,
}) => {
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('college');
  const [schoolId, setSchoolId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [issuedAccount, setIssuedAccount] = useState<IssuedAccount | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate(schoolId, password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const response = await api.post('/auth/register', {
        schoolId: schoolId.trim(),
        password,
        educationLevel,
        // Hardcoded student role — the server enforces this independently.
        requestedRole: ACCOUNT_ROLE,
      });
      const data: IssuedAccount = {
        schoolEmail: response.data?.data?.schoolEmail,
        schoolId: response.data?.data?.schoolId ?? schoolId.trim(),
        fullName: response.data?.data?.fullName,
        emailSent: response.data?.data?.emailSent ?? false,
      };
      setIssuedAccount(data);
      if (onNotify) onNotify('Student account activated — sign in with your school ID!');
      if (onSuccess) onSuccess(data);
    } catch (requestError) {
      // Offline / no-backend fallback: activate against a locally provisioned
      // school record so registration never hard-fails during demos.
      const apiError = requestError as { response?: { data?: { message?: string } } };
      if (!apiError.response) {
        try {
          const findLocal = (key: string) => {
            const raw = localStorage.getItem(key);
            const rows = raw ? (JSON.parse(raw) as { id?: string; name?: string; fullName?: string; schoolEmail?: string }[]) : [];
            return rows.find((r) => r.id === schoolId.trim());
          };
          const hit = findLocal('cec:registrations') ?? findLocal('cec:a_accounts_v2') ?? findLocal('cec:a_enroll_v2');
          if (hit) {
            const raw = localStorage.getItem('cec:registrations');
            const regs = raw ? (JSON.parse(raw) as Record<string, unknown>[]) : [];
            const existing = regs.find((r) => (r as { id?: string }).id === schoolId.trim());
            if (existing) {
              (existing as Record<string, unknown>).password = password;
              (existing as Record<string, unknown>).temporaryPassword = password;
            } else {
              regs.push({ id: schoolId.trim(), fullName: (hit.fullName ?? hit.name ?? '').trim(), schoolEmail: hit.schoolEmail ?? '', password, temporaryPassword: password, requestedRole: ACCOUNT_ROLE, educationLevel, createdAt: new Date().toISOString() });
            }
            localStorage.setItem('cec:registrations', JSON.stringify(regs));
            const data: IssuedAccount = { schoolEmail: hit.schoolEmail ?? '', schoolId: schoolId.trim(), fullName: hit.fullName ?? hit.name, emailSent: false };
            setIssuedAccount(data);
            if (onNotify) onNotify('Student account activated (offline mode)!');
            if (onSuccess) onSuccess(data);
            return;
          }
        } catch { /* fall through to error */ }
        setError('No school record found for that ID on this device (offline mode). Connect to the network or ask the registrar to issue your school ID.');
      } else {
        setError(apiError.response?.data?.message ?? 'Registration could not be completed. Please check your details.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    if (onNotify) {
      onNotify(`${label} copied to clipboard`);
    }
    setTimeout(() => setCopiedField(null), 2500);
  };

  const resetForm = () => {
    setIssuedAccount(null);
    setEducationLevel('college');
    setSchoolId('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  if (issuedAccount) {
    return (
      <div className={`auth-panel-content ${className}`}>
        <div className="account-issued-card">
          <div className="issued-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>Registration Successful</span>
          </div>

          <h2 className="issued-title">Student Account Activated!</h2>
          <p className="issued-subtitle">
            Welcome to Cebu Eastern College{issuedAccount.fullName ? <strong>, {issuedAccount.fullName}</strong> : ''}. Your student account is ready — sign in with your school ID and the password you just created.
          </p>

          <div className="credentials-box">
            <div className="credential-row">
              <span className="credential-label">School Email (Username)</span>
              <div className="credential-value-wrap">
                <code className="credential-value">{issuedAccount.schoolEmail || '—'}</code>
                {issuedAccount.schoolEmail && (
                  <button
                    type="button"
                    className="credential-copy-btn"
                    onClick={() => copyToClipboard(issuedAccount.schoolEmail, 'School email')}
                    title="Copy School Email"
                  >
                    {copiedField === 'School email' ? (
                      <span className="copied-text">✓ Copied</span>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="credential-row">
              <span className="credential-label">School ID (7 digits)</span>
              <div className="credential-value-wrap">
                <code className="credential-value">{issuedAccount.schoolId ?? '—'}</code>
                {issuedAccount.schoolId && (
                  <button
                    type="button"
                    className="credential-copy-btn"
                    onClick={() => copyToClipboard(issuedAccount.schoolId as string, 'School ID')}
                    title="Copy School ID"
                  >
                    {copiedField === 'School ID' ? (
                      <span className="copied-text">✓ Copied</span>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="security-notice">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <div>
              <strong>Account Security</strong>
              <p>
                Your password was set by you during registration. Never share it with anyone — CEC staff will never ask for it.
              </p>
            </div>
          </div>

          <div className="issued-actions">
            {onSwitchToLogin && (
              <button
                type="button"
                className="auth-btn auth-btn-primary"
                onClick={() => onSwitchToLogin(issuedAccount.schoolEmail || issuedAccount.schoolId, password)}
              >
                Proceed to Sign In →
              </button>
            )}
            <button
              type="button"
              className="auth-btn auth-btn-secondary"
              onClick={resetForm}
            >
              Register Another Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`auth-panel-content ${className}`}>
      <div className="auth-heading">
        <h2 className="auth-title">
          {embedded ? 'Student Registration' : 'Student Registration'}
        </h2>
        <p className="auth-subtitle">
          Use the school ID issued by the registrar to activate your student portal account.
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
          <label>Education Level <span className="required-star">*</span></label>
          <div className="role-pills" role="tablist" aria-label="Education level">
            {EDUCATION_LEVELS.map((level) => (
              <button key={level.value} type="button" role="tab" aria-selected={educationLevel === level.value}
                className={`role-pill ${educationLevel === level.value ? 'active' : ''}`}
                onClick={() => setEducationLevel(level.value)}
                title={level.hint}>
                {level.label}
              </button>
            ))}
          </div>
          <span className="field-hint">{EDUCATION_LEVELS.find((l) => l.value === educationLevel)?.hint}</span>
        </div>

        <div className="auth-field">
          <label htmlFor="reg-school-id">
            School ID <span className="required-star">*</span>
          </label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
                <line x1="8" y1="9" x2="16" y2="9" />
                <line x1="8" y1="13" x2="13" y2="13" />
              </svg>
            </span>
            <input
              id="reg-school-id"
              type="text"
              inputMode="numeric"
              required
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value.replace(/\D/g, '').slice(0, 7))}
              placeholder="e.g. 2414807"
              autoComplete="off"
            />
          </div>
          <span className="field-hint">7-digit student ID issued by the registrar (starts with 2)</span>
        </div>

        <div className="auth-form-row">
          <div className="auth-field">
            <label htmlFor="reg-password">
              Password <span className="required-star">*</span>
            </label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-confirm-password">
              Confirm Password <span className="required-star">*</span>
            </label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="reg-confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="auth-btn auth-btn-primary"
          disabled={submitting}
        >
          {submitting ? (
            <span className="auth-btn-loading">
              <span className="auth-spinner" />
              Activating Account...
            </span>
          ) : (
            'Register & Activate Account'
          )}
        </button>

        {onSwitchToLogin && !embedded && (
          <div className="auth-form-footer">
            <span>Already have an active account?</span>{' '}
            <button
              type="button"
              className="auth-link-btn"
              onClick={() => onSwitchToLogin()}
            >
              Sign In to Portal
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Register;
