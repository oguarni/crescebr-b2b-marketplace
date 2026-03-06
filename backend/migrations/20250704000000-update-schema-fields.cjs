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

      // Add cnpjValidated boolean to User table if it doesn't exist
      if (!(await columnExists('users', 'cnpjValidated'))) {
        await queryInterface.addColumn('users', 'cnpjValidated', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        });
      }

      // Add tierPricing JSON field to Product table if it doesn't exist
      if (!(await columnExists('products', 'tierPricing'))) {
        await queryInterface.addColumn('products', 'tierPricing', {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'JSON field for quantity-based pricing tiers',
        });
      }

      // Add supplierId to Product table if it doesn't exist
      if (!(await columnExists('products', 'supplierId'))) {
        await queryInterface.addColumn('products', 'supplierId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
      }

      // Add totalAmount to Quotation table if it doesn't exist
      if (!(await columnExists('quotations', 'totalAmount'))) {
        await queryInterface.addColumn('quotations', 'totalAmount', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Total calculated amount for the quotation',
        });
      }

      // Add fields to Order table if they don't exist
      if (!(await columnExists('orders', 'estimatedDeliveryDate'))) {
        await queryInterface.addColumn('orders', 'estimatedDeliveryDate', {
          type: Sequelize.DATE,
          allowNull: true,
        });
      }

      if (!(await columnExists('orders', 'trackingNumber'))) {
        await queryInterface.addColumn('orders', 'trackingNumber', {
          type: Sequelize.STRING(100),
          allowNull: true,
        });
      }

      // Helper function to check if table exists (SQLite compatible)
      const tableExists = async (tableName) => {
        const result = await queryInterface.sequelize.query(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        return result.length > 0;
      };

      // SQLite doesn't support enum updates like PostgreSQL
      console.log('Enum update skipped (SQLite uses TEXT for enums)');

      // Create Rating table for supplier reviews if it doesn't exist
      if (!(await tableExists('ratings'))) {
        await queryInterface.createTable('ratings', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        supplierId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        buyerId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        orderId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'orders',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        score: {
          type: Sequelize.INTEGER,
          allowNull: false,
          validate: {
            min: 1,
            max: 5,
          },
        },
        comment: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        });
      }

      // Create OrderStatusHistory table for tracking status changes if it doesn't exist
      if (!(await tableExists('order_status_history'))) {
        await queryInterface.createTable('order_status_history', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        orderId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'orders',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        fromStatus: {
          type: Sequelize.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
          allowNull: true,
        },
        toStatus: {
          type: Sequelize.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
          allowNull: false,
        },
        changedBy: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        });
      }

      // Add indexes for better performance
      try {
        if (await tableExists('ratings')) {
          await queryInterface.addIndex('ratings', ['supplierId']);
          await queryInterface.addIndex('ratings', ['buyerId']);
          await queryInterface.addIndex('ratings', ['orderId']);
        }
        if (await tableExists('order_status_history')) {
          await queryInterface.addIndex('order_status_history', ['orderId']);
        }
        if (await columnExists('products', 'supplierId')) {
          await queryInterface.addIndex('products', ['supplierId']);
        }
      } catch (error) {
        console.log('Index creation skipped (might already exist):', error.message);
      }

      console.log('Database schema update completed successfully');
    } catch (error) {
      console.error('Error updating database schema:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Remove added columns
      await queryInterface.removeColumn('users', 'cnpjValidated');
      await queryInterface.removeColumn('products', 'tierPricing');
      await queryInterface.removeColumn('products', 'supplierId');
      await queryInterface.removeColumn('quotations', 'totalAmount');
      await queryInterface.removeColumn('orders', 'estimatedDeliveryDate');
      await queryInterface.removeColumn('orders', 'trackingNumber');

      // Drop created tables
      await queryInterface.dropTable('order_status_history');
      await queryInterface.dropTable('ratings');

      console.log('Database schema rollback completed successfully');
    } catch (error) {
      console.error('Error rolling back database schema:', error);
      throw error;
    }
  }
};