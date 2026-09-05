import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Course extends Model {}
Course.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'courses', timestamps: true });

