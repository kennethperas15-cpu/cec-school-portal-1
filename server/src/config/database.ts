import { Sequelize } from 'sequelize';
import { env } from './env.js';

export const sequelize = new Sequelize(env.databaseUrl, {
  dialect: 'mysql',
  logging: false,
  dialectOptions: {
    connectTimeout: 5000
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 5000,
    idle: 10000
  }
});
export const database = sequelize;
