import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Submission extends Model {}
Submission.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'submissions', timestamps: true });

