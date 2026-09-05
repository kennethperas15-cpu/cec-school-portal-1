import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Student extends Model {}
Student.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'students', timestamps: true });

