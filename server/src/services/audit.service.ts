import { Request } from 'express';
import { AuditLog } from '../models/AuditLog.js';

export const writeAuditLog = async (req: Request, input: { action: string; targetType: string; targetId: string; previousValue?: unknown; newValue?: unknown }) => {
  if (!req.user) return;
  await AuditLog.create({
    userId: req.user.id,
    role: req.user.role ?? 'unknown',
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    previousValue: input.previousValue ?? null,
    newValue: input.newValue ?? null,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? null
  });
};
