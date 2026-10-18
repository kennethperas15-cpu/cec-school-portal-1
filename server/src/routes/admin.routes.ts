import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { QueryTypes } from 'sequelize';
import { sql } from '../config/sql.js';
import { sequelize } from '../config/database.js';
import { authService } from '../services/auth.service.js';
import { writeAuditLog } from '../services/audit.service.js';
import { authmiddlewareMiddleware } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

/**
 * Registrar and administration reads.
 *
 * The admin console lists institutional records — students, faculty, courses,
 * sections, accounts, configuration — and those lists used to be browser-local
 * demo collections. Every one of them now reads from here instead, so a screen
 * shows what the database actually holds and opens as an honest empty state
 * when it holds nothing.
 *
 * Read-only on purpose: decisions (enrollment approve/reject, schedule publish,
 * announcements, records) keep going through the portal routes that already own
 * them, and any new write is agreed before it is added.
 */
const router = Router();

router.use(authmiddlewareMiddleware, requireRoles('admin'));

const DEFAULT_PAGE = 500;
const pageSize = (value: unknown): number => Math.min(Math.max(Number(value) || DEFAULT_PAGE, 1), 1000);
const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const like = (value: string): string => `%${value}%`;

/** Counts are optional detail: a missing table must not blank a whole screen. */
const safeCount = async (statement: string, warnings: string[], replacements: unknown[] = []): Promise<number> => {
  try {
    const rows = await sql<{ total: string | number }>(statement, { replacements, type: QueryTypes.SELECT });
    return Number(rows[0]?.total ?? 0);
  } catch (error) {
    warnings.push((error as Error).message);
    return 0;
  }
};

/** Counts the shell and the dashboard cards report. */
router.get('/overview', async (_req, res, next) => {
  try {
    const warnings: string[] = [];
    const [
      students,
      teachers,
      admins,
      courses,
      subjects,
      sections,
      rooms,
      departments,
      schedules,
      announcements,
      applicationsPending,
      applicationsApproved,
      applicationsRejected,
      applicationsTotal,
      accounts,
      accountsInactive,
      auditEvents,
      publishedTimetables,
      postedGrades,
      postedAttendance,
      receipts,
    ] = await Promise.all([
      safeCount(`SELECT COUNT(*) AS total FROM students WHERE status = 'active'`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM teachers WHERE employment_status = 'active'`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin')`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM courses WHERE status = 'open'`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM subjects`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM sections`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM rooms`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM departments`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM schedules`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM announcements`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM enrollment_applications WHERE status = 'pending'`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM enrollment_applications WHERE status = 'approved'`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM enrollment_applications WHERE status = 'rejected'`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM enrollment_applications`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM users`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM users WHERE is_active = FALSE`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM audit_logs`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM portal_items WHERE module = 'schedule' AND status = 'Published'`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM portal_items WHERE module = 'grade'`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM portal_items WHERE module = 'attendance'`, warnings),
      safeCount(`SELECT COUNT(*) AS total FROM portal_items WHERE module = 'receipt'`, warnings),
    ]);

    res.json({
      success: true,
      data: {
        students,
        teachers,
        admins,
        courses,
        subjects,
        sections,
        rooms,
        departments,
        schedules,
        announcements,
        accounts,
        accountsInactive,
        auditEvents,
        publishedTimetables,
        postedGrades,
        postedAttendance,
        receipts,
        applicationsPending,
        applicationsApproved,
        applicationsRejected,
        applicationsTotal,
      },
      warnings,
    });
  } catch (error) {
    next(error);
  }
});

/** Matriculated students, with the account behind each one. */
router.get('/students', async (req, res, next) => {
  try {
    const search = text(req.query.search);
    const program = text(req.query.program);
    const yearLevel = text(req.query.yearLevel);
    const status = text(req.query.status);

    const where: string[] = [];
    const replacements: unknown[] = [];
    if (search) {
      where.push(`(u.first_name ILIKE ? OR u.last_name ILIKE ? OR (u.first_name || ' ' || u.last_name) ILIKE ? OR u.email ILIKE ? OR s.student_number ILIKE ?)`);
      replacements.push(like(search), like(search), like(search), like(search), like(search));
    }
    if (program) {
      where.push('s.program = ?');
      replacements.push(program);
    }
    if (yearLevel) {
      where.push('s.year_level = ?');
      replacements.push(Number(yearLevel));
    }
    if (status) {
      where.push('s.status = ?');
      replacements.push(status);
    }
    replacements.push(pageSize(req.query.limit));

    const rows = await sql(
      `SELECT s.id, s.student_number, s.program, s.year_level, s.status, s.date_of_birth,
              s.guardian_name, s.guardian_phone,
              u.first_name, u.middle_name, u.last_name, u.email, u.is_active,
              u.last_login_at, u.created_at,
              d.code AS department_code, d.name AS department_name
         FROM students s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN departments d ON d.id = s.department_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY u.last_name ASC, u.first_name ASC
        LIMIT ?`,
      { replacements, type: QueryTypes.SELECT },
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

/** Faculty, with department and specialization. */
router.get('/teachers', async (req, res, next) => {
  try {
    const search = text(req.query.search);
    const where: string[] = [];
    const replacements: unknown[] = [];
    if (search) {
      where.push(`(u.first_name ILIKE ? OR u.last_name ILIKE ? OR (u.first_name || ' ' || u.last_name) ILIKE ? OR u.email ILIKE ? OR t.employee_number ILIKE ? OR t.specialization ILIKE ?)`);
      replacements.push(like(search), like(search), like(search), like(search), like(search), like(search));
    }
    replacements.push(pageSize(req.query.limit));

    const rows = await sql(
      `SELECT t.id, t.employee_number, t.specialization, t.employment_status,
              u.first_name, u.middle_name, u.last_name, u.email, u.is_active, u.last_login_at, u.created_at,
              d.code AS department_code, d.name AS department_name
         FROM teachers t
         JOIN users u ON u.id = t.user_id
         LEFT JOIN departments d ON d.id = t.department_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY u.last_name ASC, u.first_name ASC
        LIMIT ?`,
      { replacements, type: QueryTypes.SELECT },
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

/** The course catalog as the database holds it: course offering + subject. */
router.get('/courses', async (req, res, next) => {
  try {
    const search = text(req.query.search);
    const status = text(req.query.status);
    const where: string[] = [];
    const replacements: unknown[] = [];
    if (search) {
      where.push(`(c.code ILIKE ? OR sub.code ILIKE ? OR sub.name ILIKE ? OR sub.description ILIKE ?)`);
      replacements.push(like(search), like(search), like(search), like(search));
    }
    if (status) {
      where.push('c.status = ?');
      replacements.push(status);
    }
    replacements.push(pageSize(req.query.limit));

    const rows = await sql(
      `SELECT c.id, c.code, c.school_year, c.semester, c.status,
              sub.code AS subject_code, sub.name AS subject_name, sub.units, sub.description,
              t.id AS teacher_id, tu.first_name AS teacher_first_name, tu.last_name AS teacher_last_name, tu.email AS teacher_email
         FROM courses c
         LEFT JOIN subjects sub ON sub.id = c.subject_id
         LEFT JOIN teachers t ON t.id = c.teacher_id
         LEFT JOIN users tu ON tu.id = t.user_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY c.code ASC
        LIMIT ?`,
      { replacements, type: QueryTypes.SELECT },
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

/** Class sections. */
router.get('/sections', async (req, res, next) => {
  try {
    const rows = await sql(
      `SELECT id, name, school_year, year_level FROM sections ORDER BY school_year DESC, name ASC LIMIT ?`,
      { replacements: [pageSize(req.query.limit)], type: QueryTypes.SELECT },
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

/** Timetabled meetings, joined to subject, room and instructor. */
router.get('/schedules', async (req, res, next) => {
  try {
    const rows = await sql(
      `SELECT sc.id, sc.day_of_week, sc.start_time, sc.end_time,
              c.code AS course_code, c.school_year, c.semester,
              sub.code AS subject_code, sub.name AS subject_name,
              r.building, r.room_number, r.capacity,
              tu.first_name AS teacher_first_name, tu.last_name AS teacher_last_name
         FROM schedules sc
         LEFT JOIN courses c ON c.id = sc.course_id
         LEFT JOIN subjects sub ON sub.id = c.subject_id
         LEFT JOIN rooms r ON r.id = sc.room_id
         LEFT JOIN teachers t ON t.id = c.teacher_id
         LEFT JOIN users tu ON tu.id = t.user_id
        ORDER BY sc.day_of_week ASC, sc.start_time ASC
        LIMIT ?`,
      { replacements: [pageSize(req.query.limit)], type: QueryTypes.SELECT },
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

/** Every account, with the role it carries and the number that identifies it. */
router.get('/accounts', async (req, res, next) => {
  try {
    const search = text(req.query.search);
    const role = text(req.query.role);
    const where: string[] = [];
    const replacements: unknown[] = [];
    if (search) {
      where.push(`(u.first_name ILIKE ? OR u.last_name ILIKE ? OR (u.first_name || ' ' || u.last_name) ILIKE ? OR u.email ILIKE ? OR s.student_number ILIKE ? OR t.employee_number ILIKE ?)`);
      replacements.push(like(search), like(search), like(search), like(search), like(search), like(search));
    }
    if (role) {
      where.push('rl.name = ?');
      replacements.push(role);
    }
    replacements.push(pageSize(req.query.limit));

    const rows = await sql(
      `SELECT u.id, u.email, u.first_name, u.middle_name, u.last_name, u.phone,
              u.is_active, u.last_login_at, u.created_at, u.locked_until, u.failed_login_attempts,
              rl.name AS role_name, rl.id AS role_id,
              s.student_number, s.program, s.year_level,
              t.employee_number, t.specialization,
              d.code AS department_code
         FROM users u
         LEFT JOIN roles rl ON rl.id = u.role_id
         LEFT JOIN students s ON s.user_id = u.id
         LEFT JOIN teachers t ON t.user_id = u.id
         LEFT JOIN departments d ON d.id = COALESCE(s.department_id, t.department_id)
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY u.created_at DESC
        LIMIT ?`,
      { replacements, type: QueryTypes.SELECT },
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

/** Departments, for the filters that group students and faculty. */
router.get('/departments', async (_req, res, next) => {
  try {
    const rows = await sql(
      `SELECT id, code, name, description FROM departments ORDER BY name ASC`,
      { type: QueryTypes.SELECT },
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

/**
 * Institutional configuration, as stored (settings screen reads this).
 */
router.get('/config', async (_req, res, next) => {
  try {
    const rows = await sql(
      `SELECT config_key, config_value, is_public, updated_at FROM system_config ORDER BY config_key ASC`,
      { type: QueryTypes.SELECT },
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------- writes ---------------------------------- */

/**
 * The registrar's writes.
 *
 * Every one of these is reachable only by an administrator (the router gate
 * above), validates its own input, and writes an audit entry naming the record
 * and the values before and after. Nothing here invents a school number: a
 * student number is reserved from the same counter the enrollment approval uses,
 * so 2xxxxxx / 3xxxxxx / 4xxxxxx stay sequential and unique.
 */

const badRequest = (res: import('express').Response, message: string) => res.status(400).json({ success: false, message });

/** Update one stored configuration value. */
router.put('/config/:key', async (req, res, next) => {
  try {
    const key = text(req.params.key);
    const { value, isPublic } = req.body as { value?: string; isPublic?: boolean };
    const nextValue = typeof value === 'string' ? value.trim() : '';
    if (!key) return badRequest(res, 'A configuration key is required');
    if (!nextValue) return badRequest(res, 'A configuration value is required');
    if (nextValue.length > 2000) return badRequest(res, 'Configuration values are limited to 2000 characters');

    const existing = await sql<{ config_key: string; config_value: string; is_public: boolean }>(
      'SELECT config_key, config_value, is_public FROM system_config WHERE config_key = ? LIMIT 1',
      { replacements: [key], type: QueryTypes.SELECT },
    );
    if (!existing.length) return badRequest(res, `No stored configuration named ${key}`);

    const makePublic = typeof isPublic === 'boolean' ? isPublic : existing[0].is_public;
    await sql(
      'UPDATE system_config SET config_value = ?, is_public = ?, updated_at = NOW() WHERE config_key = ?',
      { replacements: [nextValue, makePublic, key], type: QueryTypes.UPDATE },
    );
    await writeAuditLog(req, {
      action: 'Configuration updated',
      targetType: 'SystemConfig',
      targetId: key,
      previousValue: { value: existing[0].config_value, isPublic: existing[0].is_public },
      newValue: { value: nextValue, isPublic: makePublic },
    });

    const [row] = await sql(
      'SELECT config_key, config_value, is_public, updated_at FROM system_config WHERE config_key = ? LIMIT 1',
      { replacements: [key], type: QueryTypes.SELECT },
    );
    res.json({ success: true, data: row, message: `${key} updated` });
  } catch (error) {
    next(error);
  }
});

/**
 * Register a walk-in student: the registrar's own enrollment.
 *
 * The pupil is recorded and the account issued in one step — student number
 * reserved, school email in the firstname.lastname.<id6>@cec.edu.ph shape the
 * portal uses, and a temporary password returned for the registrar to hand over
 * (email delivery is not configured on this deployment).
 */
router.post('/students', async (req, res, next) => {
  try {
    const {
      firstName, middleName, lastName, personalEmail, phone,
      program, yearLevel, educationLevel, guardianName, guardianPhone, dateOfBirth, address,
    } = req.body as Record<string, string | number | undefined>;

    const first = text(firstName);
    const last = text(lastName);
    const email = text(personalEmail);
    const programme = text(program);
    const level = Number(yearLevel);

    if (!first || !last) return badRequest(res, 'A first and last name are required');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return badRequest(res, 'A valid personal email address is required');
    if (!programme) return badRequest(res, 'A program is required');
    if (!Number.isInteger(level) || level < 1 || level > 6) return badRequest(res, 'A year level between 1 and 6 is required');

    const clash = await sql<{ id: string }>('SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', {
      replacements: [email],
      type: QueryTypes.SELECT,
    });
    if (clash.length) return badRequest(res, 'An account already uses that email address');

    const role = await sql<{ id: number }>("SELECT id FROM roles WHERE name = 'student' LIMIT 1", { type: QueryTypes.SELECT });
    if (!role.length) return badRequest(res, 'The student role is missing from the database');

    const studentNumber = await authService.reserveStudentId();
    const userId = crypto.randomUUID();
    const localPart = `${first}.${last}`.toLowerCase().replace(/[^a-z0-9.]/g, '').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
    const schoolEmail = `${localPart || 'student'}.${userId.slice(0, 6)}@cec.edu.ph`;
    const temporaryPassword = `Cec2026-${crypto.randomBytes(3).toString('hex')}`;
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    await sequelize.transaction(async (transaction) => {
      await sql(
        `INSERT INTO users (id, role_id, email, password_hash, first_name, middle_name, last_name, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [userId, role[0].id, schoolEmail, passwordHash, first, text(middleName) || null, last, text(phone) || null],
          transaction,
        },
      );
      await sql(
        `INSERT INTO students (id, user_id, student_number, program, year_level, education_level, date_of_birth, address, guardian_name, guardian_phone, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        {
          replacements: [
            crypto.randomUUID(), userId, studentNumber, programme, level,
            text(educationLevel) || 'college',
            text(dateOfBirth) || null,
            text(address) || null,
            text(guardianName) || null,
            text(guardianPhone) || null,
          ],
          transaction,
        },
      );
    });

    await writeAuditLog(req, {
      action: 'Student registered',
      targetType: 'Student',
      targetId: studentNumber,
      newValue: { studentNumber, schoolEmail, personalEmail: email, program: programme, yearLevel: level },
    });

    res.status(201).json({
      success: true,
      data: { studentNumber, schoolEmail, temporaryPassword, firstName: first, lastName: last },
      message: `${first} ${last} registered as ${studentNumber}`,
    });
  } catch (error) {
    if (error instanceof Error && /reserve|already|missing/.test(error.message)) return badRequest(res, error.message);
    next(error);
  }
});

/** Correct a student's registry record. */
router.put('/students/:id', async (req, res, next) => {
  try {
    const id = text(req.params.id);
    const body = req.body as Record<string, string | number | boolean | undefined>;
    const existing = await sql<Record<string, unknown>>(
      `SELECT s.id, s.student_number, s.program, s.year_level, s.status, s.education_level,
              s.guardian_name, s.guardian_phone, s.date_of_birth, s.address, u.is_active
       FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = ? LIMIT 1`,
      { replacements: [id], type: QueryTypes.SELECT },
    );
    if (!existing.length) return badRequest(res, 'No student record with that id');

    const level = body.yearLevel === undefined ? undefined : Number(body.yearLevel);
    if (level !== undefined && (!Number.isInteger(level) || level < 1 || level > 12)) {
      return badRequest(res, 'A year level between 1 and 12 is required');
    }
    const status = body.status === undefined ? undefined : text(body.status);
    if (status !== undefined && !['active', 'inactive', 'graduated', 'transferred'].includes(status)) {
      return badRequest(res, 'Status must be active, inactive, graduated or transferred');
    }

    const patch: Record<string, unknown> = {};
    if (body.program !== undefined) patch.program = text(body.program) || null;
    if (level !== undefined) patch.year_level = level;
    if (status !== undefined) patch.status = status;
    if (body.educationLevel !== undefined) patch.education_level = text(body.educationLevel) || null;
    if (body.guardianName !== undefined) patch.guardian_name = text(body.guardianName) || null;
    if (body.guardianPhone !== undefined) patch.guardian_phone = text(body.guardianPhone) || null;
    if (body.dateOfBirth !== undefined) patch.date_of_birth = text(body.dateOfBirth) || null;
    if (body.address !== undefined) patch.address = text(body.address) || null;
    if (body.isActive !== undefined) patch.__user_active = Boolean(body.isActive);

    if (!Object.keys(patch).length) return badRequest(res, 'Nothing to update');

    const studentColumns = Object.keys(patch).filter((column) => !column.startsWith('__'));
    if (studentColumns.length) {
      await sql(
        `UPDATE students SET ${studentColumns.map((column) => `${column} = ?`).join(', ')}
         WHERE id = ?`,
        { replacements: [...studentColumns.map((column) => patch[column]), id], type: QueryTypes.UPDATE },
      );
    }
    if (patch.__user_active !== undefined) {
      await sql(
        `UPDATE users SET is_active = ?, updated_at = NOW()
         WHERE id = (SELECT user_id FROM students WHERE id = ?)`,
        { replacements: [patch.__user_active, id], type: QueryTypes.UPDATE },
      );
    }

    await writeAuditLog(req, {
      action: 'Student record updated',
      targetType: 'Student',
      targetId: String(existing[0].student_number ?? id),
      previousValue: existing[0],
      newValue: patch,
    });

    const [row] = await sql(
      `SELECT s.id, s.student_number, s.program, s.year_level, s.status, s.education_level,
              s.guardian_name, s.guardian_phone, s.date_of_birth, s.address, u.is_active
       FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = ? LIMIT 1`,
      { replacements: [id], type: QueryTypes.SELECT },
    );
    res.json({ success: true, data: row, message: 'Student record updated' });
  } catch (error) {
    next(error);
  }
});

/** Correct a faculty record (the account itself is created by the staff route). */
router.put('/teachers/:id', async (req, res, next) => {
  try {
    const id = text(req.params.id);
    const body = req.body as Record<string, string | boolean | undefined>;
    const existing = await sql<Record<string, unknown>>(
      `SELECT t.id, t.employee_number, t.specialization, t.employment_status, u.is_active
       FROM teachers t JOIN users u ON u.id = t.user_id WHERE t.id = ? LIMIT 1`,
      { replacements: [id], type: QueryTypes.SELECT },
    );
    if (!existing.length) return badRequest(res, 'No faculty record with that id');

    const employment = body.employmentStatus === undefined ? undefined : text(body.employmentStatus);
    if (employment !== undefined && !['active', 'inactive', 'on_leave'].includes(employment)) {
      return badRequest(res, 'Employment status must be active, inactive or on_leave');
    }

    const patch: Record<string, unknown> = {};
    if (body.specialization !== undefined) patch.specialization = text(body.specialization) || null;
    if (employment !== undefined) patch.employment_status = employment;
    if (body.isActive !== undefined) patch.__user_active = Boolean(body.isActive);
    if (!Object.keys(patch).length) return badRequest(res, 'Nothing to update');

    const columns = Object.keys(patch).filter((column) => !column.startsWith('__'));
    if (columns.length) {
      await sql(`UPDATE teachers SET ${columns.map((column) => `${column} = ?`).join(', ')} WHERE id = ?`, {
        replacements: [...columns.map((column) => patch[column]), id],
        type: QueryTypes.UPDATE,
      });
    }
    if (patch.__user_active !== undefined) {
      await sql(
        `UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = (SELECT user_id FROM teachers WHERE id = ?)`,
        { replacements: [patch.__user_active, id], type: QueryTypes.UPDATE },
      );
    }

    await writeAuditLog(req, {
      action: 'Faculty record updated',
      targetType: 'Teacher',
      targetId: String(existing[0].employee_number ?? id),
      previousValue: existing[0],
      newValue: patch,
    });
    res.json({ success: true, message: 'Faculty record updated' });
  } catch (error) {
    next(error);
  }
});

/**
 * Open a course for a term.
 *
 * A course is a subject offered in a term, so the subject is created when its
 * code is new and reused when it is not — the unique key is (subject, code, term).
 */
router.post('/courses', async (req, res, next) => {
  try {
    const { code, subjectCode, subjectName, units, description, schoolYear, semester, status, teacherId } = req.body as Record<string, string | number | undefined>;
    const courseCode = text(code) || text(subjectCode);
    const name = text(subjectName);
    const year = text(schoolYear);
    const term = Number(semester);

    if (!courseCode) return badRequest(res, 'A course code is required');
    if (!name) return badRequest(res, 'A subject title is required');
    if (!year) return badRequest(res, 'A school year is required');
    if (![1, 2].includes(term)) return badRequest(res, 'Semester must be 1 or 2');
    const courseStatus = text(status) || 'open';
    if (!['open', 'closed', 'archived'].includes(courseStatus)) return badRequest(res, 'Status must be open, closed or archived');
    const unitCount = units === undefined || units === '' ? 3 : Number(units);
    if (!Number.isFinite(unitCount) || unitCount < 0 || unitCount > 20) return badRequest(res, 'Units must be between 0 and 20');

    const subject = await sql<{ id: number }>(
      `INSERT INTO subjects (code, name, units, description) VALUES (?, ?, ?, ?)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, units = EXCLUDED.units,
         description = COALESCE(EXCLUDED.description, subjects.description)
       RETURNING id`,
      { replacements: [courseCode, name, unitCount, text(description) || null], type: QueryTypes.SELECT },
    );

    const existing = await sql<{ id: number }>(
      'SELECT id FROM courses WHERE subject_id = ? AND code = ? AND school_year = ? AND semester = ? LIMIT 1',
      { replacements: [subject[0].id, courseCode, year, term], type: QueryTypes.SELECT },
    );
    if (existing.length) return badRequest(res, `${courseCode} is already open for ${year} semester ${term}`);

    const [course] = await sql<{ id: number }>(
      `INSERT INTO courses (subject_id, teacher_id, code, school_year, semester, status)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      { replacements: [subject[0].id, text(teacherId) || null, courseCode, year, term, courseStatus], type: QueryTypes.SELECT },
    );

    await writeAuditLog(req, {
      action: 'Course created',
      targetType: 'Course',
      targetId: String(course.id),
      newValue: { code: courseCode, subjectName: name, units: unitCount, schoolYear: year, semester: term, status: courseStatus, teacherId: text(teacherId) || null },
    });
    res.status(201).json({ success: true, data: { id: course.id }, message: `${courseCode} opened for ${year} semester ${term}` });
  } catch (error) {
    next(error);
  }
});

/** Change a course: its subject details, its instructor, or whether it is open. */
router.put('/courses/:id', async (req, res, next) => {
  try {
    const id = text(req.params.id);
    if (!/^\d+$/.test(id)) return badRequest(res, 'A numeric course id is required');
    const body = req.body as Record<string, string | number | undefined>;
    const courses = await sql<Record<string, unknown>>(
      'SELECT id, subject_id, teacher_id, code, school_year, semester, status FROM courses WHERE id = ? LIMIT 1',
      { replacements: [id], type: QueryTypes.SELECT },
    );
    if (!courses.length) return badRequest(res, 'No course with that id');
    const course = courses[0];

    const patch: Record<string, unknown> = {};
    const status = body.status === undefined ? undefined : text(body.status);
    if (status !== undefined) {
      if (!['open', 'closed', 'archived'].includes(status)) return badRequest(res, 'Status must be open, closed or archived');
      patch.status = status;
    }
    if (body.teacherId !== undefined) patch.teacher_id = text(body.teacherId) || null;
    if (!Object.keys(patch).length) {
      // Nothing on the course itself changed — maybe just the subject details.
      const subjectName = text(body.subjectName);
      const units = body.units === undefined || body.units === '' ? undefined : Number(body.units);
      if (subjectName || units !== undefined) {
        await sql(
          `UPDATE subjects SET name = COALESCE(NULLIF(?, ''), name), units = COALESCE(?, units) WHERE id = ?`,
          { replacements: [subjectName, units ?? null, course.subject_id], type: QueryTypes.UPDATE },
        );
        await writeAuditLog(req, {
          action: 'Course subject updated',
          targetType: 'Course',
          targetId: String(course.code),
          newValue: { subjectName: subjectName || undefined, units },
        });
        return res.json({ success: true, message: 'Subject details updated' });
      }
      return badRequest(res, 'Nothing to update');
    }

    await sql(`UPDATE courses SET ${Object.keys(patch).map((column) => `${column} = ?`).join(', ')} WHERE id = ?`, {
      replacements: [...Object.values(patch), id],
      type: QueryTypes.UPDATE,
    });
    await writeAuditLog(req, {
      action: 'Course updated',
      targetType: 'Course',
      targetId: String(course.code),
      previousValue: course,
      newValue: patch,
    });
    res.json({ success: true, message: 'Course updated' });
  } catch (error) {
    next(error);
  }
});

/** Remove a course that has nothing attached to it yet. */
router.delete('/courses/:id', async (req, res, next) => {
  try {
    const id = text(req.params.id);
    if (!/^\d+$/.test(id)) return badRequest(res, 'A numeric course id is required');
    const courses = await sql<Record<string, unknown>>('SELECT id, code, school_year, semester, status FROM courses WHERE id = ? LIMIT 1', {
      replacements: [id],
      type: QueryTypes.SELECT,
    });
    if (!courses.length) return badRequest(res, 'No course with that id');

    const attached = await safeCount('SELECT COUNT(*) AS total FROM schedules WHERE course_id = ?', [], [id]);
    if (attached > 0) {
      return badRequest(res, `${courses[0].code} has ${attached} scheduled meeting${attached === 1 ? '' : 's'}; close it instead of deleting it`);
    }

    await sql('DELETE FROM courses WHERE id = ?', { replacements: [id], type: QueryTypes.DELETE });
    await writeAuditLog(req, {
      action: 'Course deleted',
      targetType: 'Course',
      targetId: String(courses[0].code),
      previousValue: courses[0],
    });
    res.json({ success: true, message: `${courses[0].code} removed from the catalog` });
  } catch (error) {
    next(error);
  }
});

/** Activate or deactivate any account. */
router.put('/accounts/:id', async (req, res, next) => {
  try {
    const id = text(req.params.id);
    const { isActive } = req.body as { isActive?: boolean };
    if (typeof isActive !== 'boolean') return badRequest(res, 'Send isActive as true or false');
    if (id === req.user?.id) return badRequest(res, 'An administrator cannot deactivate their own account');

    const accounts = await sql<{ id: string; email: string; is_active: boolean }>(
      'SELECT id, email, is_active FROM users WHERE id = ? LIMIT 1',
      { replacements: [id], type: QueryTypes.SELECT },
    );
    if (!accounts.length) return badRequest(res, 'No account with that id');

    await sql('UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?', {
      replacements: [isActive, id],
      type: QueryTypes.UPDATE,
    });
    await writeAuditLog(req, {
      action: isActive ? 'Account activated' : 'Account deactivated',
      targetType: 'User',
      targetId: accounts[0].email,
      previousValue: { isActive: accounts[0].is_active },
      newValue: { isActive },
    });
    res.json({ success: true, message: `${accounts[0].email} ${isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    next(error);
  }
});

export default router;
