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
    const schoolYear = typeof req.query.schoolYear === 'string' && req.query.schoolYear ? req.query.schoolYear : null;
    const semester = typeof req.query.semester === 'string' && req.query.semester ? Number(req.query.semester) : null;
    const where = ['status = ?', ...(schoolYear ? ['school_year = ?'] : []), ...(semester ? ['semester = ?'] : [])].join(' AND ');
    const replacements: (string | number)[] = [status];
    if (schoolYear) replacements.push(schoolYear);
    if (semester) replacements.push(semester);
    const rows = await sql(
      `SELECT id, email, first_name, last_name, program, year_level, phone, requested_role, status,
              payment_reference_no, payment_status, student_status, assigned_school_id, school_year, semester, created_at
       FROM enrollment_applications WHERE ${where} ORDER BY created_at DESC LIMIT 100`,
      { replacements, type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

router.post('/enrollments', async (req, res, next) => {
  try {
    const { fullName, personalEmail, phone, program, yearLevel, requestedRole, schoolYear, semester } = req.body as {
      fullName?: string; personalEmail?: string; phone?: string; program?: string; yearLevel?: number; requestedRole?: string;
      schoolYear?: string; semester?: number;
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
       (id, google_subject, email, first_name, last_name, program, year_level, phone, requested_role, status, school_year, semester)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      { replacements: [id, `portal:${id}`, personalEmail.trim(), firstName, lastName, program, yearLevel, phone ?? null, requestedRole ?? 'student', schoolYear?.trim() || null, typeof semester === 'number' ? semester : null], type: QueryTypes.INSERT }
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
      classification, lrn, details,
    } = req.body as {
      applicantType?: string; fullName?: string; personalEmail?: string; phone?: string; address?: string;
      program?: string; yearLevel?: number; schoolYear?: string; semester?: number;
      schoolId?: string; paymentReferenceNo?: string; educationLevel?: string;
      classification?: string; lrn?: string; details?: Record<string, unknown>;
    };
    if (applicantType !== 'new' && applicantType !== 'returning') {
      res.status(400).json({ success: false, message: 'Choose New Student or Returning Student' });
      return;
    }
    const result = await authService.submitPublicEnrollment({
      applicantType, fullName, personalEmail, phone, address, program, yearLevel,
      schoolYear, semester, schoolId, paymentReferenceNo: paymentReferenceNo ?? '', educationLevel,
      classification, lrn, details,
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
      error.message.includes('7-digit') || error.message.includes('No school record') ||
      error.message.includes('classification') || error.message.includes('Learner Reference')
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
    const category = typeof req.query.category === 'string' && ['General', 'Urgent', 'Events'].includes(req.query.category)
      ? req.query.category
      : null;
    const where = `(a.audience = 'all' OR a.audience = ?)${category ? ' AND a.category = ?' : ''}`;
    const replacements = category ? [audience, category] : [audience];
    const rows = await sql(
      `SELECT a.id, a.title, a.content, a.audience, a.category, a.published_at,
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS published_by_name
       FROM announcements a LEFT JOIN users u ON u.id = a.published_by
       WHERE a.published_at IS NOT NULL AND ${where}
       ORDER BY a.published_at DESC LIMIT 50`,
      { replacements, type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

router.post('/announcements', authmiddlewareMiddleware, requireRoles('admin'), async (req, res, next) => {
  try {
    const { title, content, audience, category } = req.body as { title?: string; content?: string; audience?: string; category?: string };
    if (!title?.trim() || !content?.trim()) {
      res.status(400).json({ success: false, message: 'Title and details are required' });
      return;
    }
    if (audience && !['all', 'students', 'teachers', 'admins'].includes(audience)) {
      res.status(400).json({ success: false, message: 'Invalid audience' });
      return;
    }
    if (category && !['General', 'Urgent', 'Events'].includes(category)) {
      res.status(400).json({ success: false, message: 'Invalid category' });
      return;
    }
    const rows = await sql<{ id: number }>(
      `INSERT INTO announcements (title, content, audience, category, published_by, published_at)
       VALUES (?, ?, ?, ?, ?, NOW()) RETURNING id`,
      {
        replacements: [title.trim(), content.trim(), audience ?? 'all', category ?? 'General', req.user?.id ?? null],
        type: QueryTypes.SELECT,
      }
    );
    await writeAuditLog(req, { action: 'Announcement published', targetType: 'Announcement', targetId: String(rows[0]?.id ?? ''), newValue: { title: title.trim(), audience: audience ?? 'all', category: category ?? 'General' } });
    res.status(201).json({ success: true, data: { id: rows[0]?.id ?? null, title: title.trim(), audience: audience ?? 'all', category: category ?? 'General' } });
  } catch (error) { next(error); }
});

// Withdraw a bulletin. The registrar publishes one audience at a time and has to
// be able to take it back down; the audit trail keeps the removal.
router.delete('/announcements/:id', authmiddlewareMiddleware, requireRoles('admin'), async (req, res, next) => {
  try {
    const id = String(req.params.id ?? '').trim();
    if (!/^\d+$/.test(id)) {
      res.status(400).json({ success: false, message: 'A numeric announcement id is required' });
      return;
    }
    const rows = await sql<{ id: number; title: string }>(
      'SELECT id, title FROM announcements WHERE id = ? LIMIT 1',
      { replacements: [id], type: QueryTypes.SELECT }
    );
    if (!rows.length) {
      res.status(400).json({ success: false, message: 'No bulletin with that id' });
      return;
    }
    await sql('DELETE FROM announcements WHERE id = ?', { replacements: [id], type: QueryTypes.DELETE });
    await writeAuditLog(req, { action: 'Announcement withdrawn', targetType: 'Announcement', targetId: id, previousValue: rows[0] });
    res.json({ success: true, message: `“${rows[0].title}” withdrawn`, data: { id: Number(id) } });
  } catch (error) { next(error); }
});

// ---- Certificate of Enrollment requests ----
router.post('/coe', authmiddlewareMiddleware, async (req, res, next) => {
  try {
    const { fullName, program, yearLevel, purpose } = req.body as {
      fullName?: string; program?: string; yearLevel?: number; purpose?: string;
    };
    const result = await authService.requestCoe({
      userId: req.user?.id ?? null, fullName: fullName ?? '', program, yearLevel, purpose,
    });
    res.status(201).json({ success: true, data: result, message: 'COE request submitted — track it with your transaction number' });
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('full name') || error.message.includes('Full name') ||
      error.message.includes('transaction number')
    )) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

router.get('/coe/track', async (req, res, next) => {
  try {
    const transactionNo = typeof req.query.transactionNo === 'string' ? req.query.transactionNo : '';
    try {
      res.json({ success: true, data: await authService.trackCoe(transactionNo) });
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('No COE request') || error.message.includes('transaction number')
      )) {
        res.status(404).json({ success: false, message: error.message });
        return;
      }
      throw error;
    }
  } catch (error) { next(error); }
});

router.get('/coe', authmiddlewareMiddleware, requireRoles('admin'), async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json({ success: true, data: await authService.listCoe(status) });
  } catch (error) { next(error); }
});

router.post('/coe/:id/decide', authmiddlewareMiddleware, requireRoles('admin'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { decision } = req.body as { decision?: string };
    const result = await authService.decideCoe(id, decision as 'ready' | 'rejected', req.user?.id ?? '');
    await writeAuditLog(req, { action: `COE ${decision}`, targetType: 'CoeRequest', targetId: id, newValue: result });
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('Decision') || error.message.includes('not found')
    )) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

// ---- Real-time conversations (Socket.io persists here too) ----
router.get('/conversations', authmiddlewareMiddleware, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? '';
    const rows = await sql<{
      id: string; created_at: Date; peer_name: string | null; last_body: string | null; last_at: Date | null;
    }>(
      `SELECT c.id, c.created_at,
              (SELECT TRIM(CONCAT(u.first_name, ' ', u.last_name))
               FROM conversation_participants p JOIN users u ON u.id = p.user_id
               WHERE p.conversation_id = c.id AND p.user_id <> ? LIMIT 1) AS peer_name,
              (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_body,
              (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_at
       FROM conversations c JOIN conversation_participants mine
         ON mine.conversation_id = c.id AND mine.user_id = ?
       ORDER BY last_at DESC NULLS LAST, c.created_at DESC LIMIT 50`,
      { replacements: [userId, userId], type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

router.post('/conversations', authmiddlewareMiddleware, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? '';
    const { identifier } = req.body as { identifier?: string };
    if (!identifier?.trim()) {
      res.status(400).json({ success: false, message: 'School ID or email is required' });
      return;
    }
    const id = identifier.trim();
    const peers = await sql<{ id: string; first_name: string; last_name: string }>(
      `SELECT u.id, u.first_name, u.last_name FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN teachers t ON t.user_id = u.id
       WHERE u.is_active = TRUE AND u.id <> ?
         AND (LOWER(u.email) = LOWER(?) OR s.student_number = ? OR t.employee_number = ?) LIMIT 1`,
      { replacements: [userId, id, id, id], type: QueryTypes.SELECT }
    );
    if (!peers.length) {
      res.status(404).json({ success: false, message: 'No school account found for that ID or email' });
      return;
    }
    const existing = await sql<{ id: string }>(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants a ON a.conversation_id = c.id AND a.user_id = ?
       JOIN conversation_participants b ON b.conversation_id = c.id AND b.user_id = ?
       LIMIT 1`,
      { replacements: [userId, peers[0].id], type: QueryTypes.SELECT }
    );
    if (existing.length) {
      res.json({ success: true, data: { id: existing[0].id, peerName: `${peers[0].first_name} ${peers[0].last_name}`.trim() } });
      return;
    }
    const conversationId = crypto.randomUUID();
    await sequelize.transaction(async (transaction) => {
      await sql('INSERT INTO conversations (id) VALUES (?)', { replacements: [conversationId], transaction });
      await sql(
        'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)',
        { replacements: [conversationId, userId, conversationId, peers[0].id], transaction }
      );
    });
    res.status(201).json({ success: true, data: { id: conversationId, peerName: `${peers[0].first_name} ${peers[0].last_name}`.trim() } });
  } catch (error) { next(error); }
});

router.get('/conversations/:id/messages', authmiddlewareMiddleware, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? '';
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const member = await sql<{ conversation_id: string }>(
      'SELECT conversation_id FROM conversation_participants WHERE conversation_id = ? AND user_id = ? LIMIT 1',
      { replacements: [id, userId], type: QueryTypes.SELECT }
    );
    if (!member.length) {
      res.status(403).json({ success: false, message: 'Not a participant of this conversation' });
      return;
    }
    const rows = await sql<{
      id: number; sender_id: string; sender_name: string; body: string; created_at: Date;
    }>(
      `SELECT m.id, m.sender_id, TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS sender_name, m.body, m.created_at
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = ? ORDER BY m.created_at ASC LIMIT 200`,
      { replacements: [id], type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: rows });
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

/* ---------------------------------------------------------------------------
 * Academic records — the official grades and attendance a faculty member posts.
 *
 * These are deliberately NOT part of the public /items shelf above: a grade is
 * personal data. Every route here is authenticated and scoped to the caller — a
 * teacher reads and manages only their own submissions, a student reads only the
 * documents carrying their seven-digit school ID, and the registrar (admin) sees
 * the whole school. One document per (module, teacher, student, term), so
 * publishing twice edits the same record instead of stacking duplicates.
 * ------------------------------------------------------------------------- */

/** Route segment -> the `portal_items.module` it stores under. */
const RECORD_MODULES: Record<string, { module: string; label: string }> = {
  grades: { module: 'grade', label: 'Grades' },
  attendance: { module: 'attendance', label: 'Attendance' },
};

/** Academic records hold one row per student, so a wider page than /items. */
const RECORD_PAGE_SIZE = 500;
const RECORD_ENTRY_LIMIT = 500;

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Term comparison that tolerates en dashes and odd spacing. */
const fold = (value: string): string =>
  value.toLowerCase().replace(/[\u2010-\u2015\u2212-]+/g, '-').replace(/\s+/g, ' ').trim();

/** The signed-in account's seven-digit school number, when it has one. */
const schoolNumberOf = async (userId: string): Promise<string> => {
  const rows = await sql<{ student_number: string | null; employee_number: string | null }>(
    `SELECT s.student_number, t.employee_number
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN teachers t ON t.user_id = u.id
      WHERE u.id = ? LIMIT 1`,
    { replacements: [userId], type: QueryTypes.SELECT }
  );
  return rows[0]?.student_number ?? rows[0]?.employee_number ?? '';
};

/** Display name behind the bearer token, kept for the record's provenance. */
const displayNameOf = async (userId: string): Promise<string> => {
  const rows = await sql<{ first_name: string; last_name: string }>(
    `SELECT first_name, last_name FROM users WHERE id = ? LIMIT 1`,
    { replacements: [userId], type: QueryTypes.SELECT }
  );
  return rows.length ? `${rows[0].first_name} ${rows[0].last_name}`.replace(/\s+/g, ' ').trim() : '';
};

router.get('/records/:module', authmiddlewareMiddleware, async (req, res, next) => {
  try {
    const key = String(req.params.module ?? '');
    const target = RECORD_MODULES[key];
    if (!target) { res.status(400).json({ success: false, message: 'Unknown academic record module' }); return; }
    const role = req.user?.role ?? '';
    const where = ['portal = ?', 'module = ?'];
    const replacements: string[] = ['student', target.module];
    if (role === 'teacher') {
      // A faculty member sees exactly what they posted.
      where.push('owner = ?');
      replacements.push(req.user?.email ?? '');
    } else if (role !== 'admin') {
      // A student sees exactly their own document, matched on the school ID the
      // record was posted under. No ID on the account means nothing to read —
      // never somebody else's marks.
      const schoolNumber = await schoolNumberOf(req.user?.id ?? '');
      if (!schoolNumber) { res.json({ success: true, data: [] }); return; }
      where.push('title LIKE ?');
      replacements.push(`${target.label} · ${schoolNumber} %`);
    }
    const rows = await sql(
      `SELECT id, portal, module, title, detail, status, owner, created_at, updated_at
         FROM portal_items WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ${RECORD_PAGE_SIZE}`,
      { replacements, type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

router.post('/records/:module', authmiddlewareMiddleware, requireRoles('admin', 'teacher'), async (req, res, next) => {
  try {
    const key = String(req.params.module ?? '');
    const target = RECORD_MODULES[key];
    if (!target) { res.status(400).json({ success: false, message: 'Unknown academic record module' }); return; }

    const body = req.body as {
      schoolYear?: unknown; semester?: unknown; studentId?: unknown; studentName?: unknown;
      section?: unknown; program?: unknown; entries?: unknown;
    };
    const schoolYear = asString(body.schoolYear);
    const semester = asString(body.semester);
    const studentId = asString(body.studentId);
    const studentName = asString(body.studentName);
    if (!schoolYear || !semester) {
      res.status(400).json({ success: false, message: 'The school year and semester are required' });
      return;
    }
    // The school ID is the only safe join key: a record posted without one could
    // never be shown to the right student, so it is refused instead.
    if (!/^2\d{6}$/.test(studentId)) {
      res.status(400).json({ success: false, message: "A student's seven-digit school ID (2xxxxxx) is required" });
      return;
    }
    const entries = Array.isArray(body.entries) ? body.entries.slice(0, RECORD_ENTRY_LIMIT) : [];

    const postedBy = req.user?.email ?? '';
    const postedByName = (await displayNameOf(req.user?.id ?? '')) || postedBy;
    const now = new Date().toISOString();

    const candidates = await sql<{ id: string; detail: string | null }>(
      `SELECT id, detail FROM portal_items
        WHERE portal = 'student' AND module = ? AND owner = ? AND title LIKE ?`,
      { replacements: [target.module, postedBy, `${target.label} · ${studentId} %`], type: QueryTypes.SELECT }
    );
    let existing: { id: string; postedAt?: string } | null = null;
    for (const row of candidates) {
      try {
        const parsed = JSON.parse(row.detail ?? '') as { v?: number; schoolYear?: string; semester?: string; postedAt?: string };
        if (parsed.v === 1 && fold(parsed.schoolYear ?? '') === fold(schoolYear) && fold(parsed.semester ?? '') === fold(semester)) {
          existing = { id: row.id, postedAt: parsed.postedAt };
          break;
        }
      } catch { /* an older or damaged row simply is not the one being updated */ }
    }

    const doc: Record<string, unknown> = {
      v: 1,
      schoolYear,
      semester,
      studentId,
      studentName,
      section: asString(body.section),
      program: asString(body.program),
      entries,
      postedBy,
      postedByName,
      postedAt: existing?.postedAt || now,
    };
    if (existing) {
      doc.updatedAt = now;
      doc.updatedByName = postedByName;
    }
    const title = `${target.label} · ${studentId}${studentName ? ` ${studentName}` : ''}`.slice(0, 255);
    const detail = JSON.stringify(doc);

    if (existing) {
      await sql(
        `UPDATE portal_items SET title = ?, detail = ?, status = 'Posted', updated_at = NOW() WHERE id = ?`,
        { replacements: [title, detail, existing.id], type: QueryTypes.UPDATE }
      );
      await writeAuditLog(req, {
        action: 'Academic record updated', targetType: 'AcademicRecord', targetId: existing.id,
        newValue: { module: target.module, studentId, schoolYear, semester, entries: entries.length },
      });
      res.json({ success: true, data: { id: existing.id, created: false } });
      return;
    }

    const id = crypto.randomUUID();
    await sql(
      `INSERT INTO portal_items (id, portal, module, title, detail, status, owner)
       VALUES (?, 'student', ?, ?, ?, 'Posted', ?)`,
      { replacements: [id, target.module, title, detail, postedBy], type: QueryTypes.INSERT }
    );
    await writeAuditLog(req, {
      action: 'Academic record posted', targetType: 'AcademicRecord', targetId: id,
      newValue: { module: target.module, studentId, schoolYear, semester, entries: entries.length },
    });
    res.status(201).json({ success: true, data: { id, created: true } });
  } catch (error) { next(error); }
});

router.delete('/records/:module/:id', authmiddlewareMiddleware, requireRoles('admin', 'teacher'), async (req, res, next) => {
  try {
    const key = String(req.params.module ?? '');
    const target = RECORD_MODULES[key];
    if (!target) { res.status(400).json({ success: false, message: 'Unknown academic record module' }); return; }
    const id = String(req.params.id ?? '');
    const rows = await sql<{ owner: string | null }>(
      `SELECT owner FROM portal_items WHERE id = ? AND module = ? LIMIT 1`,
      { replacements: [id, target.module], type: QueryTypes.SELECT }
    );
    if (!rows.length) { res.status(404).json({ success: false, message: 'Academic record not found' }); return; }
    const mine = fold(rows[0].owner ?? '') === fold(req.user?.email ?? '');
    if (req.user?.role !== 'admin' && !mine) {
      res.status(403).json({ success: false, message: 'Only the faculty member who posted this record, or the registrar, can retract it' });
      return;
    }
    await sql(`DELETE FROM portal_items WHERE id = ?`, { replacements: [id], type: QueryTypes.UPDATE });
    await writeAuditLog(req, { action: 'Academic record retracted', targetType: 'AcademicRecord', targetId: id });
    res.json({ success: true, data: { id } });
  } catch (error) { next(error); }
});

/* ---------------------------------------------------------------------------
 * Course offerings and the student's own study load.
 *
 * The registrar opens a course in Course Management: the subject, the
 * instructor and the weekly meetings. That offering is what a student picks
 * from — the courses the school has opened for the live term, each with the
 * schedule it runs. Choosing one records a real enrollment in the school's own
 * tables (`enrollments` for the term, `enrollment_items` per course), so the
 * load the student sees is the load the registrar can see too.
 *
 * There is no invented approval step: opening a course for enrollment is the
 * registrar's decision, and a student can only pick from what has been opened.
 * A course they already hold stays on their load even after it closes.
 * ------------------------------------------------------------------------- */

/** `schedules.day_of_week` numbering: 1 is Monday … 6 is Saturday. */
const WEEKDAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

type LiveTerm = { schoolYear: string; semester: number; label: string };

/**
 * The live term, as the registrar's configuration has it. Two spellings live in
 * `system_config` — the console's display year ("2026–2027") and the term key
 * ("2026-2027") — so comparisons fold the dash family, exactly like elsewhere.
 */
const liveTerm = async (): Promise<LiveTerm> => {
  const rows = await sql<{ config_key: string; config_value: string }>(
    `SELECT config_key, config_value FROM system_config
      WHERE config_key IN ('current_school_year', 'school_year', 'current_semester', 'semester')`,
    { type: QueryTypes.SELECT },
  );
  const values = Object.fromEntries(rows.map((row) => [row.config_key, row.config_value]));
  const semester = Number(values.current_semester);
  const schoolYear = values.current_school_year || values.school_year || '2026–2027';
  const displayYear = values.school_year || schoolYear;
  const displaySemester = values.semester || `Semester ${semester}`;
  return {
    schoolYear,
    semester: Number.isInteger(semester) && semester > 0 ? semester : 1,
    label: `${displaySemester} AY ${displayYear}`,
  };
};

/** The signed-in student's register row, or null for a non-student account. */
const studentRowOf = async (userId: string): Promise<{ id: string; student_number: string } | null> => {
  const rows = await sql<{ id: string; student_number: string }>(
    'SELECT id, student_number FROM students WHERE user_id = ? LIMIT 1',
    { replacements: [userId], type: QueryTypes.SELECT },
  );
  return rows[0] ?? null;
};

/** A weekly meeting as the portal renders it. */
type CatalogMeeting = { day: string; dayOfWeek: number; start: string; end: string; room: string };

type CatalogRow = {
  id: number;
  code: string;
  school_year: string;
  semester: number;
  status: string;
  subject_code: string | null;
  subject_name: string | null;
  units: string | number | null;
  description: string | null;
  teacher_first_name: string | null;
  teacher_last_name: string | null;
  meetings: { dayOfWeek: number | string; startTime: string; endTime: string; room: string | null }[] | null;
  enrolled: boolean;
};

/**
 * Every offering the school has put in front of a student, with the meetings it
 * runs and whether this student already holds it. Filtered to the live term here
 * rather than in SQL so the dash family is compared the same way everywhere.
 */
const catalogFor = async (studentId: string | null): Promise<{ term: LiveTerm; courses: Record<string, unknown>[] }> => {
  const term = await liveTerm();
  const rows = await sql<CatalogRow>(
    `SELECT c.id, c.code, c.school_year, c.semester, c.status,
            sub.code AS subject_code, sub.name AS subject_name, sub.units, sub.description,
            tu.first_name AS teacher_first_name, tu.last_name AS teacher_last_name,
            COALESCE((
              SELECT json_agg(json_build_object(
                       'dayOfWeek', sc.day_of_week,
                       'startTime', to_char(sc.start_time, 'HH24:MI'),
                       'endTime', to_char(sc.end_time, 'HH24:MI'),
                       'room', COALESCE(r.room_number, '')
                     ) ORDER BY sc.day_of_week ASC, sc.start_time ASC)
                FROM schedules sc LEFT JOIN rooms r ON r.id = sc.room_id
               WHERE sc.course_id = c.id
            ), '[]'::json) AS meetings,
            EXISTS (
              SELECT 1 FROM enrollment_items ei
                JOIN enrollments e ON e.id = ei.enrollment_id
               WHERE ei.course_id = c.id AND e.student_id = ?
                 AND ei.status <> 'rejected' AND e.status <> 'dropped'
            ) AS enrolled
       FROM courses c
       LEFT JOIN subjects sub ON sub.id = c.subject_id
       LEFT JOIN teachers t ON t.id = c.teacher_id
       LEFT JOIN users tu ON tu.id = t.user_id
      WHERE c.status <> 'archived'
      ORDER BY c.code ASC
      LIMIT 500`,
    { replacements: [studentId ?? ''], type: QueryTypes.SELECT },
  );

  const courses = rows
    .filter((row) => fold(row.school_year ?? '') === fold(term.schoolYear) && Number(row.semester) === term.semester)
    .map((row) => {
      const meetings: CatalogMeeting[] = (row.meetings ?? [])
        .map((meeting) => ({
          day: WEEKDAYS[Number(meeting.dayOfWeek)] ?? '',
          dayOfWeek: Number(meeting.dayOfWeek),
          start: meeting.startTime,
          end: meeting.endTime,
          room: meeting.room ?? '',
        }))
        .filter((meeting) => meeting.day !== '');
      return {
        id: row.id,
        code: row.code,
        title: row.subject_name ?? row.code,
        subjectCode: row.subject_code ?? row.code,
        units: row.units === null ? null : Number(row.units),
        description: row.description,
        instructor: [row.teacher_first_name, row.teacher_last_name].filter(Boolean).join(' '),
        status: row.status,
        open: row.status === 'open',
        meetings,
        enrolled: Boolean(row.enrolled),
      };
    });

  return { term, courses };
};

/** What the school has opened for the live term, and what of it this student holds. */
router.get('/course-catalog', authmiddlewareMiddleware, requireRoles('student'), async (req, res, next) => {
  try {
    const student = await studentRowOf(req.user?.id ?? '');
    if (!student) { res.status(403).json({ success: false, message: 'Only a student account holds a study load' }); return; }
    const { term, courses } = await catalogFor(student.id);
    res.json({ success: true, data: { term: { ...term }, courses } });
  } catch (error) { next(error); }
});

/** Take a course the school has opened for the live term. */
router.post('/course-catalog/enroll', authmiddlewareMiddleware, requireRoles('student'), async (req, res, next) => {
  try {
    const student = await studentRowOf(req.user?.id ?? '');
    if (!student) { res.status(403).json({ success: false, message: 'Only a student account holds a study load' }); return; }
    const courseId = Number((req.body as { courseId?: unknown })?.courseId);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      res.status(400).json({ success: false, message: 'A course id is required' });
      return;
    }

    const rows = await sql<{ id: number; code: string; school_year: string; semester: number; status: string; subject_name: string | null }>(
      `SELECT c.id, c.code, c.school_year, c.semester, c.status, sub.name AS subject_name
         FROM courses c LEFT JOIN subjects sub ON sub.id = c.subject_id
        WHERE c.id = ? LIMIT 1`,
      { replacements: [courseId], type: QueryTypes.SELECT },
    );
    if (!rows.length) { res.status(404).json({ success: false, message: 'That course is not in the catalog' }); return; }
    const course = rows[0];
    if (course.status !== 'open') { res.status(409).json({ success: false, message: `${course.code} is not open for enrollment` }); return; }

    const term = await liveTerm();
    if (fold(course.school_year ?? '') !== fold(term.schoolYear) || Number(course.semester) !== term.semester) {
      res.status(409).json({ success: false, message: `${course.code} belongs to another term` });
      return;
    }

    // One enrollment row per student per term, with a line per course they took.
    const [enrollment] = await sql<{ id: string }>(
      `INSERT INTO enrollments (id, student_id, school_year, semester, status, submitted_at)
       VALUES (?, ?, ?, ?, 'enrolled', NOW())
       ON CONFLICT (student_id, school_year, semester)
       DO UPDATE SET status = 'enrolled', updated_at = NOW()
       RETURNING id`,
      { replacements: [crypto.randomUUID(), student.id, term.schoolYear, term.semester], type: QueryTypes.SELECT },
    );
    await sql(
      `INSERT INTO enrollment_items (enrollment_id, course_id, status) VALUES (?, ?, 'approved')
       ON CONFLICT (enrollment_id, course_id) DO UPDATE SET status = 'approved'`,
      { replacements: [enrollment.id, course.id], type: QueryTypes.INSERT },
    );
    await writeAuditLog(req, {
      action: 'Course enrolled',
      targetType: 'Course',
      targetId: course.code,
      newValue: {
        studentId: student.student_number,
        courseId: course.id,
        subject: course.subject_name ?? course.code,
        schoolYear: term.schoolYear,
        semester: term.semester,
      },
    });
    res.status(201).json({
      success: true,
      data: { courseId: course.id, enrolled: true },
      message: `${course.code} is on your study load`,
    });
  } catch (error) { next(error); }
});

/** Drop a course from the student's own load. */
router.delete('/course-catalog/enroll/:courseId', authmiddlewareMiddleware, requireRoles('student'), async (req, res, next) => {
  try {
    const student = await studentRowOf(req.user?.id ?? '');
    if (!student) { res.status(403).json({ success: false, message: 'Only a student account holds a study load' }); return; }
    const courseId = Number(req.params.courseId);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      res.status(400).json({ success: false, message: 'A course id is required' });
      return;
    }

    const rows = await sql<{ item_id: number; enrollment_id: string; code: string }>(
      `SELECT ei.id AS item_id, e.id AS enrollment_id, c.code
         FROM enrollments e
         JOIN enrollment_items ei ON ei.enrollment_id = e.id
         JOIN courses c ON c.id = ei.course_id
        WHERE e.student_id = ? AND ei.course_id = ? LIMIT 1`,
      { replacements: [student.id, courseId], type: QueryTypes.SELECT },
    );
    if (!rows.length) { res.status(404).json({ success: false, message: 'That course is not on your study load' }); return; }
    const line = rows[0];

    await sql('DELETE FROM enrollment_items WHERE id = ?', { replacements: [line.item_id], type: QueryTypes.DELETE });
    const remaining = await sql<{ total: string | number }>(
      'SELECT COUNT(*) AS total FROM enrollment_items WHERE enrollment_id = ?',
      { replacements: [line.enrollment_id], type: QueryTypes.SELECT },
    );
    if (Number(remaining[0]?.total ?? 0) === 0) {
      await sql('DELETE FROM enrollments WHERE id = ?', { replacements: [line.enrollment_id], type: QueryTypes.DELETE });
    }

    await writeAuditLog(req, {
      action: 'Course dropped',
      targetType: 'Course',
      targetId: line.code,
      previousValue: { studentId: student.student_number, courseId },
    });
    res.json({ success: true, data: { courseId, enrolled: false }, message: `${line.code} is off your study load` });
  } catch (error) { next(error); }
});

export default router;
