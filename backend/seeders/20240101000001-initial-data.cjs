'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const supplierPasswordHash = await bcrypt.hash('supplier123', 10);
    const buyerPasswordHash = await bcrypt.hash('buyer123', 10);

    // Create users
    await queryInterface.bulkInsert('users', [
      {
        email: 'admin@crescebr.com',
        password: adminPasswordHash,
        cpf: '123.456.789-00',
        address: 'Rua Principal, 123, Cascavel, PR',
        role: 'admin',
        status: 'approved',
        companyName: 'CresceBR Admin',
        corporateName: 'CresceBR Administracao LTDA',
        cnpj: '00.000.000/0001-00',
        cnpjValidated: false,
        industrySector: 'other',
        companyType: 'both',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: 'supplier@example.com',
        password: supplierPasswordHash,
        cpf: '111.222.333-44',
        address: 'Av. Industrial, 500, Curitiba, PR',
        role: 'supplier',
        status: 'approved',
        companyName: 'Industrial Solutions',
        corporateName: 'Industrial Solutions LTDA',
        cnpj: '22.222.222/0001-22',
        cnpjValidated: false,
        industrySector: 'machinery',
        companyType: 'supplier',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: 'buyer@example.com',
        password: buyerPasswordHash,
        cpf: '555.666.777-88',
        address: 'Av. Brasil, 456, Foz do Iguacu, PR',
        role: 'customer',
        status: 'approved',
        companyName: 'Buyer Corp',
        corporateName: 'Buyer Corp Comercio LTDA',
        cnpj: '33.333.333/0001-33',
        cnpjValidated: false,
        industrySector: 'construction',
        companyType: 'buyer',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Get the supplier user ID for products
    const [users] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = 'supplier@example.com' LIMIT 1;"
    );
    const supplierId = users[0].id;

    // Create sample products
    await queryInterface.bulkInsert('products', [
      {
        name: 'Industrial Bearing XYZ-500',
        description: 'High-precision ball bearing for industrial machinery. Grade ABEC-7, suitable for heavy-duty applications.',
        price: 150.00,
        imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158',
        supplierId: supplierId,
        category: 'Components',
        unitPrice: 150.00,
        minimumOrderQuantity: 10,
        leadTime: 5,
        availability: 'in_stock',
        specifications: JSON.stringify({ size: '50mm', material: 'Steel', grade: 'ABEC-7' }),
        tierPricing: JSON.stringify([
          { minQuantity: 1, maxQuantity: 50, discount: 0 },
          { minQuantity: 51, maxQuantity: 200, discount: 0.1 },
          { minQuantity: 201, maxQuantity: null, discount: 0.2 },
        ]),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Professional Hydraulic Press',
        description: 'Heavy-duty hydraulic press with 50-ton capacity. Digital pressure gauge included.',
        price: 15000.00,
        imageUrl: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407',
        supplierId: supplierId,
        category: 'Machinery',
        unitPrice: 15000.00,
        minimumOrderQuantity: 1,
        leadTime: 14,
        availability: 'in_stock',
        specifications: JSON.stringify({ capacity: '50 tons', power: '380V', weight: '2500kg' }),
        tierPricing: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Premium Construction Steel Rebar',
        description: 'CA-50 steel rebar, 12mm diameter, compliant with NBR 7480. Sold per ton.',
        price: 4200.00,
        imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd',
        supplierId: supplierId,
        category: 'Construction',
        unitPrice: 4200.00,
        minimumOrderQuantity: 1,
        leadTime: 7,
        availability: 'in_stock',
        specifications: JSON.stringify({ diameter: '12mm', standard: 'NBR 7480', type: 'CA-50' }),
        tierPricing: JSON.stringify([
          { minQuantity: 1, maxQuantity: 5, discount: 0 },
          { minQuantity: 6, maxQuantity: 20, discount: 0.05 },
          { minQuantity: 21, maxQuantity: null, discount: 0.12 },
        ]),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Industrial Automation PLC Module',
        description: 'Programmable Logic Controller module with 16 digital I/O. Modbus and Ethernet support.',
        price: 2800.00,
        imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837',
        supplierId: supplierId,
        category: 'Electronics',
        unitPrice: 2800.00,
        minimumOrderQuantity: 1,
        leadTime: 10,
        availability: 'in_stock',
        specifications: JSON.stringify({ io_count: '16', protocols: 'Modbus, Ethernet', voltage: '24V DC' }),
        tierPricing: JSON.stringify([
          { minQuantity: 1, maxQuantity: 10, discount: 0 },
          { minQuantity: 11, maxQuantity: 50, discount: 0.08 },
          { minQuantity: 51, maxQuantity: null, discount: 0.15 },
        ]),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Safety Helmet - Industrial Grade',
        description: 'ANSI Z89.1 compliant industrial safety helmet with adjustable suspension.',
        price: 45.00,
        imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd',
        supplierId: supplierId,
        category: 'Safety',
        unitPrice: 45.00,
        minimumOrderQuantity: 20,
        leadTime: 3,
        availability: 'in_stock',
        specifications: JSON.stringify({ standard: 'ANSI Z89.1', material: 'HDPE', color: 'Yellow' }),
        tierPricing: JSON.stringify([
          { minQuantity: 20, maxQuantity: 100, discount: 0 },
          { minQuantity: 101, maxQuantity: 500, discount: 0.1 },
          { minQuantity: 501, maxQuantity: null, discount: 0.18 },
        ]),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
