import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Grade extends Model {}
Grade.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'grades', timestamps: true });

