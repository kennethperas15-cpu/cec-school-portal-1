import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Invoice extends Model {}
Invoice.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'invoices', timestamps: true });

