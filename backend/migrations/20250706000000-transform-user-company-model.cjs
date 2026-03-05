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

    // Add new fields to users table for company-centric approach
    if (!(await columnExists('users', 'companyType'))) {
      await queryInterface.addColumn('users', 'companyType', {
        type: Sequelize.ENUM('buyer', 'supplier', 'both'),
        allowNull: true, // Temporary to allow migration
        comment: 'Type of company in the B2B marketplace'
      });
    }

    // Make existing company fields NOT NULL with default values
    await queryInterface.changeColumn('users', 'companyName', {
      type: Sequelize.STRING(255),
      allowNull: true, // Keep as nullable during migration
      validate: {
        notEmpty: true,
        len: [2, 255]
      }
    });

    await queryInterface.changeColumn('users', 'corporateName', {
      type: Sequelize.STRING(255),
      allowNull: true, // Keep as nullable during migration
      validate: {
        notEmpty: true,
        len: [2, 255]
      },
      comment: 'Legal corporate name for business registration'
    });

    await queryInterface.changeColumn('users', 'cnpj', {
      type: Sequelize.STRING(18),
      allowNull: true, // Keep as nullable during migration
      unique: true,
      validate: {
        notEmpty: true,
        len: [14, 18]
      }
    });

    await queryInterface.changeColumn('users', 'industrySector', {
      type: Sequelize.STRING(100),
      allowNull: true, // Keep as nullable during migration
      validate: {
        notEmpty: true,
        isIn: [['machinery', 'raw_materials', 'components', 'electronics', 'textiles', 'chemicals', 'automotive', 'food_beverage', 'construction', 'pharmaceutical', 'other']]
      },
      comment: 'Industry sector (machinery, raw_materials, components, etc.)'
    });

    // Update existing users to have default company values
    await queryInterface.sequelize.query(`
      UPDATE users 
      SET 
        companyName = COALESCE(companyName, 'Company Name Required'),
        corporateName = COALESCE(corporateName, 'Corporate Name Required'),
        cnpj = COALESCE(cnpj, '00000000000000' || CAST(id AS TEXT)),
        industrySector = COALESCE(industrySector, 'other'),
        companyType = CASE 
          WHEN role = 'supplier' THEN 'supplier'
          WHEN role = 'customer' THEN 'buyer'
          ELSE 'buyer'
        END
      WHERE companyName IS NULL OR corporateName IS NULL OR cnpj IS NULL OR industrySector IS NULL OR companyType IS NULL;
    `);

    // Add new fields to quotations table
    if (!(await columnExists('quotations', 'validUntil'))) {
      await queryInterface.addColumn('quotations', 'validUntil', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date until which the quotation is valid'
      });
    }

    if (!(await columnExists('quotations', 'requestedDeliveryDate'))) {
      await queryInterface.addColumn('quotations', 'requestedDeliveryDate', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Requested delivery date by the buyer'
      });
    }

    // Update products table for B2B requirements
    await queryInterface.changeColumn('products', 'supplierId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    });

    await queryInterface.changeColumn('products', 'tierPricing', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: [],
      comment: 'JSON field for quantity-based pricing tiers'
    });

    await queryInterface.changeColumn('products', 'specifications', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: {},
      comment: 'JSON field for technical specifications and product details'
    });

    await queryInterface.changeColumn('products', 'unitPrice', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Price per unit for bulk ordering'
    });

    await queryInterface.changeColumn('products', 'minimumOrderQuantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Minimum quantity required for orders'
    });

    if (!(await columnExists('products', 'leadTime'))) {
      await queryInterface.addColumn('products', 'leadTime', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 7,
        comment: 'Lead time in days for product delivery'
      });
    }

    if (!(await columnExists('products', 'availability'))) {
      await queryInterface.addColumn('products', 'availability', {
        type: Sequelize.ENUM('in_stock', 'out_of_stock', 'limited', 'custom_order'),
        allowNull: false,
        defaultValue: 'in_stock',
        comment: 'Product availability status'
      });
    }

    // Update existing products to have default B2B values
    await queryInterface.sequelize.query(`
      UPDATE products 
      SET 
        tierPricing = COALESCE(tierPricing, '[]'),
        specifications = COALESCE(specifications, '{}'),
        unitPrice = COALESCE(unitPrice, price),
        minimumOrderQuantity = COALESCE(minimumOrderQuantity, 1)
      WHERE tierPricing IS NULL OR specifications IS NULL OR unitPrice IS NULL OR minimumOrderQuantity IS NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove new columns from users table
    await queryInterface.removeColumn('users', 'companyType');

    // Revert users table changes
    await queryInterface.changeColumn('users', 'companyName', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.changeColumn('users', 'corporateName', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.changeColumn('users', 'cnpj', {
      type: Sequelize.STRING(18),
      allowNull: true,
      unique: true
    });

    await queryInterface.changeColumn('users', 'industrySector', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    // Remove new columns from quotations table
    await queryInterface.removeColumn('quotations', 'validUntil');
    await queryInterface.removeColumn('quotations', 'requestedDeliveryDate');

    // Revert products table changes
    await queryInterface.changeColumn('products', 'supplierId', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.changeColumn('products', 'tierPricing', {
      type: Sequelize.JSON,
      allowNull: true
    });

    await queryInterface.changeColumn('products', 'specifications', {
      type: Sequelize.JSON,
      allowNull: true
    });

    await queryInterface.changeColumn('products', 'unitPrice', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });

    await queryInterface.changeColumn('products', 'minimumOrderQuantity', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.removeColumn('products', 'leadTime');
    await queryInterface.removeColumn('products', 'availability');
  }
};