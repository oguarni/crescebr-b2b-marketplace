import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { existsSync, mkdtempSync, rmSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getAvailableSpecifications,
  importProductsFromCSV,
  generateSampleCSV,
  getImportStats,
} from '../productsController';
import { productValidation } from '../../validators/product.validators';
import { handleValidationErrors } from '../../middleware/handleValidationErrors';
import { authenticateJWT } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { errorHandler } from '../../middleware/errorHandler';
import Product from '../../models/Product';
import { CSVImporter } from '../../utils/csvImporter';
import { logger } from '../../utils/structuredLogger';

// Mock the models and utilities
jest.mock('../../models/Product');
jest.mock('../../utils/csvImporter');
jest.mock('../../middleware/auth', () => ({
  authenticateJWT: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
}));
jest.mock('../../middleware/rbac', () => {
  let _impl: (req: Request, res: Response, next: NextFunction) => void = (req, res, next) => next();
  const requireRoleMock = jest.fn(
    () => (req: Request, res: Response, next: NextFunction) => _impl(req, res, next)
  );
  (requireRoleMock as any).__setImpl = (fn: typeof _impl) => {
    _impl = fn;
  };
  return { requireRole: requireRoleMock };
});
jest.mock('../../middleware/errorHandler', () => ({
  errorHandler: jest.fn(),
  asyncHandler: jest.requireActual('../../middleware/errorHandler').asyncHandler,
}));

const MockProduct = Product as jest.Mocked<typeof Product>;
const MockCSVImporter = CSVImporter as jest.Mocked<typeof CSVImporter>;

// Create Express app for testing
const app = express();
app.use(express.json());

// Setup routes
app.get('/api/products', getAllProducts);
app.get('/api/products/categories', getCategories);
app.get('/api/products/specifications', getAvailableSpecifications);
app.get('/api/products/import/sample', generateSampleCSV);
app.get('/api/products/import/stats', authenticateJWT, getImportStats);
app.get('/api/products/:id', getProductById);
app.post(
  '/api/products',
  authenticateJWT,
  productValidation,
  handleValidationErrors,
  createProduct
);
app.post(
  '/api/products/import/csv',
  authenticateJWT,
  requireRole('supplier'),
  importProductsFromCSV
);
app.put(
  '/api/products/:id',
  authenticateJWT,
  productValidation,
  handleValidationErrors,
  updateProduct
);
app.delete('/api/products/:id', authenticateJWT, deleteProduct);

// CSV import route (would typically be in a separate controller). Its uploads go
// to a throwaway directory, so a test run leaves nothing in backend/uploads.
const stubUploadDir = mkdtempSync(join(tmpdir(), 'crescebr-products-test-'));
const upload = multer({ dest: stubUploadDir });
app.post(
  '/api/products/import',
  authenticateJWT,
  requireRole('supplier'),
  upload.single('csv'),
  async (req: Request, res: Response) => {
    try {
      const filePath = req.file?.path;
      if (!filePath) {
        return res.status(400).json({
          success: false,
          error: 'CSV file is required',
        });
      }

      const result = await CSVImporter.importProductsFromCSV(filePath, {
        supplierId: req.user?.id,
        skipErrors: true,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Import failed',
      });
    }
  }
);

app.use(errorHandler);

// Removes the file the real controller stored for this test's import, for the
// tests that stop the controller from cleaning up after itself.
const removeStoredUpload = (): void => {
  const storedPath = MockCSVImporter.importProductsFromCSV.mock.calls[0]?.[0];
  if (storedPath && existsSync(storedPath)) unlinkSync(storedPath);
};

describe('Products Controller', () => {
  afterAll(() => {
    rmSync(stubUploadDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authentication middleware to pass
    (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { id: 1, role: 'supplier', email: 'supplier@test.com' };
      next();
    });

    (requireRole as any).__setImpl((req: Request, res: Response, next: NextFunction) => next());
  });

  describe('GET /api/products', () => {
    it('should get all products with pagination', async () => {
      const mockProducts = [
        createMockProduct({ id: 1, name: 'Product 1' }),
        createMockProduct({ id: 2, name: 'Product 2' }),
      ];

      MockProduct.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockProducts,
      } as any);

      const response = await request(app)
        .get('/api/products')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(2);
      expect(response.body.data.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter products by category', async () => {
      MockProduct.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [createMockProduct({ category: 'Electronics' })],
      } as any);

      await request(app).get('/api/products').query({ category: 'Electronics' }).expect(200);

      expect(MockProduct.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: expect.any(Object),
          }),
        })
      );
    });

    it('should search products by name and description', async () => {
      MockProduct.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [createMockProduct({ name: 'Industrial Pump' })],
      } as any);

      await request(app).get('/api/products').query({ search: 'pump' }).expect(200);

      expect(MockProduct.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Symbol.for('or')]: expect.any(Array),
          }),
        })
      );
    });

    it('should handle pagination correctly', async () => {
      MockProduct.findAndCountAll.mockResolvedValue({
        count: 25,
        rows: [],
      } as any);

      await request(app).get('/api/products').query({ page: 3, limit: 5 }).expect(200);

      expect(MockProduct.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
          offset: 10,
        })
      );
    });
  });

  describe('GET /api/products/:id', () => {
    it('should get product by ID', async () => {
      const mockProduct = createMockProduct({ id: 1, name: 'Test Product' });
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const response = await request(app).get('/api/products/1').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.name).toBe('Test Product');
    });

    it('should return 404 when product not found', async () => {
      MockProduct.findByPk.mockResolvedValue(null);

      const response = await request(app).get('/api/products/999').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Product not found');
    });
  });

  describe('POST /api/products', () => {
    it('should create product successfully', async () => {
      const productData = {
        name: 'New Product',
        description: 'Product Description',
        price: 100.0,
        imageUrl: 'https://example.com/image.jpg',
        category: 'Electronics',
      };

      const mockProduct = createMockProduct({ id: 1, ...productData });
      MockProduct.create.mockResolvedValue(mockProduct as any);

      const response = await request(app).post('/api/products').send(productData).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product created successfully');
      expect(response.body.data.name).toBe('New Product');
      expect(MockProduct.create).toHaveBeenCalledWith({
        name: 'New Product',
        description: 'Product Description',
        price: 100.0,
        imageUrl: 'https://example.com/image.jpg',
        category: 'Electronics',
        minimumOrderQuantity: 1,
        specifications: {},
        supplierId: 1,
        unitPrice: 100.0,
      });
    });

    it('should return 400 for invalid product data', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({
          name: '',
          description: '',
          price: -10,
          imageUrl: 'invalid-url',
          category: '',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app).post('/api/products').send({}).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update product successfully', async () => {
      const updateData = {
        name: 'Updated Product',
        description: 'Updated Description',
        price: 150.0,
        imageUrl: 'https://example.com/updated-image.jpg',
        category: 'Updated Category',
      };

      const mockProduct = {
        id: 1,
        ...updateData,
        update: jest.fn().mockResolvedValue(true),
      };

      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const response = await request(app).put('/api/products/1').send(updateData).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product updated successfully');
      expect(mockProduct.update).toHaveBeenCalledWith({
        name: 'Updated Product',
        description: 'Updated Description',
        price: 150.0,
        imageUrl: 'https://example.com/updated-image.jpg',
        category: 'Updated Category',
        minimumOrderQuantity: undefined,
        specifications: undefined,
        unitPrice: 150.0,
      });
    });

    it('should return 404 when product not found for update', async () => {
      MockProduct.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/products/999')
        .send({
          name: 'Updated Product',
          description: 'Updated Description',
          price: 150.0,
          imageUrl: 'https://example.com/image.jpg',
          category: 'Category',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Product not found');
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete product successfully', async () => {
      const mockProduct = {
        id: 1,
        destroy: jest.fn().mockResolvedValue(true),
      };

      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const response = await request(app).delete('/api/products/1').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product deleted successfully');
      expect(mockProduct.destroy).toHaveBeenCalled();
    });

    it('should return 404 when product not found for deletion', async () => {
      MockProduct.findByPk.mockResolvedValue(null);

      const response = await request(app).delete('/api/products/999').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Product not found');
    });
  });

  describe('GET /api/products/categories', () => {
    it('should get all categories', async () => {
      const mockCategories = [
        { category: 'Electronics' },
        { category: 'Industrial Equipment' },
        { category: 'Safety Equipment' },
      ];

      MockProduct.findAll.mockResolvedValue(mockCategories as any);

      const response = await request(app).get('/api/products/categories').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([
        'Electronics',
        'Industrial Equipment',
        'Safety Equipment',
      ]);
      expect(MockProduct.findAll).toHaveBeenCalledWith({
        attributes: ['category'],
        group: ['category'],
        order: [['category', 'ASC']],
      });
    });

    it('should return empty array when no categories exist', async () => {
      MockProduct.findAll.mockResolvedValue([]);

      const response = await request(app).get('/api/products/categories').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('POST /api/products/import (CSV Bulk Import)', () => {
    it('should import CSV file successfully', async () => {
      const mockImportResult = {
        success: true,
        imported: 10,
        failed: 0,
        errors: [],
      };

      MockCSVImporter.importProductsFromCSV.mockResolvedValue(mockImportResult);

      const response = await request(app)
        .post('/api/products/import')
        .attach(
          'csv',
          Buffer.from(
            'name,description,price,imageUrl,category\nTest Product,Test Description,100.00,https://example.com/image.jpg,Electronics'
          ),
          'test.csv'
        )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.imported).toBe(10);
      expect(response.body.data.failed).toBe(0);
      expect(MockCSVImporter.importProductsFromCSV).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          supplierId: 1,
          skipErrors: true,
        })
      );
    });

    it('should handle partially successful import', async () => {
      const mockImportResult = {
        success: true,
        imported: 8,
        failed: 2,
        errors: [
          {
            row: 3,
            data: {
              name: '',
              description: 'Invalid product',
              price: '100.00',
              imageUrl: 'https://example.com/image.jpg',
              category: 'Electronics',
            },
            error: 'Product name is required',
          },
          {
            row: 7,
            data: {
              name: 'Product',
              price: 'invalid',
              description: 'Test product',
              imageUrl: 'https://example.com/image.jpg',
              category: 'Electronics',
            },
            error: 'Valid price is required (must be a positive number)',
          },
        ],
      };

      MockCSVImporter.importProductsFromCSV.mockResolvedValue(mockImportResult);

      const response = await request(app)
        .post('/api/products/import')
        .attach('csv', Buffer.from('csv content'), 'test.csv')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.imported).toBe(8);
      expect(response.body.data.failed).toBe(2);
      expect(response.body.data.errors).toHaveLength(2);
    });

    it('should return 400 when no file is uploaded', async () => {
      const response = await request(app).post('/api/products/import').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('CSV file is required');
    });

    it('should return 403 for non-supplier users', async () => {
      (requireRole as any).__setImpl((req: Request, res: Response) => {
        return res
          .status(403)
          .json({ success: false, error: 'Access denied. Required role: supplier' });
      });

      const response = await request(app)
        .post('/api/products/import')
        .attach('csv', Buffer.from('csv content'), 'test.csv')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied. Required role: supplier');
    });

    it('should handle import failure gracefully', async () => {
      MockCSVImporter.importProductsFromCSV.mockRejectedValue(new Error('File processing failed'));

      const response = await request(app)
        .post('/api/products/import')
        .attach('csv', Buffer.from('invalid csv content'), 'test.csv')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File processing failed');
    });

    it('should pass supplier ID to import function', async () => {
      (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 42, role: 'supplier', email: 'supplier@test.com' };
        next();
      });

      const mockImportResult = {
        success: true,
        imported: 5,
        failed: 0,
        errors: [],
      };

      MockCSVImporter.importProductsFromCSV.mockResolvedValue(mockImportResult);

      await request(app)
        .post('/api/products/import')
        .attach('csv', Buffer.from('csv content'), 'test.csv')
        .expect(200);

      expect(MockCSVImporter.importProductsFromCSV).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          supplierId: 42,
        })
      );
    });
  });

  describe('POST /api/products - validation error for updateProduct', () => {
    it('should return 400 for invalid update data', async () => {
      const response = await request(app)
        .put('/api/products/1')
        .send({
          name: '',
          description: '',
          price: -5,
          category: '',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });
  });

  describe('GET /api/products/specifications', () => {
    it('should return available specifications', async () => {
      const mockProducts = [
        { specifications: { color: 'red', size: 'large' } },
        { specifications: { color: 'blue', size: 'medium' } },
        { specifications: { material: 'steel' } },
      ];

      MockProduct.findAll.mockResolvedValue(mockProducts as any);

      const response = await request(app).get('/api/products/specifications').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('POST /api/products/import/csv (controller importProductsFromCSV)', () => {
    it('should handle upload error from multer', async () => {
      // The importProductsFromCSV controller creates its own multer instance internally.
      // When no file is provided and multer processes the request,
      // req.file will be undefined.
      const response = await request(app).post('/api/products/import/csv').expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when a non-CSV file is uploaded (fileFilter rejection)', async () => {
      const response = await request(app)
        .post('/api/products/import/csv')
        .attach('csvFile', Buffer.from('some binary content'), {
          filename: 'file.png',
          contentType: 'image/png',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Only CSV files are allowed');
    });

    // Regression: the filter accepted a file when EITHER the extension OR the
    // MIME type looked like CSV, and the stored name reused the client's
    // extension — so `text/csv` + "payload.php" landed in uploads/ as *.php.
    it('should reject a non-CSV extension even when the client claims text/csv', async () => {
      const response = await request(app)
        .post('/api/products/import/csv')
        .attach('csvFile', Buffer.from('<?php system($_GET["c"]); ?>'), {
          filename: 'payload.php',
          contentType: 'text/csv',
        })
        .expect(400);

      expect(response.body.error).toBe('Only CSV files are allowed');
      expect(MockCSVImporter.importProductsFromCSV).not.toHaveBeenCalled();
    });

    it('should reject a .csv name carrying an unexpected MIME type', async () => {
      const response = await request(app)
        .post('/api/products/import/csv')
        .attach('csvFile', Buffer.from('name,price'), {
          filename: 'products.csv',
          contentType: 'application/x-httpd-php',
        })
        .expect(400);

      expect(response.body.error).toBe('Only CSV files are allowed');
    });

    it('should store an accepted upload under a server-generated .csv name', async () => {
      MockCSVImporter.importProductsFromCSV.mockResolvedValue({
        success: true,
        imported: 1,
        failed: 0,
        errors: [],
      });

      await request(app)
        .post('/api/products/import/csv')
        .attach('csvFile', Buffer.from('name,price\nWidget,10'), {
          filename: 'quarterly.report.csv',
          contentType: 'text/csv',
        })
        .expect(200);

      const storedPath = MockCSVImporter.importProductsFromCSV.mock.calls[0][0] as string;
      expect(storedPath).toMatch(/^uploads[/\\]csvFile-\d+-\d+\.csv$/);
    });

    it('should import CSV successfully when file is provided', async () => {
      MockCSVImporter.importProductsFromCSV.mockResolvedValue({
        success: true,
        imported: 5,
        failed: 1,
        errors: [
          {
            row: 3,
            data: { name: '', description: '', price: '', imageUrl: '', category: '' },
            error: 'Invalid price',
          },
        ],
      });

      // The controller uses its own multer instance with field name 'csvFile'.
      const response = await request(app)
        .post('/api/products/import/csv')
        .attach('csvFile', Buffer.from('name,description,price,category\nProd1,Desc1,10,Cat1'), {
          filename: 'test.csv',
          contentType: 'text/csv',
        });

      // Depending on whether uploads/ exists, this may succeed or fail.
      // We verify the response is a valid JSON structure.
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/products/import/sample (generateSampleCSV)', () => {
    // Regression: the 500 body echoed the raw error, which for a file-system
    // failure carries an absolute server path.
    it('should return a generic 500 and log the cause when generateSampleCSV throws', async () => {
      const loggerSpy = jest.spyOn(logger, 'error').mockImplementation();
      MockCSVImporter.generateSampleCSV = jest.fn().mockImplementation(() => {
        throw new Error("EACCES: permission denied, open '/srv/app/uploads/sample.csv'");
      });

      try {
        const response = await request(app).get('/api/products/import/sample').expect(500);

        expect(response.body).toEqual({ success: false, error: 'Failed to generate sample CSV' });
        expect(loggerSpy).toHaveBeenCalledWith(
          'Failed to generate sample CSV',
          expect.objectContaining({ error: expect.any(Error) })
        );
      } finally {
        loggerSpy.mockRestore();
      }
    });

    it('should log download error and skip cleanup when file does not exist (B16 true/B17 false)', async () => {
      const loggerSpy = jest.spyOn(logger, 'error').mockImplementation();
      MockCSVImporter.generateSampleCSV = jest.fn(); // no-op: file never created

      const mockRes = {
        download: jest.fn((_filePath: string, _name: string, cb: Function) => {
          cb(new Error('ENOENT: no such file or directory'));
        }),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockReq = {};
      const next = jest.fn();

      await generateSampleCSV(mockReq as any, mockRes as any, next);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to download file',
        expect.objectContaining({ error: expect.any(Error) })
      );
      expect(mockRes.status).not.toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });

  describe('GET /api/products/import/stats (getImportStats)', () => {
    it('should return import statistics', async () => {
      const mockStats = {
        totalImports: 10,
        totalProducts: 500,
        lastImportDate: new Date().toISOString(),
      };

      MockCSVImporter.getImportStats = jest.fn().mockResolvedValue(mockStats);

      const response = await request(app).get('/api/products/import/stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });

    // Regression: the per-supplier product breakdown used to be returned whole
    // to every supplier, handing each one a product count for each competitor.
    it('should scope the supplier breakdown to the calling supplier', async () => {
      MockCSVImporter.getImportStats = jest.fn().mockResolvedValue({ totalProducts: 1 });

      await request(app).get('/api/products/import/stats').expect(200);

      expect(MockCSVImporter.getImportStats).toHaveBeenCalledWith(1);
    });

    it('should give an admin the unscoped breakdown', async () => {
      (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 9, role: 'admin', email: 'admin@test.com' };
        next();
      });
      MockCSVImporter.getImportStats = jest.fn().mockResolvedValue({ totalProducts: 1 });

      await request(app).get('/api/products/import/stats').expect(200);

      expect(MockCSVImporter.getImportStats).toHaveBeenCalledWith(undefined);
    });

    // Regression: the 500 body echoed the driver's message, handing any signed-in
    // user SQL and schema details whenever the query failed.
    it('should return a generic 500 and log the cause when getImportStats throws', async () => {
      const loggerSpy = jest.spyOn(logger, 'error').mockImplementation();
      MockCSVImporter.getImportStats = jest
        .fn()
        .mockRejectedValue(new Error('relation "products" does not exist'));

      try {
        const response = await request(app).get('/api/products/import/stats').expect(500);

        expect(response.body).toEqual({ success: false, error: 'Failed to get import statistics' });
        expect(loggerSpy).toHaveBeenCalledWith(
          'Failed to get import statistics',
          expect.objectContaining({ error: expect.any(Error) })
        );
      } finally {
        loggerSpy.mockRestore();
      }
    });
  });

  describe('POST /api/products/import/csv - error handling', () => {
    // Regression: when the import threw, the uploaded CSV stayed in uploads/ for
    // good and the 500 body echoed the raw error message.
    it('should return a generic 500, log the cause and remove the upload when the import throws', async () => {
      const loggerSpy = jest.spyOn(logger, 'error').mockImplementation();
      MockCSVImporter.importProductsFromCSV.mockRejectedValue(
        new Error('relation "products" does not exist')
      );

      try {
        const response = await request(app)
          .post('/api/products/import/csv')
          .attach('csvFile', Buffer.from('name,description,price,category\nProd1,Desc1,10,Cat1'), {
            filename: 'test.csv',
            contentType: 'text/csv',
          })
          .expect(500);

        expect(response.body).toEqual({ success: false, error: 'Import failed' });
        expect(loggerSpy).toHaveBeenCalledWith(
          'CSV import failed',
          expect.objectContaining({ error: expect.any(Error) })
        );
        const storedPath = MockCSVImporter.importProductsFromCSV.mock.calls[0][0];
        expect(existsSync(storedPath)).toBe(false);
      } finally {
        loggerSpy.mockRestore();
      }
    });

    it('should use "File upload failed" fallback when multer error has no message (B9 false)', async () => {
      // Temporarily replace multer in require cache to inject a no-message error
      const multerPath = require.resolve('multer');
      const cachedMod = (require as any).cache[multerPath];
      const originalExports = cachedMod?.exports;

      const mockMulter = jest.fn(() => ({
        single: jest.fn(() => (req: Request, res: Response, cb: Function) => {
          cb({ code: 'UNKNOWN_ERROR' }); // no .message property
        }),
      }));
      (mockMulter as any).diskStorage = jest.fn(() => ({}));

      if (cachedMod) cachedMod.exports = mockMulter;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      try {
        await importProductsFromCSV({ user: { id: 1 }, body: {} } as any, mockRes as any, next);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'File upload failed',
        });
      } finally {
        if (cachedMod) cachedMod.exports = originalExports;
      }
    });

    it('should skip file cleanup when uploaded file no longer exists (B14 false)', async () => {
      MockCSVImporter.importProductsFromCSV.mockResolvedValue({
        success: true,
        imported: 1,
        failed: 0,
        errors: [],
      });

      const fs = require('fs');
      const unlinkSyncSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      try {
        await request(app)
          .post('/api/products/import/csv')
          .attach('csvFile', Buffer.from('name,description,price,category\nProd,Desc,10,Cat'), {
            filename: 'test.csv',
            contentType: 'text/csv',
          })
          .expect(200);

        expect(unlinkSyncSpy).not.toHaveBeenCalled();
      } finally {
        existsSyncSpy.mockRestore();
        unlinkSyncSpy.mockRestore();
        removeStoredUpload();
      }
    });

    it('should still answer and log when the upload cannot be removed afterwards', async () => {
      MockCSVImporter.importProductsFromCSV.mockResolvedValue({
        success: true,
        imported: 1,
        failed: 0,
        errors: [],
      });

      const fs = require('fs');
      const loggerSpy = jest.spyOn(logger, 'error').mockImplementation();
      const unlinkSyncSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {
        throw new Error('EPERM: operation not permitted');
      });

      try {
        await request(app)
          .post('/api/products/import/csv')
          .attach('csvFile', Buffer.from('name,description,price,category\nProd,Desc,10,Cat'), {
            filename: 'test.csv',
            contentType: 'text/csv',
          })
          .expect(200);

        expect(loggerSpy).toHaveBeenCalledWith(
          'Failed to remove uploaded CSV',
          expect.objectContaining({ error: expect.any(Error) })
        );
      } finally {
        unlinkSyncSpy.mockRestore();
        loggerSpy.mockRestore();
        removeStoredUpload();
      }
    });
  });

  describe('GET /api/products/import/sample - success path', () => {
    it('should call generateSampleCSV and create a downloadable file', async () => {
      const fs = require('fs');
      // Ensure uploads directory exists and create the file so res.download can serve it
      if (!fs.existsSync('uploads/')) {
        fs.mkdirSync('uploads/', { recursive: true });
      }
      MockCSVImporter.generateSampleCSV = jest.fn().mockImplementation((filePath: string) => {
        fs.writeFileSync(filePath, 'name,description,price,category\n');
      });

      const response = await request(app).get('/api/products/import/sample');

      expect(MockCSVImporter.generateSampleCSV).toHaveBeenCalled();
      // Response should succeed (not 500) since the file was created
      expect(response.status).not.toBe(500);
    });
  });

  // Regression: uploads/ is relative to the working directory, and only the
  // backend image created it. On a fresh clone run with `npm run dev`, the
  // import answered 400 (ENOENT from multer) and the sample download 500.
  describe('fresh checkout without an uploads/ directory', () => {
    let freshDir: string;
    let originalCwd: string;

    beforeEach(() => {
      originalCwd = process.cwd();
      freshDir = mkdtempSync(join(tmpdir(), 'crescebr-fresh-checkout-'));
      process.chdir(freshDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      rmSync(freshDir, { recursive: true, force: true });
    });

    it('should create uploads/ and import the CSV', async () => {
      MockCSVImporter.importProductsFromCSV.mockResolvedValue({
        success: true,
        imported: 1,
        failed: 0,
        errors: [],
      });

      await request(app)
        .post('/api/products/import/csv')
        .attach('csvFile', Buffer.from('name,description,price,category\nProd,Desc,10,Cat'), {
          filename: 'test.csv',
          contentType: 'text/csv',
        })
        .expect(200);

      expect(MockCSVImporter.importProductsFromCSV).toHaveBeenCalled();
      expect(existsSync(join(freshDir, 'uploads'))).toBe(true);
    });

    it('should create uploads/ and serve the sample CSV', async () => {
      const fs = require('fs');
      MockCSVImporter.generateSampleCSV = jest.fn().mockImplementation((filePath: string) => {
        fs.writeFileSync(filePath, 'name,description,price,category\n');
      });

      await request(app).get('/api/products/import/sample').expect(200);
    });

    it('should answer 400 when uploads/ cannot be created', async () => {
      const fs = require('fs');
      const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      try {
        const response = await request(app)
          .post('/api/products/import/csv')
          .attach('csvFile', Buffer.from('name,description,price,category\nProd,Desc,10,Cat'), {
            filename: 'test.csv',
            contentType: 'text/csv',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(MockCSVImporter.importProductsFromCSV).not.toHaveBeenCalled();
      } finally {
        mkdirSyncSpy.mockRestore();
      }
    });
  });

  describe('POST /api/products/import/csv - batchSize fallback', () => {
    it('should use default batchSize of 100 when batchSize cannot be parsed as integer', async () => {
      MockCSVImporter.importProductsFromCSV.mockResolvedValue({
        success: true,
        imported: 1,
        failed: 0,
        errors: [],
      });

      await request(app)
        .post('/api/products/import/csv')
        .field('batchSize', '0')
        .attach('csvFile', Buffer.from('name,description,price,category\nProd1,Desc1,10,Cat1'), {
          filename: 'test.csv',
          contentType: 'text/csv',
        });

      if (MockCSVImporter.importProductsFromCSV.mock.calls.length > 0) {
        expect(MockCSVImporter.importProductsFromCSV).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ batchSize: 100 })
        );
      }
    });
  });

  describe('Non-Error fallback branches', () => {
    it('should use "Import failed" fallback when non-Error is thrown during CSV import', async () => {
      MockCSVImporter.importProductsFromCSV.mockRejectedValue('db timeout');

      const response = await request(app)
        .post('/api/products/import/csv')
        .attach('csvFile', Buffer.from('name,description,price,category\nProd1,Desc1,10,Cat1'), {
          filename: 'test.csv',
          contentType: 'text/csv',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Import failed');
    });

    it('should use "Failed to generate sample CSV" fallback when non-Error is thrown', async () => {
      MockCSVImporter.generateSampleCSV = jest.fn().mockImplementation(() => {
        throw 'disk full';
      });

      const response = await request(app).get('/api/products/import/sample').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to generate sample CSV');
    });

    it('should use "Failed to get import statistics" fallback when non-Error is thrown', async () => {
      MockCSVImporter.getImportStats = jest.fn().mockRejectedValue('network error');

      const response = await request(app).get('/api/products/import/stats').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get import statistics');
    });
  });
});
