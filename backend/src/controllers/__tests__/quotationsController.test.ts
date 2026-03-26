import request from 'supertest';
import express from 'express';
import {
  createQuotation,
  getCustomerQuotations,
  getQuotationById,
  getAllQuotations,
  updateQuotation,
  calculateQuote,
  getQuotationCalculations,
  processQuotationWithCalculations,
  getMultipleSupplierQuotes,
  createQuotationValidation,
  updateQuotationValidation,
  calculateQuoteValidation,
  getMultipleSupplierQuotesValidation,
} from '../quotationsController';
import { authenticateJWT } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { errorHandler } from '../../middleware/errorHandler';
import Product from '../../models/Product';
import Quotation from '../../models/Quotation';
import QuotationItem from '../../models/QuotationItem';
import { QuoteService } from '../../services/quoteService';

// Mock dependencies
jest.mock('../../models/Product');
jest.mock('../../models/Quotation');
jest.mock('../../models/QuotationItem');
jest.mock('../../models/User');
jest.mock('../../services/quoteService');
jest.mock('../../middleware/auth', () => ({
  authenticateJWT: jest.fn(),
}));
jest.mock('../../middleware/rbac', () => ({
  requireRole: jest.fn((...roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  }),
}));

const MockProduct = Product as jest.Mocked<typeof Product>;
const MockQuotation = Quotation as jest.Mocked<typeof Quotation>;
const MockQuotationItem = QuotationItem as jest.Mocked<typeof QuotationItem>;
const mockQuoteService = QuoteService as jest.Mocked<typeof QuoteService>;
const mockAuthenticateJWT = authenticateJWT as jest.MockedFunction<typeof authenticateJWT>;
const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;

// Create Express app for testing
const app = express();
app.use(express.json());

// Setup routes with proper middleware
app.post(
  '/api/quotations',
  authenticateJWT,
  requireRole('customer'),
  createQuotationValidation,
  createQuotation
);
app.get(
  '/api/quotations/customer',
  authenticateJWT,
  requireRole('customer'),
  getCustomerQuotations
);
app.get('/api/quotations/:id', authenticateJWT, getQuotationById);
app.get('/api/admin/quotations', authenticateJWT, requireRole('admin'), getAllQuotations);
app.put(
  '/api/admin/quotations/:id',
  authenticateJWT,
  requireRole('admin'),
  updateQuotationValidation,
  updateQuotation
);
app.post('/api/quotations/calculate', authenticateJWT, calculateQuoteValidation, calculateQuote);
app.get('/api/quotations/:id/calculations', authenticateJWT, getQuotationCalculations);
app.post(
  '/api/admin/quotations/:id/process',
  authenticateJWT,
  requireRole('admin'),
  processQuotationWithCalculations
);
app.post(
  '/api/quotations/compare',
  authenticateJWT,
  getMultipleSupplierQuotesValidation,
  getMultipleSupplierQuotes
);

app.use(errorHandler);

describe('Quotations Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/quotations', () => {
    const validQuotationData = {
      items: [
        { productId: 1, quantity: 5 },
        { productId: 2, quantity: 3 },
      ],
    };

    it('should create quotation successfully for customer', async () => {
      // Arrange
      const mockCustomer = { id: 1, email: 'customer@example.com', role: 'customer' };
      const mockProducts = [
        { id: 1, name: 'Product 1', price: 100 },
        { id: 2, name: 'Product 2', price: 200 },
      ];
      const mockQuotation = {
        id: 1,
        companyId: 1,
        status: 'pending',
        adminNotes: null,
        createdAt: new Date(),
      };
      const mockQuotationItems = [
        { id: 1, quotationId: 1, productId: 1, quantity: 5 },
        { id: 2, quotationId: 1, productId: 2, quantity: 3 },
      ];
      const mockFullQuotation = {
        ...mockQuotation,
        items: mockQuotationItems.map((item, index) => ({
          ...item,
          product: mockProducts[index],
        })),
      };

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = mockCustomer;
        next();
      });
      // Mock Product.findAll for productRepository.findByIds
      MockProduct.findAll.mockResolvedValue(mockProducts as any);
      MockQuotation.create.mockResolvedValue(mockQuotation as any);
      MockQuotationItem.create
        .mockResolvedValueOnce(mockQuotationItems[0] as any)
        .mockResolvedValueOnce(mockQuotationItems[1] as any);
      MockQuotation.findByPk.mockResolvedValue(mockFullQuotation as any);

      // Act
      const response = await request(app)
        .post('/api/quotations')
        .send(validQuotationData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Quotation created successfully');
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.companyId).toBe(1);
      expect(response.body.data.status).toBe('pending');
    });

    it('should return 400 for invalid validation', async () => {
      // Arrange
      const invalidData = {
        items: [
          { productId: 'invalid', quantity: 0 }, // Invalid productId and quantity
        ],
      };

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });

      // Act
      const response = await request(app).post('/api/quotations').send(invalidData).expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should return 400 for empty items array', async () => {
      // Arrange
      const invalidData = {
        items: [],
      };

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });

      // Act
      const response = await request(app).post('/api/quotations').send(invalidData).expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 403 for non-customer users', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 2, email: 'supplier@example.com', role: 'supplier' };
        next();
      });

      // Act
      const response = await request(app)
        .post('/api/quotations')
        .send(validQuotationData)
        .expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });

    it('should return 400 when product not found', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      // Return empty array - no products found
      MockProduct.findAll.mockResolvedValue([]);

      // Act
      const response = await request(app)
        .post('/api/quotations')
        .send(validQuotationData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Products not found');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      MockProduct.findAll.mockRejectedValue(new Error('Database error'));

      // Act
      const response = await request(app)
        .post('/api/quotations')
        .send(validQuotationData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/quotations/customer', () => {
    it('should get customer quotations successfully', async () => {
      // Arrange
      const mockCustomer = { id: 1, email: 'customer@example.com', role: 'customer' };
      const mockQuotations = [
        {
          id: 1,
          companyId: 1,
          status: 'pending',
          createdAt: new Date(),
          items: [
            {
              id: 1,
              productId: 1,
              quantity: 5,
              product: { id: 1, name: 'Product 1', price: 100 },
            },
          ],
        },
        {
          id: 2,
          companyId: 1,
          status: 'processed',
          createdAt: new Date(),
          items: [
            {
              id: 2,
              productId: 2,
              quantity: 3,
              product: { id: 2, name: 'Product 2', price: 200 },
            },
          ],
        },
      ];

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = mockCustomer;
        next();
      });
      MockQuotation.findAll.mockResolvedValue(mockQuotations as any);

      // Act
      const response = await request(app).get('/api/quotations/customer').expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].id).toBe(1);
      expect(response.body.data[1].id).toBe(2);
      expect(MockQuotation.findAll).toHaveBeenCalledWith({
        where: { companyId: 1 },
        include: expect.any(Array),
        order: [['createdAt', 'DESC']],
      });
    });

    it('should return 403 for non-customer users', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 2, email: 'admin@example.com', role: 'admin' };
        next();
      });

      // Act
      const response = await request(app).get('/api/quotations/customer').expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      MockQuotation.findAll.mockRejectedValue(new Error('Database error'));

      // Act
      const response = await request(app).get('/api/quotations/customer').expect(500);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/quotations/:id', () => {
    const mockQuotation = {
      id: 1,
      companyId: 1,
      status: 'pending',
      items: [
        {
          id: 1,
          productId: 1,
          quantity: 5,
          product: { id: 1, name: 'Product 1', price: 100 },
        },
      ],
      user: { id: 1, email: 'customer@example.com', role: 'customer' },
    };

    it('should get quotation by ID for owner customer', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      MockQuotation.findByPk.mockResolvedValue(mockQuotation as any);

      // Act
      const response = await request(app).get('/api/quotations/1').expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.companyId).toBe(1);
    });

    it('should get quotation by ID for admin', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 2, email: 'admin@example.com', role: 'admin' };
        next();
      });
      MockQuotation.findByPk.mockResolvedValue(mockQuotation as any);

      // Act
      const response = await request(app).get('/api/quotations/1').expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
    });

    it('should return 404 when quotation not found', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      MockQuotation.findByPk.mockResolvedValue(null);

      // Act
      const response = await request(app).get('/api/quotations/999').expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Quotation not found');
    });

    it('should return 403 when customer tries to access other customer quotation', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 2, email: 'other@example.com', role: 'customer' };
        next();
      });
      MockQuotation.findByPk.mockResolvedValue(mockQuotation as any);

      // Act
      const response = await request(app).get('/api/quotations/1').expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('GET /api/admin/quotations', () => {
    it('should get all quotations for admin', async () => {
      // Arrange
      const mockQuotations = [
        {
          id: 1,
          companyId: 1,
          status: 'pending',
          items: [],
          user: { id: 1, email: 'customer1@example.com', role: 'customer' },
        },
        {
          id: 2,
          companyId: 2,
          status: 'processed',
          items: [],
          user: { id: 2, email: 'customer2@example.com', role: 'customer' },
        },
      ];

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 3, email: 'admin@example.com', role: 'admin' };
        next();
      });
      MockQuotation.findAll.mockResolvedValue(mockQuotations as any);

      // Act
      const response = await request(app).get('/api/admin/quotations').expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(MockQuotation.findAll).toHaveBeenCalledWith({
        include: expect.any(Array),
        order: [['createdAt', 'DESC']],
      });
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });

      // Act
      const response = await request(app).get('/api/admin/quotations').expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('PUT /api/admin/quotations/:id', () => {
    const validUpdateData = {
      status: 'processed',
      adminNotes: 'Updated by admin',
    };

    it('should update quotation successfully for admin', async () => {
      // Arrange
      const mockQuotation = {
        id: 1,
        companyId: 1,
        status: 'pending',
        adminNotes: null,
        update: jest.fn().mockResolvedValue(true),
      };
      const mockUpdatedQuotation = {
        id: 1,
        companyId: 1,
        status: 'processed',
        adminNotes: 'Updated by admin',
        items: [],
        user: { id: 1, email: 'customer@example.com', role: 'customer' },
      };

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 2, email: 'admin@example.com', role: 'admin' };
        next();
      });
      MockQuotation.findByPk
        .mockResolvedValueOnce(mockQuotation as any)
        .mockResolvedValueOnce(mockUpdatedQuotation as any);

      // Act
      const response = await request(app)
        .put('/api/admin/quotations/1')
        .send(validUpdateData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Quotation updated successfully');
      expect(response.body.data.status).toBe('processed');
      expect(response.body.data.adminNotes).toBe('Updated by admin');
    });

    it('should return 400 for invalid status', async () => {
      // Arrange
      const invalidData = {
        status: 'invalid-status',
        adminNotes: 'Test notes',
      };

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 2, email: 'admin@example.com', role: 'admin' };
        next();
      });

      // Act
      const response = await request(app)
        .put('/api/admin/quotations/1')
        .send(invalidData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });

      // Act
      const response = await request(app)
        .put('/api/admin/quotations/1')
        .send(validUpdateData)
        .expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });

    it('should return 404 when quotation not found', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 2, email: 'admin@example.com', role: 'admin' };
        next();
      });
      MockQuotation.findByPk.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .put('/api/admin/quotations/999')
        .send(validUpdateData)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Quotation not found');
    });

    it('should update with partial data', async () => {
      // Arrange
      const partialData = {
        status: 'rejected',
      };
      const mockQuotation = {
        id: 1,
        status: 'pending',
        adminNotes: 'Existing notes',
        update: jest.fn().mockResolvedValue(true),
      };

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 2, email: 'admin@example.com', role: 'admin' };
        next();
      });
      MockQuotation.findByPk.mockResolvedValueOnce(mockQuotation as any);
      MockQuotation.findByPk.mockResolvedValueOnce({
        ...mockQuotation,
        status: 'rejected',
        items: [],
        user: { id: 1, email: 'customer@example.com', role: 'customer' },
      } as any);

      // Act
      const response = await request(app)
        .put('/api/admin/quotations/1')
        .send(partialData)
        .expect(200);

      // Assert
      expect(mockQuotation.update).toHaveBeenCalledWith({
        status: 'rejected',
        adminNotes: 'Existing notes',
      });
    });
  });

  describe('POST /api/quotations/calculate', () => {
    const validCalculateData = {
      items: [
        { productId: 1, quantity: 5 },
        { productId: 2, quantity: 3 },
      ],
      buyerLocation: 'São Paulo',
      supplierLocation: 'Rio de Janeiro',
      shippingMethod: 'standard',
    };

    it('should calculate quote successfully', async () => {
      // Arrange
      const mockCalculations = {
        items: [
          {
            productId: 1,
            quantity: 5,
            basePrice: 100,
            tierDiscount: 0.05,
            unitPriceAfterDiscount: 95,
            subtotal: 475,
            shippingCost: 25,
            tax: 47.5,
            total: 547.5,
            savings: 25,
            appliedTier: { minQuantity: 1, maxQuantity: 10, discount: 0.05 },
          },
          {
            productId: 2,
            quantity: 3,
            basePrice: 200,
            tierDiscount: 0,
            unitPriceAfterDiscount: 200,
            subtotal: 600,
            shippingCost: 25,
            tax: 60,
            total: 685,
            savings: 0,
            appliedTier: null,
          },
        ],
        totalSubtotal: 1075,
        totalShipping: 50,
        totalTax: 107.5,
        grandTotal: 1232.5,
        totalSavings: 25,
      };
      const mockFormattedResponse = {
        summary: {
          totalItems: 2,
          subtotal: 'R$ 1075.00',
          shipping: 'R$ 50.00',
          tax: 'R$ 107.50',
          total: 'R$ 1232.50',
          savings: 'R$ 25.00',
        },
        items: [
          {
            productId: 1,
            quantity: 5,
            unitPrice: 'R$ 95.00',
            discount: '5.0%',
            subtotal: 'R$ 475.00',
            appliedTier: '1-10 units',
          },
          {
            productId: 2,
            quantity: 3,
            unitPrice: 'R$ 200.00',
            discount: '0.0%',
            subtotal: 'R$ 600.00',
            appliedTier: 'No tier applied',
          },
        ],
      };

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      mockQuoteService.calculateQuoteComparison.mockResolvedValue(mockCalculations);
      mockQuoteService.formatQuoteResponse.mockReturnValue(mockFormattedResponse);

      // Act
      const response = await request(app)
        .post('/api/quotations/calculate')
        .send(validCalculateData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.total).toBe('R$ 1232.50');
      expect(response.body.data.calculations).toEqual(mockCalculations);
      expect(mockQuoteService.calculateQuoteComparison).toHaveBeenCalledWith(
        validCalculateData.items,
        {
          buyerLocation: 'São Paulo',
          supplierLocation: 'Rio de Janeiro',
          shippingMethod: 'standard',
        }
      );
    });

    it('should return 400 for invalid validation', async () => {
      // Arrange
      const invalidData = {
        items: [{ productId: 'invalid', quantity: 0 }],
        shippingMethod: 'invalid-method',
      };

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });

      // Act
      const response = await request(app)
        .post('/api/quotations/calculate')
        .send(invalidData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle calculation errors gracefully', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      mockQuoteService.calculateQuoteComparison.mockRejectedValue(new Error('Product not found'));

      // Act
      const response = await request(app)
        .post('/api/quotations/calculate')
        .send(validCalculateData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Product not found');
    });
  });

  describe('GET /api/quotations/:id/calculations', () => {
    it('should get quotation calculations for owner', async () => {
      // Arrange
      const mockResult = {
        quotation: {
          id: 1,
          companyId: 1,
          status: 'pending',
          adminNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
        } as any,
        calculations: {
          items: [],
          totalSubtotal: 1000,
          totalShipping: 50,
          totalTax: 100,
          grandTotal: 1150,
          totalSavings: 0,
        },
      };
      const mockFormattedResponse = {
        summary: {
          totalItems: 0,
          subtotal: 'R$ 1000.00',
          shipping: 'R$ 50.00',
          tax: 'R$ 100.00',
          total: 'R$ 1150.00',
          savings: 'R$ 0.00',
        },
        items: [],
      };

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      mockQuoteService.getQuotationWithCalculations.mockResolvedValue(mockResult);
      mockQuoteService.formatQuoteResponse.mockReturnValue(mockFormattedResponse);

      // Act
      const response = await request(app).get('/api/quotations/1/calculations').expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.quotation.id).toBe(1);
      expect(response.body.data.calculations).toEqual(mockResult.calculations);
    });

    it('should return 403 when customer tries to access other customer quotation calculations', async () => {
      // Arrange
      const mockResult = {
        quotation: {
          id: 1,
          companyId: 2, // Different user
          status: 'pending',
          adminNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
        } as any,
        calculations: {
          items: [],
          totalSubtotal: 0,
          totalShipping: 0,
          totalTax: 0,
          grandTotal: 0,
          totalSavings: 0,
        },
      };

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      mockQuoteService.getQuotationWithCalculations.mockResolvedValue(mockResult);

      // Act
      const response = await request(app).get('/api/quotations/1/calculations').expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      mockQuoteService.getQuotationWithCalculations.mockRejectedValue(
        new Error('Quotation not found')
      );

      // Act
      const response = await request(app).get('/api/quotations/1/calculations').expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Quotation not found');
    });
  });

  describe('POST /api/admin/quotations/:id/process', () => {
    it('should process quotation with calculations for admin', async () => {
      // Arrange
      const mockResult = {
        quotation: {
          id: 1,
          companyId: 1,
          status: 'pending',
          adminNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
        } as any,
        calculations: {
          items: [],
          totalSubtotal: 1000,
          totalShipping: 50,
          totalTax: 100,
          grandTotal: 1150,
          totalSavings: 0,
        },
      };
      const mockUpdatedQuotation = {
        ...mockResult.quotation,
        status: 'processed',
        items: [],
        user: { id: 1, email: 'customer@example.com', role: 'customer' },
      };
      const mockFormattedResponse = {
        summary: {
          totalItems: 0,
          subtotal: 'R$ 1000.00',
          shipping: 'R$ 50.00',
          tax: 'R$ 100.00',
          total: 'R$ 1150.00',
          savings: 'R$ 0.00',
        },
        items: [],
      };

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 2, email: 'admin@example.com', role: 'admin' };
        next();
      });
      mockQuoteService.getQuotationWithCalculations.mockResolvedValue(mockResult);
      mockQuoteService.updateQuotationWithCalculations.mockResolvedValue(undefined);
      MockQuotation.findByPk.mockResolvedValue(mockUpdatedQuotation as any);
      mockQuoteService.formatQuoteResponse.mockReturnValue(mockFormattedResponse);

      // Act
      const response = await request(app).post('/api/admin/quotations/1/process').expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Quotation processed with calculations');
      expect(response.body.data.quotation.id).toBe(1);
      expect(mockQuoteService.updateQuotationWithCalculations).toHaveBeenCalledWith(
        1,
        mockResult.calculations
      );
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });

      // Act
      const response = await request(app).post('/api/admin/quotations/1/process').expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });

    it('should handle processing errors gracefully', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 2, email: 'admin@example.com', role: 'admin' };
        next();
      });
      mockQuoteService.getQuotationWithCalculations.mockRejectedValue(
        new Error('Processing failed')
      );

      // Act
      const response = await request(app).post('/api/admin/quotations/1/process').expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Processing failed');
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle invalid quotation ID parameter', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      MockQuotation.findByPk.mockResolvedValue(null);

      // Act
      const response = await request(app).get('/api/quotations/invalid-id').expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Quotation not found');
    });

    it('should handle very large quantity in quotation items', async () => {
      // Arrange
      const largeQuantityData = {
        items: [{ productId: 1, quantity: 999999999 }],
      };

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      MockProduct.findAll.mockResolvedValue([{ id: 1, name: 'Product' }] as any);
      MockQuotation.create.mockResolvedValue({ id: 1, companyId: 1 } as any);
      MockQuotationItem.create.mockResolvedValue({ id: 1 } as any);
      MockQuotation.findByPk.mockResolvedValue({
        id: 1,
        items: [{ productId: 1, quantity: 999999999 }],
      } as any);

      // Act
      const response = await request(app)
        .post('/api/quotations')
        .send(largeQuantityData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
    });

    it('should handle simultaneous quotation creation', async () => {
      // Arrange
      const quotationData = {
        items: [{ productId: 1, quantity: 1 }],
      };

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      MockProduct.findAll.mockResolvedValue([{ id: 1 }] as any);
      MockQuotation.create.mockResolvedValue({ id: 1, companyId: 1 } as any);
      MockQuotationItem.create.mockResolvedValue({ id: 1 } as any);
      MockQuotation.findByPk.mockResolvedValue({ id: 1, items: [] } as any);

      // Act
      const promises = Array(5)
        .fill(null)
        .map(() => request(app).post('/api/quotations').send(quotationData));

      const responses = await Promise.all(promises);

      // Assert
      responses.forEach(response => {
        expect([201, 400, 500]).toContain(response.status);
      });
    });
  });

  describe('POST /api/quotations/compare (getMultipleSupplierQuotes)', () => {
    const validCompareData = {
      productId: 1,
      quantity: 10,
      buyerLocation: 'São Paulo',
      supplierIds: [1, 2],
      shippingMethod: 'standard',
    };

    it('should return quotes from multiple suppliers', async () => {
      const mockQuotes = [
        {
          supplier: { id: 1, companyName: 'Supplier 1' },
          quote: {
            productId: 1,
            basePrice: 100,
            quantity: 10,
            tierDiscount: 0,
            unitPriceAfterDiscount: 100,
            subtotal: 1000,
            shippingCost: 50,
            tax: 180,
            total: 1000,
            savings: 0,
            appliedTier: null,
          },
        },
        {
          supplier: { id: 2, companyName: 'Supplier 2' },
          quote: {
            productId: 1,
            basePrice: 90,
            quantity: 10,
            tierDiscount: 0,
            unitPriceAfterDiscount: 90,
            subtotal: 900,
            shippingCost: 50,
            tax: 162,
            total: 900,
            savings: 0,
            appliedTier: null,
          },
        },
      ];

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      mockQuoteService.getMultipleSupplierQuotes.mockResolvedValue(mockQuotes);

      const response = await request(app)
        .post('/api/quotations/compare')
        .send(validCompareData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quotes).toEqual(mockQuotes);
      expect(response.body.data.productId).toBe(1);
      expect(response.body.data.quantity).toBe(10);
      expect(response.body.data.shippingMethod).toBe('standard');
    });

    it('should default shippingMethod to standard when not provided', async () => {
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      mockQuoteService.getMultipleSupplierQuotes.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/quotations/compare')
        .send({ productId: 1, quantity: 5 })
        .expect(200);

      expect(response.body.data.shippingMethod).toBe('standard');
    });

    it('should return 400 when QuoteService throws', async () => {
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      mockQuoteService.getMultipleSupplierQuotes.mockRejectedValue(new Error('Product not found'));

      const response = await request(app)
        .post('/api/quotations/compare')
        .send(validCompareData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Product not found');
    });

    it('should pass optional parameters through', async () => {
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'customer@example.com', role: 'customer' };
        next();
      });
      mockQuoteService.getMultipleSupplierQuotes.mockResolvedValue([]);

      await request(app).post('/api/quotations/compare').send(validCompareData).expect(200);

      expect(mockQuoteService.getMultipleSupplierQuotes).toHaveBeenCalledWith(
        1,
        10,
        'São Paulo',
        [1, 2],
        'standard'
      );
    });
  });
});
