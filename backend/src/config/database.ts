import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const env = process.env.NODE_ENV || 'development';
const password = process.env.DB_PASSWORD;
if (!password) {
  throw new Error('DB_PASSWORD is not set. Configure it in backend/.env or the environment.');
}
const port = Number(process.env.DB_PORT) || 5432;

const config = {
  development: {
    username: process.env.DB_USER!,
    password,
    port,
    database: process.env.DB_NAME!,
    host: process.env.DB_HOST!,
    dialect: 'postgres' as const,
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password,
    port,
    database: process.env.TEST_DB_NAME || 'crescebr_test',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres' as const,
    logging: false,
  },
  production: {
    username: process.env.DB_USER!,
    password,
    port,
    database: process.env.DB_NAME!,
    host: process.env.DB_HOST!,
    dialect: 'postgres' as const,
    logging: false,
  },
} as const;

const sequelize = new Sequelize(config[env as keyof typeof config]);

export default sequelize;
