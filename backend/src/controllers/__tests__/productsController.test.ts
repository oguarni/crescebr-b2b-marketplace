import request from 'supertest';
import express from 'express';
import multer from 'multer';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  productValidation,
} from '../productsController';
import { authenticateJWT, isSupplier } from '../../middleware/auth';
import { errorHandler } from '../../middleware/errorHandler';
import Product from '../../models/Product';
import { CSVImporter } from '../../utils/csvImporter';

// Mock the models and utilities
jest.mock('../../models/Product');
jest.mock('../../utils/csvImporter');
jest.mock('../../middleware/auth', () => ({
  authenticateJWT: jest.fn((req: any, res: any, next: any) => next()),
  isSupplier: jest.fn((req: any, res: any, next: any) => next()),
  isAdmin: jest.fn((req: any, res: any, next: any) => next()),
}));
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
app.get('/api/products/:id', getProductById);
app.post('/api/products', authenticateJWT, productValidation, createProduct);
app.put('/api/products/:id', authenticateJWT, productValidation, updateProduct);
app.delete('/api/products/:id', authenticateJWT, deleteProduct);

// CSV import route (would typically be in a separate controller)
const upload = multer({ dest: 'uploads/' });
app.post(
  '/api/products/import',
  authenticateJWT,
  isSupplier,
  upload.single('csv'),
  async (req: any, res: any) => {
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

describe('Products Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authentication middleware to pass
    (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { id: 1, role: 'supplier', email: 'supplier@test.com' };
      next();
    });

    (isSupplier as jest.Mock).mockImplementation((req, res, next) => {
      if (req.user?.role !== 'supplier') {
        return res.status(403).json({ success: false, error: 'Supplier access required' });
      }
      next();
    });
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
        specifications: null,
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
      (isSupplier as jest.Mock).mockImplementation((req, res, next) => {
        return res.status(403).json({ success: false, error: 'Supplier access required' });
      });

      const response = await request(app)
        .post('/api/products/import')
        .attach('csv', Buffer.from('csv content'), 'test.csv')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Supplier access required');
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
});
