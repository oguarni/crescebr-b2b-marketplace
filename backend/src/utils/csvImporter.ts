import csv from 'csv-parser';
import * as fs from 'fs';
import Product, { ProductCreationAttributes } from '../models/Product';
import { Transaction, Op } from 'sequelize';
import sequelize from '../config/database';

interface ProductCSVRow {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  category: string;
  supplierId?: string;
  tierPricing?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    data: ProductCSVRow;
    error: string;
  }>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class CSVImporter {
  private static validateProductRow(row: ProductCSVRow, _rowNumber: number): ValidationResult {
    const errors: string[] = [];

    if (!row.name || row.name.trim().length === 0) {
      errors.push('Product name is required');
    }

    if (!row.description || row.description.trim().length === 0) {
      errors.push('Product description is required');
    }

    if (!row.price || isNaN(parseFloat(row.price)) || parseFloat(row.price) <= 0) {
      errors.push('Valid price is required (must be a positive number)');
    }

    if (!row.imageUrl || row.imageUrl.trim().length === 0) {
      errors.push('Image URL is required');
    } else {
      try {
        new URL(row.imageUrl);
      } catch {
        errors.push('Invalid image URL format');
      }
    }

    if (!row.category || row.category.trim().length === 0) {
      errors.push('Category is required');
    }

    if (row.supplierId && (isNaN(parseInt(row.supplierId)) || parseInt(row.supplierId) <= 0)) {
      errors.push('Supplier ID must be a valid positive number');
    }

    if (row.tierPricing) {
      try {
        const tierPricing = JSON.parse(row.tierPricing);
        if (!Array.isArray(tierPricing)) {
          errors.push('Tier pricing must be a valid JSON array');
        } else {
          for (const tier of tierPricing) {
            if (
              tier.minQuantity === undefined ||
              tier.minQuantity === null ||
              tier.discount === undefined ||
              tier.discount === null ||
              isNaN(tier.minQuantity) ||
              isNaN(tier.discount) ||
              tier.minQuantity <= 0 ||
              tier.discount < 0 ||
              tier.discount > 1
            ) {
              errors.push(
                'Invalid tier pricing format - each tier must have valid minQuantity and discount (0-1)'
              );
              break;
            }
          }
        }
      } catch {
        errors.push('Tier pricing must be valid JSON');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static async processProductRow(
    row: ProductCSVRow,
    transaction: Transaction
  ): Promise<Product> {
    const productData: Partial<ProductCreationAttributes> = {
      name: row.name.trim(),
      description: row.description.trim(),
      price: parseFloat(row.price),
      imageUrl: row.imageUrl.trim(),
      category: row.category.trim(),
      // Default values required by model
      specifications: {},
      unitPrice: parseFloat(row.price),
      minimumOrderQuantity: 1,
      leadTime: 7,
      availability: 'in_stock',
      tierPricing: [],
    };

    if (row.supplierId) {
      productData.supplierId = parseInt(row.supplierId);
    }

    if (row.tierPricing) {
      try {
        productData.tierPricing = JSON.parse(row.tierPricing);
      } catch {
        // Will be caught by validation
      }
    }

    return await Product.create(productData as ProductCreationAttributes, { transaction });
  }

  static async importProductsFromCSV(
    filePath: string,
    options: {
      batchSize?: number;
      skipErrors?: boolean;
      supplierId?: number;
    } = {}
  ): Promise<ImportResult> {
    const { batchSize = 100, skipErrors = true, supplierId } = options;

    const result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: [],
    };

    if (!fs.existsSync(filePath)) {
      result.errors.push({
        row: 0,
        data: {} as ProductCSVRow,
        error: 'CSV file not found',
      });
      return result;
    }

    const rows: ProductCSVRow[] = [];

    try {
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data: ProductCSVRow) => {
            if (supplierId) {
              data.supplierId = supplierId.toString();
            }
            rows.push(data);
          })
          .on('end', resolve)
          .on('error', reject);
      });

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const transaction = await sequelize.transaction();

        try {
          for (const [index, row] of batch.entries()) {
            const rowNumber = i + index + 1;

            try {
              const validation = this.validateProductRow(row, rowNumber);

              if (!validation.valid) {
                result.failed++;
                result.errors.push({
                  row: rowNumber,
                  data: row,
                  error: validation.errors.join(', '),
                });

                if (!skipErrors) {
                  throw new Error(
                    `Validation failed for row ${rowNumber}: ${validation.errors.join(', ')}`
                  );
                }
                continue;
              }

              await this.processProductRow(row, transaction);
              result.imported++;
            } catch (error) {
              result.failed++;
              result.errors.push({
                row: rowNumber,
                data: row,
                error: error instanceof Error ? error.message : 'Unknown error',
              });

              if (!skipErrors) {
                throw error;
              }
            }
          }

          await transaction.commit();
        } catch (error) {
          await transaction.rollback();

          if (!skipErrors) {
            throw error;
          }
        }
      }

      result.success = result.imported > 0;
    } catch (error) {
      result.errors.push({
        row: 0,
        data: {} as ProductCSVRow,
        error: error instanceof Error ? error.message : 'Failed to process CSV file',
      });
    }

    return result;
  }

  static generateSampleCSV(filePath: string): void {
    const sampleData = [
      {
        name: 'Industrial Pump Model A',
        description: 'High-performance industrial water pump suitable for heavy-duty applications',
        price: '1500.00',
        imageUrl: 'https://example.com/pump-a.jpg',
        category: 'Industrial Equipment',
        supplierId: '1',
        tierPricing: JSON.stringify([
          { minQuantity: 1, maxQuantity: 10, discount: 0 },
          { minQuantity: 11, maxQuantity: 50, discount: 0.05 },
          { minQuantity: 51, maxQuantity: null, discount: 0.1 },
        ]),
      },
      {
        name: 'Steel Pipe 6 inch',
        description: 'Galvanized steel pipe, 6 inch diameter, 3 meter length',
        price: '85.50',
        imageUrl: 'https://example.com/steel-pipe.jpg',
        category: 'Construction Materials',
        supplierId: '2',
        tierPricing: JSON.stringify([
          { minQuantity: 1, maxQuantity: 20, discount: 0 },
          { minQuantity: 21, maxQuantity: 100, discount: 0.08 },
          { minQuantity: 101, maxQuantity: null, discount: 0.15 },
        ]),
      },
      {
        name: 'Safety Helmet',
        description: 'Industrial safety helmet with adjustable strap, meets safety standards',
        price: '25.00',
        imageUrl: 'https://example.com/safety-helmet.jpg',
        category: 'Safety Equipment',
        supplierId: '1',
        tierPricing: JSON.stringify([
          { minQuantity: 1, maxQuantity: 50, discount: 0 },
          { minQuantity: 51, maxQuantity: 200, discount: 0.12 },
          { minQuantity: 201, maxQuantity: null, discount: 0.2 },
        ]),
      },
    ];

    const csvHeaders = 'name,description,price,imageUrl,category,supplierId,tierPricing\n';
    const csvContent = sampleData
      .map(
        row =>
          `"${row.name}","${row.description}","${row.price}","${row.imageUrl}","${row.category}","${row.supplierId}","${row.tierPricing}"`
      )
      .join('\n');

    fs.writeFileSync(filePath, csvHeaders + csvContent);
  }

  static async getImportStats(): Promise<{
    totalProducts: number;
    productsByCategory: { [category: string]: number };
    productsWithTierPricing: number;
    productsBySupplier: { [supplierId: string]: number };
  }> {
    const totalProducts = await Product.count();

    const productsByCategory = (await Product.findAll({
      attributes: ['category', [sequelize.fn('COUNT', sequelize.col('category')), 'count']],
      group: ['category'],
      raw: true,
    })) as unknown as Array<{ category: string; count: string }>;

    const categoryStats = productsByCategory.reduce((acc: Record<string, number>, item: { category: string; count: string }) => {
      acc[item.category] = parseInt(item.count);
      return acc;
    }, {} as Record<string, number>);

    const productsWithTierPricing = await Product.count({
      where: sequelize.where(sequelize.col('tierPricing'), { [Op.not]: null }),
    });

    const productsBySupplier = (await Product.findAll({
      attributes: ['supplierId', [sequelize.fn('COUNT', sequelize.col('supplierId')), 'count']],
      group: ['supplierId'],
      raw: true,
    })) as unknown as Array<{ supplierId: number; count: string }>;

    const supplierStats = productsBySupplier.reduce((acc: Record<string, number>, item: { supplierId: number; count: string }) => {
      acc[item.supplierId] = parseInt(item.count);
      return acc;
    }, {} as Record<string, number>);

    return {
      totalProducts,
      productsByCategory: categoryStats,
      productsWithTierPricing,
      productsBySupplier: supplierStats,
    };
  }
}
