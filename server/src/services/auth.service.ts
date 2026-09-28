import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { sql } from '../config/sql.js';
import { env } from '../config/env.js';

type EnrollmentInput = {
  fullName: string;
  personalEmail: string;
  phone: string;
  program: string;
  yearLevel: number;
  requestedRole?: 'student' | 'teacher' | 'admin';
  googleToken?: string;
  schoolId?: string;
};

type GoogleEnrollmentInput = { program: string; yearLevel: number; phone?: string };

const googleClient = new OAuth2Client(
  env.googleClientId,
  env.googleClientSecret,
  env.googleRedirectUri
);

const mailer = env.smtpHost
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPassword } : undefined
    })
  : null;

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const accessTokenFor = (user: { id: string; role: string; email: string }) => jwt.sign(
  { sub: user.id, role: user.role, email: user.email },
  env.jwtSecret,
  { expiresIn: env.accessTokenTtl as jwt.SignOptions['expiresIn'] }
);

const refreshSessionFor = async (userId: string) => {
  const refreshToken = crypto.randomBytes(48).toString('base64url');
  await sql(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, NOW() + INTERVAL '7 days')`,
    { replacements: [crypto.randomUUID(), userId, hashToken(refreshToken)], type: QueryTypes.INSERT }
  );
  return refreshToken;
};

export const authService = {
  createGoogleLoginUrl() {
    if (!env.googleClientId || !env.googleClientSecret) throw new Error('Google OAuth is not configured');
    const state = jwt.sign({ purpose: 'google-login' }, env.jwtSecret, { expiresIn: '10m' });
    return googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account'
    });
  },

  async completeGoogleLogin(code: string, state: string) {
    const stateData = jwt.verify(state, env.jwtSecret) as { purpose?: string };
    if (stateData.purpose !== 'google-login') throw new Error('Invalid Google login state');
    const { tokens } = await googleClient.getToken(code);
    if (!tokens.id_token) throw new Error('Google did not return an identity token');
    const ticket = await googleClient.verifyIdToken({ idToken: tokens.id_token, audience: env.googleClientId });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || !profile.email_verified) throw new Error('A verified Google email is required');
    return jwt.sign({
      purpose: 'google-enrollment',
      googleSubject: profile.sub,
      email: profile.email,
      firstName: profile.given_name ?? '',
      lastName: profile.family_name ?? ''
    }, env.jwtSecret, { expiresIn: '30m' });
  },

  async submitEnrollment(input: EnrollmentInput) {
    const googleIdentity = input.googleToken
      ? jwt.verify(input.googleToken, env.jwtSecret) as { purpose?: string; googleSubject?: string; email?: string; firstName?: string; lastName?: string }
      : null;
    if (googleIdentity && googleIdentity.purpose !== 'google-enrollment') throw new Error('Invalid Google enrollment session');
    const nameParts = (googleIdentity ? `${googleIdentity.firstName} ${googleIdentity.lastName}` : input.fullName).trim().split(/\s+/);
    const firstName = nameParts.shift() ?? '';
    const lastName = nameParts.join(' ') || firstName;
    const personalEmail = googleIdentity?.email ?? input.personalEmail;
    if (!firstName || !lastName || !personalEmail.includes('@')) {
      throw new Error('Full name and a valid personal email are required');
    }

    const requestedRole = input.requestedRole ?? 'student';
    const role = await sql<{ id: number }>(
      'SELECT id FROM roles WHERE name = ? LIMIT 1',
      { replacements: [requestedRole], type: QueryTypes.SELECT }
    );
    if (!role.length) throw new Error('Requested account role is not configured');

    const userId = crypto.randomUUID();
    const schoolEmail = `${firstName}.${lastName}.${userId.slice(0, 6)}@cec.edu.ph`
      .toLowerCase().replace(/[^a-z0-9.@]/g, '');
    const temporaryPassword = crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const applicationId = crypto.randomUUID();
    // 7-digit school IDs only (2 student • 3 teacher • 4 admin): keep a
    // valid provided one, otherwise issue a fresh one — never CEC- formats.
    const idLead = requestedRole === 'teacher' ? '3' : requestedRole === 'admin' ? '4' : '2';
    const providedId = typeof input.schoolId === 'string' && new RegExp(`^${idLead}\\d{6}$`).test(input.schoolId.trim())
      ? input.schoolId.trim()
      : null;
    let issuedId = idLead;
    for (let i = 0; i < 6; i++) issuedId += Math.floor(Math.random() * 10).toString();
    const studentNumber = providedId ?? issuedId;

    await sequelize.transaction(async (transaction) => {
      await sql(
        `INSERT INTO users (id, role_id, email, password_hash, first_name, last_name, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        { replacements: [userId, role[0].id, schoolEmail, passwordHash, firstName, lastName, input.phone], transaction }
      );
      await sql(
        `INSERT INTO enrollment_applications
         (id, google_subject, email, first_name, last_name, program, year_level, phone, requested_role, status, user_id, reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, NOW())`,
        {
          replacements: [
            applicationId, googleIdentity?.googleSubject ?? `manual:${applicationId}`, personalEmail, firstName, lastName,
            input.program, input.yearLevel, input.phone, requestedRole, userId
          ],
          transaction
        }
      );
      if (requestedRole === 'student') {
        await sql(
          `INSERT INTO students (id, user_id, student_number, program, year_level)
           VALUES (?, ?, ?, ?, ?)`,
          {
            replacements: [
              crypto.randomUUID(), userId,
              studentNumber,
              input.program, input.yearLevel
            ],
            transaction
          }
        );
      }
      if (requestedRole === 'teacher' && providedId) {
        await sql(
          `INSERT INTO teachers (id, user_id, employee_number, employment_status)
           VALUES (?, ?, ?, 'active')
           ON CONFLICT (user_id) DO UPDATE SET employee_number = EXCLUDED.employee_number`,
          { replacements: [crypto.randomUUID(), userId, providedId], transaction }
        );
      }
    });

    let emailSent = false;
    if (mailer) {
      await mailer.sendMail({
        from: env.emailFrom,
        to: personalEmail,
        subject: 'Your CEC School Portal account',
        text: `Your CEC ${requestedRole} account is ready. School email: ${schoolEmail}. Temporary password: ${temporaryPassword}. Please change it after your first login.`,
        html: `<p>Your CEC ${requestedRole} account is ready.</p><p>School email: <strong>${schoolEmail}</strong></p><p>Temporary password: <strong>${temporaryPassword}</strong></p><p>Please change it after your first login.</p>`
      });
      emailSent = true;
    }
    return {
      applicationId,
      status: 'approved',
      schoolEmail,
      schoolId: requestedRole === 'student' ? studentNumber : providedId ?? undefined,
      temporaryPassword,
      emailSent,
    };
  },

  // Public over-the-counter enrollment: NEW or RETURNING student submits
  // profile + Accounting Office reference number. No online gateways here by
  // design — payment is settled physically before submitting. A 7-digit
  // student ID (2xxxxxx) is reserved at submit time; the account advances to
  // ENROLLED only through admin/accounting approval.
  async submitPublicEnrollment(input: {
    applicantType: 'new' | 'returning';
    fullName?: string; personalEmail?: string; phone?: string; address?: string;
    program?: string; yearLevel?: number; schoolYear?: string; semester?: number;
    schoolId?: string; paymentReferenceNo: string; educationLevel?: string;
  }) {
    const referenceNo = (input.paymentReferenceNo ?? '').trim();
    if (referenceNo.length < 4) {
      throw new Error('Enter the Official Receipt / Accounting Reference Number from the Accounting Office');
    }
    const yearLevel = Number(input.yearLevel);
    if (!Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 6) {
      throw new Error('Select a valid year / grade level');
    }
    if (!input.program?.trim()) throw new Error('Select a program / grade level');
    const semester = input.semester == null ? 1 : Number(input.semester);
    if (![1, 2].includes(semester)) throw new Error('Select a valid semester');

    let schoolId: string;
    let firstName: string;
    let lastName: string;
    let personalEmail: string;
    let phone: string | null;
    let existingUserId: string | null = null;

    if (input.applicantType === 'returning') {
      schoolId = (input.schoolId ?? '').trim();
      if (!/^2\d{6}$/.test(schoolId)) {
        throw new Error('Enter your assigned 7-digit student school ID (starts with 2)');
      }
      const found = await sql<{ user_id: string; email: string; first_name: string; last_name: string }>(
        `SELECT s.user_id, u.email, u.first_name, u.last_name
         FROM students s JOIN users u ON u.id = s.user_id
         WHERE s.student_number = ? AND u.is_active = TRUE LIMIT 1`,
        { replacements: [schoolId], type: QueryTypes.SELECT }
      );
      if (!found.length) throw new Error('No school record found for that ID — please contact the registrar');
      existingUserId = found[0].user_id;
      firstName = found[0].first_name;
      lastName = found[0].last_name;
      personalEmail = found[0].email;
      phone = null;
    } else {
      const nameParts = (input.fullName ?? '').trim().split(/\s+/).filter(Boolean);
      if (nameParts.length < 2) throw new Error('Enter your full name (first and last)');
      if (!input.personalEmail?.includes('@')) throw new Error('Enter a valid email address');
      if (!input.phone?.trim()) throw new Error('Enter a contact number');
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
      personalEmail = input.personalEmail.trim();
      phone = input.phone.trim();
      schoolId = await this.reserveStudentId();
    }

    const applicationId = crypto.randomUUID();
    await sql(
      `INSERT INTO enrollment_applications
       (id, google_subject, email, first_name, last_name, program, year_level, phone,
        requested_role, status, payment_reference_no, payment_status, student_status,
        assigned_school_id, school_year, semester, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'student', 'pending', ?, 'PENDING_VERIFICATION', 'PROVISIONAL', ?, ?, ?, ?)`,
      {
        replacements: [
          applicationId, `otc:${applicationId}`, personalEmail, firstName, lastName,
          input.program.trim(), yearLevel, phone, referenceNo, schoolId,
          (input.schoolYear ?? '').trim() || null, semester, existingUserId,
        ],
        type: QueryTypes.INSERT,
      }
    );
    const submittedAt = new Date().toISOString();
    return {
      applicationId,
      schoolId,
      status: 'pending',
      paymentStatus: 'PENDING_VERIFICATION',
      studentStatus: 'PROVISIONAL',
      submittedAt,
      summary: {
        fullName: `${firstName} ${lastName}`.trim(),
        program: input.program.trim(),
        yearLevel,
        schoolYear: (input.schoolYear ?? '').trim() || null,
        semester,
        paymentReferenceNo: referenceNo,
      },
    };
  },

  // Reserve a unique 7-digit student ID (2xxxxxx) across live rows.
  async reserveStudentId(): Promise<string> {
    for (let attempt = 0; attempt < 25; attempt++) {
      let candidate = '2';
      for (let i = 0; i < 6; i++) candidate += Math.floor(Math.random() * 10).toString();
      const taken = await sql<{ n: string }>(
        `SELECT student_number AS n FROM students WHERE student_number = ?
         UNION SELECT assigned_school_id AS n FROM enrollment_applications WHERE assigned_school_id = ? LIMIT 1`,
        { replacements: [candidate, candidate], type: QueryTypes.SELECT }
      );
      if (!taken.length) return candidate;
    }
    throw new Error('Could not reserve a school ID — please try again');
  },

  // Public self-registration: STUDENT-ONLY. The student supplies the
  // registrar-issued 7-digit ID (2xxxxxx), chooses a password, and picks an
  // education level. Only never-signed-in accounts can be activated here, so
  // an existing active account cannot be taken over by ID alone.
  async registerStudent(input: { schoolId: string; password: string; educationLevel: string }) {
    const schoolId = (input.schoolId ?? '').trim();
    if (!/^2\d{6}$/.test(schoolId)) {
      throw new Error('Enter your assigned 7-digit student school ID (starts with 2)');
    }
    if (!input.password || input.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    const levels = ['college', 'shs', 'hs', 'elementary'];
    if (!levels.includes(input.educationLevel)) {
      throw new Error('Select your education level');
    }
    const rows = await sql<{
      user_id: string; email: string; first_name: string; last_name: string; role: string; last_login: Date | null;
    }>(
      `SELECT u.id AS user_id, u.email, u.first_name, u.last_name, r.name AS role, u.last_login_at AS last_login
       FROM students s
       JOIN users u ON u.id = s.user_id
       JOIN roles r ON r.id = u.role_id
       WHERE s.student_number = ? AND u.is_active = TRUE LIMIT 1`,
      { replacements: [schoolId], type: QueryTypes.SELECT }
    );
    if (!rows.length || rows[0].role !== 'student') {
      throw new Error('No school record found for that ID — please contact the registrar to have your school ID issued');
    }
    if (rows[0].last_login) {
      throw new Error('This school ID is already registered — sign in, or use Password Recovery if you forgot your password');
    }
    const passwordHash = await bcrypt.hash(input.password, 12);
    await sql('UPDATE users SET password_hash = ? WHERE id = ?', {
      replacements: [passwordHash, rows[0].user_id], type: QueryTypes.UPDATE,
    });
    await sql('UPDATE students SET education_level = ? WHERE student_number = ?', {
      replacements: [input.educationLevel, schoolId], type: QueryTypes.UPDATE,
    });
    return {
      schoolEmail: rows[0].email,
      schoolId,
      fullName: `${rows[0].first_name} ${rows[0].last_name}`.trim(),
      emailSent: false,
    };
  },

  // Internal staff provisioning: ADMIN-ONLY (route-guarded). Issues a
  // teacher (3xxxxxx) or admin (4xxxxxx) account with a temporary password.
  async createStaffAccount(input: {
    fullName: string; personalEmail: string; phone?: string; staffId: string;
    role: 'teacher' | 'admin'; department?: string; position?: string; office?: string;
  }) {
    if (!['teacher', 'admin'].includes(input.role)) throw new Error('Staff role must be teacher or admin');
    const lead = input.role === 'teacher' ? '3' : '4';
    const staffId = (input.staffId ?? '').trim();
    if (!new RegExp(`^${lead}\\d{6}$`).test(staffId)) {
      throw new Error(`Staff ID must be 7 digits starting with ${lead}`);
    }
    const nameParts = (input.fullName ?? '').trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 2) throw new Error('Full name is required');
    if (!input.personalEmail?.includes('@')) throw new Error('A valid personal email is required');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    const role = await sql<{ id: number }>(
      'SELECT id FROM roles WHERE name = ? LIMIT 1',
      { replacements: [input.role], type: QueryTypes.SELECT }
    );
    if (!role.length) throw new Error('Staff role is not configured; run the database seed');
    const taken = await sql<{ id: string }>(
      `SELECT u.id FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN teachers t ON t.user_id = u.id
       WHERE LOWER(u.email) = LOWER(?) OR s.student_number = ? OR t.employee_number = ? LIMIT 1`,
      { replacements: [input.personalEmail.trim(), staffId, staffId], type: QueryTypes.SELECT }
    );
    if (taken.length) throw new Error('A school account already exists for that email or staff ID');
    const userId = crypto.randomUUID();
    const schoolEmail = `${firstName}.${lastName}.${userId.slice(0, 6)}@cec.edu.ph`
      .toLowerCase().replace(/[^a-z0-9.@]/g, '');
    const temporaryPassword = crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    await sequelize.transaction(async (transaction) => {
      await sql(
        `INSERT INTO users (id, role_id, email, password_hash, first_name, last_name, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [userId, role[0].id, schoolEmail, passwordHash, firstName, lastName, input.phone?.trim() || null],
          transaction,
        }
      );
      if (input.role === 'teacher') {
        await sql(
          `INSERT INTO teachers (id, user_id, employee_number, employment_status)
           VALUES (?, ?, ?, 'active')`,
          { replacements: [crypto.randomUUID(), userId, staffId], transaction }
        );
      }
    });
    return { schoolEmail, schoolId: staffId, temporaryPassword, emailSent: false };
  },

  async login(identifier: string, password: string) {
    const users = await sql<{
      id: string; email: string; password_hash: string; first_name: string; last_name: string; role: string;
      failed_login_attempts: number; locked_until: Date | null;
      student_number: string | null; employee_number: string | null;
    }>(
      `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, r.name AS role,
              u.failed_login_attempts, u.locked_until, s.student_number, t.employee_number
       FROM users u JOIN roles r ON r.id = u.role_id
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN teachers t ON t.user_id = u.id
       WHERE (LOWER(u.email) = LOWER(?) OR u.id = ? OR s.student_number = ? OR t.employee_number = ?)
         AND u.is_active = TRUE
       LIMIT 1`,
      { replacements: [identifier.trim(), identifier.trim(), identifier.trim(), identifier.trim()], type: QueryTypes.SELECT }
    );
    if (!users.length || users[0].password_hash === 'ACTIVATION_PENDING') {
      throw new Error('Invalid email or password');
    }
    if (users[0].locked_until && new Date(users[0].locked_until).getTime() > Date.now()) {
      throw new Error('Account temporarily locked. Try again later.');
    }
    const valid = await bcrypt.compare(password, users[0].password_hash);
    if (!valid) {
      await sql(
        `UPDATE users SET failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE WHEN failed_login_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END
         WHERE id = ?`,
        { replacements: [users[0].id], type: QueryTypes.UPDATE }
      );
      throw new Error('Invalid email or password');
    }
    await sql('UPDATE users SET last_login_at = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE id = ?', {
      replacements: [users[0].id],
      type: QueryTypes.UPDATE
    });
    const user = { id: users[0].id, email: users[0].email, role: users[0].role };
    const accessToken = accessTokenFor(user);
    const refreshToken = await refreshSessionFor(user.id);
    return {
      accessToken,
      refreshToken,
      user: {
        id: users[0].id,
        email: users[0].email,
        firstName: users[0].first_name,
        lastName: users[0].last_name,
        role: users[0].role,
        schoolId: users[0].student_number ?? users[0].employee_number ?? undefined
      }
    };
  },

  async refresh(refreshToken: string) {
    const rows = await sql<{ id: string; user_id: string; email: string; first_name: string; last_name: string; role: string }>(
      `SELECT s.id, s.user_id, u.email, u.first_name, u.last_name, r.name AS role
       FROM sessions s JOIN users u ON u.id = s.user_id JOIN roles r ON r.id = u.role_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > NOW() AND u.is_active = TRUE LIMIT 1`,
      { replacements: [hashToken(refreshToken)], type: QueryTypes.SELECT }
    );
    if (!rows.length) throw new Error('Refresh session expired or revoked');
    await sql('UPDATE sessions SET revoked_at = NOW() WHERE id = ?', { replacements: [rows[0].id], type: QueryTypes.UPDATE });
    const user = { id: rows[0].user_id, email: rows[0].email, role: rows[0].role };
    return {
      accessToken: accessTokenFor(user),
      refreshToken: await refreshSessionFor(user.id),
      user: { id: user.id, email: user.email, firstName: rows[0].first_name, lastName: rows[0].last_name, role: user.role },
    };
  },

  async revokeRefresh(refreshToken: string) {
    await sql('UPDATE sessions SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL', {
      replacements: [hashToken(refreshToken)], type: QueryTypes.UPDATE,
    });
  },

  createGoogleEnrollmentUrl(input: GoogleEnrollmentInput) {
    if (!env.googleClientId || !env.googleClientSecret) {
      throw new Error('Google OAuth is not configured');
    }

    const state = jwt.sign({ ...input, purpose: 'enrollment' }, env.jwtSecret, { expiresIn: '10m' });
    return googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account'
    });
  },

  async completeGoogleEnrollment(code: string, state: string) {
    const details = jwt.verify(state, env.jwtSecret) as EnrollmentInput & { purpose: string };
    if (details.purpose !== 'enrollment') throw new Error('Invalid enrollment state');

    const { tokens } = await googleClient.getToken(code);
    if (!tokens.id_token) throw new Error('Google did not return an identity token');
    const ticket = await googleClient.verifyIdToken({ idToken: tokens.id_token, audience: env.googleClientId });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || !profile.email_verified) {
      throw new Error('A verified Google email is required');
    }

    const existing = await sql<{ id: string }>(
      'SELECT id FROM enrollment_applications WHERE google_subject = ? OR email = ? LIMIT 1',
      { replacements: [profile.sub, profile.email], type: QueryTypes.SELECT }
    );
    if (existing.length) return { id: existing[0].id, status: 'pending' };

    const id = crypto.randomUUID();
    await sql(
      `INSERT INTO enrollment_applications
       (id, google_subject, email, first_name, last_name, program, year_level, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          id, profile.sub, profile.email, profile.given_name ?? '', profile.family_name ?? '',
          details.program, details.yearLevel, details.phone ?? null
        ],
        type: QueryTypes.INSERT
      }
    );
    return { id, status: 'pending' };
  },

  async approveEnrollment(applicationId: string) {
    const applications = await sql<{
      email: string; first_name: string; last_name: string; program: string; year_level: number; requested_role: 'student' | 'teacher' | 'admin';
      payment_reference_no: string | null; assigned_school_id: string | null;
    }>(
      `SELECT email, first_name, last_name, program, year_level, requested_role, payment_reference_no, assigned_school_id
       FROM enrollment_applications WHERE id = ? AND status = 'pending' LIMIT 1`,
      { replacements: [applicationId], type: QueryTypes.SELECT }
    );
    if (!applications.length) throw new Error('Pending enrollment application not found');

    const application = applications[0];
    const userId = crypto.randomUUID();
    const localPart = `${application.first_name}.${application.last_name}`
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');
    const schoolEmail = `${localPart || 'student'}.${userId.slice(0, 6)}@cec.edu.ph`;
    const role = await sql<{ id: number }>(
      'SELECT id FROM roles WHERE name = ? LIMIT 1',
      { replacements: [application.requested_role], type: QueryTypes.SELECT }
    );
    if (!role.length) throw new Error('Student role is missing; run seed.sql');

    // Without email delivery, issue an active account with a temporary
    // password so approval still lands in users/students tables.
    let temporaryPassword: string | null = null;
    let tokenHash: string | null = null;
    let token: string | null = null;
    let passwordHash = 'ACTIVATION_PENDING';
    if (!mailer) {
      temporaryPassword = crypto.randomBytes(12).toString('base64url');
      passwordHash = await bcrypt.hash(temporaryPassword, 12);
    } else {
      token = crypto.randomBytes(32).toString('hex');
      tokenHash = hashToken(token);
    }

    let provisionedSchoolId: string | undefined;
    await sequelize.transaction(async (transaction) => {
      await sql(
        `INSERT INTO users (id, role_id, email, password_hash, first_name, last_name)
         VALUES (?, ?, ?, ?, ?, ?)`,
        { replacements: [userId, role[0].id, schoolEmail, passwordHash, application.first_name, application.last_name], transaction }
      );
      if (tokenHash) {
        await sql(
          `INSERT INTO account_activation_tokens (user_id, token_hash, expires_at)
           VALUES (?, ?, NOW() + INTERVAL '24 hours')`,
          { replacements: [userId, tokenHash], transaction }
        );
      }
      await sql(
        `UPDATE enrollment_applications
         SET status = 'approved', user_id = ?, reviewed_at = NOW(),
             payment_status = 'VERIFIED', student_status = 'ENROLLED'
         WHERE id = ?`,
        { replacements: [userId, applicationId], transaction }
      );
      if (application.requested_role === 'student') {
        // Honor the ID reserved at OTC submission; fall back to a fresh one.
        let approvalId = application.assigned_school_id;
        if (!approvalId || !/^2\d{6}$/.test(approvalId)) {
          approvalId = await this.reserveStudentId();
        } else {
          const clash = await sql<{ n: string }>(
            `SELECT student_number AS n FROM students WHERE student_number = ? LIMIT 1`,
            { replacements: [approvalId], type: QueryTypes.SELECT }
          );
          if (clash.length) approvalId = await this.reserveStudentId();
        }
        provisionedSchoolId = approvalId;
        await sql(
          `INSERT INTO students (id, user_id, student_number, program, year_level)
           VALUES (?, ?, ?, ?, ?)`,
          {
            replacements: [
              crypto.randomUUID(), userId,
              approvalId,
              application.program, application.year_level
            ],
            transaction
          }
        );
      }
    });

    if (!mailer) {
      return { personalEmail: application.email, schoolEmail, temporaryPassword, emailSent: false, schoolId: provisionedSchoolId };
    }
    const activationUrl = `${env.clientUrl}/activate?token=${token}`;
    await mailer.sendMail({
      from: env.emailFrom,
      to: application.email,
      subject: 'CEC Portal account activation',
      text: `Your enrollment was approved. Your school email is ${schoolEmail}. Activate your CEC Portal account within 24 hours: ${activationUrl}`,
      html: `<p>Your enrollment was approved.</p><p>Your school email is <strong>${schoolEmail}</strong>.</p><p><a href="${activationUrl}">Activate your CEC Portal account</a></p><p>This link expires in 24 hours.</p>`
    });
    return { personalEmail: application.email, schoolEmail, emailSent: true };
  },

  async activateAccount(token: string, password: string) {
    if (password.length < 8) throw new Error('Password must be at least 8 characters');
    const tokenHash = hashToken(token);
    const records = await sql<{ user_id: string; email: string }>(
      `SELECT t.user_id, u.email FROM account_activation_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > NOW() LIMIT 1`,
      { replacements: [tokenHash], type: QueryTypes.SELECT }
    );
    if (!records.length) throw new Error('Activation link is invalid or expired');
    const passwordHash = await bcrypt.hash(password, 12);
    await sequelize.transaction(async (transaction) => {
      await sql(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        { replacements: [passwordHash, records[0].user_id], transaction }
      );
      await sql(
        'UPDATE account_activation_tokens SET used_at = NOW() WHERE token_hash = ?',
        { replacements: [tokenHash], transaction }
      );
    });
    return { email: records[0].email };
  },

  // Returning students/teachers: claim portal access with an existing
  // 7-digit school ID (+ name match). Issues fresh credentials for login.
  async claimAccount(input: { schoolId: string; fullName: string; personalEmail: string; phone: string }) {
    const schoolId = (input.schoolId ?? '').trim();
    if (!/^\d{7}$/.test(schoolId)) throw new Error('School ID must be 7 digits');
    const nameParts = (input.fullName ?? '').trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 2 || !input.personalEmail?.includes('@') || !input.phone?.trim()) {
      throw new Error('Full name, valid email and phone are required');
    }
    const firstGuess = nameParts[0].toLowerCase();
    const lastGuess = nameParts[nameParts.length - 1].toLowerCase();
    // Students first, then teachers
    const studentRows = await sql<{ user_id: string; program: string }>(
      `SELECT user_id, program FROM students WHERE student_number = ? LIMIT 1`,
      { replacements: [schoolId], type: QueryTypes.SELECT }
    );
    const teacherRows = studentRows.length ? [] : await sql<{ user_id: string }>(
      `SELECT user_id FROM teachers WHERE employee_number = ? LIMIT 1`,
      { replacements: [schoolId], type: QueryTypes.SELECT }
    );
    const ownerId = studentRows.length || teacherRows.length
      ? (studentRows[0]?.user_id ?? teacherRows[0]?.user_id)
      : null;
    if (!ownerId) throw new Error('No school record found for that ID — apply as a new enrollee instead');
    const owners = await sql<{ id: string; email: string; first_name: string; last_name: string; role: string }>(
      `SELECT u.id, u.email, u.first_name, u.last_name, r.name AS role
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? AND u.is_active = TRUE LIMIT 1`,
      { replacements: [ownerId], type: QueryTypes.SELECT }
    );
    if (!owners.length) throw new Error('No school record found for that ID — apply as a new enrollee instead');
    const owner = owners[0];
    if (!owner.first_name.toLowerCase().includes(firstGuess) && !owner.last_name.toLowerCase().includes(lastGuess)) {
      if (!owner.last_name.toLowerCase().includes(firstGuess) && !owner.first_name.toLowerCase().includes(lastGuess)) {
        throw new Error('Name does not match our records for that school ID');
      }
    }
    const temporaryPassword = crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    await sql('UPDATE users SET password_hash = ?, phone = COALESCE(NULLIF(phone, \'\'), ?) WHERE id = ?', {
      replacements: [passwordHash, input.phone.trim(), owner.id], type: QueryTypes.UPDATE,
    });
    let emailSent = false;
    if (mailer) {
      await mailer.sendMail({
        from: env.emailFrom,
        to: input.personalEmail.trim(),
        subject: 'Your CEC School Portal credentials',
        text: `School email: ${owner.email}. Temporary password: ${temporaryPassword}. Please change it after you sign in.`,
        html: `<p>School email: <strong>${owner.email}</strong></p><p>Temporary password: <strong>${temporaryPassword}</strong></p><p>Please change it after you sign in.</p>`,
      });
      emailSent = true;
    }
    return { schoolEmail: owner.email, temporaryPassword, schoolId, emailSent, role: owner.role };
  },

  async loginWithGoogleIdToken(idToken: string) {
    if (!env.googleClientId) throw new Error('Google OAuth is not configured');
    const ticket = await googleClient.verifyIdToken({ idToken, audience: env.googleClientId });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || profile.email_verified === false) {
      throw new Error('A verified Google account is required');
    }
    const email = profile.email.trim();
    const existing = await sql<{
      id: string; email: string; first_name: string; last_name: string; role: string;
    }>(
      `SELECT u.id, u.email, u.first_name, u.last_name, r.name AS role
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE LOWER(u.email) = LOWER(?) AND u.is_active = TRUE LIMIT 1`,
      { replacements: [email], type: QueryTypes.SELECT }
    );
    let user = existing[0];
    const googlePicture = profile.picture ?? null;
    if (!user) {
      const role = await sql<{ id: number }>(
        'SELECT id FROM roles WHERE name = ? LIMIT 1',
        { replacements: ['student'], type: QueryTypes.SELECT }
      );
      if (!role.length) throw new Error('Student role is missing; run seed.sql');
      const userId = crypto.randomUUID();
      const firstName = profile.given_name?.trim() || email.split('@')[0];
      const lastName = profile.family_name?.trim() || firstName;
      const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 12);
      await sql(
        `INSERT INTO users (id, role_id, email, password_hash, first_name, last_name, avatar_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        { replacements: [userId, role[0].id, email, passwordHash, firstName, lastName, googlePicture], type: QueryTypes.INSERT }
      );
      user = { id: userId, email, first_name: firstName, last_name: lastName, role: 'student' };
    }
    await sql('UPDATE users SET last_login_at = NOW(), avatar_url = COALESCE(?, avatar_url) WHERE id = ?', {
      replacements: [googlePicture, user.id], type: QueryTypes.UPDATE,
    });
    const accessToken = accessTokenFor({ id: user.id, role: user.role, email: user.email });
    const refreshToken = await refreshSessionFor(user.id);
    return {
      accessToken,
      token: accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role, picture: googlePicture ?? undefined },
    };
  },

  async changePassword(identifier: string, currentPassword: string, newPassword: string) {
    if (!identifier?.trim() || !currentPassword || !newPassword) {
      throw new Error('Current and new passwords are required');
    }
    if (newPassword.length < 8) throw new Error('New password must be at least 8 characters');
    if (newPassword === currentPassword) throw new Error('New password must be different from the current one');
    const users = await sql<{ id: string; password_hash: string }>(
      `SELECT id, password_hash FROM users
       WHERE (LOWER(email) = LOWER(?) OR id = ?) AND is_active = TRUE LIMIT 1`,
      { replacements: [identifier.trim(), identifier.trim()], type: QueryTypes.SELECT }
    );
    if (!users.length || users[0].password_hash === 'ACTIVATION_PENDING') {
      throw new Error('Account not found');
    }
    const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!valid) throw new Error('Current password is incorrect');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await sql('UPDATE users SET password_hash = ? WHERE id = ?', {
      replacements: [passwordHash, users[0].id], type: QueryTypes.UPDATE,
    });
    return { id: users[0].id };
  },
};
