'use strict';

/**
 * The `users.role` enum was originally created as ('customer', 'admin') and never
 * extended, but the model and services use 'supplier' (registration, admin stats,
 * ratings, quotes). On SQLite enums are TEXT so this was masked; on Postgres any
 * query/insert with role='supplier' throws "invalid input value for enum". Add the
 * missing value so the application's intended role model works on Postgres.
 */
module.exports = {
  async up(queryInterface) {
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'supplier';`
      );
    }
    // SQLite stores enums as TEXT, so no change is required there.
  },

  async down() {
    // Postgres cannot drop an enum value without recreating the type; intentional no-op.
  },
};
