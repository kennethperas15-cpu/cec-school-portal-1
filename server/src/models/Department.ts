import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Department extends Model {}
Department.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'departments', timestamps: true });

