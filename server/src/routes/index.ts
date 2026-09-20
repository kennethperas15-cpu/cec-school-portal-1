import { Router } from 'express';
import authRoutes from './auth.routes.js';
import portalRoutes from './portal.routes.js';
const router = Router();
router.get('/', (_req, res) => res.json({ success: true }));
router.use('/auth', authRoutes);
router.use('/portal', portalRoutes);
export default router;
