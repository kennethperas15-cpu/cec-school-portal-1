import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Schedule extends Model {}
Schedule.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'schedules', timestamps: true });

