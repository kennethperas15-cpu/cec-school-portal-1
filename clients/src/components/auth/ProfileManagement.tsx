import React, { useState } from 'react';

interface ProfileManagementProps {
  className?: string;
  onNotify?: (message: string) => void;
  currentUser?: {
    firstName: string;
    lastName: string;
    role: string;
    id?: string;
    email?: string;
    program?: string;
  };
}

export const ProfileManagement: React.FC<ProfileManagementProps> = ({
  className = '',
  onNotify,
  currentUser,
}) => {
  const [fullName, setFullName] = useState(
    currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Juan Dela Cruz'
  );
  const [studentId] = useState(currentUser?.id || 'CEC-2024-0015');
  const [email, setEmail] = useState(currentUser?.email || 'juan.delacruz@cec.edu.ph');
  const [phone, setPhone] = useState('0917-123-4567');
  const [program, setProgram] = useState(currentUser?.program || 'BSIT');
  const [yearLevel, setYearLevel] = useState('3rd Year');
  const [address, setAddress] = useState('Cebu City, Philippines');
  const [guardian, setGuardian] = useState('Maria Dela Cruz');
  const [emergencyPhone, setEmergencyPhone] = useState('0918-987-6543');
  const [saving, setSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      if (onNotify) {
        onNotify('Profile details updated successfully.');
      }
    }, 600);
  };

  return (
    <section className={`academic-card profile-card ${className}`}>
      <div className="profile-header-banner">
        <div className="profile-avatar-block">
          <div className="profile-avatar-large">
            {fullName
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div className="profile-badge-info">
            <h2>{fullName}</h2>
            <div className="profile-meta-tags">
              <span className="profile-tag tag-primary">{studentId}</span>
              <span className="profile-tag tag-success">Active Enrolled</span>
              <span className="profile-tag tag-program">{program} - {yearLevel}</span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="profile-form">
        <div className="profile-section">
          <h3 className="profile-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Personal & Academic Information
          </h3>
          <div className="profile-grid">
            <div className="profile-field">
              <label htmlFor="prof-name">Full Name</label>
              <input
                id="prof-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="profile-field">
              <label htmlFor="prof-id">School ID Number</label>
              <input
                id="prof-id"
                type="text"
                value={studentId}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="profile-field">
              <label htmlFor="prof-email">Institutional Email</label>
              <input
                id="prof-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="profile-field">
              <label htmlFor="prof-phone">Contact Number</label>
              <input
                id="prof-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="profile-field">
              <label htmlFor="prof-program">Academic Program</label>
              <select
                id="prof-program"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
              >
                <option value="BSIT">BS Information Technology (BSIT)</option>
                <option value="BSCS">BS Computer Science (BSCS)</option>
                <option value="BEED">Bachelor of Elementary Education (BEED)</option>
                <option value="BSED">Bachelor of Secondary Education (BSED)</option>
              </select>
            </div>

            <div className="profile-field">
              <label htmlFor="prof-year">Year Level</label>
              <select
                id="prof-year"
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
              >
                <option value="1st Year">1st Year (Freshman)</option>
                <option value="2nd Year">2nd Year (Sophomore)</option>
                <option value="3rd Year">3rd Year (Junior)</option>
                <option value="4th Year">4th Year (Senior)</option>
              </select>
            </div>

            <div className="profile-field full-width">
              <label htmlFor="prof-address">Residential Address</label>
              <input
                id="prof-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3 className="profile-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Emergency & Guardian Contact
          </h3>
          <div className="profile-grid">
            <div className="profile-field">
              <label htmlFor="prof-guardian">Guardian / Parent Name</label>
              <input
                id="prof-guardian"
                type="text"
                value={guardian}
                onChange={(e) => setGuardian(e.target.value)}
              />
            </div>

            <div className="profile-field">
              <label htmlFor="prof-emergency">Emergency Contact Phone</label>
              <input
                id="prof-emergency"
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <button
            type="submit"
            className="primary-button"
            disabled={saving}
          >
            {saving ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ProfileManagement;