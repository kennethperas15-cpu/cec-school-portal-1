import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Message extends Model {}
Message.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'messages', timestamps: true });

