import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
export class LibraryBook extends Model {}
LibraryBook.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true } }, { sequelize, tableName: 'librarybooks', timestamps: true });

