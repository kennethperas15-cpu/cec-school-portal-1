import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class User extends Model {}
User.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'users', timestamps: true });

