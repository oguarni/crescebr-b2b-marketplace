import request from 'supertest';
import express from 'express';
import {
  createOrderFromQuotation,
  updateOrderStatus,
  getUserOrders,
  getOrderHistory,
  getAllOrders,
  getOrderStats,
  createOrderValidation,
  updateOrderStatusValidation,
} from '../ordersController';
import { authenticateJWT } from '../../middleware/auth';
import { errorHandler } from '../../middleware/errorHandler';
import { OrderStatusService } from '../../services/orderStatusService';
import { QuoteService } from '../../services/quoteService';
import Order from '../../models/Order';
import Quotation from '../../models/Quotation';
import User from '../../models/User';

// Mock the services and models
jest.mock('../../services/orderStatusService');
jest.mock('../../services/quoteService');
jest.mock('../../models/Order');
jest.mock('../../models/Quotation');
jest.mock('../../models/User');
jest.mock('../../middleware/auth', () => ({
  authenticateJWT: jest.fn((req, res, next) => next()),
}));
jest.mock('../../middleware/errorHandler', () => ({
  errorHandler: jest.fn((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  }),
  asyncHandler: jest.fn(
    (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next)
  ),
}));

const MockOrderStatusService = OrderStatusService as jest.Mocked<typeof OrderStatusService>;
const MockQuoteService = QuoteService as jest.Mocked<typeof QuoteService>;
const MockOrder = Order as jest.Mocked<typeof Order>;
const MockQuotation = Quotation as jest.Mocked<typeof Quotation>;
const MockUser = User as jest.Mocked<typeof User>;

// Create Express app for testing
const app = express();
app.use(express.json());

// Setup routes
app.post('/api/orders', authenticateJWT, createOrderValidation, createOrderFromQuotation);
app.put(
  '/api/orders/:orderId/status',
  authenticateJWT,
  updateOrderStatusValidation,
  updateOrderStatus
);
app.get('/api/orders', authenticateJWT, getUserOrders);
app.get('/api/orders/:orderId/history', authenticateJWT, getOrderHistory);
app.get('/api/admin/orders', authenticateJWT, getAllOrders);
app.get('/api/admin/orders/stats', authenticateJWT, getOrderStats);

app.use(errorHandler);

describe('Orders Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authentication middleware to pass
    (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { id: 1, role: 'buyer', email: 'buyer@test.com' };
      next();
    });
  });

  describe('POST /api/orders', () => {
    it('should create order from quotation successfully', async () => {
      const mockQuotation = {
        ...createMockQuotation({ id: 1, companyId: 1, status: 'processed' }),
        update: jest.fn().mockResolvedValue(true),
      };
      const mockCalculations = {
        items: [],
        totalSubtotal: 1000,
        totalShipping: 100,
        totalTax: 180,
        grandTotal: 1280,
        totalSavings: 0,
      };
      const mockOrder = createMockOrder({
        id: 'order-123',
        companyId: 1,
        quotationId: 1,
        totalAmount: 1280,
      });

      MockQuotation.findOne.mockResolvedValue(mockQuotation as any);
      MockQuoteService.getQuotationWithCalculations.mockResolvedValue({
        quotation: mockQuotation as any,
        calculations: mockCalculations,
      });
      MockOrder.create.mockResolvedValue(mockOrder as any);
      MockOrder.findByPk.mockResolvedValue({
        ...mockOrder,
        user: { id: 1, email: 'buyer@test.com', role: 'buyer' },
        quotation: mockQuotation,
      } as any);

      const response = await request(app).post('/api/orders').send({ quotationId: 1 }).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Order created successfully');
      expect(response.body.data.id).toBe('order-123');
      expect(MockOrder.create).toHaveBeenCalledWith({
        companyId: 1,
        quotationId: 1,
        totalAmount: 1280,
        status: 'pending',
      });
    });

    it('should return 400 for invalid quotation ID', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({ quotationId: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 404 when quotation not found', async () => {
      MockQuotation.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/orders')
        .send({ quotationId: 999 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Quotation not found or does not belong to the user');
    });

    it('should return 400 when quotation is not processed', async () => {
      const mockQuotation = createMockQuotation({ id: 1, companyId: 1, status: 'pending' });
      MockQuotation.findOne.mockResolvedValue(mockQuotation as any);

      const response = await request(app).post('/api/orders').send({ quotationId: 1 }).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Only processed quotations can be converted to orders');
    });

    it('should return 400 when order creation fails', async () => {
      const mockQuotation = createMockQuotation({ id: 1, companyId: 1, status: 'processed' });
      MockQuotation.findOne.mockResolvedValue(mockQuotation as any);
      MockQuoteService.getQuotationWithCalculations.mockRejectedValue(
        new Error('Calculation failed')
      );

      const response = await request(app).post('/api/orders').send({ quotationId: 1 }).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Calculation failed');
    });
  });

  describe('PUT /api/orders/:orderId/status', () => {
    beforeEach(() => {
      // Mock as supplier for these tests
      (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 2, role: 'supplier', email: 'supplier@test.com' };
        next();
      });
    });

    it('should update order status successfully as supplier', async () => {
      const mockUpdatedOrder = createMockOrder({
        id: 'order-123',
        status: 'shipped',
        trackingNumber: 'TRACK123',
      });

      MockOrderStatusService.updateOrderStatus.mockResolvedValue(mockUpdatedOrder as any);

      const response = await request(app)
        .put('/api/orders/order-123/status')
        .send({
          status: 'shipped',
          trackingNumber: 'TRACK123',
          estimatedDeliveryDate: '2023-12-31',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Order status updated successfully');
      expect(MockOrderStatusService.updateOrderStatus).toHaveBeenCalledWith(
        'order-123',
        {
          status: 'shipped',
          trackingNumber: 'TRACK123',
          estimatedDeliveryDate: new Date('2023-12-31'),
          notes: undefined,
        },
        2
      );
    });

    it('should update order status successfully as admin', async () => {
      (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 1, role: 'admin', email: 'admin@test.com' };
        next();
      });

      const mockUpdatedOrder = createMockOrder({ id: 'order-123', status: 'cancelled' });
      MockOrderStatusService.updateOrderStatus.mockResolvedValue(mockUpdatedOrder as any);

      const response = await request(app)
        .put('/api/orders/order-123/status')
        .send({ status: 'cancelled', notes: 'Customer request' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 403 when user is not admin or supplier', async () => {
      (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 3, role: 'buyer', email: 'buyer@test.com' };
        next();
      });

      const response = await request(app)
        .put('/api/orders/order-123/status')
        .send({ status: 'shipped' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Only admins and suppliers can update order status');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put('/api/orders/order-123/status')
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 when service throws error', async () => {
      MockOrderStatusService.updateOrderStatus.mockRejectedValue(
        new Error('Invalid status transition')
      );

      const response = await request(app)
        .put('/api/orders/order-123/status')
        .send({ status: 'shipped', trackingNumber: 'TRACK123' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid status transition');
    });
  });

  describe('GET /api/orders', () => {
    it('should get user orders successfully', async () => {
      const mockResult = {
        orders: [
          createMockOrder({ id: 'order-1', companyId: 1 }),
          createMockOrder({ id: 'order-2', companyId: 1 }),
        ],
        total: 2,
      };

      MockOrderStatusService.getOrdersByStatus.mockResolvedValue(mockResult as any);

      const response = await request(app)
        .get('/api/orders')
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      expect(MockOrderStatusService.getOrdersByStatus).toHaveBeenCalledWith(undefined, {
        companyId: 1,
        limit: 20,
        offset: 0,
      });
    });

    it('should filter orders by status', async () => {
      const mockResult = {
        orders: [createMockOrder({ id: 'order-1', status: 'delivered' })],
        total: 1,
      };

      MockOrderStatusService.getOrdersByStatus.mockResolvedValue(mockResult as any);

      await request(app).get('/api/orders').query({ status: 'delivered' }).expect(200);

      expect(MockOrderStatusService.getOrdersByStatus).toHaveBeenCalledWith(
        'delivered',
        expect.objectContaining({
          companyId: 1,
        })
      );
    });

    it('should handle pagination correctly', async () => {
      const mockResult = { orders: [], total: 0 };
      MockOrderStatusService.getOrdersByStatus.mockResolvedValue(mockResult as any);

      const response = await request(app)
        .get('/api/orders')
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(MockOrderStatusService.getOrdersByStatus).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          offset: 10,
          limit: 10,
        })
      );
    });
  });

  describe('GET /api/orders/:orderId/history', () => {
    it('should get order history successfully for order owner', async () => {
      const mockResult = {
        order: createMockOrder({ id: 'order-123', companyId: 1 }),
        timeline: [
          {
            status: 'pending',
            description: 'Order placed, awaiting processing',
            date: new Date(),
            canTransitionTo: ['processing', 'cancelled'],
          },
        ],
      };

      MockOrderStatusService.getOrderHistory.mockResolvedValue(mockResult as any);

      const response = await request(app).get('/api/orders/order-123/history').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.id).toBe('order-123');
      expect(response.body.data.timeline).toHaveLength(1);
    });

    it('should return 403 for non-owner customer', async () => {
      const mockResult = {
        order: createMockOrder({ id: 'order-123', companyId: 2 }), // Different user
        timeline: [],
      };

      (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 1, role: 'customer', email: 'customer@test.com' };
        next();
      });

      MockOrderStatusService.getOrderHistory.mockResolvedValue(mockResult as any);

      const response = await request(app).get('/api/orders/order-123/history').expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should allow access for non-customer roles', async () => {
      const mockResult = {
        order: createMockOrder({ id: 'order-123', companyId: 2 }),
        timeline: [],
      };

      (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 1, role: 'admin', email: 'admin@test.com' };
        next();
      });

      MockOrderStatusService.getOrderHistory.mockResolvedValue(mockResult as any);

      await request(app).get('/api/orders/order-123/history').expect(200);
    });
  });

  describe('GET /api/admin/orders', () => {
    beforeEach(() => {
      (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 1, role: 'admin', email: 'admin@test.com' };
        next();
      });
    });

    it('should get all orders for admin', async () => {
      const mockResult = {
        orders: [createMockOrder({ id: 'order-1' }), createMockOrder({ id: 'order-2' })],
        total: 2,
      };

      MockOrderStatusService.getOrdersByStatus.mockResolvedValue(mockResult as any);

      const response = await request(app).get('/api/admin/orders').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return 403 for non-admin', async () => {
      (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 1, role: 'buyer', email: 'buyer@test.com' };
        next();
      });

      const response = await request(app).get('/api/admin/orders').expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should filter by date range', async () => {
      const mockResult = { orders: [], total: 0 };
      MockOrderStatusService.getOrdersByStatus.mockResolvedValue(mockResult as any);

      await request(app)
        .get('/api/admin/orders')
        .query({
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          status: 'delivered',
        })
        .expect(200);

      expect(MockOrderStatusService.getOrdersByStatus).toHaveBeenCalledWith(
        'delivered',
        expect.objectContaining({
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31'),
        })
      );
    });
  });

  describe('GET /api/admin/orders/stats', () => {
    beforeEach(() => {
      (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 1, role: 'admin', email: 'admin@test.com' };
        next();
      });
    });

    it('should get order statistics for admin', async () => {
      const mockStats = {
        statusCounts: {
          pending: 5,
          processing: 3,
          shipped: 2,
          delivered: 10,
          cancelled: 1,
        },
        totalOrders: 21,
        averageProcessingTime: 3.5,
      };

      MockOrderStatusService.getOrderStatusStats.mockResolvedValue(mockStats);

      const response = await request(app).get('/api/admin/orders/stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalOrders).toBe(21);
      expect(response.body.data.statusCounts.delivered).toBe(10);
    });

    it('should return 403 for non-admin', async () => {
      (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 1, role: 'supplier', email: 'supplier@test.com' };
        next();
      });

      const response = await request(app).get('/api/admin/orders/stats').expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Admin access required');
    });
  });
});
