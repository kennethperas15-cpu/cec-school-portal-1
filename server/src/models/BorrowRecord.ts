import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class BorrowRecord extends Model {}
BorrowRecord.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'borrowrecords', timestamps: true });

