import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Attendance extends Model {}
Attendance.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'attendances', timestamps: true });

