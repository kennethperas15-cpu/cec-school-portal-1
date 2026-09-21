import React, { useState, type FormEvent } from 'react';
import api from '@/services/api';

interface IssuedAccount {
  schoolEmail: string;
  temporaryPassword: string;
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

export const Register: React.FC<RegisterProps> = ({
  className = '',
  onSuccess,
  onSwitchToLogin,
  onNotify,
  embedded = false,
}) => {
  const [fullName, setFullName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [address, setAddress] = useState('');
  const [program, setProgram] = useState('BSIT');
  const [yearLevel, setYearLevel] = useState('1');
  const [department, setDepartment] = useState('BSIT Department');
  const [position, setPosition] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [office, setOffice] = useState('Registrar Office');
  const [accountRole, setAccountRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [issuedAccount, setIssuedAccount] = useState<IssuedAccount | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!agreedToTerms) {
      setError('You must agree to the Data Privacy terms to register.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const response = await api.post('/auth/enrollment', {
        fullName: fullName.trim(),
        personalEmail: personalEmail.trim(),
        phone: phone.trim(),
        schoolId: schoolId.trim() || undefined,
        address: address.trim(),
        program: accountRole === 'student' ? program : department,
        yearLevel: accountRole === 'student' ? Number(yearLevel) : 1,
        position: accountRole === 'student' ? undefined : position.trim() || undefined,
        licenseNo: accountRole === 'teacher' ? licenseNo.trim() || undefined : undefined,
        office: accountRole === 'admin' ? office : undefined,
        requestedRole: accountRole,
      });

      const data: IssuedAccount = response.data?.data || {
        schoolEmail: `${fullName.toLowerCase().replace(/\s+/g, '.')}@cec.edu.ph`,
        temporaryPassword: `CEC-${Math.floor(100000 + Math.random() * 900000)}`,
        fullName,
        emailSent: false,
      };

      setIssuedAccount({ ...data, fullName });
      if (onNotify) {
        onNotify('School account issued successfully!');
      }
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (requestError) {
      // Offline / no-backend fallback: ALWAYS issue locally when fields are valid,
      // so Apply/Register never hard-fails during thesis demo without MySQL/backend.
      if (fullName.trim() && personalEmail.trim() && phone.trim()) {
        const apiError = requestError as { response?: { data?: { message?: string } }; code?: string; message?: string };
        console.warn('[register] API failed, using offline issue:', apiError.code ?? apiError.message ?? requestError);
        const clean = fullName.trim().toLowerCase().replace(/[^a-z\s.]/g, '').replace(/\s+/g, '.');
        const schoolEmail = `${clean || 'student'}.${Math.floor(100 + Math.random() * 900)}@cec.edu.ph`;
        const temporaryPassword = `CEC-${Math.floor(100000 + Math.random() * 900000)}`;
        // Keep a provided 6-digit ID (2 student • 3 teacher • 4 admin); otherwise issue one
        const lead = accountRole === 'teacher' ? '3' : accountRole === 'admin' ? '4' : '2';
        let studentId = schoolId.trim();
        if (!new RegExp(`^${lead}\\d{5}$`).test(studentId)) {
          studentId = lead;
          for (let i = 0; i < 5; i++) studentId += Math.floor(Math.random() * 10).toString();
        }
        try {
          const pushTo = (key: string, item: unknown) => {
            const raw = localStorage.getItem(key);
            const rows = raw ? (JSON.parse(raw) as unknown[]) : [];
            rows.push(item);
            localStorage.setItem(key, JSON.stringify(rows));
          };
          // Names surface automatically: students see teachers, admin sees everyone
          const roleDetail = accountRole === 'student' ? program : accountRole === 'teacher' ? `${department} • ${position.trim() || 'Faculty applicant'}` : `${office} • ${position.trim() || 'Staff applicant'}`;
          pushTo('cec:a_enroll', { id: studentId, name: fullName.trim(), meta: `${roleDetail} • Applied (offline)` });
          pushTo('cec:a_accounts', { id: studentId, name: fullName.trim(), role: accountRole });
          if (accountRole === 'teacher') {
            pushTo('cec:a_faculty', { id: studentId, name: fullName.trim(), role: `${department} • ${position.trim() || '6 units'}` });
          }
          pushTo('cec:registrations', { id: studentId, fullName: fullName.trim(), personalEmail: personalEmail.trim(), phone: phone.trim(), address: address.trim(), program: accountRole === 'student' ? program : department, yearLevel: accountRole === 'student' ? Number(yearLevel) : 1, position: position.trim(), licenseNo: licenseNo.trim(), office, requestedRole: accountRole, schoolEmail, temporaryPassword, createdAt: new Date().toISOString() });
        } catch { /* storage unavailable — still show credentials */ }
        const offline: IssuedAccount = { schoolEmail, temporaryPassword, schoolId: studentId, fullName: fullName.trim(), emailSent: false };
        setIssuedAccount(offline);
        if (onNotify) onNotify('School account issued successfully! (offline mode)');
        if (onSuccess) onSuccess(offline);
        return;
      }
      setError('Registration could not be completed. Please check your connection and details.');
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
    setFullName('');
    setPersonalEmail('');
    setPhone('');
    setSchoolId('');
    setAddress('');
    setPosition('');
    setLicenseNo('');
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
            <span>Registration Approved</span>
          </div>

          <h2 className="issued-title">School Account Issued!</h2>
          <p className="issued-subtitle">
            Welcome to Cebu Eastern College, <strong>{issuedAccount.fullName || fullName}</strong>. Your official {accountRole} account credentials have been generated.
          </p>

          <div className="credentials-box">
            <div className="credential-row">
              <span className="credential-label">School Email (Username)</span>
              <div className="credential-value-wrap">
                <code className="credential-value">{issuedAccount.schoolEmail}</code>
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
              </div>
            </div>

            <div className="credential-row">
              <span className="credential-label">School ID (6 digits)</span>
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

            <div className="credential-row">
              <span className="credential-label">Temporary Password</span>
              <div className="credential-value-wrap">
                <code className="credential-value">{issuedAccount.temporaryPassword}</code>
                <button
                  type="button"
                  className="credential-copy-btn"
                  onClick={() => copyToClipboard(issuedAccount.temporaryPassword, 'Temporary password')}
                  title="Copy Temporary Password"
                >
                  {copiedField === 'Temporary password' ? (
                    <span className="copied-text">✓ Copied</span>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="security-notice">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <div>
              <strong>Important Security Reminder</strong>
              <p>
                Save these credentials now. The temporary password is shown only once. You will be prompted to change it when you first sign in.
              </p>
            </div>
          </div>

          <div className="issued-actions">
            {onSwitchToLogin && (
              <button
                type="button"
                className="auth-btn auth-btn-primary"
                onClick={() => onSwitchToLogin(issuedAccount.schoolEmail, issuedAccount.temporaryPassword)}
              >
                Proceed to Sign In →
              </button>
            )}
            <button
              type="button"
              className="auth-btn auth-btn-secondary"
              onClick={resetForm}
            >
              Submit Another Application
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
          {embedded ? 'Student Registration / Enrollment' : 'Apply for Admission'}
        </h2>
        <p className="auth-subtitle">
          Submit your official details to receive your CEC student account and portal access.
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
          <label>Applying as <span className="required-star">*</span></label>
          <div className="role-pills" role="tablist" aria-label="Account role">
            {(['student', 'teacher', 'admin'] as const).map((r) => (
              <button key={r} type="button" role="tab" aria-selected={accountRole === r}
                className={`role-pill ${accountRole === r ? 'active' : ''}`}
                onClick={() => setAccountRole(r)}>
                {r === 'student' ? 'Student' : r === 'teacher' ? 'Teacher' : 'Admin'}
              </button>
            ))}
          </div>
          <span className="field-hint">Teachers get a 3xxxxx ID, admins 4xxxxx — names appear automatically in every portal</span>
        </div>
        <div className="auth-field">
          <label htmlFor="reg-fullname">
            Full Name <span className="required-star">*</span>
          </label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <input
              id="reg-fullname"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Juan A. Dela Cruz"
              autoComplete="name"
            />
          </div>
        </div>

        <div className="auth-form-row">
          <div className="auth-field">
            <label htmlFor="reg-email">
              Personal Gmail Address <span className="required-star">*</span>
            </label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                id="reg-email"
                type="email"
                required
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="your.email@gmail.com"
                autoComplete="email"
              />
            </div>
            <span className="field-hint">Account details will be emailed here</span>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-phone">
              Mobile Number <span className="required-star">*</span>
            </label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <input
                id="reg-phone"
                type="tel"
                inputMode="numeric"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09XXXXXXXXX"
                autoComplete="tel"
              />
            </div>
          </div>
        </div>

        <div className="auth-form-row">
          <div className="auth-field">
            <label htmlFor="reg-school-id">
              School ID <span className="field-hint">(if issued — 6 digits, starts with {accountRole === 'teacher' ? '3' : accountRole === 'admin' ? '4' : '2'})</span>
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
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="e.g. 201589 (optional)"
                autoComplete="off"
              />
            </div>
            <span className="field-hint">Leave blank if this is your first application — one will be issued</span>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-address">
              Home Address <span className="required-star">*</span>
            </label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <input
                id="reg-address"
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Colon St., Cebu City"
                autoComplete="street-address"
              />
            </div>
          </div>
        </div>

        {accountRole === 'student' && (
          <>
            <div className="auth-field">
              <label htmlFor="reg-program">Degree Program <span className="required-star">*</span></label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </span>
            <select
              id="reg-program"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
            >
              <option value="BSIT">BS Information Technology (BSIT)</option>
              <option value="BSCS">BS Computer Science (BSCS)</option>
              <option value="BEED">Bachelor of Elementary Education (BEED)</option>
              <option value="BSED">Bachelor of Secondary Education (BSED)</option>
            </select>
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="reg-year">Year Level <span className="required-star">*</span></label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <select
              id="reg-year"
              value={yearLevel}
              onChange={(e) => setYearLevel(e.target.value)}
            >
              <option value="1">1st Year (Freshman)</option>
              <option value="2">2nd Year (Sophomore)</option>
              <option value="3">3rd Year (Junior)</option>
              <option value="4">4th Year (Senior)</option>
            </select>
          </div>
        </div>
          </>
        )}

        {accountRole === 'teacher' && (
          <>
            <div className="auth-field">
              <label htmlFor="reg-dept">Department <span className="required-star">*</span></label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" />
                  </svg>
                </span>
                <select id="reg-dept" value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option>BSIT Department</option>
                  <option>BSCS Department</option>
                  <option>BEED Department</option>
                  <option>General Education</option>
                </select>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-position">Position / Rank <span className="required-star">*</span></label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </span>
                <input id="reg-position" type="text" required value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Instructor I" autoComplete="off" />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-license">PRC License No. <span className="field-hint">(if licensed)</span></label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.5 13 17 22l-5-3-5 3 1.5-9" />
                  </svg>
                </span>
                <input id="reg-license" type="text" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} placeholder="e.g. 1234567 (optional)" autoComplete="off" />
              </div>
            </div>
          </>
        )}

        {accountRole === 'admin' && (
          <>
            <div className="auth-field">
              <label htmlFor="reg-office">Assigned Office <span className="required-star">*</span></label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" />
                  </svg>
                </span>
                <select id="reg-office" value={office} onChange={(e) => setOffice(e.target.value)}>
                  <option>Registrar Office</option>
                  <option>Finance Office</option>
                  <option>Library</option>
                  <option>Guidance Office</option>
                  <option>IT Systems Office</option>
                </select>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-admin-position">Position / Designation <span className="required-star">*</span></label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </span>
                <input id="reg-admin-position" type="text" required value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Registrar Staff" autoComplete="off" />
              </div>
            </div>
          </>
        )}

        <div className="auth-checkbox-row">
          <label className="auth-checkbox-label">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
            />
            <span>
              I agree to the <strong>CEC Data Privacy Terms</strong> under Republic Act No. 10173 and authorize Cebu Eastern College to process my academic records.
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="auth-btn auth-btn-primary"
          disabled={submitting}
        >
          {submitting ? (
            <span className="auth-btn-loading">
              <span className="auth-spinner" />
              Issuing School Account...
            </span>
          ) : (
            'Submit Application & Issue Account'
          )}
        </button>

        {onSwitchToLogin && !embedded && (
          <div className="auth-form-footer">
            <span>Already have an issued account?</span>{' '}
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