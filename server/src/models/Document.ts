import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Document extends Model {}
Document.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'documents', timestamps: true });

