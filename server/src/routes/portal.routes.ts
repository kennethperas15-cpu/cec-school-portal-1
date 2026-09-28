import { Router } from 'express';
import crypto from 'node:crypto';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { sql } from '../config/sql.js';
import { authmiddlewareMiddleware } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import { writeAuditLog } from '../services/audit.service.js';
import { authService } from '../services/auth.service.js';

const router = Router();

router.get('/health', async (_req, res, next) => {
  try {
    await sql('SELECT 1', { type: QueryTypes.SELECT });
    res.json({ success: true, db: 'connected' });
  } catch (error) { next(error); }
});

router.get('/config/academic', async (_req, res, next) => {
  try {
    const rows = await sql<{ config_key: string; config_value: string }>(
      `SELECT config_key, config_value FROM system_config WHERE is_public = TRUE AND config_key IN ('school_year', 'semester')`,
      { type: QueryTypes.SELECT }
    );
    const values = Object.fromEntries(rows.map((row) => [row.config_key, row.config_value]));
    res.json({ success: true, data: { schoolYear: values.school_year ?? '2026–2027', semester: values.semester ?? '1st Semester' } });
  } catch (error) { next(error); }
});

// ---- Enrollment queue shared by student <-> admin (real tables) ----
router.get('/enrollments', authmiddlewareMiddleware, requireRoles('admin'), async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
    const rows = await sql(
      `SELECT id, email, first_name, last_name, program, year_level, phone, requested_role, status,
              payment_reference_no, payment_status, student_status, assigned_school_id, school_year, semester, created_at
       FROM enrollment_applications WHERE status = ? ORDER BY created_at DESC LIMIT 100`,
      { replacements: [status], type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

router.post('/enrollments', async (req, res, next) => {
  try {
    const { fullName, personalEmail, phone, program, yearLevel, requestedRole } = req.body as {
      fullName?: string; personalEmail?: string; phone?: string; program?: string; yearLevel?: number; requestedRole?: string;
    };
    if (!fullName?.trim() || !personalEmail?.includes('@') || !program || typeof yearLevel !== 'number') {
      res.status(400).json({ success: false, message: 'Full name, valid email, program and year level are required' });
      return;
    }
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts.shift() ?? '';
    const lastName = parts.join(' ') || firstName;
    const id = crypto.randomUUID();
    await sql(
      `INSERT INTO enrollment_applications
       (id, google_subject, email, first_name, last_name, program, year_level, phone, requested_role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      { replacements: [id, `portal:${id}`, personalEmail.trim(), firstName, lastName, program, yearLevel, phone ?? null, requestedRole ?? 'student'], type: QueryTypes.INSERT }
    );
    res.status(201).json({ success: true, data: { id, status: 'pending' } });
  } catch (error) { next(error); }
});

// Public over-the-counter enrollment submission (new + returning students).
// Settles nothing online: only the Accounting Office reference number is
// collected here. Returns the reserved school ID + summary for the slip.
router.post('/enrollment/submit', async (req, res, next) => {
  try {
    const {
      applicantType, fullName, personalEmail, phone, address, program, yearLevel,
      schoolYear, semester, schoolId, paymentReferenceNo, educationLevel,
    } = req.body as {
      applicantType?: string; fullName?: string; personalEmail?: string; phone?: string; address?: string;
      program?: string; yearLevel?: number; schoolYear?: string; semester?: number;
      schoolId?: string; paymentReferenceNo?: string; educationLevel?: string;
    };
    if (applicantType !== 'new' && applicantType !== 'returning') {
      res.status(400).json({ success: false, message: 'Choose New Student or Returning Student' });
      return;
    }
    const result = await authService.submitPublicEnrollment({
      applicantType, fullName, personalEmail, phone, address, program, yearLevel,
      schoolYear, semester, schoolId, paymentReferenceNo: paymentReferenceNo ?? '', educationLevel,
    });
    res.status(201).json({ success: true, data: result, message: 'Enrollment submitted — pending accounting verification' });
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('Reference Number') || error.message.includes('Reference number') ||
      error.message.includes('full name') || error.message.includes('Full name') ||
      error.message.includes('email') || error.message.includes('contact') ||
      error.message.includes('program') || error.message.includes('Program') ||
      error.message.includes('year') || error.message.includes('Year') ||
      error.message.includes('semester') || error.message.includes('Semester') ||
      error.message.includes('7-digit') || error.message.includes('No school record')
    )) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

router.post('/enrollments/:id/decide', authmiddlewareMiddleware, requireRoles('admin'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { decision } = req.body as { decision?: string };
    if (decision !== 'approved' && decision !== 'rejected') {
      res.status(400).json({ success: false, message: 'Decision must be approved or rejected' });
      return;
    }
    if (decision === 'rejected') {
      await sql(
        `UPDATE enrollment_applications SET status = ?, reviewed_at = NOW() WHERE id = ? AND status = 'pending'`,
        { replacements: [decision, id], type: QueryTypes.UPDATE }
      );
      await writeAuditLog(req, { action: 'Enrollment rejected', targetType: 'EnrollmentApplication', targetId: id, newValue: { status: decision } });
      res.json({ success: true, data: { id, status: decision } });
      return;
    }
    // Approved: full provisioning — users + students rows, not just a status flip
    const provisioned = await authService.approveEnrollment(id);
    await writeAuditLog(req, { action: 'Enrollment approved', targetType: 'EnrollmentApplication', targetId: id, newValue: { status: 'approved', schoolEmail: provisioned.schoolEmail } });
    res.json({ success: true, data: { id, status: 'approved', ...provisioned } });
  } catch (error) { next(error); }
});

// ---- Live announcements: admin publishes once, every portal polls it ----
router.get('/announcements', async (req, res, next) => {
  try {
    const audience = typeof req.query.audience === 'string' ? req.query.audience : 'all';
    const rows = await sql(
      `SELECT a.id, a.title, a.content, a.audience, a.published_at,
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS published_by_name
       FROM announcements a LEFT JOIN users u ON u.id = a.published_by
       WHERE a.published_at IS NOT NULL AND (a.audience = 'all' OR a.audience = ?)
       ORDER BY a.published_at DESC LIMIT 50`,
      { replacements: [audience], type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

router.post('/announcements', authmiddlewareMiddleware, requireRoles('admin'), async (req, res, next) => {
  try {
    const { title, content, audience } = req.body as { title?: string; content?: string; audience?: string };
    if (!title?.trim() || !content?.trim()) {
      res.status(400).json({ success: false, message: 'Title and details are required' });
      return;
    }
    if (audience && !['all', 'students', 'teachers', 'admins'].includes(audience)) {
      res.status(400).json({ success: false, message: 'Invalid audience' });
      return;
    }
    const rows = await sql<{ id: number }>(
      `INSERT INTO announcements (title, content, audience, published_by, published_at)
       VALUES (?, ?, ?, ?, NOW()) RETURNING id`,
      {
        replacements: [title.trim(), content.trim(), audience ?? 'all', req.user?.id ?? null],
        type: QueryTypes.SELECT,
      }
    );
    await writeAuditLog(req, { action: 'Announcement published', targetType: 'Announcement', targetId: String(rows[0]?.id ?? ''), newValue: { title: title.trim(), audience: audience ?? 'all' } });
    res.status(201).json({ success: true, data: { id: rows[0]?.id ?? null, title: title.trim(), audience: audience ?? 'all' } });
  } catch (error) { next(error); }
});

// ---- Shared portal items (all modules, all roles) ----
router.get('/items', async (req, res, next) => {
  try {
    const portal = typeof req.query.portal === 'string' ? req.query.portal : undefined;
    const module = typeof req.query.module === 'string' ? req.query.module : undefined;
    const where = [portal ? 'portal = ?' : '1=1', module ? 'module = ?' : '1=1'].join(' AND ');
    const replacements = [portal, module].filter((v): v is string => !!v);
    const rows = await sql(
      `SELECT id, portal, module, title, detail, status, owner, created_at FROM portal_items WHERE ${where} ORDER BY created_at DESC LIMIT 200`,
      { replacements, type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

router.post('/items', authmiddlewareMiddleware, requireRoles('admin', 'teacher', 'student'), async (req, res, next) => {
  try {
    const { portal, module, title, detail, status, owner } = req.body as {
      portal?: string; module?: string; title?: string; detail?: string; status?: string; owner?: string;
    };
    if (!portal?.trim() || !module?.trim() || !title?.trim()) {
      res.status(400).json({ success: false, message: 'portal, module and title are required' });
      return;
    }
    const id = crypto.randomUUID();
    await sql(
      `INSERT INTO portal_items (id, portal, module, title, detail, status, owner) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      { replacements: [id, portal.trim(), module.trim(), title.trim(), detail ?? null, status ?? 'New', owner ?? null], type: QueryTypes.INSERT }
    );
    await writeAuditLog(req, { action: 'Portal item created', targetType: 'PortalItem', targetId: id, newValue: { portal, module, title, status } });
    res.status(201).json({ success: true, data: { id } });
  } catch (error) { next(error); }
});

router.put('/items/:id', authmiddlewareMiddleware, requireRoles('admin', 'teacher'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { title, detail, status, owner } = req.body as { title?: string; detail?: string; status?: string; owner?: string };
    await sql(
      `UPDATE portal_items SET title = COALESCE(?, title), detail = COALESCE(?, detail), status = COALESCE(?, status), owner = COALESCE(?, owner) WHERE id = ?`,
      { replacements: [title ?? null, detail ?? null, status ?? null, owner ?? null, id], type: QueryTypes.UPDATE }
    );
    await writeAuditLog(req, { action: 'Portal item updated', targetType: 'PortalItem', targetId: id, newValue: { title, detail, status, owner } });
    res.json({ success: true, data: { id } });
  } catch (error) { next(error); }
});

router.delete('/items/:id', authmiddlewareMiddleware, requireRoles('admin', 'teacher'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await sql(`DELETE FROM portal_items WHERE id = ?`, { replacements: [id], type: QueryTypes.UPDATE });
    await writeAuditLog(req, { action: 'Portal item deleted', targetType: 'PortalItem', targetId: id });
    res.json({ success: true, data: { id } });
  } catch (error) { next(error); }
});

export default router;
