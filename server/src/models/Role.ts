import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Role extends Model {}
Role.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'roles', timestamps: true });

