import React, { useEffect, useState, type FormEvent } from 'react';
import api from '../../services/api';
import { portalApi, type EnrollmentReceipt } from '../../services/portal';
import { genSchoolId } from '../../services/crud';

interface EnrollmentLandingProps {
  onSwitchToLogin?: () => void;
  onNotify?: (message: string) => void;
}

const PROGRAMS = [
  'BSIT', 'BSCS', 'BEED', 'BSED',
  'SHS — STEM', 'SHS — ABM', 'SHS — HUMSS',
  'Junior High School', 'Elementary',
];

const OTC_NOTICE =
  'Payment must be settled physically at the Accounting Office before submitting this form. Enter your Official Receipt / Accounting Reference Number below.';

export const EnrollmentLanding: React.FC<EnrollmentLandingProps> = ({ onSwitchToLogin, onNotify }) => {
  const [applicantType, setApplicantType] = useState<'new' | 'returning'>('new');
  const [fullName, setFullName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [program, setProgram] = useState('BSIT');
  const [yearLevel, setYearLevel] = useState('1');
  const [schoolYear, setSchoolYear] = useState('2026–2027');
  const [semester, setSemester] = useState('1');
  const [schoolId, setSchoolId] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<EnrollmentReceipt | null>(null);

  useEffect(() => {
    let live = true;
    api.get('/portal/config/academic')
      .then((r) => {
        if (!live) return;
        if (r.data?.data?.schoolYear) setSchoolYear(String(r.data.data.schoolYear));
        const sem = String(r.data?.data?.semester ?? '1');
        setSemester(sem.includes('2') ? '2' : '1');
      })
      .catch(() => { /* offline — keep defaults */ });
    return () => { live = false; };
  }, []);

  const validate = (): string => {
    if (!/^[A-Za-z ]{2,}/.test(program.trim())) return 'Select a program / grade level.';
    const yl = Number(yearLevel);
    if (!Number.isInteger(yl) || yl < 1 || yl > 6) return 'Select a valid year / grade level.';
    if (applicantType === 'returning' && !/^2\d{6}$/.test(schoolId.trim())) {
      return 'Enter your assigned 7-digit student school ID (starts with 2).';
    }
    if (applicantType === 'new') {
      if (fullName.trim().split(/\s+/).filter(Boolean).length < 2) return 'Enter your full name (first and last).';
      if (!personalEmail.includes('@')) return 'Enter a valid email address.';
      if (!phone.trim()) return 'Enter a contact number.';
    }
    if (referenceNo.trim().length < 4) return 'Enter the Official Receipt / Accounting Reference Number from the Accounting Office.';
    return '';
  };

  const mirrorOffline = (assignedId: string) => {
    try {
      const name = applicantType === 'new' ? fullName.trim() : `Returning • ${assignedId}`;
      const rawApps = localStorage.getItem('cec:s_enroll_apps');
      const apps = rawApps ? (JSON.parse(rawApps) as { id: string; name: string; role: string }[]) : [];
      apps.push({ id: assignedId, name: `${program} • Year ${yearLevel} • ${semester === '2' ? '2nd' : '1st'} Sem`, role: 'Pending Accounting Verification' });
      localStorage.setItem('cec:s_enroll_apps', JSON.stringify(apps));
      const rawQ = localStorage.getItem('cec:a_enroll_v2');
      const queue = rawQ ? (JSON.parse(rawQ) as { id: string; name: string; meta: string }[]) : [];
      queue.push({ id: assignedId, name, meta: `${program} • Year ${yearLevel} • Ref ${referenceNo.trim()} • Applied (offline)` });
      localStorage.setItem('cec:a_enroll_v2', JSON.stringify(queue));
    } catch { /* storage optional */ }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setBusy(true);
    try {
      const data = await portalApi.enrollmentSubmit({
        applicantType,
        fullName: fullName.trim() || undefined,
        personalEmail: personalEmail.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        program: program.trim(),
        yearLevel: Number(yearLevel),
        schoolYear: schoolYear.trim() || undefined,
        semester: Number(semester),
        schoolId: applicantType === 'returning' ? schoolId.trim() : undefined,
        paymentReferenceNo: referenceNo.trim(),
      });
      setReceipt(data);
      if (onNotify) onNotify('Enrollment submitted — pending accounting verification');
    } catch (requestError) {
      const apiError = requestError as { response?: { data?: { message?: string } } };
      if (!apiError.response) {
        // Offline fallback: reserve an ID locally and queue for admin review.
        const assignedId = applicantType === 'returning' ? schoolId.trim() : genSchoolId('student');
        mirrorOffline(assignedId);
        setReceipt({
          applicationId: `offline-${Date.now()}`,
          schoolId: assignedId,
          status: 'pending',
          paymentStatus: 'PENDING_VERIFICATION',
          studentStatus: 'PROVISIONAL',
          submittedAt: new Date().toISOString(),
          summary: {
            fullName: applicantType === 'new' ? fullName.trim() : `Returning • ${assignedId}`,
            program: program.trim(),
            yearLevel: Number(yearLevel),
            schoolYear: schoolYear.trim() || null,
            semester: Number(semester),
            paymentReferenceNo: referenceNo.trim(),
          },
        });
        if (onNotify) onNotify('Enrollment queued offline — pending accounting verification');
      } else {
        setError(apiError.response?.data?.message ?? 'Enrollment could not be submitted. Please check your details.');
      }
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setReceipt(null);
    setFullName('');
    setPersonalEmail('');
    setPhone('');
    setAddress('');
    setSchoolId('');
    setReferenceNo('');
    setError('');
  };

  if (receipt) {
    const s = receipt.summary;
    return (
      <div className="auth-panel-content">
        <style>{`@media print { body * { visibility: hidden; } #cec-enroll-slip, #cec-enroll-slip * { visibility: visible; } #cec-enroll-slip { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
        <div className="account-issued-card">
          <div className="issued-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>Enrollment Submitted</span>
          </div>
          <h2 className="issued-title">Enrollment Summary</h2>
          <p className="issued-subtitle">Your application is now <strong>Pending Accounting Verification</strong>. Present this slip at the Registrar / Accounting Office for follow-up.</p>

          <div id="cec-enroll-slip" className="credentials-box">
            <div className="credential-row">
              <span className="credential-label">Assigned School ID</span>
              <div className="credential-value-wrap">
                <code className="credential-value" style={{ fontSize: 20 }}>{receipt.schoolId}</code>
              </div>
            </div>
            <div className="credential-row"><span className="credential-label">Name</span><div className="credential-value-wrap"><code className="credential-value">{s.fullName}</code></div></div>
            <div className="credential-row"><span className="credential-label">Program / Level</span><div className="credential-value-wrap"><code className="credential-value">{s.program} • Year {s.yearLevel}</code></div></div>
            <div className="credential-row"><span className="credential-label">Academic Year</span><div className="credential-value-wrap"><code className="credential-value">{s.schoolYear ?? '—'} • {s.semester === 2 ? '2nd' : '1st'} Semester</code></div></div>
            <div className="credential-row"><span className="credential-label">Accounting Reference No.</span><div className="credential-value-wrap"><code className="credential-value">{s.paymentReferenceNo}</code></div></div>
            <div className="credential-row"><span className="credential-label">Payment Status</span><div className="credential-value-wrap"><code className="credential-value">{receipt.paymentStatus.replace(/_/g, ' ')}</code></div></div>
            <div className="credential-row"><span className="credential-label">Student Status</span><div className="credential-value-wrap"><code className="credential-value">{receipt.studentStatus}</code></div></div>
            <div className="credential-row"><span className="credential-label">Submitted</span><div className="credential-value-wrap"><code className="credential-value">{new Date(receipt.submittedAt).toLocaleString()}</code></div></div>
          </div>

          <div className="issued-actions">
            <button type="button" className="auth-btn auth-btn-primary" onClick={() => window.print()}>
              Download / Print Enrollment Slip
            </button>
            <button type="button" className="auth-btn auth-btn-secondary" onClick={resetForm}>
              Submit Another Enrollment
            </button>
            {onSwitchToLogin && (
              <button type="button" className="auth-link-btn" onClick={onSwitchToLogin}>
                Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-panel-content">
      <div className="auth-heading">
        <h2 className="auth-title">Online Enrollment</h2>
        <p className="auth-subtitle">New here or coming back — complete the form below. No online payment is collected on this page.</p>
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
          <label>I am a <span className="required-star">*</span></label>
          <div className="role-pills" role="tablist" aria-label="Applicant type">
            <button type="button" role="tab" aria-selected={applicantType === 'new'}
              className={`role-pill ${applicantType === 'new' ? 'active' : ''}`}
              onClick={() => setApplicantType('new')}>
              New Student
            </button>
            <button type="button" role="tab" aria-selected={applicantType === 'returning'}
              className={`role-pill ${applicantType === 'returning' ? 'active' : ''}`}
              onClick={() => setApplicantType('returning')}>
              Returning Student
            </button>
          </div>
          <span className="field-hint">
            {applicantType === 'new'
              ? 'First enrollment at CEC? A school ID will be assigned after you submit.'
              : 'Already have a school ID? Enter it below with your new reference number.'}
          </span>
        </div>

        {applicantType === 'returning' && (
          <div className="auth-field">
            <label htmlFor="enr-school-id">School ID <span className="required-star">*</span></label>
            <div className="auth-input-wrap">
              <input
                id="enr-school-id"
                type="text"
                inputMode="numeric"
                required
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value.replace(/\D/g, '').slice(0, 7))}
                placeholder="e.g. 2414807"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        {applicantType === 'new' && (
          <>
            <div className="auth-field">
              <label htmlFor="enr-fullname">Full Name <span className="required-star">*</span></label>
              <div className="auth-input-wrap">
                <input id="enr-fullname" type="text" required value={fullName}
                  onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Juan A. Dela Cruz" autoComplete="name" />
              </div>
            </div>
            <div className="auth-form-row">
              <div className="auth-field">
                <label htmlFor="enr-email">Email Address <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <input id="enr-email" type="email" required value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)} placeholder="your.email@gmail.com" autoComplete="email" />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="enr-phone">Contact Number <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <input id="enr-phone" type="tel" inputMode="numeric" required value={phone}
                    onChange={(e) => setPhone(e.target.value)} placeholder="09XXXXXXXXX" autoComplete="tel" />
                </div>
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="enr-address">Home Address</label>
              <div className="auth-input-wrap">
                <input id="enr-address" type="text" value={address}
                  onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Colon St., Cebu City" autoComplete="street-address" />
              </div>
            </div>
          </>
        )}

        <div className="auth-form-row">
          <div className="auth-field">
            <label htmlFor="enr-program">Program / Grade Level <span className="required-star">*</span></label>
            <div className="auth-input-wrap">
              <select id="enr-program" value={program} onChange={(e) => setProgram(e.target.value)}>
                {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="enr-year">Year / Grade Level <span className="required-star">*</span></label>
            <div className="auth-input-wrap">
              <select id="enr-year" value={yearLevel} onChange={(e) => setYearLevel(e.target.value)}>
                {['1', '2', '3', '4', '5', '6'].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="auth-form-row">
          <div className="auth-field">
            <label htmlFor="enr-ay">Academic Year <span className="required-star">*</span></label>
            <div className="auth-input-wrap">
              <input id="enr-ay" type="text" required value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)} placeholder="e.g. 2026–2027" />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="enr-sem">Semester <span className="required-star">*</span></label>
            <div className="auth-input-wrap">
              <select id="enr-sem" value={semester} onChange={(e) => setSemester(e.target.value)}>
                <option value="1">1st Semester</option>
                <option value="2">2nd Semester</option>
              </select>
            </div>
          </div>
        </div>

        <div className="auth-info-box">
          <div>
            <strong>Over-the-Counter Payment</strong>
            <p>{OTC_NOTICE}</p>
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="enr-ref">Official Receipt / Accounting Reference Number <span className="required-star">*</span></label>
          <div className="auth-input-wrap">
            <input id="enr-ref" type="text" required value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)} placeholder="e.g. OR-2026-00123" autoComplete="off" />
          </div>
          <span className="field-hint">Found on the receipt issued at the Accounting Office. Online payments (GCash, Maya, cards) are not accepted in this form.</span>
        </div>

        <button type="submit" className="auth-btn auth-btn-primary" disabled={busy}>
          {busy ? (
            <span className="auth-btn-loading"><span className="auth-spinner" />Submitting Enrollment...</span>
          ) : (
            'Submit Enrollment'
          )}
        </button>

        {onSwitchToLogin && (
          <div className="auth-form-footer">
            <span>Already have portal access?</span>{' '}
            <button type="button" className="auth-link-btn" onClick={onSwitchToLogin}>
              Sign In to Portal
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default EnrollmentLanding;
