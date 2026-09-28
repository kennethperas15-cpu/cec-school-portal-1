import { Sequelize } from 'sequelize';
import { env } from './env.js';

// Supabase Postgres: connection string comes from DATABASE_URL.
// Supabase requires SSL; `rejectUnauthorized: false` suits their managed certs.
export const sequelize = new Sequelize(env.databaseUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
    connectTimeout: 10000,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 10000,
    idle: 10000,
  },
});
export const database = sequelize;
