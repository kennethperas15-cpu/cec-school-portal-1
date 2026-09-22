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
      `SELECT id, user_id, action, entity_type, entity_id, metadata, ip_address, created_at
       FROM audit_logs ORDER BY created_at DESC LIMIT ${limit}`,
      { type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});
export default router;
