import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const authmiddlewareMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) { res.status(401).json({ success: false, message: 'Authentication required' }); return; }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub?: string; role?: string; email?: string };
    if (!payload.sub) { res.status(401).json({ success: false, message: 'Invalid authentication token' }); return; }
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Authentication token expired or invalid' });
  }
};
