'use strict';

// Sequelize CLI configuration (used by migrations and seeders).
// Connection details come from the environment so the same image works
// locally, in Docker Compose, and on Cloud Run.
//
//   - Local dev/test fall back to the original Docker Compose Postgres defaults.
//   - Cloud SQL via Unix socket: set DB_HOST=/cloudsql/<INSTANCE_CONNECTION_NAME>
//     (no SSL — the socket is already a private, local channel).
//   - Cloud SQL / external over TCP: set DB_HOST=<host> and DB_SSL=true.

const host = process.env.DB_HOST || 'localhost';
const isUnixSocket = host.startsWith('/cloudsql');

const common = {
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'mysecretpassword',
  database: process.env.DB_NAME || 'crescebr',
  host,
  port: Number(process.env.DB_PORT) || 5432,
  dialect: 'postgres',
  logging: false,
};

const sslOptions =
  !isUnixSocket && process.env.DB_SSL === 'true'
    ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }
    : {};

module.exports = {
  development: { ...common },
  test: { ...common, database: process.env.DB_NAME || 'crescebr_test' },
  production: { ...common, ...sslOptions },
};
