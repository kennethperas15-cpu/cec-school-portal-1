import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Scholarship extends Model {}
Scholarship.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'scholarships', timestamps: true });

