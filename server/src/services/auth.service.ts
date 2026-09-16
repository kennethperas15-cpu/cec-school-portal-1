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
    const schoolEmail = `${firstName}.${lastName}.${userId.slice(0, 6)}@cebueasterncollege.com`
      .toLowerCase().replace(/[^a-z0-9.@]/g, '');
    const temporaryPassword = crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const applicationId = crypto.randomUUID();

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
              `CEC-${new Date().getFullYear()}-${userId.slice(0, 8).toUpperCase()}`,
              input.program, input.yearLevel
            ],
            transaction
          }
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
    return { applicationId, status: 'approved', schoolEmail, temporaryPassword, emailSent };
  },

  async login(identifier: string, password: string) {
    const users = await sequelize.query<{
      id: string; email: string; password_hash: string; first_name: string; last_name: string; role: string;
    }>(
      `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, r.name AS role
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE (LOWER(u.email) = LOWER(?) OR u.id = ?) AND u.is_active = TRUE
       LIMIT 1`,
      { replacements: [identifier.trim(), identifier.trim()], type: QueryTypes.SELECT }
    );
    if (!users.length || users[0].password_hash === 'ACTIVATION_PENDING') {
      throw new Error('Invalid email or password');
    }
    const valid = await bcrypt.compare(password, users[0].password_hash);
    if (!valid) throw new Error('Invalid email or password');
    await sequelize.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', {
      replacements: [users[0].id],
      type: QueryTypes.UPDATE
    });
    const accessToken = jwt.sign(
      { sub: users[0].id, role: users[0].role, email: users[0].email },
      env.jwtSecret,
      { expiresIn: '8h' }
    );
    return {
      accessToken,
      user: {
        id: users[0].id,
        email: users[0].email,
        firstName: users[0].first_name,
        lastName: users[0].last_name,
        role: users[0].role
      }
    };
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
    if (!mailer) throw new Error('Email delivery is not configured');

    const application = applications[0];
    const userId = crypto.randomUUID();
    const localPart = `${application.first_name}.${application.last_name}`
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');
    const schoolEmail = `${localPart || 'student'}.${userId.slice(0, 6)}@cebueasterncollege.com`;
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const role = await sequelize.query<{ id: number }>(
      'SELECT id FROM roles WHERE name = ? LIMIT 1',
      { replacements: [application.requested_role], type: QueryTypes.SELECT }
    );
    if (!role.length) throw new Error('Student role is missing; run seed.sql');

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `INSERT INTO users (id, role_id, email, password_hash, first_name, last_name)
         VALUES (?, ?, ?, ?, ?, ?)`,
        { replacements: [userId, role[0].id, schoolEmail, 'ACTIVATION_PENDING', application.first_name, application.last_name], transaction }
      );
      await sequelize.query(
        `INSERT INTO account_activation_tokens (user_id, token_hash, expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
        { replacements: [userId, tokenHash], transaction }
      );
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

    const activationUrl = `${env.clientUrl}/activate?token=${token}`;
    await mailer.sendMail({
      from: env.emailFrom,
      to: application.email,
      subject: 'CEC Portal account activation',
      text: `Your enrollment was approved. Your school email is ${schoolEmail}. Activate your CEC Portal account within 24 hours: ${activationUrl}`,
      html: `<p>Your enrollment was approved.</p><p>Your school email is <strong>${schoolEmail}</strong>.</p><p><a href="${activationUrl}">Activate your CEC Portal account</a></p><p>This link expires in 24 hours.</p>`
    });
    return { personalEmail: application.email, schoolEmail };
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
  }
};
