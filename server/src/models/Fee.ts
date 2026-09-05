import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Fee extends Model {}
Fee.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'fees', timestamps: true });

