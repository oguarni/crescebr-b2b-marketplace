'use strict';

// Standalone demo-data reset for the live portfolio environment.
//
// Wipes all user-generated data and restores the original seed set so the
// public demo always returns to a clean, working state after visitors test it.
// Intended to run as a scheduled Cloud Run Job; it is deliberately NOT wired
// into the public HTTP API, so the destructive TRUNCATE is never reachable from
// the internet.
//
// Connection details come from config/config.cjs (same env-driven config the
// app and migrations use). Run with: `node scripts/reset-demo.cjs`.

const { Sequelize } = require('sequelize');

const env = process.env.NODE_ENV || 'production';
const config = require('../config/config.cjs')[env];
const seeder = require('../seeders/20240101000001-initial-data.cjs');

// All application data tables. SequelizeMeta / SequelizeData are intentionally
// excluded so the schema and migration/seed bookkeeping survive the reset.
// CASCADE clears foreign-key children regardless of order; RESTART IDENTITY
// resets auto-increment so the reseeded rows get their original ids.
const DATA_TABLES = [
  'ratings',
  'order_status_history',
  'orders',
  'quotation_items',
  'quotations',
  'products',
  'users',
];

(async () => {
  const sequelize = new Sequelize(config);
  try {
    await sequelize.authenticate();

    const tableList = DATA_TABLES.map(table => `"${table}"`).join(', ');
    await sequelize.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);

    await seeder.up(sequelize.getQueryInterface(), Sequelize);

    console.log(`Demo data reset complete (truncated ${DATA_TABLES.length} tables and reseeded).`);
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Demo reset failed:', error.message);
    await sequelize.close();
    process.exit(1);
  }
})();
