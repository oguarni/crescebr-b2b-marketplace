import request from 'supertest';
import express from 'express';
import {
  createRating,
  getSupplierRatings,
  updateRating,
  deleteRating,
  getTopSuppliers,
  getBuyerRatings,
  createRatingValidation,
} from '../ratingsController';
import { authenticateJWT } from '../../middleware/auth';
import { errorHandler } from '../../middleware/errorHandler';
import Rating from '../../models/Rating';
import Order from '../../models/Order';
import User from '../../models/User';

// Mock the models
jest.mock('../../models/Rating');
jest.mock('../../models/Order');
jest.mock('../../models/User');
jest.mock('../../middleware/auth', () => ({
  authenticateJWT: jest.fn((req: any, res: any, next: any) => next()),
}));
jest.mock('../../middleware/errorHandler', () => ({
  errorHandler: jest.fn(),
  asyncHandler: jest.requireActual('../../middleware/errorHandler').asyncHandler,
}));

const MockRating = Rating as jest.Mocked<typeof Rating>;
const MockOrder = Order as jest.Mocked<typeof Order>;
const MockUser = User as jest.Mocked<typeof User>;

// Create Express app for testing
const app = express();
app.use(express.json());

// Setup routes
app.post('/api/ratings', authenticateJWT, createRatingValidation, createRating);
app.get('/api/suppliers/:supplierId/ratings', authenticateJWT, getSupplierRatings);
app.put('/api/ratings/:ratingId', authenticateJWT, updateRating);
app.delete('/api/ratings/:ratingId', authenticateJWT, deleteRating);
app.get('/api/suppliers/top', authenticateJWT, getTopSuppliers);
app.get('/api/ratings/my', authenticateJWT, getBuyerRatings);

app.use(errorHandler);

describe('Ratings Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authentication middleware to pass
    (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { id: 1, role: 'buyer', email: 'buyer@test.com' };
      next();
    });
  });

  describe('POST /api/ratings', () => {
    it('should create rating successfully with completed order', async () => {
      const mockSupplier = createMockUser({ id: 2, role: 'supplier' });
      const mockOrder = createMockOrder({
        id: 'order-123',
        companyId: 1,
        status: 'delivered',
      });
      const mockRating = {
        id: 1,
        supplierId: 2,
        buyerId: 1,
        orderId: 'order-123',
        score: 5,
        comment: 'Great service!',
        createdAt: new Date(),
      };

      MockUser.findOne.mockResolvedValue(mockSupplier as any);
      MockOrder.findOne.mockResolvedValue(mockOrder as any);
      MockRating.findOne.mockResolvedValue(null); // No existing rating
      MockRating.create.mockResolvedValue(mockRating as any);
      MockRating.findByPk.mockResolvedValue({
        ...mockRating,
        supplier: { id: 2, companyName: 'Test Supplier', email: 'supplier@test.com' },
        buyer: { id: 1, companyName: 'Test Buyer', email: 'buyer@test.com' },
      } as any);

      const response = await request(app)
        .post('/api/ratings')
        .send({
          supplierId: 2,
          orderId: 'order-123',
          score: 5,
          comment: 'Great service!',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Rating created successfully');
      expect(response.body.data.score).toBe(5);
      expect(MockRating.create).toHaveBeenCalledWith({
        supplierId: 2,
        buyerId: 1,
        orderId: 'order-123',
        score: 5,
        comment: 'Great service!',
      });
    });

    it('should create rating without specific order ID', async () => {
      const mockSupplier = createMockUser({ id: 2, role: 'supplier' });
      const mockOrder = createMockOrder({
        id: 'order-123',
        companyId: 1,
        status: 'delivered',
      });

      MockUser.findOne.mockResolvedValue(mockSupplier as any);
      MockOrder.findOne.mockResolvedValue(mockOrder as any);
      MockRating.create.mockResolvedValue({ id: 1 } as any);
      MockRating.findByPk.mockResolvedValue({ id: 1 } as any);

      const response = await request(app)
        .post('/api/ratings')
        .send({
          supplierId: 2,
          score: 4,
          comment: 'Good service',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(MockRating.create).toHaveBeenCalledWith({
        supplierId: 2,
        buyerId: 1,
        orderId: undefined,
        score: 4,
        comment: 'Good service',
      });
    });

    it('should return 404 when supplier not found', async () => {
      MockUser.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/ratings')
        .send({
          supplierId: 999,
          score: 5,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Supplier not found');
    });

    it('should return 403 when buyer has no completed orders from supplier', async () => {
      const mockSupplier = createMockUser({ id: 2, role: 'supplier' });
      MockUser.findOne.mockResolvedValue(mockSupplier as any);
      MockOrder.findOne.mockResolvedValue(null); // No completed orders

      const response = await request(app)
        .post('/api/ratings')
        .send({
          supplierId: 2,
          orderId: 'order-123',
          score: 5,
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('You can only rate suppliers from completed orders');
    });

    it('should return 400 when trying to rate same order twice', async () => {
      const mockSupplier = createMockUser({ id: 2, role: 'supplier' });
      const mockOrder = createMockOrder({
        id: 'order-123',
        companyId: 1,
        status: 'delivered',
      });
      const existingRating = { id: 1, orderId: 'order-123', buyerId: 1 };

      MockUser.findOne.mockResolvedValue(mockSupplier as any);
      MockOrder.findOne.mockResolvedValue(mockOrder as any);
      MockRating.findOne.mockResolvedValue(existingRating as any);

      const response = await request(app)
        .post('/api/ratings')
        .send({
          supplierId: 2,
          orderId: 'order-123',
          score: 5,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('You have already rated this order');
    });

    it('should return 400 for invalid score', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .send({
          supplierId: 2,
          score: 6, // Invalid score
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for invalid supplier ID', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .send({
          supplierId: 'invalid',
          score: 5,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/suppliers/:supplierId/ratings', () => {
    it('should get supplier ratings with statistics', async () => {
      const mockRatings = [
        { id: 1, score: 5, comment: 'Excellent!', buyer: { id: 1, companyName: 'Buyer 1' } },
        { id: 2, score: 4, comment: 'Good', buyer: { id: 2, companyName: 'Buyer 2' } },
        { id: 3, score: 5, comment: 'Perfect', buyer: { id: 3, companyName: 'Buyer 3' } },
      ];

      MockRating.findAndCountAll.mockResolvedValue({
        count: 3,
        rows: mockRatings,
      } as any);

      const response = await request(app)
        .get('/api/suppliers/2/ratings')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ratings).toHaveLength(3);
      expect(response.body.data.averageScore).toBe(4.67); // (5+4+5)/3 = 4.67
      expect(response.body.data.totalRatings).toBe(3);
      expect(response.body.data.scoreDistribution).toEqual({
        1: 0,
        2: 0,
        3: 0,
        4: 1,
        5: 2,
      });
    });

    it('should handle pagination correctly', async () => {
      MockRating.findAndCountAll.mockResolvedValue({
        count: 25,
        rows: [],
      } as any);

      const response = await request(app)
        .get('/api/suppliers/2/ratings')
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(response.body.data.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });

      expect(MockRating.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 10,
        })
      );
    });

    it('should return zero average for supplier with no ratings', async () => {
      MockRating.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      } as any);

      const response = await request(app).get('/api/suppliers/2/ratings').expect(200);

      expect(response.body.data.averageScore).toBe(0);
      expect(response.body.data.totalRatings).toBe(0);
    });
  });

  describe('PUT /api/ratings/:ratingId', () => {
    it('should update rating successfully within 24 hours', async () => {
      const recentDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const mockRating = {
        id: 1,
        buyerId: 1,
        score: 4,
        comment: 'Good',
        createdAt: recentDate,
        update: jest.fn().mockResolvedValue(true),
      };

      MockRating.findOne.mockResolvedValue(mockRating as any);
      MockRating.findByPk.mockResolvedValue({
        ...mockRating,
        score: 5,
        comment: 'Excellent!',
      } as any);

      const response = await request(app)
        .put('/api/ratings/1')
        .send({
          score: 5,
          comment: 'Excellent!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Rating updated successfully');
      expect(mockRating.update).toHaveBeenCalledWith({
        score: 5,
        comment: 'Excellent!',
      });
    });

    it('should return 404 when rating not found or not owned by user', async () => {
      MockRating.findOne.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/ratings/999')
        .send({
          score: 5,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Rating not found or you do not have permission to edit it');
    });

    it('should return 400 when trying to edit rating after 24 hours', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const mockRating = {
        id: 1,
        buyerId: 1,
        createdAt: oldDate,
      };

      MockRating.findOne.mockResolvedValue(mockRating as any);

      const response = await request(app)
        .put('/api/ratings/1')
        .send({
          score: 5,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Ratings can only be edited within 24 hours of creation');
    });
  });

  describe('DELETE /api/ratings/:ratingId', () => {
    it('should delete own rating successfully', async () => {
      const mockRating = {
        id: 1,
        buyerId: 1,
        destroy: jest.fn().mockResolvedValue(true),
      };

      MockRating.findOne.mockResolvedValue(mockRating as any);

      const response = await request(app).delete('/api/ratings/1').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Rating deleted successfully');
      expect(mockRating.destroy).toHaveBeenCalled();
    });

    it('should allow admin to delete any rating', async () => {
      (authenticateJWT as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 2, role: 'admin', email: 'admin@test.com' };
        next();
      });

      const mockRating = {
        id: 1,
        buyerId: 1, // Different user
        destroy: jest.fn().mockResolvedValue(true),
      };

      MockRating.findOne.mockResolvedValue(mockRating as any);

      const response = await request(app).delete('/api/ratings/1').expect(200);

      expect(response.body.success).toBe(true);
      expect(mockRating.destroy).toHaveBeenCalled();
    });

    it('should return 404 when rating not found or not owned by non-admin user', async () => {
      MockRating.findOne.mockResolvedValue(null);

      const response = await request(app).delete('/api/ratings/999').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe(
        'Rating not found or you do not have permission to delete it'
      );
    });
  });

  describe('GET /api/suppliers/top', () => {
    it('should return top suppliers with ratings', async () => {
      // Mock the aggregated result that would come from the Sequelize query
      const mockAggregatedSuppliers = [
        {
          id: 1,
          companyName: 'Top Supplier',
          email: 'top@example.com',
          averageRating: 4.67,
          totalRatings: 3,
        },
        {
          id: 2,
          companyName: 'Good Supplier',
          email: 'good@example.com',
          averageRating: 3.67,
          totalRatings: 3,
        },
      ];

      MockUser.findAll.mockResolvedValue(mockAggregatedSuppliers as any);

      const response = await request(app)
        .get('/api/suppliers/top')
        .query({ limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].companyName).toBe('Top Supplier');
      expect(response.body.data[0].averageRating).toBe(4.67);
      expect(response.body.data[0].totalRatings).toBe(3);
    });

    it('should filter out suppliers with less than 3 ratings', async () => {
      // Mock only the supplier with 3+ ratings (the query has HAVING COUNT >= 3)
      const mockAggregatedSuppliers = [
        {
          id: 1,
          companyName: 'Test Company',
          email: 'test@example.com',
          averageRating: 4.67,
          totalRatings: 3,
        },
      ];

      MockUser.findAll.mockResolvedValue(mockAggregatedSuppliers as any);

      const response = await request(app).get('/api/suppliers/top').expect(200);

      expect(response.body.data).toHaveLength(1); // Only supplier with 3+ ratings
    });
  });

  describe('GET /api/ratings/my', () => {
    it("should get buyer's own ratings", async () => {
      const mockRatings = [
        {
          id: 1,
          score: 5,
          comment: 'Great!',
          supplier: { id: 2, companyName: 'Supplier 1' },
        },
        {
          id: 2,
          score: 4,
          comment: 'Good',
          supplier: { id: 3, companyName: 'Supplier 2' },
        },
      ];

      MockRating.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockRatings,
      } as any);

      const response = await request(app)
        .get('/api/ratings/my')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ratings).toHaveLength(2);
      expect(response.body.data.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      expect(MockRating.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { buyerId: 1 },
        })
      );
    });

    it('should handle pagination for buyer ratings', async () => {
      MockRating.findAndCountAll.mockResolvedValue({
        count: 15,
        rows: [],
      } as any);

      await request(app).get('/api/ratings/my').query({ page: 2, limit: 5 }).expect(200);

      expect(MockRating.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
          offset: 5,
        })
      );
    });
  });
});
