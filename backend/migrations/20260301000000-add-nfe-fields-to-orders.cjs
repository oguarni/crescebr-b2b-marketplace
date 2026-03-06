'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Helper: check if a column already exists (SQLite-compatible via PRAGMA)
        const columnExists = async (tableName, columnName) => {
            const tableInfo = await queryInterface.sequelize.query(
                `PRAGMA table_info(${tableName})`,
                { type: Sequelize.QueryTypes.SELECT }
            );
            return tableInfo.some(column => column.name === columnName);
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
