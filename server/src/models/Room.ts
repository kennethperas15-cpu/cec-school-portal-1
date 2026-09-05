import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class Room extends Model {}
Room.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'rooms', timestamps: true });

