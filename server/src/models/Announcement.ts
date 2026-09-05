import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Announcement extends Model {}
Announcement.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'announcements', timestamps: true });

