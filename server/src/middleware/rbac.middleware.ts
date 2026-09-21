import { Request, Response, NextFunction } from 'express';
export const requireRoles = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) { res.status(401).json({ success: false, message: 'Authentication required' }); return; }
  if (!req.user.role || !roles.includes(req.user.role)) { res.status(403).json({ success: false, message: 'Insufficient permissions' }); return; }
  next();
};
export const rbacmiddlewareMiddleware = requireRoles('student', 'teacher', 'admin');
