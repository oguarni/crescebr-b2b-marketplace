/**
 * SQLite to PostgreSQL Data Migration Script
 *
 * This script exports data from SQLite and imports it into PostgreSQL.
 * Run with: npx tsx scripts/migrate-sqlite-to-postgres.ts
 *
 * Prerequisites:
 * 1. PostgreSQL must be running (docker-compose up -d)
 * 2. Migrations must be run first (npm run db:migrate)
 */

import { Sequelize, QueryTypes } from 'sequelize';
import * as fs from 'fs';
import * as path from 'path';

// SQLite connection (source)
const sqliteDb = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'crescebr_b2b.db'),
  logging: false,
});

// PostgreSQL connection (target)
const postgresDb = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'crescebr_dev',
  logging: false,
});

// Tables in dependency order (foreign key relationships)
const TABLES = [
  'users',
  'products',
  'quotations',
  'quotation_items',
  'orders',
  'order_status_history',
  'ratings',
];

interface MigrationResult {
  table: string;
  exported: number;
  imported: number;
  errors: string[];
}

async function exportTable(tableName: string): Promise<Record<string, unknown>[]> {
  try {
    const rows = await sqliteDb.query(`SELECT * FROM ${tableName}`, {
      type: QueryTypes.SELECT,
    });
    console.log(`  Exported ${rows.length} rows from ${tableName}`);
    return rows;
  } catch (error) {
    console.error(`  Error exporting ${tableName}:`, error);
    return [];
  }
}

async function importTable(tableName: string, rows: Record<string, unknown>[]): Promise<number> {
  if (rows.length === 0) {
    console.log(`  No rows to import for ${tableName}`);
    return 0;
  }

  let imported = 0;

  for (const row of rows) {
    try {
      // Build column names and values
      const columns = Object.keys(row);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const quotedColumns = columns.map(c => `"${c}"`).join(', ');
      const values = columns.map(c => row[c]);

      await postgresDb.query(
        `INSERT INTO ${tableName} (${quotedColumns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        {
          bind: values,
          type: QueryTypes.INSERT,
        }
      );
      imported++;
    } catch (error: unknown) {
      console.error(
        `  Error importing row into ${tableName}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.log(`  Imported ${imported}/${rows.length} rows into ${tableName}`);
  return imported;
}

async function resetSequences(): Promise<void> {
  console.log('\nResetting PostgreSQL sequences...');

  const sequenceQueries = [
    "SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1))",
    "SELECT setval('products_id_seq', COALESCE((SELECT MAX(id) FROM products), 1))",
    "SELECT setval('quotations_id_seq', COALESCE((SELECT MAX(id) FROM quotations), 1))",
    "SELECT setval('quotation_items_id_seq', COALESCE((SELECT MAX(id) FROM quotation_items), 1))",
    "SELECT setval('order_status_history_id_seq', COALESCE((SELECT MAX(id) FROM order_status_history), 1))",
    "SELECT setval('ratings_id_seq', COALESCE((SELECT MAX(id) FROM ratings), 1))",
  ];

  for (const query of sequenceQueries) {
    try {
      await postgresDb.query(query);
      console.log(`  Reset: ${query.split("'")[1]}`);
    } catch (error: unknown) {
      // Sequence might not exist if table is empty or different naming
      console.log(`  Skipped (sequence may not exist): ${query.split("'")[1]}`);
    }
  }
}

async function exportToJson(data: Record<string, Record<string, unknown>[]>): Promise<void> {
  const exportPath = path.join(__dirname, '..', 'data-export.json');
  fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
  console.log(`\nData exported to: ${exportPath}`);
}

async function migrate(): Promise<void> {
  console.log('='.repeat(60));
  console.log('SQLite to PostgreSQL Migration');
  console.log('='.repeat(60));

  const results: MigrationResult[] = [];
  const exportedData: Record<string, Record<string, unknown>[]> = {};

  try {
    // Test connections
    console.log('\n1. Testing database connections...');
    await sqliteDb.authenticate();
    console.log('  SQLite: Connected');

    await postgresDb.authenticate();
    console.log('  PostgreSQL: Connected');

    // Export data from SQLite
    console.log('\n2. Exporting data from SQLite...');
    for (const table of TABLES) {
      const rows = await exportTable(table);
      exportedData[table] = rows;
    }

    // Save export to JSON (backup)
    await exportToJson(exportedData);

    // Import data to PostgreSQL
    console.log('\n3. Importing data to PostgreSQL...');
    for (const table of TABLES) {
      const imported = await importTable(table, exportedData[table]);
      results.push({
        table,
        exported: exportedData[table].length,
        imported,
        errors: [],
      });
    }

    // Reset sequences
    await resetSequences();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    console.log('\nTable            | Exported | Imported');
    console.log('-'.repeat(45));
    for (const result of results) {
      console.log(
        `${result.table.padEnd(16)} | ${String(result.exported).padStart(8)} | ${String(result.imported).padStart(8)}`
      );
    }

    const totalExported = results.reduce((sum, r) => sum + r.exported, 0);
    const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
    console.log('-'.repeat(45));
    console.log(
      `${'TOTAL'.padEnd(16)} | ${String(totalExported).padStart(8)} | ${String(totalImported).padStart(8)}`
    );

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('\nMigration failed:', error);
    process.exit(1);
  } finally {
    await sqliteDb.close();
    await postgresDb.close();
  }
}

// Run migration
migrate().catch(console.error);
