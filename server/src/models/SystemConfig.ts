import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class SystemConfig extends Model {}
SystemConfig.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'systemconfigs', timestamps: true });

