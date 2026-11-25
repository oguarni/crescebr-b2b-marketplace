'use strict';

/**
 * Creates `system_settings`, the single row of commercial parameters that an
 * administrator edits from the admin panel: the estimated tax rate, how long a
 * quotation stays valid, the freight table and the default volume discounts.
 *
 * Until now these were constants in `quoteService.ts` and
 * `orderStatusService.ts`. The row is seeded with exactly those values, so
 * applying this migration changes no price and no delivery estimate.
 *
 * The CHECK constraints repeat the scalar bounds of
 * `src/services/systemSettingsRules.ts` so a direct SQL write cannot store a
 * value the application would refuse. The JSON columns are validated by the
 * application only.
 */

const DEFAULTS = {
  taxRate: 0.18,
  quotationValidityDays: 30,
  shippingMethods: {
    express: { baseRate: 100, perKgRate: 5, deliveryDays: 2 },
    standard: { baseRate: 50, perKgRate: 2.5, deliveryDays: 5 },
    economy: { baseRate: 25, perKgRate: 1.5, deliveryDays: 10 },
  },
  pricingTiers: [
    { minQuantity: 1, maxQuantity: 10, discount: 0 },
    { minQuantity: 11, maxQuantity: 50, discount: 0.05 },
    { minQuantity: 51, maxQuantity: 100, discount: 0.1 },
    { minQuantity: 101, maxQuantity: 500, discount: 0.15 },
    { minQuantity: 501, maxQuantity: null, discount: 0.2 },
  ],
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.createTable(
        'system_settings',
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false, defaultValue: 1 },
          taxRate: { type: Sequelize.DECIMAL(5, 4), allowNull: false },
          quotationValidityDays: { type: Sequelize.INTEGER, allowNull: false },
          shippingMethods: { type: Sequelize.JSON, allowNull: false },
          pricingTiers: { type: Sequelize.JSON, allowNull: false },
          version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
          updatedBy: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL',
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE system_settings
           ADD CONSTRAINT system_settings_single_row CHECK (id = 1),
           ADD CONSTRAINT system_settings_tax_rate CHECK ("taxRate" >= 0 AND "taxRate" <= 0.5),
           ADD CONSTRAINT system_settings_validity CHECK ("quotationValidityDays" BETWEEN 1 AND 180),
           ADD CONSTRAINT system_settings_version CHECK (version >= 1);`,
        { transaction }
      );

      const now = new Date();
      await queryInterface.bulkInsert(
        'system_settings',
        [
          {
            id: 1,
            taxRate: DEFAULTS.taxRate,
            quotationValidityDays: DEFAULTS.quotationValidityDays,
            shippingMethods: JSON.stringify(DEFAULTS.shippingMethods),
            pricingTiers: JSON.stringify(DEFAULTS.pricingTiers),
            version: 1,
            updatedBy: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('system_settings');
  },
};
