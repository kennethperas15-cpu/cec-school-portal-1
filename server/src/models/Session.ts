import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Session extends Model {}
Session.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'sessions', timestamps: true });

