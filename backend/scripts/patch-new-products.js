'use strict';

/**
 * patch-new-products.js
 *
 * Additive, idempotent injection of the new demo suppliers and their products
 * into an existing database. Safe to run against production:
 *
 *   - It NEVER deletes, truncates, updates, or overwrites existing rows.
 *   - Suppliers are inserted with findOrCreate (skipped if already present).
 *   - Products are filtered against existing names, then inserted with
 *     bulkCreate({ ignoreDuplicates: true }) so a re-run is a no-op.
 *   - All writes run inside a single transaction (all-or-nothing).
 *   - It does NOT call sequelize.sync(), so the schema is never altered.
 *
 * Models: this project has no separate "Supplier" model — suppliers are User
 * rows with role 'supplier'. We reuse the real compiled User/Product models so
 * their validations and the User password-hashing hook (beforeCreate) apply.
 *
 * Prerequisites:
 *   1. Build the backend first so dist/ exists:  npm run build
 *   2. Provide DB connection via environment (same vars the app uses):
 *        NODE_ENV=production DB_HOST=... DB_NAME=... DB_USER=... DB_PASSWORD=...
 *        # Cloud SQL over TCP also needs DB_SSL=true; Unix socket: DB_HOST=/cloudsql/<conn>
 *
 * Usage:
 *   node scripts/patch-new-products.js              # apply
 *   DRY_RUN=true node scripts/patch-new-products.js # preview, then roll back
 */

// Real models (compiled output). They share one Sequelize instance created from
// the app's env-driven config, so this connects exactly like the running app.
const User = require('../dist/backend/src/models/User').default;
const Product = require('../dist/backend/src/models/Product').default;

const sequelize = User.sequelize;
const DRY_RUN = process.env.DRY_RUN === 'true';

// Shared default password for the demo supplier logins. The User model's
// beforeCreate hook bcrypt-hashes this on insert — it is never stored in clear.
const SUPPLIER_PASSWORD = 'supplier123';

// --- New suppliers (keyed so products can reference them by domain, not by a
//     numeric id that does not exist until after they are created). -----------
const SUPPLIERS = [
  {
    key: 'electronics',
    email: 'supplier2@example.com',
    companyName: 'Apex Electronics Supply',
    corporateName: 'Apex Electronics Supply LTDA',
    cpf: '222.333.444-55',
    cnpj: '44.444.444/0001-44',
    address: 'Rua da Tecnologia, 1200, Londrina, PR',
    industrySector: 'electronics',
  },
  {
    key: 'construction',
    email: 'supplier3@example.com',
    companyName: 'BuildPro Materials',
    corporateName: 'BuildPro Materials LTDA',
    cpf: '333.444.555-66',
    cnpj: '55.555.555/0001-55',
    address: 'Rod. do Cimento, 3000, Ponta Grossa, PR',
    industrySector: 'construction',
  },
  {
    key: 'chemicals',
    email: 'supplier4@example.com',
    companyName: 'ChemSource Industrial',
    corporateName: 'ChemSource Industrial SA',
    cpf: '444.555.666-77',
    cnpj: '66.666.666/0001-66',
    address: 'Av. das Industrias Quimicas, 850, Araucaria, PR',
    industrySector: 'chemicals',
  },
];

// --- The 15 new products, 5 per new supplier. ------------------------------
// Edit this array freely. `supplierKey` ties a product to one of the suppliers
// above; `specifications`/`tierPricing` are plain objects/arrays (the JSON model
// fields serialize them — do NOT pre-stringify).
const PRODUCTS = [
  // Apex Electronics Supply
  {
    supplierKey: 'electronics',
    name: 'Three-Phase Induction Motor 5HP',
    description: 'TEFC three-phase induction motor, 5 HP, 380V, 4-pole, IE3 efficiency class.',
    price: 1850.0,
    category: 'Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837',
    minimumOrderQuantity: 2,
    leadTime: 7,
    availability: 'in_stock',
    specifications: { power: '5HP', voltage: '380V', poles: '4' },
    tierPricing: [
      { minQuantity: 1, maxQuantity: 10, discount: 0 },
      { minQuantity: 11, maxQuantity: null, discount: 0.1 },
    ],
  },
  {
    supplierKey: 'electronics',
    name: 'Industrial Ethernet Switch 8-Port',
    description:
      'DIN-rail managed industrial Ethernet switch, 8x Gigabit ports, -40C to 75C range.',
    price: 980.0,
    category: 'Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837',
    minimumOrderQuantity: 5,
    leadTime: 6,
    availability: 'in_stock',
    specifications: { ports: '8', speed: '1Gbps', mounting: 'DIN rail' },
    tierPricing: [
      { minQuantity: 5, maxQuantity: 50, discount: 0 },
      { minQuantity: 51, maxQuantity: null, discount: 0.12 },
    ],
  },
  {
    supplierKey: 'electronics',
    name: 'Variable Frequency Drive 7.5kW',
    description: 'Vector-control VFD, 7.5kW, 380V input, Modbus RTU, built-in EMC filter.',
    price: 2450.0,
    category: 'Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837',
    minimumOrderQuantity: 1,
    leadTime: 10,
    availability: 'in_stock',
    specifications: { power: '7.5kW', input: '380V', protocol: 'Modbus' },
    tierPricing: [],
  },
  {
    supplierKey: 'electronics',
    name: 'Capacitive Proximity Sensor M18',
    description:
      'M18 capacitive proximity sensor, 8mm sensing range, PNP normally-open output, IP67.',
    price: 145.0,
    category: 'Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837',
    minimumOrderQuantity: 10,
    leadTime: 4,
    availability: 'in_stock',
    specifications: { range: '8mm', output: 'PNP', housing: 'M18' },
    tierPricing: [
      { minQuantity: 10, maxQuantity: 100, discount: 0 },
      { minQuantity: 101, maxQuantity: null, discount: 0.15 },
    ],
  },
  {
    supplierKey: 'electronics',
    name: 'CNC Spindle Motor 2.2kW',
    description:
      'Air-cooled high-frequency spindle motor for CNC routers. 24,000 RPM, ER20 collet.',
    price: 3200.0,
    category: 'Machinery',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158',
    minimumOrderQuantity: 2,
    leadTime: 9,
    availability: 'limited',
    specifications: { power: '2.2kW', rpm: '24000', cooling: 'Air' },
    tierPricing: [],
  },

  // BuildPro Materials
  {
    supplierKey: 'construction',
    name: 'Portland Cement CP-II (per ton)',
    description: 'CP-II-E-32 Portland cement compliant with NBR 11578. Sold per metric ton.',
    price: 580.0,
    category: 'Construction',
    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd',
    minimumOrderQuantity: 5,
    leadTime: 5,
    availability: 'in_stock',
    specifications: { type: 'CP-II', standard: 'NBR 11578', weight: '1000kg' },
    tierPricing: [
      { minQuantity: 5, maxQuantity: 20, discount: 0 },
      { minQuantity: 21, maxQuantity: null, discount: 0.08 },
    ],
  },
  {
    supplierKey: 'construction',
    name: 'Structural Steel Beam W200x15',
    description: 'Hot-rolled W200x15.0 structural steel beam, ASTM A572 Grade 50, 6m length.',
    price: 1240.0,
    category: 'Construction',
    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd',
    minimumOrderQuantity: 4,
    leadTime: 8,
    availability: 'in_stock',
    specifications: { profile: 'W200x15', length: '6m', grade: 'ASTM A572' },
    tierPricing: [],
  },
  {
    supplierKey: 'construction',
    name: 'Concrete Block 14x19x39 (pallet)',
    description: 'Structural concrete blocks 14x19x39cm, 4 MPa, supplied per pallet of 180 units.',
    price: 420.0,
    category: 'Construction',
    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd',
    minimumOrderQuantity: 2,
    leadTime: 6,
    availability: 'in_stock',
    specifications: { dimensions: '14x19x39cm', perPallet: '180', strength: '4 MPa' },
    tierPricing: [
      { minQuantity: 2, maxQuantity: 10, discount: 0 },
      { minQuantity: 11, maxQuantity: null, discount: 0.1 },
    ],
  },
  {
    supplierKey: 'construction',
    name: 'Waterproofing Membrane Roll',
    description:
      'Asphaltic waterproofing membrane, 3mm thick, 10m2 per roll, polyester reinforced.',
    price: 315.0,
    category: 'Construction',
    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd',
    minimumOrderQuantity: 10,
    leadTime: 7,
    availability: 'limited',
    specifications: { area: '10m2', thickness: '3mm', type: 'Asphaltic' },
    tierPricing: [],
  },
  {
    supplierKey: 'construction',
    name: 'Industrial Air Compressor 100L',
    description:
      'Belt-driven 100L air compressor, 8 bar working pressure, 3 HP motor for job sites.',
    price: 8900.0,
    category: 'Machinery',
    imageUrl: 'https://images.unsplash.com/photo-1567789884554-0b844b597180',
    minimumOrderQuantity: 1,
    leadTime: 12,
    availability: 'in_stock',
    specifications: { capacity: '100L', pressure: '8 bar', power: '3HP' },
    tierPricing: [
      { minQuantity: 1, maxQuantity: 5, discount: 0 },
      { minQuantity: 6, maxQuantity: null, discount: 0.07 },
    ],
  },

  // ChemSource Industrial
  {
    supplierKey: 'chemicals',
    name: 'Industrial Degreaser Concentrate 20L',
    description: 'Biodegradable alkaline degreaser concentrate, 1:10 dilution, for heavy cleaning.',
    price: 260.0,
    category: 'Chemicals',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158',
    minimumOrderQuantity: 4,
    leadTime: 5,
    availability: 'in_stock',
    specifications: { volume: '20L', dilution: '1:10', biodegradable: 'Yes' },
    tierPricing: [
      { minQuantity: 4, maxQuantity: 20, discount: 0 },
      { minQuantity: 21, maxQuantity: null, discount: 0.09 },
    ],
  },
  {
    supplierKey: 'chemicals',
    name: 'Epoxy Floor Coating Kit',
    description:
      'Two-component self-leveling epoxy floor coating, glossy finish, covers 25m2 per kit.',
    price: 690.0,
    category: 'Chemicals',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158',
    minimumOrderQuantity: 2,
    leadTime: 9,
    availability: 'in_stock',
    specifications: { coverage: '25m2', components: '2', finish: 'Glossy' },
    tierPricing: [],
  },
  {
    supplierKey: 'chemicals',
    name: 'Nitrile Safety Gloves (box of 100)',
    description: 'Powder-free nitrile examination gloves, EN 374 chemical resistance, box of 100.',
    price: 89.0,
    category: 'Safety',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158',
    minimumOrderQuantity: 20,
    leadTime: 3,
    availability: 'in_stock',
    specifications: { size: 'M-L', standard: 'EN 374', count: '100' },
    tierPricing: [
      { minQuantity: 20, maxQuantity: 200, discount: 0 },
      { minQuantity: 201, maxQuantity: null, discount: 0.18 },
    ],
  },
  {
    supplierKey: 'chemicals',
    name: 'Industrial Solvent Cleaner 50L',
    description: 'High-flash-point solvent cleaner for degreasing metal parts, 50L drum.',
    price: 540.0,
    category: 'Chemicals',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158',
    minimumOrderQuantity: 2,
    leadTime: 6,
    availability: 'custom_order',
    specifications: { volume: '50L', flashPoint: '62C', use: 'Degreasing' },
    tierPricing: [],
  },
  {
    supplierKey: 'chemicals',
    name: 'Industrial Lubricant Oil ISO 68 (200L)',
    description: 'Mineral hydraulic/lubricant oil ISO VG 68, anti-wear additives, 200L drum.',
    price: 1200.0,
    category: 'Chemicals',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158',
    minimumOrderQuantity: 1,
    leadTime: 6,
    availability: 'in_stock',
    specifications: { grade: 'ISO VG 68', volume: '200L', additive: 'Anti-wear' },
    tierPricing: [],
  },
];

/** Build the full attribute set for a new supplier User row. */
function buildSupplierDefaults(supplier) {
  return {
    email: supplier.email,
    password: SUPPLIER_PASSWORD, // hashed by the model's beforeCreate hook
    cpf: supplier.cpf,
    address: supplier.address,
    role: 'supplier',
    status: 'approved',
    companyName: supplier.companyName,
    corporateName: supplier.corporateName,
    cnpj: supplier.cnpj,
    cnpjValidated: false,
    industrySector: supplier.industrySector,
    companyType: 'supplier',
  };
}

async function run() {
  await sequelize.authenticate();
  console.log(
    `Connected (${process.env.NODE_ENV || 'development'}).${DRY_RUN ? ' DRY RUN — changes will be rolled back.' : ''}`
  );

  const transaction = await sequelize.transaction();
  try {
    // 1) Suppliers: idempotent via findOrCreate (keyed on the unique email).
    const supplierIdByKey = {};
    for (const supplier of SUPPLIERS) {
      const [row, created] = await User.findOrCreate({
        where: { email: supplier.email },
        defaults: buildSupplierDefaults(supplier),
        transaction,
      });
      supplierIdByKey[supplier.key] = row.id;
      console.log(
        `Supplier ${supplier.email}: ${created ? 'created' : 'already existed'} (id ${row.id}).`
      );
    }

    // 2) Map products to their supplier id and drop the helper key.
    const candidates = PRODUCTS.map(({ supplierKey, ...rest }) => {
      const supplierId = supplierIdByKey[supplierKey];
      if (!supplierId) {
        throw new Error(`No supplier resolved for key "${supplierKey}" (product "${rest.name}").`);
      }
      return { ...rest, supplierId, unitPrice: rest.price };
    });

    // 3) Skip products already present by name so re-runs never duplicate.
    const existing = await Product.findAll({
      where: { name: candidates.map(p => p.name) },
      attributes: ['name'],
      transaction,
    });
    const existingNames = new Set(existing.map(p => p.name));
    const toInsert = candidates.filter(p => !existingNames.has(p.name));

    if (toInsert.length === 0) {
      console.log('All products already present — nothing to insert.');
    } else {
      // ignoreDuplicates guards any unique/PK conflict at the DB level too.
      await Product.bulkCreate(toInsert, {
        ignoreDuplicates: true,
        validate: true,
        transaction,
      });
      console.log(
        `Inserted ${toInsert.length} product(s); skipped ${existingNames.size} already present.`
      );
    }

    if (DRY_RUN) {
      await transaction.rollback();
      console.log('DRY RUN complete — transaction rolled back, no changes persisted.');
    } else {
      await transaction.commit();
      console.log('Patch committed successfully.');
    }
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Only auto-run when invoked directly (node scripts/patch-new-products.js).
// Exporting the data lets it be imported/validated without opening a connection.
if (require.main === module) {
  run()
    .then(async () => {
      await sequelize.close();
      process.exit(0);
    })
    .catch(async error => {
      console.error('Patch failed (no partial changes were committed):', error.message);
      try {
        await sequelize.close();
      } catch {
        /* connection may already be closed */
      }
      process.exit(1);
    });
}

module.exports = { SUPPLIERS, PRODUCTS, buildSupplierDefaults, run };
