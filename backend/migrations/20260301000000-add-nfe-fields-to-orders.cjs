'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Helper: check if a column already exists (PostgreSQL-compatible)
        const columnExists = async (tableName, columnName) => {
            const tableInfo = await queryInterface.sequelize.query(
                `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}'`,
                { type: Sequelize.QueryTypes.SELECT }
            );
            return tableInfo.length > 0;
        };

        // Add nfeAccessKey — Brazilian NF-e access key (exactly 44 numeric digits)
        if (!(await columnExists('orders', 'nfeAccessKey'))) {
            await queryInterface.addColumn('orders', 'nfeAccessKey', {
                type: Sequelize.STRING(44),
                allowNull: true,
                comment: 'Brazilian NF-e access key — exactly 44 numeric digits',
            });
        }

        // Add nfeUrl — URL pointing to the NF-e document (optional)
        if (!(await columnExists('orders', 'nfeUrl'))) {
            await queryInterface.addColumn('orders', 'nfeUrl', {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'URL pointing to the NF-e document',
            });
        }
    },

    async down(queryInterface, _Sequelize) {
        await queryInterface.removeColumn('orders', 'nfeAccessKey');
        await queryInterface.removeColumn('orders', 'nfeUrl');
    },
};
