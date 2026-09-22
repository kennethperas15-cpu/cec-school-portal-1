import { Request } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const writeAuditLog = async (req: Request, input: { action: string; targetType: string; targetId: string; previousValue?: unknown; newValue?: unknown }) => {
  if (!req.user) return;
  const metadata = JSON.stringify({
    role: req.user.role ?? 'unknown',
    targetType: input.targetType,
    targetId: input.targetId,
    previousValue: input.previousValue ?? null,
    newValue: input.newValue ?? null,
    userAgent: req.get('user-agent') ?? null,
  });
  await sequelize.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    {
      replacements: [req.user.id, input.action, input.targetType, input.targetId, metadata, req.ip ?? null],
      type: QueryTypes.INSERT,
    }
  );
};
