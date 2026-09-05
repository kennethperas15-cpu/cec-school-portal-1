import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Assignment extends Model {}
Assignment.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'assignments', timestamps: true });

