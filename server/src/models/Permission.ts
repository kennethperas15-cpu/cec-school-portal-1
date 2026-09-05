import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Permission extends Model {}
Permission.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'permissions', timestamps: true });

