'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Helper function to check if column exists (SQLite compatible)
      const columnExists = async (tableName, columnName) => {
        const tableInfo = await queryInterface.sequelize.query(
          `PRAGMA table_info(${tableName})`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        return tableInfo.some(column => column.name === columnName);
      };

      // Add corporateName to User table if it doesn't exist
      if (!(await columnExists('users', 'corporateName'))) {
        await queryInterface.addColumn('users', 'corporateName', {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Legal corporate name for business registration',
        });
      }

      // Add industrySector to User table if it doesn't exist
      if (!(await columnExists('users', 'industrySector'))) {
        await queryInterface.addColumn('users', 'industrySector', {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'Industry sector (machinery, raw_materials, components, etc.)',
        });
      }

      // Add specifications to Product table if it doesn't exist
      if (!(await columnExists('products', 'specifications'))) {
        await queryInterface.addColumn('products', 'specifications', {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'JSON field for technical specifications and product details',
        });
      }

      // Add unitPrice to Product table if it doesn't exist
      if (!(await columnExists('products', 'unitPrice'))) {
        await queryInterface.addColumn('products', 'unitPrice', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Price per unit for bulk ordering',
        });
      }

      // Add minimumOrderQuantity to Product table if it doesn't exist
      if (!(await columnExists('products', 'minimumOrderQuantity'))) {
        await queryInterface.addColumn('products', 'minimumOrderQuantity', {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Minimum quantity required for orders',
        });
      }

      // Add indexes for better performance (SQLite compatible)
      try {
        await queryInterface.addIndex('users', ['industrySector'], {
          name: 'idx_users_industry_sector',
        });
        await queryInterface.addIndex('products', ['unitPrice'], {
          name: 'idx_products_unit_price',
        });
        await queryInterface.addIndex('products', ['minimumOrderQuantity'], {
          name: 'idx_products_min_order_qty',
        });
      } catch (error) {
        console.log('Index creation skipped (might already exist):', error.message);
      }

      console.log('Company and product fields migration completed successfully');
    } catch (error) {
      console.error('Error in company and product fields migration:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Remove indexes
      await queryInterface.removeIndex('users', 'idx_users_industry_sector');
      await queryInterface.removeIndex('products', 'idx_products_unit_price');
      await queryInterface.removeIndex('products', 'idx_products_min_order_qty');

      // Remove added columns
      await queryInterface.removeColumn('users', 'corporateName');
      await queryInterface.removeColumn('users', 'industrySector');
      await queryInterface.removeColumn('products', 'specifications');
      await queryInterface.removeColumn('products', 'unitPrice');
      await queryInterface.removeColumn('products', 'minimumOrderQuantity');

      console.log('Company and product fields migration rollback completed successfully');
    } catch (error) {
      console.error('Error rolling back company and product fields migration:', error);
      throw error;
    }
  }
};