import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Teacher extends Model {}
Teacher.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'teachers', timestamps: true });

