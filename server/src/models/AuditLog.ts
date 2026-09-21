import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class AuditLog extends Model {}
AuditLog.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  role: { type: DataTypes.STRING(30), allowNull: false },
  action: { type: DataTypes.STRING(120), allowNull: false },
  targetType: { type: DataTypes.STRING(80), allowNull: false },
  targetId: { type: DataTypes.STRING(120), allowNull: false },
  previousValue: { type: DataTypes.JSON, allowNull: true },
  newValue: { type: DataTypes.JSON, allowNull: true },
  ipAddress: { type: DataTypes.STRING(64), allowNull: true },
  userAgent: { type: DataTypes.STRING(512), allowNull: true }
}, { sequelize, tableName: 'auditlogs', timestamps: true, underscored: true });
