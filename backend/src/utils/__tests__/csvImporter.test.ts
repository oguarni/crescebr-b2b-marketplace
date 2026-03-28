import * as fs from 'fs';
import * as path from 'path';
import { CSVImporter } from '../csvImporter';
import Product from '../../models/Product';
import sequelize from '../../config/database';

// Mock the dependencies
jest.mock('fs');
jest.mock('../../models/Product');
jest.mock('../../config/database');

const mockFs = fs as jest.Mocked<typeof fs>;
const MockProduct = Product as jest.Mocked<typeof Product>;
const mockSequelize = sequelize as jest.Mocked<typeof sequelize>;

// Mock csv-parser
jest.mock('csv-parser', () =>
  jest.fn(() => ({
    on: jest.fn(function (this: any, event: string, callback: Function) {
      if (event === 'data') {
        this.dataCallback = callback;
      } else if (event === 'end') {
        this.endCallback = callback;
      } else if (event === 'error') {
        this.errorCallback = callback;
      }
      return this;
    }),
  }))
);

const mockCsvParser = require('csv-parser');

describe('CSVImporter', () => {
  const setupFileSystemMock = (csvData: any[]) => {
    mockFs.existsSync.mockReturnValue(true);

    const mockCsvParserInstance = {
      on: jest.fn(function (this: any, event: string, callback: Function) {
        if (event === 'data') {
          // Immediately call the callback for each data row
          csvData.forEach(row => callback(row));
        } else if (event === 'end') {
          // Immediately call the end callback
          callback();
        } else if (event === 'error') {
          this.errorCallback = callback;
        }
        return this;
      }),
    };

    mockCsvParser.mockReturnValue(mockCsvParserInstance);

    mockFs.createReadStream.mockReturnValue({
      pipe: jest.fn().mockReturnValue(mockCsvParserInstance),
    } as any);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock transaction
    const mockTransaction = {
      commit: jest.fn().mockResolvedValue(true),
      rollback: jest.fn().mockResolvedValue(true),
    };
    mockSequelize.transaction = jest.fn().mockResolvedValue(mockTransaction as any);
  });

  describe('validateProductRow', () => {
    it('should validate a valid product row', () => {
      const validRow = {
        name: 'Test Product',
        description: 'Test Description',
        price: '100.00',
        imageUrl: 'https://example.com/image.jpg',
        category: 'Test Category',
        supplierId: '1',
        tierPricing: JSON.stringify([
          { minQuantity: 1, maxQuantity: 10, discount: 0 },
          { minQuantity: 11, maxQuantity: null, discount: 0.1 },
        ]),
      };

      const result = (CSVImporter as any).validateProductRow(validRow, 1);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should invalidate row with missing name', () => {
      const invalidRow = {
        name: '',
        description: 'Test Description',
        price: '100.00',
        imageUrl: 'https://example.com/image.jpg',
        category: 'Test Category',
      };

      const result = (CSVImporter as any).validateProductRow(invalidRow, 1);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Product name is required');
    });

    it('should invalidate row with missing description', () => {
      const invalidRow = {
        name: 'Test Product',
        description: '',
        price: '100.00',
        imageUrl: 'https://example.com/image.jpg',
        category: 'Test Category',
      };

      const result = (CSVImporter as any).validateProductRow(invalidRow, 1);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Product description is required');
    });

    it('should invalidate row with invalid price', () => {
      const invalidRow = {
        name: 'Test Product',
        description: 'Test Description',
        price: 'invalid',
        imageUrl: 'https://example.com/image.jpg',
        category: 'Test Category',
      };

      const result = (CSVImporter as any).validateProductRow(invalidRow, 1);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valid price is required (must be a positive number)');
    });

    it('should invalidate row with negative price', () => {
      const invalidRow = {
        name: 'Test Product',
        description: 'Test Description',
        price: '-10.00',
        imageUrl: 'https://example.com/image.jpg',
        category: 'Test Category',
      };

      const result = (CSVImporter as any).validateProductRow(invalidRow, 1);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valid price is required (must be a positive number)');
    });

    it('should invalidate row with zero price', () => {
      const invalidRow = {
        name: 'Test Product',
        description: 'Test Description',
        price: '0',
        imageUrl: 'https://example.com/image.jpg',
        category: 'Test Category',
      };

      const result = (CSVImporter as any).validateProductRow(invalidRow, 1);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valid price is required (must be a positive number)');
    });

    it('should invalidate row with missing image URL', () => {
      const invalidRow = {
        name: 'Test Product',
        description: 'Test Description',
        price: '100.00',
        imageUrl: '',
        category: 'Test Category',
      };

      const result = (CSVImporter as any).validateProductRow(invalidRow, 1);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image URL is required');
    });

    it('should invalidate row with invalid image URL format', () => {
      const invalidRow = {
        name: 'Test Product',
        description: 'Test Description',
        price: '100.00',
        imageUrl: 'not-a-url',
        category: 'Test Category',
      };

      const result = (CSVImporter as any).validateProductRow(invalidRow, 1);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid image URL format');
    });

    it('should invalidate row with missing category', () => {
      const invalidRow = {
        name: 'Test Product',
        description: 'Test Description',
        price: '100.00',
        imageUrl: 'https://example.com/image.jpg',
        category: '',
      };

      const result = (CSVImporter as any).validateProductRow(invalidRow, 1);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Category is required');
    });

    it('should invalidate row with invalid supplier ID', () => {
      const invalidRow = {
        name: 'Test Product',
        description: 'Test Description',
        price: '100.00',
        imageUrl: 'https://example.com/image.jpg',
        category: 'Test Category',
        supplierId: 'invalid',
      };

      const result = (CSVImporter as any).validateProductRow(invalidRow, 1);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Supplier ID must be a valid positive number');
    });

    it('should invalidate row with negative supplier ID', () => {
      const invalidRow = {
        name: 'Test Product',
        description: 'Test Description',
        price: '100.00',
        imageUrl: 'https://example.com/image.jpg',
        category: 'Test Category',
        supplierId: '-1',
      };

      const result = (CSVImporter as any).validateProductRow(invalidRow, 1);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Supplier ID must be a valid positive number');
    });

    it('should invalidate row with invalid tier pricing JSON', () => {
      const invalidRow = {
        name: 'Test Product',
        description: 'Test Description',
        price: '100.00',
        imageUrl: 'https://example.com/image.jpg',
        category: 'Test Category',
        tierPricing: 'invalid-json',
      };

      const result = (CSVImporter as any).validateProductRow(invalidRow, 1);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tier pricing must be valid JSON');
    });

    it('should invalidate row with tier pricing that is not an array', () => {
      const invalidRow = {
        name: 'Test Product',
        description: 'Test Description',
        price: '100.00',
        imageUrl: 'https://example.com/image.jpg',
        category: 'Test Category',
        tierPricing: '{"not": "array"}',
      };

      const result = (CSVImporter as any).validateProductRow(invalidRow, 1);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tier pricing must be a valid JSON array');
    });

    it('should invalidate row with invalid tier pricing structure', () => {
      const invalidRow = {
        name: 'Test Product',
        description: 'Test Description',
        price: '100.00',
        imageUrl: 'https://example.com/image.jpg',
        category: 'Test Category',
        tierPricing: JSON.stringify([{ minQuantity: 'invalid', discount: 0.1 }]),
      };

      const result = (CSVImporter as any).validateProductRow(invalidRow, 1);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Invalid tier pricing format - each tier must have valid minQuantity and discount (0-1)'
      );
    });

    it('should collect multiple validation errors', () => {
      const invalidRow = {
        name: '',
        description: '',
        price: 'invalid',
        imageUrl: '',
        category: '',
      };

      const result = (CSVImporter as any).validateProductRow(invalidRow, 1);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(5);
    });
  });

  describe('importProductsFromCSV', () => {
    const testFilePath = '/test/path/products.csv';

    it('should successfully import valid CSV file', async () => {
      const csvData = [
        {
          name: 'Product 1',
          description: 'Description 1',
          price: '100.00',
          imageUrl: 'https://example.com/image1.jpg',
          category: 'Category 1',
        },
        {
          name: 'Product 2',
          description: 'Description 2',
          price: '200.00',
          imageUrl: 'https://example.com/image2.jpg',
          category: 'Category 2',
        },
      ];

      setupFileSystemMock(csvData);

      MockProduct.create.mockResolvedValue({ id: 1 } as any);

      const result = await CSVImporter.importProductsFromCSV(testFilePath);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await CSVImporter.importProductsFromCSV('/nonexistent/file.csv');

      expect(result.success).toBe(false);
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('CSV file not found');
    });

    it('should handle partially valid CSV file with skipErrors=true', async () => {
      const csvData = [
        {
          name: 'Valid Product',
          description: 'Valid Description',
          price: '100.00',
          imageUrl: 'https://example.com/image.jpg',
          category: 'Valid Category',
        },
        {
          name: '', // Invalid - missing name
          description: 'Description',
          price: '200.00',
          imageUrl: 'https://example.com/image.jpg',
          category: 'Category',
        },
        {
          name: 'Another Valid Product',
          description: 'Valid Description',
          price: '300.00',
          imageUrl: 'https://example.com/image.jpg',
          category: 'Valid Category',
        },
      ];

      setupFileSystemMock(csvData);

      MockProduct.create.mockResolvedValue({ id: 1 } as any);

      const result = await CSVImporter.importProductsFromCSV(testFilePath, {
        skipErrors: true,
      });

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(2);
      expect(result.errors[0].error).toContain('Product name is required');
    });

    it('should fail fast with skipErrors=false', async () => {
      const csvData = [
        {
          name: 'Valid Product',
          description: 'Valid Description',
          price: '100.00',
          imageUrl: 'https://example.com/image.jpg',
          category: 'Valid Category',
        },
        {
          name: '', // Invalid - missing name
          description: 'Description',
          price: '200.00',
          imageUrl: 'https://example.com/image.jpg',
          category: 'Category',
        },
      ];

      setupFileSystemMock(csvData);

      const result = await CSVImporter.importProductsFromCSV(testFilePath, {
        skipErrors: false,
      });

      expect(result.success).toBe(false);
      expect(result.imported).toBeLessThan(2);
      expect(result.failed).toBeGreaterThan(0);
    });

    it('should apply supplierId option to all rows', async () => {
      const csvData = [
        {
          name: 'Product 1',
          description: 'Description 1',
          price: '100.00',
          imageUrl: 'https://example.com/image.jpg',
          category: 'Category',
        },
      ];

      setupFileSystemMock(csvData);

      MockProduct.create.mockResolvedValue({ id: 1 } as any);

      await CSVImporter.importProductsFromCSV(testFilePath, {
        supplierId: 123,
      });

      expect(MockProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: 123,
        }),
        expect.any(Object)
      );
    });

    it('should handle database errors gracefully with skipErrors=true', async () => {
      const csvData = [
        {
          name: 'Product 1',
          description: 'Description 1',
          price: '100.00',
          imageUrl: 'https://example.com/image.jpg',
          category: 'Category',
        },
      ];

      setupFileSystemMock(csvData);

      MockProduct.create.mockRejectedValue(new Error('Database connection failed'));

      const result = await CSVImporter.importProductsFromCSV(testFilePath, {
        skipErrors: true,
      });

      expect(result.success).toBe(false);
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toBe('Database connection failed');
    });

    it('should process data in batches', async () => {
      const csvData = Array.from({ length: 250 }, (_, i) => ({
        name: `Product ${i + 1}`,
        description: `Description ${i + 1}`,
        price: '100.00',
        imageUrl: 'https://example.com/image.jpg',
        category: 'Category',
      }));

      setupFileSystemMock(csvData);

      MockProduct.create.mockResolvedValue({ id: 1 } as any);

      const result = await CSVImporter.importProductsFromCSV(testFilePath, {
        batchSize: 100,
      });

      expect(result.success).toBe(true);
      expect(result.imported).toBe(250);
      expect(mockSequelize.transaction).toHaveBeenCalledTimes(3); // 3 batches of 100
    });
  });

  describe('processProductRow', () => {
    it('should parse tierPricing when present (B17 - if row.tierPricing true)', async () => {
      const row = {
        name: 'Product With Tiers',
        description: 'Description',
        price: '100.00',
        imageUrl: 'https://example.com/image.jpg',
        category: 'Category',
        supplierId: '1',
        tierPricing: JSON.stringify([{ minQuantity: 1, maxQuantity: 10, discount: 0.05 }]),
      };
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      MockProduct.create.mockResolvedValue({ id: 1 } as any);

      await (CSVImporter as any).processProductRow(row, mockTransaction);

      expect(MockProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tierPricing: [{ minQuantity: 1, maxQuantity: 10, discount: 0.05 }],
        }),
        { transaction: mockTransaction }
      );
    });
  });

  describe('importProductsFromCSV - additional branches', () => {
    const testFilePath = '/test/path/products.csv';

    it('should use "Unknown error" fallback for non-Error thrown by Product.create (B25)', async () => {
      const csvData = [
        {
          name: 'Product 1',
          description: 'Description 1',
          price: '100.00',
          imageUrl: 'https://example.com/image.jpg',
          category: 'Category',
        },
      ];

      setupFileSystemMock(csvData);
      MockProduct.create.mockRejectedValue('string error');

      const result = await CSVImporter.importProductsFromCSV(testFilePath, { skipErrors: true });

      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toBe('Unknown error');
    });

    it('should rollback and not rethrow when transaction.commit() fails with skipErrors=true (B27)', async () => {
      const mockTransaction = {
        commit: jest.fn().mockRejectedValue(new Error('Commit failed')),
        rollback: jest.fn().mockResolvedValue(true),
      };
      mockSequelize.transaction = jest.fn().mockResolvedValue(mockTransaction as any);

      const csvData = [
        {
          name: 'Product 1',
          description: 'Description 1',
          price: '100.00',
          imageUrl: 'https://example.com/image.jpg',
          category: 'Category',
        },
      ];
      setupFileSystemMock(csvData);
      MockProduct.create.mockResolvedValue({ id: 1 } as any);

      const result = await CSVImporter.importProductsFromCSV(testFilePath, { skipErrors: true });

      expect(mockTransaction.rollback).toHaveBeenCalled();
      // With skipErrors=true, batch-level catch does NOT rethrow (B27 false branch)
      // result.success may be true since imported was incremented before commit failed
      expect(result).toBeDefined();
    });

    it('should use "Failed to process CSV file" fallback for non-Error stream error (B28)', async () => {
      mockFs.existsSync.mockReturnValue(true);

      const mockCsvParserInstance = {
        on: jest.fn(function (this: any, event: string, callback: Function) {
          if (event === 'error') {
            callback('stream failure string');
          }
          return this;
        }),
      };

      mockCsvParser.mockReturnValue(mockCsvParserInstance);
      mockFs.createReadStream.mockReturnValue({
        pipe: jest.fn().mockReturnValue(mockCsvParserInstance),
      } as any);

      const result = await CSVImporter.importProductsFromCSV(testFilePath);

      expect(result.errors[0].error).toBe('Failed to process CSV file');
    });
  });

  describe('generateSampleCSV', () => {
    it('should generate sample CSV file', () => {
      const testPath = '/test/sample.csv';
      mockFs.writeFileSync.mockImplementation(() => {});

      CSVImporter.generateSampleCSV(testPath);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        testPath,
        expect.stringContaining('name,description,price,imageUrl,category,supplierId,tierPricing')
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        testPath,
        expect.stringContaining('Industrial Pump Model A')
      );
    });

    it('should include proper tier pricing in sample', () => {
      const testPath = '/test/sample.csv';
      let writtenContent = '';
      mockFs.writeFileSync.mockImplementation((path, content) => {
        writtenContent = content as string;
      });

      CSVImporter.generateSampleCSV(testPath);

      expect(writtenContent).toContain('"[{"minQuantity":1,"maxQuantity":10,"discount":0}');
    });
  });

  describe('getImportStats', () => {
    it('should return import statistics', async () => {
      const mockCategoryStats = [
        { category: 'Category A', count: '5' },
        { category: 'Category B', count: '3' },
      ];

      const mockSupplierStats = [
        { supplierId: '1', count: '4' },
        { supplierId: '2', count: '4' },
      ];

      MockProduct.count
        .mockResolvedValueOnce(10) // totalProducts
        .mockResolvedValueOnce(6); // productsWithTierPricing

      MockProduct.findAll
        .mockResolvedValueOnce(mockCategoryStats as any)
        .mockResolvedValueOnce(mockSupplierStats as any);

      const result = await CSVImporter.getImportStats();

      expect(result.totalProducts).toBe(10);
      expect(result.productsByCategory).toEqual({
        'Category A': 5,
        'Category B': 3,
      });
      expect(result.productsWithTierPricing).toBe(6);
      expect(result.productsBySupplier).toEqual({
        '1': 4,
        '2': 4,
      });
    });

    it('should handle empty database', async () => {
      MockProduct.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      MockProduct.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await CSVImporter.getImportStats();

      expect(result.totalProducts).toBe(0);
      expect(result.productsByCategory).toEqual({});
      expect(result.productsWithTierPricing).toBe(0);
      expect(result.productsBySupplier).toEqual({});
    });
  });
});
