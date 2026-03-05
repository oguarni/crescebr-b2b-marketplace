'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Helper function to check if column exists
      const columnExists = async (tableName, columnName) => {
        const tableInfo = await queryInterface.sequelize.query(
          `PRAGMA table_info(${tableName})`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        return tableInfo.some(column => column.name === columnName);
      };

      // Add status column if it doesn't exist
      if (!(await columnExists('users', 'status'))) {
        await queryInterface.addColumn('users', 'status', {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'pending',
        });
      }

      // Add companyName column if it doesn't exist
      if (!(await columnExists('users', 'companyName'))) {
        await queryInterface.addColumn('users', 'companyName', {
          type: Sequelize.STRING,
          allowNull: true,
        });
      }

      // Add cnpj column if it doesn't exist
      if (!(await columnExists('users', 'cnpj'))) {
        await queryInterface.addColumn('users', 'cnpj', {
          type: Sequelize.STRING,
          allowNull: true,
        });
      }

      console.log('User status migration completed successfully');
    } catch (error) {
      console.error('Error in user status migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'status');
    await queryInterface.removeColumn('users', 'companyName');
    await queryInterface.removeColumn('users', 'cnpj');
    await queryInterface.changeColumn('users', 'role', {
        type: Sequelize.ENUM('customer', 'admin'),
        allowNull: false,
        defaultValue: 'customer',
    });
  }
};