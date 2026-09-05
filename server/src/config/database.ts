import { Sequelize } from 'sequelize';
import { env } from './env.js';
export const sequelize = new Sequelize(env.databaseUrl || 'postgres://localhost/cec_portal', { logging: false });
export const database = sequelize;
