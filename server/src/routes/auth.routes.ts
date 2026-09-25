import { Router } from 'express';
import { authService } from '../services/auth.service.js';
import { env } from '../config/env.js';
import { loginRateLimit } from '../middleware/rate-limit.middleware.js';

const router = Router();

router.post('/google/login-url', (_req, res, next) => {
  try {
    res.json({ success: true, url: authService.createGoogleLoginUrl() });
  } catch (error) {
    next(error);
  }
});

router.get('/google/login-callback', async (req, res, next) => {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !state) {
      res.status(400).send('Google login was cancelled.');
      return;
    }
    const token = await authService.completeGoogleLogin(code, state);
    res.redirect(`${env.clientUrl}/?googleEnrollmentToken=${encodeURIComponent(token)}`);
  } catch (error) {
    next(error);
  }
});

router.post('/enrollment', async (req, res, next) => {
  try {
    const { fullName, personalEmail, phone, program, yearLevel, requestedRole, googleToken, schoolId } = req.body as {
      fullName?: string; personalEmail?: string; phone?: string; program?: string; yearLevel?: number;
      requestedRole?: 'student' | 'teacher' | 'admin'; googleToken?: string; schoolId?: string;
    };
    if (!fullName?.trim() || !personalEmail?.trim() || !phone?.trim() || !program?.trim() ||
      typeof yearLevel !== 'number' || !Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 6) {
      res.status(400).json({ success: false, message: 'All enrollment fields are required' });
      return;
    }
    if (requestedRole && !['student', 'teacher', 'admin'].includes(requestedRole)) {
      res.status(400).json({ success: false, message: 'Invalid requested role' });
      return;
    }
    const result = await authService.submitEnrollment({ fullName, personalEmail, phone, program, yearLevel, requestedRole, googleToken, schoolId });
    res.status(201).json({
      success: true,
      data: result,
      message: result.emailSent
        ? 'Account details were sent to the submitted Gmail'
        : 'Account was created, but email delivery is not configured'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', loginRateLimit(), async (req, res, next) => {
  try {
    const { identifier, password } = req.body as { identifier?: string; password?: string };
    if (!identifier?.trim() || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }
    const result = await authService.login(identifier, password);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Invalid email or password' || error.message.includes('temporarily locked'))) {
      res.status(401).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      res.status(401).json({ success: false, message: 'Refresh token is required' });
      return;
    }
    res.json({ success: true, data: await authService.refresh(refreshToken) });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Refresh session')) {
      res.status(401).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken) await authService.revokeRefresh(refreshToken);
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.post('/google/id-token', async (req, res, next) => {
  try {
    const { idToken } = req.body as { idToken?: string };
    if (!idToken) {
      res.status(400).json({ success: false, message: 'Google ID token is required' });
      return;
    }
    const result = await authService.loginWithGoogleIdToken(idToken);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', async (req, res, next) => {
  try {
    const { identifier, currentPassword, newPassword } = req.body as {
      identifier?: string; currentPassword?: string; newPassword?: string;
    };
    const result = await authService.changePassword(identifier ?? '', currentPassword ?? '', newPassword ?? '');
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('required') || error.message.includes('at least 8') ||
      error.message.includes('different') || error.message.includes('incorrect') || error.message.includes('not found')
    )) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

router.post('/claim', async (req, res, next) => {
  try {
    const { schoolId, fullName, personalEmail, phone } = req.body as {
      schoolId?: string; fullName?: string; personalEmail?: string; phone?: string;
    };
    const result = await authService.claimAccount({
      schoolId: schoolId ?? '', fullName: fullName ?? '',
      personalEmail: personalEmail ?? '', phone: phone ?? '',
    });
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('7 digits') || error.message.includes('required') ||
      error.message.includes('No school record') || error.message.includes('does not match')
    )) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

router.post('/google/enrollment-url', (req, res, next) => {
  try {
    const { program, yearLevel, phone } = req.body as { program?: string; yearLevel?: number; phone?: string };
    if (!program || typeof yearLevel !== 'number' || !Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 6) {
      res.status(400).json({ success: false, message: 'Program and year level are required' });
      return;
    }
    res.json({ success: true, url: authService.createGoogleEnrollmentUrl({ program, yearLevel, phone }) });
  } catch (error) {
    next(error);
  }
});

router.get('/google/callback', async (req, res, next) => {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !state) {
      res.status(400).send('Google enrollment was cancelled or missing required data.');
      return;
    }
    const result = await authService.completeGoogleEnrollment(code, state);
    res.redirect(`${process.env.CLIENT_URL ?? 'http://localhost:5173'}/?enrollment=${result.status}`);
  } catch (error) {
    next(error);
  }
});

router.post('/enrollment/:id/approve', async (req, res, next) => {
  try {
    if (!env.enrollmentApprovalSecret || req.header('x-enrollment-approval-secret') !== env.enrollmentApprovalSecret) {
      res.status(403).json({ success: false, message: 'Enrollment approval is restricted' });
      return;
    }
    const result = await authService.approveEnrollment(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/activate', async (req, res, next) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password) {
      res.status(400).json({ success: false, message: 'Activation token and password are required' });
      return;
    }
    const result = await authService.activateAccount(token, password);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
