import request from 'supertest';
import express from 'express';
import {
  getAllPendingCompanies,
  verifyCompany,
  getAllProducts,
  moderateProduct,
  getTransactionMonitoring,
  getCompanyDetails,
  updateCompanyStatus,
  validateSupplierCNPJ,
  getSupplierMetrics,
  getVerificationQueue,
  getDashboardAnalytics,
} from '../adminController';
import { authenticateJWT } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { errorHandler } from '../../middleware/errorHandler';
import { adminService } from '../../services/adminService';

// Mock the admin service
jest.mock('../../services/adminService');

// Mock middleware
jest.mock('../../middleware/auth', () => ({
  authenticateJWT: jest.fn((req, res, next) => next()),
}));
jest.mock('../../middleware/rbac', () => {
  let _impl: (req: any, res: any, next: any) => void = (req, res, next) => next();
  const requireRoleMock = jest.fn(() => (req: any, res: any, next: any) => _impl(req, res, next));
  (requireRoleMock as any).__setImpl = (fn: typeof _impl) => {
    _impl = fn;
  };
  return { requireRole: requireRoleMock };
});
jest.mock('../../middleware/errorHandler', () => ({
  errorHandler: jest.fn((err: any, req: any, res: any, _next: any) => {
    res.status(500).json({ error: err.message });
  }),
  asyncHandler: jest.fn(
    (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next)
  ),
}));

const MockAdminService = adminService as jest.Mocked<typeof adminService>;

// Helper factories
function createMockUser(overrides: any = {}) {
  return {
    id: 1,
    email: 'test@test.com',
    role: 'supplier',
    status: 'pending',
    companyName: 'Test Company',
    cnpj: '12.345.678/0001-90',
    cnpjValidated: false,
    industrySector: 'technology',
    ...overrides,
  };
}

function createMockProduct(overrides: any = {}) {
  return {
    id: 1,
    name: 'Test Product',
    price: 100,
    category: 'electronics',
    ...overrides,
  };
}

function createMockOrder(overrides: any = {}) {
  return {
    id: 'order-1',
    totalAmount: 100,
    status: 'delivered',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// Create Express app for testing
const app = express();
app.use(express.json());

// Setup routes
app.get(
  '/api/admin/companies/pending',
  authenticateJWT,
  requireRole('admin'),
  getAllPendingCompanies
);
app.put(
  '/api/admin/companies/:userId/verify',
  authenticateJWT,
  requireRole('admin'),
  verifyCompany
);
app.get('/api/admin/products', authenticateJWT, requireRole('admin'), getAllProducts);
app.put(
  '/api/admin/products/:productId/moderate',
  authenticateJWT,
  requireRole('admin'),
  moderateProduct
);
app.get('/api/admin/transactions', authenticateJWT, requireRole('admin'), getTransactionMonitoring);
app.get('/api/admin/companies/:userId', authenticateJWT, requireRole('admin'), getCompanyDetails);
app.put(
  '/api/admin/companies/:userId/status',
  authenticateJWT,
  requireRole('admin'),
  updateCompanyStatus
);
app.post(
  '/api/admin/companies/:userId/validate-cnpj',
  authenticateJWT,
  requireRole('admin'),
  validateSupplierCNPJ
);
app.get(
  '/api/admin/suppliers/:userId/metrics',
  authenticateJWT,
  requireRole('admin'),
  getSupplierMetrics
);
app.get(
  '/api/admin/verification-queue',
  authenticateJWT,
  requireRole('admin'),
  getVerificationQueue
);
app.get('/api/admin/dashboard', authenticateJWT, requireRole('admin'), getDashboardAnalytics);

app.use(errorHandler);

describe('Admin Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authentication middleware to pass
    (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { id: 1, role: 'admin', email: 'admin@test.com' };
      next();
    });

    (requireRole as any).__setImpl((req: any, res: any, next: any) => next());
  });

  describe('GET /api/admin/companies/pending', () => {
    it('should return list of pending companies', async () => {
      const mockCompanies = [
        createMockUser({ id: 1, status: 'pending' }),
        createMockUser({ id: 2, status: 'pending' }),
      ];

      MockAdminService.getPendingCompanies.mockResolvedValue(mockCompanies as any);

      const response = await request(app).get('/api/admin/companies/pending').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(MockAdminService.getPendingCompanies).toHaveBeenCalled();
    });
  });

  describe('PUT /api/admin/companies/:userId/verify', () => {
    it('should successfully approve a company', async () => {
      const mockUser = createMockUser({ id: 1, status: 'approved' });
      MockAdminService.verifyCompany.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .put('/api/admin/companies/1/verify')
        .send({ status: 'approved' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
      expect(MockAdminService.verifyCompany).toHaveBeenCalledWith('1', 'approved', undefined, true);
    });

    it('should successfully reject a company', async () => {
      const mockUser = createMockUser({ id: 1, status: 'rejected' });
      MockAdminService.verifyCompany.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .put('/api/admin/companies/1/verify')
        .send({ status: 'rejected' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
    });

    it('should return 403 when user is not an admin', async () => {
      (requireRole as any).__setImpl((req: any, res: any) => {
        return res
          .status(403)
          .json({ success: false, error: 'Access denied. Required role: admin' });
      });

      const response = await request(app)
        .put('/api/admin/companies/1/verify')
        .send({ status: 'approved' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied. Required role: admin');
    });

    it('should return 404 when userId does not exist', async () => {
      MockAdminService.verifyCompany.mockRejectedValue(new Error('Supplier not found'));

      const response = await request(app)
        .put('/api/admin/companies/999/verify')
        .send({ status: 'approved' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Supplier not found');
    });

    it('should return 400 when status is invalid', async () => {
      const response = await request(app)
        .put('/api/admin/companies/1/verify')
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid status provided');
    });

    it('should return 400 when no status is provided', async () => {
      const response = await request(app).put('/api/admin/companies/1/verify').send({}).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid status provided');
    });

    it('should include reason in success message when reason is provided', async () => {
      const mockUser = createMockUser({ id: 1, status: 'rejected' });
      MockAdminService.verifyCompany.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .put('/api/admin/companies/1/verify')
        .send({ status: 'rejected', reason: 'Missing documentation', validateCNPJ: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Missing documentation');
      expect(MockAdminService.verifyCompany).toHaveBeenCalledWith(
        '1',
        'rejected',
        'Missing documentation',
        false
      );
    });

    it('should return 400 when CNPJ validation fails', async () => {
      MockAdminService.verifyCompany.mockRejectedValue(new Error('CNPJ validation failed'));

      const response = await request(app)
        .put('/api/admin/companies/1/verify')
        .send({ status: 'approved', validateCNPJ: true })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('CNPJ validation failed');
    });

    it('should return 500 when CNPJ validation throws an unexpected error', async () => {
      MockAdminService.verifyCompany.mockRejectedValue(new Error('CNPJ service unavailable'));

      const response = await request(app)
        .put('/api/admin/companies/1/verify')
        .send({ status: 'approved', validateCNPJ: true })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('CNPJ service unavailable');
    });

    it('should use fallback message when non-Error is thrown', async () => {
      MockAdminService.verifyCompany.mockRejectedValue('service timeout');

      const response = await request(app)
        .put('/api/admin/companies/1/verify')
        .send({ status: 'approved', validateCNPJ: true })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to verify company');
    });
  });

  describe('GET /api/admin/products', () => {
    it('should return list of all products', async () => {
      const mockProducts = [
        createMockProduct({ id: 1, name: 'Product 1' }),
        createMockProduct({ id: 2, name: 'Product 2' }),
      ];

      MockAdminService.getAllProducts.mockResolvedValue(mockProducts as any);

      const response = await request(app).get('/api/admin/products').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(MockAdminService.getAllProducts).toHaveBeenCalled();
    });
  });

  describe('PUT /api/admin/products/:productId/moderate', () => {
    it('should approve a product', async () => {
      const mockProduct = createMockProduct({ id: 1, name: 'Test Product' });
      MockAdminService.moderateProduct.mockResolvedValue(mockProduct as any);

      const response = await request(app)
        .put('/api/admin/products/1/moderate')
        .send({ action: 'approve' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
    });

    it('should reject a product', async () => {
      const mockProduct = createMockProduct({ id: 1, name: 'Test Product' });
      MockAdminService.moderateProduct.mockResolvedValue(mockProduct as any);

      const response = await request(app)
        .put('/api/admin/products/1/moderate')
        .send({ action: 'reject' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
    });

    it('should remove a product', async () => {
      MockAdminService.moderateProduct.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/admin/products/1/moderate')
        .send({ action: 'remove' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product removed successfully');
    });

    it('should return 404 when product not found', async () => {
      MockAdminService.moderateProduct.mockRejectedValue(new Error('Product not found'));

      const response = await request(app)
        .put('/api/admin/products/999/moderate')
        .send({ action: 'approve' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Product not found');
    });

    it('should return 400 when action is invalid', async () => {
      const response = await request(app)
        .put('/api/admin/products/1/moderate')
        .send({ action: 'invalid_action' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid action provided');
    });

    it('should return 400 when no action is provided', async () => {
      const response = await request(app)
        .put('/api/admin/products/1/moderate')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid action provided');
    });

    it('should use fallback message when non-Error is thrown', async () => {
      MockAdminService.moderateProduct.mockRejectedValue('db timeout');

      const response = await request(app)
        .put('/api/admin/products/1/moderate')
        .send({ action: 'approve' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to moderate product');
    });
  });

  describe('GET /api/admin/transactions', () => {
    it('should return transaction monitoring data', async () => {
      const mockData = {
        orders: [
          createMockOrder({ id: 'order-1', totalAmount: 100, status: 'delivered' }),
          createMockOrder({ id: 'order-2', totalAmount: 200, status: 'processing' }),
        ],
        totalRevenue: 300,
        totalOrders: 2,
        ordersByStatus: { delivered: 1, processing: 1 },
      };

      MockAdminService.getTransactionMonitoring.mockResolvedValue(mockData as any);

      const response = await request(app).get('/api/admin/transactions').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(2);
      expect(response.body.data.totalRevenue).toBe(300);
      expect(response.body.data.totalOrders).toBe(2);
      expect(response.body.data.ordersByStatus).toEqual({
        delivered: 1,
        processing: 1,
      });
    });

    it('should pass date range filters to service', async () => {
      const startDate = '2023-01-01';
      const endDate = '2023-12-31';

      MockAdminService.getTransactionMonitoring.mockResolvedValue({
        orders: [],
        totalRevenue: 0,
        totalOrders: 0,
        ordersByStatus: {},
      } as any);

      await request(app).get('/api/admin/transactions').query({ startDate, endDate }).expect(200);

      expect(MockAdminService.getTransactionMonitoring).toHaveBeenCalledWith({
        startDate,
        endDate,
        status: undefined,
      });
    });

    it('should pass status filter to service', async () => {
      MockAdminService.getTransactionMonitoring.mockResolvedValue({
        orders: [],
        totalRevenue: 0,
        totalOrders: 0,
        ordersByStatus: {},
      } as any);

      await request(app).get('/api/admin/transactions').query({ status: 'delivered' }).expect(200);

      expect(MockAdminService.getTransactionMonitoring).toHaveBeenCalledWith({
        startDate: undefined,
        endDate: undefined,
        status: 'delivered',
      });
    });
  });

  describe('GET /api/admin/companies/:userId', () => {
    it('should return company details', async () => {
      const mockCompany = createMockUser({ id: 1, role: 'supplier' });
      MockAdminService.getCompanyDetails.mockResolvedValue(mockCompany as any);

      const response = await request(app).get('/api/admin/companies/1').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
      expect(MockAdminService.getCompanyDetails).toHaveBeenCalledWith('1');
    });

    it('should return 404 when company not found', async () => {
      MockAdminService.getCompanyDetails.mockRejectedValue(new Error('Company not found'));

      const response = await request(app).get('/api/admin/companies/999').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Company not found');
    });

    it('should use fallback message when non-Error is thrown', async () => {
      MockAdminService.getCompanyDetails.mockRejectedValue('db error');

      const response = await request(app).get('/api/admin/companies/1').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get company details');
    });
  });

  describe('PUT /api/admin/companies/:userId/status', () => {
    it('should update company status successfully', async () => {
      const mockCompany = createMockUser({ id: 1, status: 'approved' });
      MockAdminService.updateCompanyStatus.mockResolvedValue(mockCompany as any);

      const response = await request(app)
        .put('/api/admin/companies/1/status')
        .send({ status: 'approved', reason: 'All documents verified' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
      expect(response.body.message).toContain('All documents verified');
      expect(MockAdminService.updateCompanyStatus).toHaveBeenCalledWith('1', 'approved');
    });

    it('should return 400 when status is invalid', async () => {
      const response = await request(app)
        .put('/api/admin/companies/1/status')
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid status provided');
    });

    it('should return 404 when company not found', async () => {
      MockAdminService.updateCompanyStatus.mockRejectedValue(new Error('Company not found'));

      const response = await request(app)
        .put('/api/admin/companies/999/status')
        .send({ status: 'approved' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Company not found');
    });

    it('should omit reason from message when reason is not provided', async () => {
      const mockCompany = createMockUser({ id: 1, status: 'approved' });
      MockAdminService.updateCompanyStatus.mockResolvedValue(mockCompany as any);

      const response = await request(app)
        .put('/api/admin/companies/1/status')
        .send({ status: 'approved' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Company status updated to approved');
    });

    it('should use fallback message when non-Error is thrown', async () => {
      MockAdminService.updateCompanyStatus.mockRejectedValue('db error');

      const response = await request(app)
        .put('/api/admin/companies/1/status')
        .send({ status: 'approved' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to update company status');
    });
  });

  describe('POST /api/admin/companies/:userId/validate-cnpj', () => {
    it('should validate supplier CNPJ successfully', async () => {
      const mockUser = createMockUser({ id: 1, cnpj: '12.345.678/0001-90' });
      const mockResult = {
        user: mockUser,
        cnpjValidation: { valid: true, companyName: 'Test Company' },
      };
      MockAdminService.validateSupplierCNPJ.mockResolvedValue(mockResult as any);

      const response = await request(app).post('/api/admin/companies/1/validate-cnpj').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cnpjValidation).toEqual({
        valid: true,
        companyName: 'Test Company',
      });
      expect(MockAdminService.validateSupplierCNPJ).toHaveBeenCalledWith('1');
    });

    it('should return 404 when supplier not found', async () => {
      MockAdminService.validateSupplierCNPJ.mockRejectedValue(new Error('Supplier not found'));

      const response = await request(app)
        .post('/api/admin/companies/999/validate-cnpj')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Supplier not found');
    });

    it('should return 400 when supplier has no CNPJ', async () => {
      MockAdminService.validateSupplierCNPJ.mockRejectedValue(
        new Error('Supplier has no CNPJ to validate')
      );

      const response = await request(app).post('/api/admin/companies/1/validate-cnpj').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Supplier has no CNPJ to validate');
    });

    it('should return 500 when CNPJ validation throws unexpected error', async () => {
      MockAdminService.validateSupplierCNPJ.mockRejectedValue(new Error('External service down'));

      const response = await request(app).post('/api/admin/companies/1/validate-cnpj').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('External service down');
    });

    it('should use fallback message when non-Error is thrown', async () => {
      MockAdminService.validateSupplierCNPJ.mockRejectedValue({ code: 'ECONNREFUSED' });

      const response = await request(app).post('/api/admin/companies/1/validate-cnpj').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to validate CNPJ');
    });
  });

  describe('GET /api/admin/suppliers/:userId/metrics', () => {
    it('should return supplier metrics', async () => {
      const mockMetrics = {
        supplier: createMockUser({ id: 1, role: 'supplier' }),
        metrics: {
          totalProducts: 10,
          totalOrders: 5,
          totalRevenue: 5000,
          averageRating: 4.5,
          totalRatings: 8,
          ordersByStatus: { delivered: 3, processing: 2 },
          cnpjValidated: true,
          industrySector: 'technology',
        },
        products: [],
        recentRatings: [],
      };

      MockAdminService.getSupplierMetrics.mockResolvedValue(mockMetrics);

      const response = await request(app).get('/api/admin/suppliers/1/metrics').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metrics.totalProducts).toBe(10);
      expect(response.body.data.metrics.averageRating).toBe(4.5);
    });

    it('should return 404 when supplier not found', async () => {
      MockAdminService.getSupplierMetrics.mockRejectedValue(new Error('Supplier not found'));

      const response = await request(app).get('/api/admin/suppliers/999/metrics').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Supplier not found');
    });

    it('should return 500 for unexpected errors', async () => {
      MockAdminService.getSupplierMetrics.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app).get('/api/admin/suppliers/1/metrics').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database connection failed');
    });

    it('should use "Failed to get supplier metrics" fallback when non-Error is thrown', async () => {
      MockAdminService.getSupplierMetrics.mockRejectedValue('service unavailable');

      const response = await request(app).get('/api/admin/suppliers/1/metrics').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get supplier metrics');
    });
  });

  describe('GET /api/admin/verification-queue', () => {
    it('should return verification queue with pagination', async () => {
      const mockData = {
        companies: [
          createMockUser({ id: 1, status: 'pending' }),
          createMockUser({ id: 2, status: 'pending' }),
        ],
        totalCount: 2,
        currentPage: 1,
        totalPages: 1,
      };

      MockAdminService.getVerificationQueue.mockResolvedValue(mockData as any);

      const response = await request(app)
        .get('/api/admin/verification-queue')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.companies).toHaveLength(2);
      expect(response.body.data.totalCount).toBe(2);
      expect(response.body.data.currentPage).toBe(1);
      expect(response.body.data.totalPages).toBe(1);
    });

    it('should pass pending filter to service', async () => {
      MockAdminService.getVerificationQueue.mockResolvedValue({
        companies: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0,
      } as any);

      await request(app)
        .get('/api/admin/verification-queue')
        .query({ filter: 'pending' })
        .expect(200);

      expect(MockAdminService.getVerificationQueue).toHaveBeenCalledWith(1, 10, 'pending');
    });

    it('should pass unvalidated_cnpj filter to service', async () => {
      MockAdminService.getVerificationQueue.mockResolvedValue({
        companies: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0,
      } as any);

      await request(app)
        .get('/api/admin/verification-queue')
        .query({ filter: 'unvalidated_cnpj' })
        .expect(200);

      expect(MockAdminService.getVerificationQueue).toHaveBeenCalledWith(1, 10, 'unvalidated_cnpj');
    });

    it('should use default pagination values', async () => {
      MockAdminService.getVerificationQueue.mockResolvedValue({
        companies: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0,
      } as any);

      await request(app).get('/api/admin/verification-queue').expect(200);

      expect(MockAdminService.getVerificationQueue).toHaveBeenCalledWith(1, 10, 'all');
    });

    it('should pass custom pagination values', async () => {
      MockAdminService.getVerificationQueue.mockResolvedValue({
        companies: [],
        totalCount: 0,
        currentPage: 2,
        totalPages: 0,
      } as any);

      await request(app)
        .get('/api/admin/verification-queue')
        .query({ page: 2, limit: 5 })
        .expect(200);

      expect(MockAdminService.getVerificationQueue).toHaveBeenCalledWith(2, 5, 'all');
    });
  });

  describe('GET /api/admin/dashboard', () => {
    it('should return dashboard analytics', async () => {
      const mockAnalytics = {
        summary: {
          companies: {
            total: 10,
            pending: 2,
            approved: 8,
            unvalidatedCNPJ: 1,
            approvalRate: '80.0',
          },
          products: { total: 50, byCategory: [] },
          orders: {
            total: 100,
            thisMonth: 15,
            lastMonth: 12,
            growthRate: '25.0',
            byStatus: {},
            recentWeek: 5,
          },
          revenue: {
            total: 50000,
            thisMonth: 8000,
            lastMonth: 6000,
            growthRate: '33.3',
            formatted: { total: 'R$ 50000.00', thisMonth: 'R$ 8000.00', lastMonth: 'R$ 6000.00' },
          },
          quotations: { total: 30, byStatus: [] },
          activity: {
            recentOrders: 5,
            recentCompanyRegistrations: 3,
            verificationQueueSize: 2,
            urgentTasks: 3,
          },
        },
      };

      MockAdminService.getDashboardAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app).get('/api/admin/dashboard').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.companies.total).toBe(10);
      expect(response.body.data.summary.orders.total).toBe(100);
      expect(response.body.data.summary.revenue.total).toBe(50000);
    });
  });
});
