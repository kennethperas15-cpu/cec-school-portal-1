import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
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
  await sequelize.query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
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
    const role = await sequelize.query<{ id: number }>(
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
    // Keep a caller-provided 7-digit school ID (2 student • 3 teacher • 4 admin)
    const idLead = requestedRole === 'teacher' ? '3' : requestedRole === 'admin' ? '4' : '2';
    const providedId = typeof input.schoolId === 'string' && new RegExp(`^${idLead}\\d{6}$`).test(input.schoolId.trim())
      ? input.schoolId.trim()
      : null;
    const studentNumber = providedId ?? `CEC-${new Date().getFullYear()}-${userId.slice(0, 8).toUpperCase()}`;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `INSERT INTO users (id, role_id, email, password_hash, first_name, last_name, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        { replacements: [userId, role[0].id, schoolEmail, passwordHash, firstName, lastName, input.phone], transaction }
      );
      await sequelize.query(
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
        await sequelize.query(
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
        await sequelize.query(
          `INSERT INTO teachers (id, user_id, employee_number, employment_status)
           VALUES (?, ?, ?, 'active')
           ON DUPLICATE KEY UPDATE employee_number = VALUES(employee_number)`,
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

  async login(identifier: string, password: string) {
    const users = await sequelize.query<{
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
      await sequelize.query(
        `UPDATE users SET failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE WHEN failed_login_attempts + 1 >= 5 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE) ELSE locked_until END
         WHERE id = ?`,
        { replacements: [users[0].id], type: QueryTypes.UPDATE }
      );
      throw new Error('Invalid email or password');
    }
    await sequelize.query('UPDATE users SET last_login_at = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE id = ?', {
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
    const rows = await sequelize.query<{ id: string; user_id: string; email: string; first_name: string; last_name: string; role: string }>(
      `SELECT s.id, s.user_id, u.email, u.first_name, u.last_name, r.name AS role
       FROM sessions s JOIN users u ON u.id = s.user_id JOIN roles r ON r.id = u.role_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > NOW() AND u.is_active = TRUE LIMIT 1`,
      { replacements: [hashToken(refreshToken)], type: QueryTypes.SELECT }
    );
    if (!rows.length) throw new Error('Refresh session expired or revoked');
    await sequelize.query('UPDATE sessions SET revoked_at = NOW() WHERE id = ?', { replacements: [rows[0].id], type: QueryTypes.UPDATE });
    const user = { id: rows[0].user_id, email: rows[0].email, role: rows[0].role };
    return {
      accessToken: accessTokenFor(user),
      refreshToken: await refreshSessionFor(user.id),
      user: { id: user.id, email: user.email, firstName: rows[0].first_name, lastName: rows[0].last_name, role: user.role },
    };
  },

  async revokeRefresh(refreshToken: string) {
    await sequelize.query('UPDATE sessions SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL', {
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

    const existing = await sequelize.query<{ id: string }>(
      'SELECT id FROM enrollment_applications WHERE google_subject = ? OR email = ? LIMIT 1',
      { replacements: [profile.sub, profile.email], type: QueryTypes.SELECT }
    );
    if (existing.length) return { id: existing[0].id, status: 'pending' };

    const id = crypto.randomUUID();
    await sequelize.query(
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
    const applications = await sequelize.query<{
      email: string; first_name: string; last_name: string; program: string; year_level: number; requested_role: 'student' | 'teacher' | 'admin';
    }>(
      `SELECT email, first_name, last_name, program, year_level, requested_role
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
    const role = await sequelize.query<{ id: number }>(
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

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `INSERT INTO users (id, role_id, email, password_hash, first_name, last_name)
         VALUES (?, ?, ?, ?, ?, ?)`,
        { replacements: [userId, role[0].id, schoolEmail, passwordHash, application.first_name, application.last_name], transaction }
      );
      if (tokenHash) {
        await sequelize.query(
          `INSERT INTO account_activation_tokens (user_id, token_hash, expires_at)
           VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
          { replacements: [userId, tokenHash], transaction }
        );
      }
      await sequelize.query(
        `UPDATE enrollment_applications SET status = 'approved', user_id = ?, reviewed_at = NOW()
         WHERE id = ?`,
        { replacements: [userId, applicationId], transaction }
      );
      if (application.requested_role === 'student') {
        await sequelize.query(
          `INSERT INTO students (id, user_id, student_number, program, year_level)
           VALUES (?, ?, ?, ?, ?)`,
          {
            replacements: [
              crypto.randomUUID(), userId,
              `CEC-${new Date().getFullYear()}-${userId.slice(0, 8).toUpperCase()}`,
              application.program, application.year_level
            ],
            transaction
          }
        );
      }
    });

    if (!mailer) {
      return { personalEmail: application.email, schoolEmail, temporaryPassword, emailSent: false };
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
    const records = await sequelize.query<{ user_id: string; email: string }>(
      `SELECT t.user_id, u.email FROM account_activation_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > NOW() LIMIT 1`,
      { replacements: [tokenHash], type: QueryTypes.SELECT }
    );
    if (!records.length) throw new Error('Activation link is invalid or expired');
    const passwordHash = await bcrypt.hash(password, 12);
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        { replacements: [passwordHash, records[0].user_id], transaction }
      );
      await sequelize.query(
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
    const studentRows = await sequelize.query<{ user_id: string; program: string }>(
      `SELECT user_id, program FROM students WHERE student_number = ? LIMIT 1`,
      { replacements: [schoolId], type: QueryTypes.SELECT }
    );
    const teacherRows = studentRows.length ? [] : await sequelize.query<{ user_id: string }>(
      `SELECT user_id FROM teachers WHERE employee_number = ? LIMIT 1`,
      { replacements: [schoolId], type: QueryTypes.SELECT }
    );
    const ownerId = studentRows.length || teacherRows.length
      ? (studentRows[0]?.user_id ?? teacherRows[0]?.user_id)
      : null;
    if (!ownerId) throw new Error('No school record found for that ID — apply as a new enrollee instead');
    const owners = await sequelize.query<{ id: string; email: string; first_name: string; last_name: string; role: string }>(
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
    await sequelize.query('UPDATE users SET password_hash = ?, phone = COALESCE(NULLIF(phone, \'\'), ?) WHERE id = ?', {
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
    const existing = await sequelize.query<{
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
      const role = await sequelize.query<{ id: number }>(
        'SELECT id FROM roles WHERE name = ? LIMIT 1',
        { replacements: ['student'], type: QueryTypes.SELECT }
      );
      if (!role.length) throw new Error('Student role is missing; run seed.sql');
      const userId = crypto.randomUUID();
      const firstName = profile.given_name?.trim() || email.split('@')[0];
      const lastName = profile.family_name?.trim() || firstName;
      const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 12);
      await sequelize.query(
        `INSERT INTO users (id, role_id, email, password_hash, first_name, last_name, avatar_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        { replacements: [userId, role[0].id, email, passwordHash, firstName, lastName, googlePicture], type: QueryTypes.INSERT }
      );
      user = { id: userId, email, first_name: firstName, last_name: lastName, role: 'student' };
    }
    await sequelize.query('UPDATE users SET last_login_at = NOW(), avatar_url = COALESCE(?, avatar_url) WHERE id = ?', {
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
    const users = await sequelize.query<{ id: string; password_hash: string }>(
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
    await sequelize.query('UPDATE users SET password_hash = ? WHERE id = ?', {
      replacements: [passwordHash, users[0].id], type: QueryTypes.UPDATE,
    });
    return { id: users[0].id };
  },
};
