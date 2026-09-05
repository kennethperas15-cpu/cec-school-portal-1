import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Report extends Model {}
Report.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'reports', timestamps: true });

