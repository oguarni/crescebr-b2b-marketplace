import { ratingsService } from '../ratingsService';
import Rating from '../../models/Rating';
import Order from '../../models/Order';
import User from '../../models/User';

// Mock models using the same pattern as other service tests
jest.mock('../../models/Rating');
jest.mock('../../models/Order');
jest.mock('../../models/User');

const MockRating = Rating as jest.Mocked<typeof Rating>;
const MockOrder = Order as jest.Mocked<typeof Order>;
const MockUser = User as jest.Mocked<typeof User>;

describe('ratingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRating', () => {
    it('should create rating successfully with orderId', async () => {
      const buyerId = 1;
      const data = { supplierId: 2, orderId: 'order-abc', score: 5, comment: 'Great service' };

      MockUser.findOne.mockResolvedValue({ id: 2, role: 'supplier' } as any);
      MockOrder.findOne.mockResolvedValue({ id: 'order-abc', companyId: 1 } as any);
      MockRating.findOne.mockResolvedValue(null);
      MockRating.create.mockResolvedValue({ id: 10 } as any);
      MockRating.findByPk.mockResolvedValue({
        id: 10,
        supplierId: 2,
        buyerId: 1,
        score: 5,
        comment: 'Great service',
      } as any);

      const result = await ratingsService.createRating(buyerId, data);

      expect(MockUser.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 2, role: 'supplier' },
        })
      );
      expect(MockOrder.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-abc', companyId: 1, status: 'delivered' },
        })
      );
      expect(MockRating.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId: 'order-abc', buyerId: 1 },
        })
      );
      expect(MockRating.create).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: 2,
          buyerId: 1,
          orderId: 'order-abc',
          score: 5,
          comment: 'Great service',
        })
      );
      expect(result).toBeDefined();
      expect((result as any).id).toBe(10);
    });

    it('should create rating successfully without orderId', async () => {
      const buyerId = 1;
      const data = { supplierId: 2, score: 4 };

      MockUser.findOne.mockResolvedValue({ id: 2, role: 'supplier' } as any);
      MockOrder.findOne.mockResolvedValue({
        id: 'order-xyz',
        companyId: 1,
        status: 'delivered',
      } as any);
      MockRating.create.mockResolvedValue({ id: 11 } as any);
      MockRating.findByPk.mockResolvedValue({ id: 11, score: 4 } as any);

      const result = await ratingsService.createRating(buyerId, data);

      expect(MockOrder.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: 1, status: 'delivered' },
        })
      );
      expect(MockRating.create).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: 2,
          buyerId: 1,
          orderId: undefined,
          score: 4,
          comment: undefined,
        })
      );
      expect(result).toBeDefined();
    });

    it('should throw 404 when supplier not found', async () => {
      MockUser.findOne.mockResolvedValue(null);

      try {
        await ratingsService.createRating(1, { supplierId: 999, score: 5 });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Supplier not found');
        expect(error.statusCode).toBe(404);
      }
    });

    it('should throw 403 when order not found for given orderId', async () => {
      MockUser.findOne.mockResolvedValue({ id: 2, role: 'supplier' } as any);
      MockOrder.findOne.mockResolvedValue(null);

      try {
        await ratingsService.createRating(1, { supplierId: 2, orderId: 'order-bad', score: 5 });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('You can only rate suppliers from completed orders');
        expect(error.statusCode).toBe(403);
      }
    });

    it('should throw 400 when rating already exists for order', async () => {
      MockUser.findOne.mockResolvedValue({ id: 2, role: 'supplier' } as any);
      MockOrder.findOne.mockResolvedValue({ id: 'order-dup', companyId: 1 } as any);
      MockRating.findOne.mockResolvedValue({ id: 99, orderId: 'order-dup' } as any);

      try {
        await ratingsService.createRating(1, { supplierId: 2, orderId: 'order-dup', score: 4 });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('You have already rated this order');
        expect(error.statusCode).toBe(400);
      }
    });

    it('should throw 403 when no completed order without orderId', async () => {
      MockUser.findOne.mockResolvedValue({ id: 2, role: 'supplier' } as any);
      MockOrder.findOne.mockResolvedValue(null);

      try {
        await ratingsService.createRating(1, { supplierId: 2, score: 5 });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('You can only rate suppliers from completed orders');
        expect(error.statusCode).toBe(403);
      }
    });
  });

  describe('getSupplierRatings', () => {
    it('should return ratings with pagination and score distribution', async () => {
      const mockRatings = [
        { score: 5, comment: 'Excellent' },
        { score: 4, comment: 'Good' },
        { score: 5, comment: 'Amazing' },
        { score: 3, comment: 'OK' },
      ];

      MockRating.findAndCountAll.mockResolvedValue({
        count: 4,
        rows: mockRatings,
      } as any);

      const result = await ratingsService.getSupplierRatings(1, 1, 10);

      expect(result.ratings).toEqual(mockRatings);
      expect(result.pagination).toEqual({
        total: 4,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      // Average: (5+4+5+3)/4 = 4.25
      expect(result.averageScore).toBe(4.25);
      expect(result.totalRatings).toBe(4);
      expect(result.scoreDistribution).toEqual({
        1: 0,
        2: 0,
        3: 1,
        4: 1,
        5: 2,
      });
    });

    it('should handle empty ratings (average=0)', async () => {
      MockRating.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      } as any);

      const result = await ratingsService.getSupplierRatings(1, 1, 10);

      expect(result.averageScore).toBe(0);
      expect(result.totalRatings).toBe(0);
      expect(result.scoreDistribution).toEqual({
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      });
    });

    it('should calculate correct pagination for multiple pages', async () => {
      MockRating.findAndCountAll.mockResolvedValue({
        count: 25,
        rows: Array(10).fill({ score: 4 }),
      } as any);

      const result = await ratingsService.getSupplierRatings(1, 2, 10);

      expect(result.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });

    it('should pass correct offset to findAndCountAll', async () => {
      MockRating.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      } as any);

      await ratingsService.getSupplierRatings(1, 3, 5);

      expect(MockRating.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 10,
          limit: 5,
        })
      );
    });

    it('should accept string supplierId', async () => {
      MockRating.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      } as any);

      await ratingsService.getSupplierRatings('supplier-uuid', 1, 10);

      expect(MockRating.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { supplierId: 'supplier-uuid' },
        })
      );
    });
  });

  describe('updateRating', () => {
    it('should update rating within 24 hours', async () => {
      const recentDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const mockRating = {
        id: 1,
        buyerId: 1,
        score: 3,
        comment: 'OK',
        createdAt: recentDate,
        update: jest.fn().mockResolvedValue(true),
      };

      MockRating.findOne.mockResolvedValue(mockRating as any);
      MockRating.findByPk.mockResolvedValue({
        ...mockRating,
        score: 5,
        comment: 'Actually great',
      } as any);

      const result = await ratingsService.updateRating('1', 1, {
        score: 5,
        comment: 'Actually great',
      });

      expect(mockRating.update).toHaveBeenCalledWith({
        score: 5,
        comment: 'Actually great',
      });
      expect(result).toBeDefined();
    });

    it('should throw 404 when rating not found', async () => {
      MockRating.findOne.mockResolvedValue(null);

      try {
        await ratingsService.updateRating('999', 1, { score: 4 });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Rating not found or you do not have permission to edit it');
        expect(error.statusCode).toBe(404);
      }
    });

    it('should throw 400 when rating older than 24 hours', async () => {
      const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 25); // 25 hours ago
      const mockRating = {
        id: 1,
        buyerId: 1,
        score: 3,
        createdAt: oldDate,
      };

      MockRating.findOne.mockResolvedValue(mockRating as any);

      try {
        await ratingsService.updateRating('1', 1, { score: 5 });
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Ratings can only be edited within 24 hours of creation');
        expect(error.statusCode).toBe(400);
      }
    });

    it('should keep existing score when not provided', async () => {
      const recentDate = new Date(Date.now() - 1000 * 60 * 30); // 30 min ago
      const mockRating = {
        id: 1,
        buyerId: 1,
        score: 4,
        comment: 'Good',
        createdAt: recentDate,
        update: jest.fn().mockResolvedValue(true),
      };

      MockRating.findOne.mockResolvedValue(mockRating as any);
      MockRating.findByPk.mockResolvedValue(mockRating as any);

      await ratingsService.updateRating('1', 1, { comment: 'Updated comment' });

      expect(mockRating.update).toHaveBeenCalledWith({
        score: 4,
        comment: 'Updated comment',
      });
    });

    it('should keep existing comment when comment is undefined', async () => {
      const recentDate = new Date(Date.now() - 1000 * 60 * 30);
      const mockRating = {
        id: 1,
        buyerId: 1,
        score: 3,
        comment: 'Original comment',
        createdAt: recentDate,
        update: jest.fn().mockResolvedValue(true),
      };

      MockRating.findOne.mockResolvedValue(mockRating as any);
      MockRating.findByPk.mockResolvedValue(mockRating as any);

      await ratingsService.updateRating('1', 1, { score: 5 });

      expect(mockRating.update).toHaveBeenCalledWith({
        score: 5,
        comment: 'Original comment',
      });
    });
  });

  describe('deleteRating', () => {
    it('should delete own rating (non-admin)', async () => {
      const mockRating = {
        id: 1,
        buyerId: 5,
        destroy: jest.fn().mockResolvedValue(true),
      };

      MockRating.findOne.mockResolvedValue(mockRating as any);

      await ratingsService.deleteRating('1', 5, 'buyer');

      expect(MockRating.findOne).toHaveBeenCalledWith({
        where: { id: '1', buyerId: 5 },
      });
      expect(mockRating.destroy).toHaveBeenCalled();
    });

    it('should allow admin to delete any rating', async () => {
      const mockRating = {
        id: 1,
        buyerId: 99,
        destroy: jest.fn().mockResolvedValue(true),
      };

      MockRating.findOne.mockResolvedValue(mockRating as any);

      await ratingsService.deleteRating('1', 1, 'admin');

      // Admin should not have buyerId in the where clause
      expect(MockRating.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(mockRating.destroy).toHaveBeenCalled();
    });

    it('should throw 404 when rating not found', async () => {
      MockRating.findOne.mockResolvedValue(null);

      try {
        await ratingsService.deleteRating('999', 1, 'buyer');
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Rating not found or you do not have permission to delete it');
        expect(error.statusCode).toBe(404);
      }
    });

    it('should throw 404 when non-admin tries to delete another user rating', async () => {
      MockRating.findOne.mockResolvedValue(null);

      try {
        await ratingsService.deleteRating('1', 99, 'buyer');
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Rating not found or you do not have permission to delete it');
        expect(error.statusCode).toBe(404);
      }
    });
  });

  describe('getTopSuppliers', () => {
    it('should return top suppliers sorted by rating', async () => {
      MockUser.findAll.mockResolvedValue([
        {
          id: 1,
          companyName: 'Top Supplier',
          email: 'top@example.com',
          averageRating: 4.8,
          totalRatings: 15,
        },
        {
          id: 2,
          companyName: 'Good Supplier',
          email: 'good@example.com',
          averageRating: 4.5,
          totalRatings: 10,
        },
      ] as any);

      const result = await ratingsService.getTopSuppliers(5);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].companyName).toBe('Top Supplier');
      expect(result[0].averageRating).toBe(4.8);
      expect(result[0].totalRatings).toBe(15);
      expect(result[1].averageRating).toBe(4.5);
    });

    it('should return empty array when no qualifying suppliers', async () => {
      MockUser.findAll.mockResolvedValue([] as any);

      const result = await ratingsService.getTopSuppliers(10);

      expect(result).toEqual([]);
    });

    it('should handle supplier with null totalRatings', async () => {
      MockUser.findAll.mockResolvedValue([
        {
          id: 1,
          companyName: 'Supplier',
          email: 'sup@example.com',
          averageRating: 4.0,
          totalRatings: null,
        },
      ] as any);

      const result = await ratingsService.getTopSuppliers(5);

      expect(result[0].totalRatings).toBe(0);
    });

    it('should pass limit to findAll', async () => {
      MockUser.findAll.mockResolvedValue([] as any);

      await ratingsService.getTopSuppliers(3);

      expect(MockUser.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 3,
        })
      );
    });

    it('should format averageRating to 2 decimal places', async () => {
      MockUser.findAll.mockResolvedValue([
        {
          id: 1,
          companyName: 'Supplier',
          email: 'sup@example.com',
          averageRating: 4.666666,
          totalRatings: 5,
        },
      ] as any);

      const result = await ratingsService.getTopSuppliers(5);

      expect(result[0].averageRating).toBe(4.67);
    });
  });

  describe('getBuyerRatings', () => {
    it('should return buyer ratings with pagination', async () => {
      const mockRatings = [
        { id: 1, score: 5, comment: 'Great' },
        { id: 2, score: 4, comment: 'Good' },
      ];

      MockRating.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockRatings,
      } as any);

      const result = await ratingsService.getBuyerRatings(1, 1, 10);

      expect(result.ratings).toEqual(mockRatings);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should return empty result when buyer has no ratings', async () => {
      MockRating.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      } as any);

      const result = await ratingsService.getBuyerRatings(1, 1, 10);

      expect(result.ratings).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should pass correct offset for pagination', async () => {
      MockRating.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      } as any);

      await ratingsService.getBuyerRatings(1, 4, 5);

      expect(MockRating.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 15,
          limit: 5,
        })
      );
    });

    it('should filter by buyerId', async () => {
      MockRating.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      } as any);

      await ratingsService.getBuyerRatings(42, 1, 10);

      expect(MockRating.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { buyerId: 42 },
        })
      );
    });

    it('should order by createdAt DESC', async () => {
      MockRating.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      } as any);

      await ratingsService.getBuyerRatings(1, 1, 10);

      expect(MockRating.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['createdAt', 'DESC']],
        })
      );
    });

    it('should calculate totalPages correctly for multiple pages', async () => {
      MockRating.findAndCountAll.mockResolvedValue({
        count: 23,
        rows: Array(5).fill({ score: 4 }),
      } as any);

      const result = await ratingsService.getBuyerRatings(1, 3, 5);

      expect(result.pagination).toEqual({
        total: 23,
        page: 3,
        limit: 5,
        totalPages: 5,
      });
    });
  });
});
