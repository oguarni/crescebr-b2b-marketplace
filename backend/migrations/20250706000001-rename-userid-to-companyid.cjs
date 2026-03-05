'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper function to check if column exists (SQLite compatible)
    const columnExists = async (tableName, columnName) => {
      const tableInfo = await queryInterface.sequelize.query(
        `PRAGMA table_info(${tableName})`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      return tableInfo.some(column => column.name === columnName);
    };

    // Rename userId to companyId in quotations table
    if (await columnExists('quotations', 'userId')) {
      await queryInterface.renameColumn('quotations', 'userId', 'companyId');
    }

    // Rename userId to companyId in orders table
    if (await columnExists('orders', 'userId')) {
      await queryInterface.renameColumn('orders', 'userId', 'companyId');
    }

    console.log('Successfully renamed userId to companyId in quotations and orders tables');
  },

  async down(queryInterface, Sequelize) {
    // Helper function to check if column exists (SQLite compatible)
    const columnExists = async (tableName, columnName) => {
      const tableInfo = await queryInterface.sequelize.query(
        `PRAGMA table_info(${tableName})`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      return tableInfo.some(column => column.name === columnName);
    };

    // Rename companyId back to userId in quotations table
    if (await columnExists('quotations', 'companyId')) {
      await queryInterface.renameColumn('quotations', 'companyId', 'userId');
    }

    // Rename companyId back to userId in orders table
    if (await columnExists('orders', 'companyId')) {
      await queryInterface.renameColumn('orders', 'companyId', 'userId');
    }

    console.log('Successfully reverted companyId to userId in quotations and orders tables');
  }
};