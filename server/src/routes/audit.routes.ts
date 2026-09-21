import { Router } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { authmiddlewareMiddleware } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authmiddlewareMiddleware, requireRoles('admin'));
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const rows = await sequelize.query(
      `SELECT id, user_id, role, action, target_type, target_id, previous_value, new_value, ip_address, user_agent, created_at
       FROM auditlogs ORDER BY created_at DESC LIMIT ${limit}`,
      { type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});
export default router;
