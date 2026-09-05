import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Enrollment extends Model {}
Enrollment.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'enrollments', timestamps: true });

