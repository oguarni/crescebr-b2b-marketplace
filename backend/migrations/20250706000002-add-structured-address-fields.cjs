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

    // Add structured address fields to users table
    if (!(await columnExists('users', 'street'))) {
      await queryInterface.addColumn('users', 'street', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Street address'
      });
    }

    if (!(await columnExists('users', 'number'))) {
      await queryInterface.addColumn('users', 'number', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Street number'
      });
    }

    if (!(await columnExists('users', 'complement'))) {
      await queryInterface.addColumn('users', 'complement', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Address complement (apartment, suite, etc.)'
      });
    }

    if (!(await columnExists('users', 'neighborhood'))) {
      await queryInterface.addColumn('users', 'neighborhood', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Neighborhood/District'
      });
    }

    if (!(await columnExists('users', 'city'))) {
      await queryInterface.addColumn('users', 'city', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'City name'
      });
    }

    if (!(await columnExists('users', 'state'))) {
      await queryInterface.addColumn('users', 'state', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'State/Province'
      });
    }

    if (!(await columnExists('users', 'zipCode'))) {
      await queryInterface.addColumn('users', 'zipCode', {
        type: Sequelize.STRING(20),
        allowNull: true,
        validate: {
          is: /^\d{5}-?\d{3}$/i, // Brazilian ZIP code format
        },
        comment: 'ZIP/Postal code'
      });
    }

    if (!(await columnExists('users', 'country'))) {
      await queryInterface.addColumn('users', 'country', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'Brazil',
        comment: 'Country name'
      });
    }

    // Add phone fields for better B2B communication
    if (!(await columnExists('users', 'phone'))) {
      await queryInterface.addColumn('users', 'phone', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Primary phone number'
      });
    }

    if (!(await columnExists('users', 'contactPerson'))) {
      await queryInterface.addColumn('users', 'contactPerson', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Main contact person name'
      });
    }

    if (!(await columnExists('users', 'contactTitle'))) {
      await queryInterface.addColumn('users', 'contactTitle', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Contact person title/position'
      });
    }

    // Add company size and revenue fields for B2B profiling
    if (!(await columnExists('users', 'companySize'))) {
      await queryInterface.addColumn('users', 'companySize', {
        type: Sequelize.ENUM('micro', 'small', 'medium', 'large', 'enterprise'),
        allowNull: true,
        comment: 'Company size classification'
      });
    }

    if (!(await columnExists('users', 'annualRevenue'))) {
      await queryInterface.addColumn('users', 'annualRevenue', {
        type: Sequelize.ENUM('under_500k', '500k_2m', '2m_10m', '10m_50m', '50m_200m', 'over_200m'),
        allowNull: true,
        comment: 'Annual revenue range in BRL'
      });
    }

    // Add business certifications field
    if (!(await columnExists('users', 'certifications'))) {
      await queryInterface.addColumn('users', 'certifications', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Business certifications and standards (ISO, etc.)'
      });
    }

    // Add website field
    if (!(await columnExists('users', 'website'))) {
      await queryInterface.addColumn('users', 'website', {
        type: Sequelize.STRING(255),
        allowNull: true,
        validate: {
          isUrl: true,
        },
        comment: 'Company website URL'
      });
    }

    // Set default values for existing users
    await queryInterface.sequelize.query(`
      UPDATE users 
      SET 
        country = COALESCE(country, 'Brazil'),
        certifications = COALESCE(certifications, '[]')
      WHERE country IS NULL OR certifications IS NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove all the new columns
    await queryInterface.removeColumn('users', 'street');
    await queryInterface.removeColumn('users', 'number');
    await queryInterface.removeColumn('users', 'complement');
    await queryInterface.removeColumn('users', 'neighborhood');
    await queryInterface.removeColumn('users', 'city');
    await queryInterface.removeColumn('users', 'state');
    await queryInterface.removeColumn('users', 'zipCode');
    await queryInterface.removeColumn('users', 'country');
    await queryInterface.removeColumn('users', 'phone');
    await queryInterface.removeColumn('users', 'contactPerson');
    await queryInterface.removeColumn('users', 'contactTitle');
    await queryInterface.removeColumn('users', 'companySize');
    await queryInterface.removeColumn('users', 'annualRevenue');
    await queryInterface.removeColumn('users', 'certifications');
    await queryInterface.removeColumn('users', 'website');
  }
};