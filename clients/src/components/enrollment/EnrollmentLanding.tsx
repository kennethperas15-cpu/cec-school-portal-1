import React, { useEffect, useState, type FormEvent } from 'react';
import api from '../../services/api';
import { portalApi, type EnrollmentReceipt } from '../../services/portal';
import { SchedulePicker, type ScheduleSlot } from './SchedulePicker';
import { genSchoolId } from '../../services/crud';

interface EnrollmentLandingProps {
  onSwitchToLogin?: () => void;
  onNotify?: (message: string) => void;
}

/**
 * Levels that follow from the chosen program. A college course offers its four
 * years; basic education offers its grades. `value` is the level within the
 * program (the range the API stores), `label` is the year or grade the
 * applicant recognises — Grade 11 is the first level of Senior High, and so on.
 */
type ProgramLevel = { value: string; label: string };

const years = (count: number): ProgramLevel[] =>
  Array.from({ length: count }, (_, index) => ({ value: String(index + 1), label: `Year ${index + 1}` }));

const grades = (from: number, to: number): ProgramLevel[] =>
  Array.from({ length: to - from + 1 }, (_, index) => ({ value: String(index + 1), label: `Grade ${from + index}` }));

type EnrollmentProgram = { name: string; levels: ProgramLevel[] };

const PROGRAMS: EnrollmentProgram[] = [
  { name: 'BSIT', levels: years(4) },
  { name: 'BSCS', levels: years(4) },
  { name: 'BEED', levels: years(4) },
  { name: 'BSED', levels: years(4) },
  { name: 'SHS — STEM', levels: grades(11, 12) },
  { name: 'SHS — ABM', levels: grades(11, 12) },
  { name: 'SHS — HUMSS', levels: grades(11, 12) },
  { name: 'Junior High School', levels: grades(7, 10) },
  { name: 'Elementary', levels: grades(1, 6) },
];

const levelsOf = (program: string): ProgramLevel[] =>
  PROGRAMS.find((entry) => entry.name === program)?.levels ?? years(4);

/** The chosen level as the applicant reads it, e.g. "Year 3" or "Grade 11". */
const levelLabelOf = (program: string, level: string): string => {
  const match = levelsOf(program).find((entry) => entry.value === level);
  return match ? match.label : `${program} level ${level}`;
};

const OTC_NOTICE =
  'Payment must be settled physically at the Accounting Office before submitting this form. Enter your Official Receipt / Accounting Reference Number below.';

export const EnrollmentLanding: React.FC<EnrollmentLandingProps> = ({ onSwitchToLogin, onNotify }) => {
  const [applicantType, setApplicantType] = useState<'new' | 'returning'>('new');
  // A. School year & classification (DepEd BEEF §1)
  const [classification, setClassification] = useState<'no-lrn' | 'with-lrn' | 'returning'>('no-lrn');
  const [lrn, setLrn] = useState('');
  // B. Learner information (DepEd BEEF §2)
  const [psaNo, setPsaNo] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [extName, setExtName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState('');
  const [motherTongue, setMotherTongue] = useState('');
  // C. Address (DepEd BEEF §3)
  const [houseStreet, setHouseStreet] = useState('');
  const [barangay, setBarangay] = useState('');
  const [cityProvince, setCityProvince] = useState('');
  const [zip, setZip] = useState('');
  // D. Parent / guardian (DepEd BEEF §4)
  const [fatherName, setFatherName] = useState('');
  const [motherMaiden, setMotherMaiden] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianCell, setGuardianCell] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  // E. Returning / transferee details (DepEd BEEF §5)
  const [lastGrade, setLastGrade] = useState('');
  const [lastSY, setLastSY] = useState('');
  const [lastSchool, setLastSchool] = useState('');
  const [lastSchoolId, setLastSchoolId] = useState('');
  const [lastSchoolAddress, setLastSchoolAddress] = useState('');
  const [program, setProgram] = useState('BSIT');
  const [yearLevel, setYearLevel] = useState('1');
  const [schoolYear, setSchoolYear] = useState('2026–2027');
  const [semester, setSemester] = useState('1');
  const [schoolId, setSchoolId] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [chosenSlot, setChosenSlot] = useState<ScheduleSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<EnrollmentReceipt | null>(null);
  const [step, setStep] = useState(1);

  const STEPS = ['Learner & Classification', 'Address & Guardian', 'Background & Submit'] as const;

  const validStep1 = (): string => {
    if (!/^[A-Za-z ]{2,}/.test(program.trim())) return 'Select a program / grade level.';
    if (!levelsOf(program).some((level) => level.value === yearLevel)) return 'Select a valid year / grade level for this program.';
    if (applicantType === 'returning' && !/^2\d{6}$/.test(schoolId.trim())) {
      return 'Enter your assigned 7-digit student school ID (starts with 2).';
    }
    if (classification === 'with-lrn' && !/^\d{12}$/.test(lrn.trim())) {
      return 'Enter the 12-digit Learner Reference Number (LRN).';
    }
    if (applicantType === 'new') {
      if (!lastName.trim() || !firstName.trim()) return 'Enter the learner\u2019s last and first names.';
      if (!dob) return 'Enter the date of birth.';
      if (!sex) return 'Select sex.';
      if (!motherTongue.trim()) return 'Enter the mother tongue.';
    }
    return '';
  };

  const validStep2 = (): string => {
    if (applicantType !== 'new') return '';
    if (!barangay.trim() || !cityProvince.trim()) return 'Enter barangay and city/province.';
    if (!guardianName.trim() || !guardianCell.trim()) return 'Enter the guardian name and cellphone number.';
    if (!contactEmail.includes('@')) return 'Enter a valid contact email — credentials are delivered there.';
    return '';
  };

  const goNext = () => {
    const err = step === 1 ? validStep1() : validStep2();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep((s) => (s === 1 && applicantType !== 'new' ? 3 : Math.min(s + 1, 3)));
  };

  const goBack = () => {
    setError('');
    setStep((s) => (s === 3 && applicantType !== 'new' ? 1 : Math.max(s - 1, 1)));
  };

  const wizNav = (showBack: boolean, showNext: boolean) => (
    <div className="enroll-nav">
      {showBack && (
        <button type="button" onClick={goBack} className="enroll-nav-back">
          ← Back
        </button>
      )}
      {showNext && (
        <button type="button" onClick={goNext} className="enroll-nav-next">
          Next →
        </button>
      )}
    </div>
  );

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

  const learnerName = [firstName, middleName, lastName, extName].map((s) => s.trim()).filter(Boolean).join(' ');
  const learnerAge = (() => {
    if (!dob) return '';
    const ms = Date.now() - new Date(`${dob}T00:00:00`).getTime();
    if (!Number.isFinite(ms) || ms < 0) return '';
    return String(Math.floor(ms / 31557600000));
  })();
  const isTransferee = classification === 'returning' || applicantType === 'returning';

  const validate = (): string => {
    if (!/^[A-Za-z ]{2,}/.test(program.trim())) return 'Select a program / grade level.';
    if (!levelsOf(program).some((level) => level.value === yearLevel)) return 'Select a valid year / grade level for this program.';
    if (applicantType === 'returning' && !/^2\d{6}$/.test(schoolId.trim())) {
      return 'Enter your assigned 7-digit student school ID (starts with 2).';
    }
    if (classification === 'with-lrn' && !/^\d{12}$/.test(lrn.trim())) {
      return 'Enter the 12-digit Learner Reference Number (LRN).';
    }
    if (applicantType === 'new') {
      if (!lastName.trim() || !firstName.trim()) return 'Enter the learner\u2019s last and first names.';
      if (!dob) return 'Enter the date of birth.';
      if (!sex) return 'Select sex.';
      if (!motherTongue.trim()) return 'Enter the mother tongue.';
      if (!barangay.trim() || !cityProvince.trim()) return 'Enter barangay and city/province.';
      if (!guardianName.trim() || !guardianCell.trim()) return 'Enter the guardian name and cellphone number.';
      if (!contactEmail.includes('@')) return 'Enter a valid contact email — credentials are delivered there.';
    }
    if (isTransferee && (!lastGrade.trim() || !lastSY.trim() || !lastSchool.trim())) {
      return 'Enter last grade level, school year, and school name.';
    }
    if (referenceNo.trim().length < 4) return 'Enter the Official Receipt / Accounting Reference Number from the Accounting Office.';
    return '';
  };

  const savePreference = () => {
    try {
      if (chosenSlot) localStorage.setItem('cec:enroll_schedule', JSON.stringify(chosenSlot));
      else localStorage.removeItem('cec:enroll_schedule');
    } catch { /* ignore */ }
  };

  const enrolleeDetails = () => ({
    psaNo: psaNo.trim() || undefined,
    lastName: lastName.trim() || undefined,
    firstName: firstName.trim() || undefined,
    middleName: middleName.trim() || undefined,
    extName: extName.trim() || undefined,
    dob: dob || undefined,
    age: learnerAge || undefined,
    sex: sex || undefined,
    motherTongue: motherTongue.trim() || undefined,
    houseStreet: houseStreet.trim() || undefined,
    barangay: barangay.trim() || undefined,
    cityProvince: cityProvince.trim() || undefined,
    zip: zip.trim() || undefined,
    fatherName: fatherName.trim() || undefined,
    motherMaiden: motherMaiden.trim() || undefined,
    guardianName: guardianName.trim() || undefined,
    guardianCell: guardianCell.trim() || undefined,
    lastGrade: lastGrade.trim() || undefined,
    lastSY: lastSY.trim() || undefined,
    lastSchool: lastSchool.trim() || undefined,
    lastSchoolId: lastSchoolId.trim() || undefined,
    lastSchoolAddress: lastSchoolAddress.trim() || undefined,
  });

  const mirrorOffline = (assignedId: string) => {
    try {
      const name = applicantType === 'new' ? learnerName : `Returning • ${assignedId}`;
      const rawApps = localStorage.getItem('cec:s_enroll_apps');
      const apps = rawApps ? (JSON.parse(rawApps) as { id: string; name: string; role: string }[]) : [];
      apps.push({ id: assignedId, name: `${program} • ${levelLabelOf(program, yearLevel)} • ${semester === '2' ? '2nd' : '1st'} Sem`, role: 'Pending Accounting Verification' });
      localStorage.setItem('cec:s_enroll_apps', JSON.stringify(apps));
      const rawQ = localStorage.getItem('cec:a_enroll_v2');
      const queue = rawQ ? (JSON.parse(rawQ) as { id: string; name: string; meta: string }[]) : [];
      queue.push({ id: assignedId, name, meta: `${program} • ${levelLabelOf(program, yearLevel)} • Ref ${referenceNo.trim()} • Applied (offline)` });
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
        fullName: learnerName || undefined,
        personalEmail: contactEmail.trim() || undefined,
        phone: guardianCell.trim() || undefined,
        address: [houseStreet.trim(), barangay.trim(), cityProvince.trim(), zip.trim()].filter(Boolean).join(', ') || undefined,
        program: program.trim(),
        yearLevel: Number(yearLevel),
        schoolYear: schoolYear.trim() || undefined,
        semester: Number(semester),
        schoolId: applicantType === 'returning' ? schoolId.trim() : undefined,
        paymentReferenceNo: referenceNo.trim(),
        classification,
        lrn: lrn.trim() || undefined,
        details: enrolleeDetails(),
      });
      setReceipt(data);
      savePreference();
      if (onNotify) onNotify('Enrollment submitted — pending accounting verification');
    } catch (requestError) {
      const apiError = requestError as { response?: { data?: { message?: string } } };
      if (!apiError.response) {
        // Offline fallback: reserve an ID locally and queue for admin review.
        const assignedId = applicantType === 'returning' ? schoolId.trim() : genSchoolId('student');
        mirrorOffline(assignedId);
        savePreference();
        setReceipt({
          applicationId: `offline-${Date.now()}`,
          schoolId: assignedId,
          status: 'pending',
          paymentStatus: 'PENDING_VERIFICATION',
          studentStatus: 'PROVISIONAL',
          submittedAt: new Date().toISOString(),
          summary: {
            fullName: applicantType === 'new' ? learnerName : `Returning • ${assignedId}`,
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
    setClassification('no-lrn');
    setLrn('');
    setPsaNo(''); setLastName(''); setFirstName(''); setMiddleName(''); setExtName('');
    setDob(''); setSex(''); setMotherTongue('');
    setHouseStreet(''); setBarangay(''); setCityProvince(''); setZip('');
    setFatherName(''); setMotherMaiden(''); setGuardianName(''); setGuardianCell(''); setContactEmail('');
    setLastGrade(''); setLastSY(''); setLastSchool(''); setLastSchoolId(''); setLastSchoolAddress('');
    setSchoolId('');
    setReferenceNo('');
    setChosenSlot(null);
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
            <div className="credential-row"><span className="credential-label">Program / Level</span><div className="credential-value-wrap"><code className="credential-value">{s.program} • {levelLabelOf(s.program, String(s.yearLevel))}</code></div></div>
            <div className="credential-row"><span className="credential-label">Academic Year</span><div className="credential-value-wrap"><code className="credential-value">{s.schoolYear ?? '—'} • {s.semester === 2 ? '2nd' : '1st'} Semester</code></div></div>
            <div className="credential-row"><span className="credential-label">Accounting Reference No.</span><div className="credential-value-wrap"><code className="credential-value">{s.paymentReferenceNo}</code></div></div>
            {chosenSlot && (
              <div className="credential-row"><span className="credential-label">Plotted Schedule</span><div className="credential-value-wrap"><code className="credential-value">{chosenSlot.subject} • {chosenSlot.schedule}{chosenSlot.room ? ` • ${chosenSlot.room}` : ''}</code></div></div>
            )}
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
        <div className="enroll-steps" role="list" aria-label="Enrollment steps">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const skipped = applicantType !== 'new' && n === 2;
            const done = n < step && !skipped;
            const current = step === n;
            return (
              <div key={label} role="listitem" aria-current={current ? 'step' : undefined} className={`enroll-step${done ? ' done' : current ? ' current' : ''}`}>
                <span className={`enroll-step-dot${done ? ' done' : current ? ' current' : ''}`}>{done ? '✓' : n}</span>
                <span className={`enroll-step-label${current ? ' current' : ''}`}>{label}</span>
                {n < STEPS.length && <span className={`enroll-step-bar${done || step > n ? ' filled' : ''}`} />}
              </div>
            );
          })}
        </div>
        {step === 1 && (
        <>
        <div className="auth-field">
          <label>I am a <span className="required-star">*</span></label>
          <div className="role-pills" role="tablist" aria-label="Applicant type">
            <button type="button" role="tab" aria-selected={applicantType === 'new'}
              className={`role-pill ${applicantType === 'new' ? 'active' : ''}`}
              onClick={() => { setApplicantType('new'); setClassification('no-lrn'); }}>
              New Student
            </button>
            <button type="button" role="tab" aria-selected={applicantType === 'returning'}
              className={`role-pill ${applicantType === 'returning' ? 'active' : ''}`}
              onClick={() => { setApplicantType('returning'); setClassification('returning'); }}>
              Returning Student
            </button>
          </div>
          <span className="field-hint">
            {applicantType === 'new'
              ? 'First enrollment at CEC? A school ID will be assigned after you submit.'
              : 'Already have a school ID? Enter it below with your new reference number.'}
          </span>
        </div>

        <section className="enroll-section">
          <h3 className="enroll-section-title">School Year &amp; Classification</h3>
          <div className="auth-form-row">
            <div className="auth-field">
              <label htmlFor="enr-ay">School Year <span className="required-star">*</span></label>
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
          <div className="role-pills" role="tablist" aria-label="Student classification" style={{ marginTop: 10 }}>
            {([['no-lrn', 'No LRN'], ['with-lrn', 'With LRN']] as const).map(([v, label]) => (
              <button key={v} type="button" role="tab" aria-selected={classification === v}
                className={`role-pill ${classification === v ? 'active' : ''}`}
                onClick={() => setClassification(v)}>
                {label}
              </button>
            ))}
          </div>
          {classification === 'with-lrn' && (
            <div className="auth-field" style={{ marginTop: 10 }}>
              <label htmlFor="enr-lrn">Learner Reference Number (12 digits) <span className="required-star">*</span></label>
              <div className="auth-input-wrap">
                <input id="enr-lrn" type="text" inputMode="numeric" required value={lrn}
                  onChange={(e) => setLrn(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="e.g. 123456789012" autoComplete="off" />
              </div>
            </div>
          )}
        </section>

        <div className="auth-form-row">
          <div className="auth-field">
            <label htmlFor="enr-program">Program / Grade Level <span className="required-star">*</span></label>
            <div className="auth-input-wrap">
              <select
                id="enr-program"
                value={program}
                onChange={(e) => {
                  const next = e.target.value;
                  setProgram(next);
                  // The year / grade level follows the program: a college course
                  // offers its four years, basic education its grade levels.
                  const allowed = levelsOf(next);
                  setYearLevel((current) =>
                    allowed.some((level) => level.value === current) ? current : allowed[0].value,
                  );
                }}
              >
                {PROGRAMS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="enr-year">Year / Grade Level <span className="required-star">*</span></label>
            <div className="auth-input-wrap">
              <select id="enr-year" value={yearLevel} onChange={(e) => setYearLevel(e.target.value)}>
                {levelsOf(program).map((level) => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
          </div>
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
          <section className="enroll-section">
            <h3 className="enroll-section-title">Learner Information</h3>
            <div className="auth-form-row">
              <div className="auth-field">
                <label htmlFor="enr-last">Last Name <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <input id="enr-last" type="text" required value={lastName}
                    onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Dela Cruz" autoComplete="family-name" />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="enr-first">First Name <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <input id="enr-first" type="text" required value={firstName}
                    onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Juan" autoComplete="given-name" />
                </div>
              </div>
            </div>
            <div className="auth-form-row">
              <div className="auth-field">
                <label htmlFor="enr-middle">Middle Name</label>
                <div className="auth-input-wrap">
                  <input id="enr-middle" type="text" value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)} placeholder="e.g. Aquino" autoComplete="additional-name" />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="enr-ext">Extension (Jr/Sr/III)</label>
                <div className="auth-input-wrap">
                  <input id="enr-ext" type="text" value={extName}
                    onChange={(e) => setExtName(e.target.value)} placeholder="e.g. Jr" autoComplete="honorific-suffix" />
                </div>
              </div>
            </div>
            <div className="auth-form-row">
              <div className="auth-field">
                <label htmlFor="enr-psa">PSA Birth Certificate No.</label>
                <div className="auth-input-wrap">
                  <input id="enr-psa" type="text" value={psaNo}
                    onChange={(e) => setPsaNo(e.target.value)} placeholder="e.g. 2010-123456" autoComplete="off" />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="enr-dob">Date of Birth <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <input id="enr-dob" type="date" required value={dob}
                    onChange={(e) => setDob(e.target.value)} aria-label="Date of birth" />
                </div>
              </div>
            </div>
            <div className="auth-form-row">
              <div className="auth-field">
                <label htmlFor="enr-sex">Sex <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <select id="enr-sex" required value={sex} onChange={(e) => setSex(e.target.value)}>
                    <option value="">Select…</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="enr-age">Age</label>
                <div className="auth-input-wrap">
                  <input id="enr-age" type="text" readOnly value={learnerAge} placeholder="Auto from birth date" aria-label="Age" />
                </div>
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="enr-mt">Mother Tongue <span className="required-star">*</span></label>
              <div className="auth-input-wrap">
                <input id="enr-mt" type="text" required value={motherTongue}
                  onChange={(e) => setMotherTongue(e.target.value)} placeholder="e.g. Cebuano" autoComplete="off" />
              </div>
            </div>
          </section>
        )}
        {wizNav(false, true)}
        </>
        )}

        {step === 2 && applicantType === 'new' && (
        <div>
        {applicantType === 'new' && (
          <section className="enroll-section">
            <h3 className="enroll-section-title">Address</h3>
            <div className="auth-form-row">
              <div className="auth-field">
                <label htmlFor="enr-house">House No. / Street</label>
                <div className="auth-input-wrap">
                  <input id="enr-house" type="text" value={houseStreet}
                    onChange={(e) => setHouseStreet(e.target.value)} placeholder="e.g. 123 Colon St." autoComplete="street-address" />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="enr-brgy">Barangay <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <input id="enr-brgy" type="text" required value={barangay}
                    onChange={(e) => setBarangay(e.target.value)} placeholder="e.g. Sambag I" autoComplete="off" />
                </div>
              </div>
            </div>
            <div className="auth-form-row">
              <div className="auth-field">
                <label htmlFor="enr-city">City / Province <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <input id="enr-city" type="text" required value={cityProvince}
                    onChange={(e) => setCityProvince(e.target.value)} placeholder="e.g. Cebu City, Cebu" autoComplete="address-level2" />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="enr-zip">Zip Code</label>
                <div className="auth-input-wrap">
                  <input id="enr-zip" type="text" inputMode="numeric" value={zip}
                    onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="e.g. 6000" autoComplete="postal-code" />
                </div>
              </div>
            </div>
          </section>
        )}

        {applicantType === 'new' && (
          <section className="enroll-section">
            <h3 className="enroll-section-title">Parent / Guardian</h3>
            <div className="auth-form-row">
              <div className="auth-field">
                <label htmlFor="enr-father">Father&apos;s Name</label>
                <div className="auth-input-wrap">
                  <input id="enr-father" type="text" value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)} placeholder="e.g. Jose Dela Cruz" autoComplete="off" />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="enr-mother">Mother&apos;s Maiden Name</label>
                <div className="auth-input-wrap">
                  <input id="enr-mother" type="text" value={motherMaiden}
                    onChange={(e) => setMotherMaiden(e.target.value)} placeholder="e.g. Maria Aquino" autoComplete="off" />
                </div>
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="enr-guardian">Guardian Name <span className="required-star">*</span></label>
              <div className="auth-input-wrap">
                <input id="enr-guardian" type="text" required value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)} placeholder="e.g. Ana Dela Cruz" autoComplete="off" />
              </div>
            </div>
            <div className="auth-form-row">
              <div className="auth-field">
                <label htmlFor="enr-gcell">Guardian Cellphone No. <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <input id="enr-gcell" type="tel" inputMode="numeric" required value={guardianCell}
                    onChange={(e) => setGuardianCell(e.target.value)} placeholder="09XXXXXXXXX" autoComplete="tel" />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="enr-cemail">Contact Email <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <input id="enr-cemail" type="email" required value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)} placeholder="your.email@gmail.com" autoComplete="email" />
                </div>
              </div>
            </div>
            <span className="field-hint">Account credentials are delivered to this email address.</span>
          </section>
        )}
        {wizNav(true, true)}
        </div>
        )}

        {step === 3 && (
        <div>
        {isTransferee && (
          <section className="enroll-section">
            <h3 className="enroll-section-title">Last School Attended</h3>
            <div className="auth-form-row">
              <div className="auth-field">
                <label htmlFor="enr-lgrade">Last Grade Level <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <input id="enr-lgrade" type="text" required value={lastGrade}
                    onChange={(e) => setLastGrade(e.target.value)} placeholder="e.g. Grade 10" autoComplete="off" />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="enr-lsy">Last School Year <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <input id="enr-lsy" type="text" required value={lastSY}
                    onChange={(e) => setLastSY(e.target.value)} placeholder="e.g. 2025–2026" autoComplete="off" />
                </div>
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="enr-lschool">School Name <span className="required-star">*</span></label>
              <div className="auth-input-wrap">
                <input id="enr-lschool" type="text" required value={lastSchool}
                  onChange={(e) => setLastSchool(e.target.value)} placeholder="e.g. Cebu City National High School" autoComplete="off" />
              </div>
            </div>
            <div className="auth-form-row">
              <div className="auth-field">
                <label htmlFor="enr-lsid">School ID</label>
                <div className="auth-input-wrap">
                  <input id="enr-lsid" type="text" value={lastSchoolId}
                    onChange={(e) => setLastSchoolId(e.target.value)} placeholder="DepEd school ID" autoComplete="off" />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="enr-laddr">School Address</label>
                <div className="auth-input-wrap">
                  <input id="enr-laddr" type="text" value={lastSchoolAddress}
                    onChange={(e) => setLastSchoolAddress(e.target.value)} placeholder="e.g. Osmeña Blvd., Cebu City" autoComplete="off" />
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="auth-info-box">
          <div>
            <strong>Enrolling for {schoolYear} • {semester === '2' ? '2nd' : '1st'} Semester</strong>
            <p>Set by the school calendar above. All offerings and queues filter to this term.</p>
          </div>
        </div>

        <div className="auth-field">
          <label>Pick a class schedule <span className="field-hint">(optional — plotting opens fully in Section Selection)</span></label>
          <SchedulePicker initialDay="morning" selectedEdp={chosenSlot?.edp ?? null} onSelect={setChosenSlot} />
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

        <div className="enroll-nav">
          <button type="button" onClick={goBack} className="enroll-nav-back">
            ← Back
          </button>
          <button type="submit" disabled={busy} className="enroll-submit">
            {busy ? 'Submitting Enrollment…' : 'Submit Enrollment'}
          </button>
        </div>
        </div>
        )}

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
