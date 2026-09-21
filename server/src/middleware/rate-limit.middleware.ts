import { Request, Response, NextFunction } from 'express';

const attempts = new Map<string, { count: number; resetAt: number }>();
export const loginRateLimit = (max = 8, windowMs = 15 * 60 * 1000) => (req: Request, res: Response, next: NextFunction) => {
  const key = `${req.ip}:${String(req.body?.identifier ?? '').toLowerCase()}`;
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + windowMs }); next(); return; }
  if (current.count >= max) { res.status(429).json({ success: false, message: 'Too many login attempts. Try again later.' }); return; }
  current.count += 1;
  next();
};
