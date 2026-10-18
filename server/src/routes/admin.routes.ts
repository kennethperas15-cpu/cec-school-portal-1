import { Router } from 'express';
import { QueryTypes } from 'sequelize';
import { sql } from '../config/sql.js';
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

/** Institutional configuration, as stored (settings screen reads this). */
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

export default router;
