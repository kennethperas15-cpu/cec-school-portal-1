import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Section extends Model {}
Section.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'sections', timestamps: true });

