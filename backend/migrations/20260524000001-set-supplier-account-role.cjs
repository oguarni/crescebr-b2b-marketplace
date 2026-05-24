'use strict';

/**
 * Align the seeded supplier account with the role model. It was seeded as
 * role='customer' (companyType='supplier'), which makes RBAC treat it as a buyer.
 * Set it to role='supplier' now that the enum allows the value. Runs after
 * 20260524000000 so the new enum value is already committed on Postgres.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE users SET role = 'supplier' WHERE email = 'supplier@example.com';`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE users SET role = 'customer' WHERE email = 'supplier@example.com';`
    );
  },
};
