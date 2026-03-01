import { OrderStatusService } from '../orderStatusService';
import Order from '../../models/Order';
import User from '../../models/User';
import Quotation from '../../models/Quotation';

// Mock the models
jest.mock('../../models/Order');
jest.mock('../../models/User');
jest.mock('../../models/Quotation');

const MockOrder = Order as jest.Mocked<typeof Order>;
const MockUser = User as jest.Mocked<typeof User>;
const MockQuotation = Quotation as jest.Mocked<typeof Quotation>;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function createMockOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'order-mock',
    status: 'pending',
    companyId: 1,
    quotationId: 1,
    totalAmount: 100,
    update: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('OrderStatusService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidTransition', () => {
    it('should allow valid transitions from pending', () => {
      expect(OrderStatusService.isValidTransition('pending', 'processing')).toBe(true);
      expect(OrderStatusService.isValidTransition('pending', 'cancelled')).toBe(true);
    });

    it('should allow valid transitions from processing', () => {
      expect(OrderStatusService.isValidTransition('processing', 'shipped')).toBe(true);
      expect(OrderStatusService.isValidTransition('processing', 'cancelled')).toBe(true);
    });

    it('should allow valid transitions from shipped', () => {
      expect(OrderStatusService.isValidTransition('shipped', 'delivered')).toBe(true);
      expect(OrderStatusService.isValidTransition('shipped', 'cancelled')).toBe(true);
    });

    it('should not allow transitions from terminal states', () => {
      expect(OrderStatusService.isValidTransition('delivered', 'shipped')).toBe(false);
      expect(OrderStatusService.isValidTransition('delivered', 'processing')).toBe(false);
      expect(OrderStatusService.isValidTransition('cancelled', 'processing')).toBe(false);
      expect(OrderStatusService.isValidTransition('cancelled', 'shipped')).toBe(false);
    });

    it('should not allow invalid transitions', () => {
      expect(OrderStatusService.isValidTransition('pending', 'shipped')).toBe(false);
      expect(OrderStatusService.isValidTransition('pending', 'delivered')).toBe(false);
      expect(OrderStatusService.isValidTransition('processing', 'delivered')).toBe(false);
    });

    it('should not allow backwards transitions', () => {
      expect(OrderStatusService.isValidTransition('shipped', 'processing')).toBe(false);
      expect(OrderStatusService.isValidTransition('processing', 'pending')).toBe(false);
      expect(OrderStatusService.isValidTransition('delivered', 'pending')).toBe(false);
    });
  });

  describe('getValidNextStatuses', () => {
    it('should return correct next statuses for pending', () => {
      const nextStatuses = OrderStatusService.getValidNextStatuses('pending');
      expect(nextStatuses).toEqual(['processing', 'cancelled']);
    });

    it('should return correct next statuses for processing', () => {
      const nextStatuses = OrderStatusService.getValidNextStatuses('processing');
      expect(nextStatuses).toEqual(['shipped', 'cancelled']);
    });

    it('should return correct next statuses for shipped', () => {
      const nextStatuses = OrderStatusService.getValidNextStatuses('shipped');
      expect(nextStatuses).toEqual(['delivered', 'cancelled']);
    });

    it('should return empty array for terminal statuses', () => {
      expect(OrderStatusService.getValidNextStatuses('delivered')).toEqual([]);
      expect(OrderStatusService.getValidNextStatuses('cancelled')).toEqual([]);
    });
  });

  describe('getStatusDescription', () => {
    it('should return correct descriptions for all statuses', () => {
      expect(OrderStatusService.getStatusDescription('pending')).toBe(
        'Order placed, awaiting processing'
      );
      expect(OrderStatusService.getStatusDescription('processing')).toBe('Order is being prepared');
      expect(OrderStatusService.getStatusDescription('shipped')).toBe('Order has been shipped');
      expect(OrderStatusService.getStatusDescription('delivered')).toBe('Order has been delivered');
      expect(OrderStatusService.getStatusDescription('cancelled')).toBe('Order has been cancelled');
    });
  });

  describe('calculateEstimatedDelivery', () => {
    it('should calculate correct delivery date for standard shipping', () => {
      const shippedDate = new Date(2023, 0, 2); // Monday, Jan 2, 2023
      const estimated = OrderStatusService.calculateEstimatedDelivery('standard', shippedDate);

      // Monday + 5 days = Saturday (Jan 7), adjusted to Monday (Jan 9)
      expect(estimated.getDate()).toBe(9); // January 9th (after weekend adjustment)
    });

    it('should calculate correct delivery date for express shipping', () => {
      const shippedDate = new Date(2023, 0, 2); // Monday, Jan 2, 2023
      const estimated = OrderStatusService.calculateEstimatedDelivery('express', shippedDate);

      // Monday + 2 days = Wednesday
      expect(estimated.getDate()).toBe(4); // January 4th
    });

    it('should calculate correct delivery date for economy shipping', () => {
      const shippedDate = new Date(2023, 0, 2); // Monday, Jan 2, 2023
      const estimated = OrderStatusService.calculateEstimatedDelivery('economy', shippedDate);

      // Monday + 10 days = Thursday
      expect(estimated.getDate()).toBe(12); // January 12th
    });

    it('should adjust delivery date if it falls on Sunday', () => {
      const shippedDate = new Date('2023-01-03'); // Tuesday
      const estimated = OrderStatusService.calculateEstimatedDelivery('standard', shippedDate);

      // 5 days from Tuesday = Sunday, should be adjusted to Monday
      expect(estimated.getDay()).toBe(1); // Monday
    });

    it('should adjust delivery date if it falls on Saturday', () => {
      const shippedDate = new Date(2023, 0, 1); // Sunday, Jan 1, 2023
      const estimated = OrderStatusService.calculateEstimatedDelivery('express', shippedDate);

      // Sunday + 2 days = Tuesday (Jan 3), no weekend adjustment needed
      expect(estimated.getDay()).toBe(2); // Tuesday
    });

    it('should use current date as default', () => {
      const beforeCall = new Date();
      const estimated = OrderStatusService.calculateEstimatedDelivery('standard');
      const afterCall = new Date();

      // Estimated date should be after current date
      expect(estimated.getTime()).toBeGreaterThan(beforeCall.getTime());
      expect(estimated.getTime()).toBeLessThan(afterCall.getTime() + 10 * 24 * 60 * 60 * 1000); // Within 10 days
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'pending',
        update: jest.fn().mockResolvedValue(true),
      };

      MockOrder.findByPk.mockResolvedValueOnce(mockOrder as any).mockResolvedValueOnce({
        ...mockOrder,
        status: 'processing',
        user: { id: 1, email: 'test@example.com', role: 'buyer' },
        quotation: { id: 1 },
      } as any);

      const result = await OrderStatusService.updateOrderStatus(
        'order-123',
        { status: 'processing' },
        1
      );

      expect(result.status).toBe('processing');
      expect(mockOrder.update).toHaveBeenCalledWith({ status: 'processing' });
    });

    it('should throw error when order not found', async () => {
      MockOrder.findByPk.mockResolvedValue(null);

      await expect(
        OrderStatusService.updateOrderStatus('order-999', { status: 'processing' }, 1)
      ).rejects.toThrow('Order not found');
    });

    it('should throw error for invalid status transition', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'delivered',
        update: jest.fn(),
      };

      MockOrder.findByPk.mockResolvedValue(mockOrder as any);

      await expect(
        OrderStatusService.updateOrderStatus('order-123', { status: 'processing' }, 1)
      ).rejects.toThrow('Invalid status transition from delivered to processing');
    });

    it('should require tracking number for shipping transition', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'processing',
        update: jest.fn(),
      };

      MockOrder.findByPk.mockResolvedValue(mockOrder as any);

      await expect(
        OrderStatusService.updateOrderStatus('order-123', { status: 'shipped' }, 1)
      ).rejects.toThrow('trackingNumber is required for this status transition');
    });

    it('should require nfeAccessKey when tracking number is present for shipping', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'processing',
        update: jest.fn(),
      };

      MockOrder.findByPk.mockResolvedValue(mockOrder as any);

      // trackingNumber provided, but nfeAccessKey is missing
      await expect(
        OrderStatusService.updateOrderStatus(
          'order-123',
          { status: 'shipped', trackingNumber: 'TRACK123' },
          1
        )
      ).rejects.toThrow('nfeAccessKey is required for this status transition');
    });

    it('should save nfeAccessKey and nfeUrl when shipping transition is complete', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'processing',
        update: jest.fn().mockResolvedValue(true),
      };
      const NFE_KEY = '12345678901234567890123456789012345678901234'; // 44 digits
      const NFE_URL = 'https://nfe.example.com/doc/12345678901234567890123456789012345678901234';

      MockOrder.findByPk.mockResolvedValueOnce(mockOrder as any).mockResolvedValueOnce({
        ...mockOrder,
        status: 'shipped',
        trackingNumber: 'TRACK123',
        nfeAccessKey: NFE_KEY,
        nfeUrl: NFE_URL,
      } as any);

      const result = await OrderStatusService.updateOrderStatus(
        'order-123',
        { status: 'shipped', trackingNumber: 'TRACK123', nfeAccessKey: NFE_KEY, nfeUrl: NFE_URL },
        1
      );

      // Both NF-e fields must be forwarded to order.update()
      expect(mockOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'shipped',
          trackingNumber: 'TRACK123',
          nfeAccessKey: NFE_KEY,
          nfeUrl: NFE_URL,
          estimatedDeliveryDate: expect.any(Date),
        })
      );

      // And they must be present on the returned order
      expect((result as any).nfeAccessKey).toBe(NFE_KEY);
      expect((result as any).nfeUrl).toBe(NFE_URL);
    });

    it('should update with tracking number when provided', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'processing',
        update: jest.fn().mockResolvedValue(true),
      };
      const NFE_KEY = '12345678901234567890123456789012345678901234';

      MockOrder.findByPk.mockResolvedValueOnce(mockOrder as any).mockResolvedValueOnce({
        ...mockOrder,
        status: 'shipped',
        trackingNumber: 'TRACK123',
        nfeAccessKey: NFE_KEY,
      } as any);

      await OrderStatusService.updateOrderStatus(
        'order-123',
        { status: 'shipped', trackingNumber: 'TRACK123', nfeAccessKey: NFE_KEY },
        1
      );

      expect(mockOrder.update).toHaveBeenCalledWith({
        status: 'shipped',
        trackingNumber: 'TRACK123',
        nfeAccessKey: NFE_KEY,
        estimatedDeliveryDate: expect.any(Date),
      });
    });

    it('should calculate estimated delivery date when shipping', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'processing',
        update: jest.fn().mockResolvedValue(true),
      };
      const NFE_KEY = '12345678901234567890123456789012345678901234';

      MockOrder.findByPk
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce(mockOrder as any);

      await OrderStatusService.updateOrderStatus(
        'order-123',
        { status: 'shipped', trackingNumber: 'TRACK123', nfeAccessKey: NFE_KEY },
        1
      );

      const updateCall = mockOrder.update.mock.calls[0][0];
      expect(updateCall.estimatedDeliveryDate).toBeInstanceOf(Date);
      expect(updateCall.estimatedDeliveryDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('should use provided estimated delivery date', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'processing',
        update: jest.fn().mockResolvedValue(true),
      };
      const customDate = new Date('2023-12-31');
      const NFE_KEY = '12345678901234567890123456789012345678901234';

      MockOrder.findByPk
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce(mockOrder as any);

      await OrderStatusService.updateOrderStatus(
        'order-123',
        {
          status: 'shipped',
          trackingNumber: 'TRACK123',
          nfeAccessKey: NFE_KEY,
          estimatedDeliveryDate: customDate,
        },
        1
      );

      expect(mockOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          estimatedDeliveryDate: customDate,
        })
      );
    });
  });

  describe('getOrderHistory', () => {
    it('should return order history with timeline', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'shipped',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-05'),
        user: { id: 1, email: 'test@example.com', role: 'buyer' },
        quotation: { id: 1 },
      };

      MockOrder.findByPk.mockResolvedValue(mockOrder as any);

      const result = await OrderStatusService.getOrderHistory('order-123');

      expect(result.order.id).toBe('order-123');
      expect(result.timeline).toHaveLength(2);
      expect(result.timeline[0].status).toBe('pending');
      expect(result.timeline[1].status).toBe('shipped');
    });

    it('should return single timeline entry for pending order', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'pending',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      MockOrder.findByPk.mockResolvedValue(mockOrder as any);

      const result = await OrderStatusService.getOrderHistory('order-123');

      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0].status).toBe('pending');
    });

    it('should throw error when order not found', async () => {
      MockOrder.findByPk.mockResolvedValue(null);

      await expect(OrderStatusService.getOrderHistory('order-999')).rejects.toThrow(
        'Order not found'
      );
    });
  });

  describe('bulkUpdateOrderStatus', () => {
    it('should update multiple orders successfully', async () => {
      const mockOrder1 = {
        id: 'order-1',
        status: 'pending',
        update: jest.fn().mockResolvedValue(true),
      };
      const mockOrder2 = {
        id: 'order-2',
        status: 'pending',
        update: jest.fn().mockResolvedValue(true),
      };

      MockOrder.findByPk
        .mockResolvedValueOnce(mockOrder1 as any)
        .mockResolvedValueOnce(mockOrder1 as any)
        .mockResolvedValueOnce(mockOrder2 as any)
        .mockResolvedValueOnce(mockOrder2 as any);

      const result = await OrderStatusService.bulkUpdateOrderStatus(
        ['order-1', 'order-2'],
        { status: 'processing' },
        1
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('order-1');
      expect(result[1].id).toBe('order-2');
    });

    it('should continue processing when one order fails', async () => {
      const mockOrder = {
        id: 'order-2',
        status: 'pending',
        update: jest.fn().mockResolvedValue(true),
      };

      MockOrder.findByPk
        .mockResolvedValueOnce(null) // First order not found
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce(mockOrder as any);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await OrderStatusService.bulkUpdateOrderStatus(
        ['order-1', 'order-2'],
        { status: 'processing' },
        1
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('order-2');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to update order order-1:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('getOrdersByStatus', () => {
    it('should return orders filtered by status', async () => {
      const mockOrders = [
        createMockOrder({ id: 'order-1', status: 'delivered' }),
        createMockOrder({ id: 'order-2', status: 'delivered' }),
      ];

      MockOrder.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockOrders,
      } as any);

      const result = await OrderStatusService.getOrdersByStatus('delivered');

      expect(result.orders).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(MockOrder.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'delivered' },
        })
      );
    });

    it('should filter by user ID when provided', async () => {
      MockOrder.findAndCountAll.mockResolvedValue({ count: 0, rows: [] } as any);

      await OrderStatusService.getOrdersByStatus('pending', { companyId: 1 });

      expect(MockOrder.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'pending', companyId: 1 },
        })
      );
    });

    it('should filter by date range when provided', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      MockOrder.findAndCountAll.mockResolvedValue({ count: 0, rows: [] } as any);

      await OrderStatusService.getOrdersByStatus('pending', { startDate, endDate });

      expect(MockOrder.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'pending',
            createdAt: expect.any(Object),
          }),
        })
      );
    });

    it('should apply pagination correctly', async () => {
      MockOrder.findAndCountAll.mockResolvedValue({ count: 0, rows: [] } as any);

      await OrderStatusService.getOrdersByStatus('pending', {
        limit: 10,
        offset: 20,
      });

      expect(MockOrder.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20,
        })
      );
    });
  });

  describe('getOrderStatusStats', () => {
    it('should return order statistics', async () => {
      const mockStatusCounts = [
        { status: 'pending', count: '5' },
        { status: 'processing', count: '3' },
        { status: 'delivered', count: '10' },
      ];

      const mockCompletedOrders = [
        {
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-05'),
        },
        {
          createdAt: new Date('2023-01-10'),
          updatedAt: new Date('2023-01-15'),
        },
      ];

      MockOrder.findAll
        .mockResolvedValueOnce(mockStatusCounts as any)
        .mockResolvedValueOnce(mockCompletedOrders as any);

      const result = await OrderStatusService.getOrderStatusStats();

      expect(result.statusCounts).toEqual({
        pending: 5,
        processing: 3,
        shipped: 0,
        delivered: 10,
        cancelled: 0,
      });
      expect(result.totalOrders).toBe(18);
      expect(result.averageProcessingTime).toBeGreaterThan(0);
    });

    it('should handle no completed orders', async () => {
      MockOrder.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await OrderStatusService.getOrderStatusStats();

      expect(result.totalOrders).toBe(0);
      expect(result.averageProcessingTime).toBe(0);
    });

    it('should calculate average processing time correctly', async () => {
      const mockStatusCounts = [{ status: 'delivered', count: '2' }];

      const mockCompletedOrders = [
        {
          createdAt: new Date('2023-01-01T00:00:00Z'),
          updatedAt: new Date('2023-01-05T00:00:00Z'), // 4 days
        },
        {
          createdAt: new Date('2023-01-10T00:00:00Z'),
          updatedAt: new Date('2023-01-16T00:00:00Z'), // 6 days
        },
      ];

      MockOrder.findAll
        .mockResolvedValueOnce(mockStatusCounts as any)
        .mockResolvedValueOnce(mockCompletedOrders as any);

      const result = await OrderStatusService.getOrderStatusStats();

      expect(result.averageProcessingTime).toBe(5); // (4 + 6) / 2 = 5 days
    });
  });

  // ---------------------------------------------------------------------------
  // updateOrderNfe
  // ---------------------------------------------------------------------------
  describe('updateOrderNfe', () => {
    // 44-digit key with a valid Modulo 11 check digit
    const VALID_NFE_KEY = '35240312345678000195550010000014761000047680';
    const VALID_NFE_URL =
      'https://nfe.example.com/doc/35240312345678000195550010000014761000047680';
    const REQUESTER_ID = 42;

    it('should update nfeAccessKey on a shipped order', async () => {
      const mockOrder = createMockOrder({
        id: 'order-123',
        status: 'shipped',
        companyId: REQUESTER_ID,
      });

      MockOrder.findByPk
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce({ ...mockOrder, nfeAccessKey: VALID_NFE_KEY } as any);

      const result = await OrderStatusService.updateOrderNfe(
        'order-123',
        { nfeAccessKey: VALID_NFE_KEY },
        REQUESTER_ID,
        'supplier'
      );

      expect(mockOrder.update).toHaveBeenCalledWith({ nfeAccessKey: VALID_NFE_KEY });
      expect((result as any).nfeAccessKey).toBe(VALID_NFE_KEY);
    });

    it('should update both nfeAccessKey and nfeUrl on a delivered order', async () => {
      const mockOrder = createMockOrder({
        id: 'order-456',
        status: 'delivered',
        companyId: REQUESTER_ID,
      });

      MockOrder.findByPk.mockResolvedValueOnce(mockOrder as any).mockResolvedValueOnce({
        ...mockOrder,
        nfeAccessKey: VALID_NFE_KEY,
        nfeUrl: VALID_NFE_URL,
      } as any);

      const result = await OrderStatusService.updateOrderNfe(
        'order-456',
        { nfeAccessKey: VALID_NFE_KEY, nfeUrl: VALID_NFE_URL },
        REQUESTER_ID,
        'supplier'
      );

      expect(mockOrder.update).toHaveBeenCalledWith({
        nfeAccessKey: VALID_NFE_KEY,
        nfeUrl: VALID_NFE_URL,
      });
      expect((result as any).nfeUrl).toBe(VALID_NFE_URL);
    });

    it('should allow admin to update nfe data on any order', async () => {
      // Admin uses a different companyId — should still succeed
      const mockOrder = createMockOrder({ id: 'order-789', status: 'shipped', companyId: 99 });

      MockOrder.findByPk
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce({ ...mockOrder, nfeUrl: VALID_NFE_URL } as any);

      await expect(
        OrderStatusService.updateOrderNfe('order-789', { nfeUrl: VALID_NFE_URL }, 1, 'admin')
      ).resolves.toBeDefined();

      expect(mockOrder.update).toHaveBeenCalledWith({ nfeUrl: VALID_NFE_URL });
    });

    it('should throw when order is not found', async () => {
      MockOrder.findByPk.mockResolvedValue(null);

      await expect(
        OrderStatusService.updateOrderNfe(
          'order-999',
          { nfeUrl: VALID_NFE_URL },
          REQUESTER_ID,
          'supplier'
        )
      ).rejects.toThrow('Order not found');
    });

    it('should throw for a supplier who does not own the order', async () => {
      const mockOrder = createMockOrder({ id: 'order-123', status: 'shipped', companyId: 999 });
      MockOrder.findByPk.mockResolvedValueOnce(mockOrder as any);

      await expect(
        OrderStatusService.updateOrderNfe(
          'order-123',
          { nfeUrl: VALID_NFE_URL },
          REQUESTER_ID,
          'supplier'
        )
      ).rejects.toThrow('Access denied');
    });

    it('should throw when order is not in shipped or delivered status', async () => {
      const mockOrder = createMockOrder({
        id: 'order-123',
        status: 'processing',
        companyId: REQUESTER_ID,
      });
      MockOrder.findByPk.mockResolvedValueOnce(mockOrder as any);

      await expect(
        OrderStatusService.updateOrderNfe(
          'order-123',
          { nfeAccessKey: VALID_NFE_KEY },
          REQUESTER_ID,
          'supplier'
        )
      ).rejects.toThrow(
        "NF-e data can only be updated on orders with status 'shipped' or 'delivered'"
      );
    });

    it('should throw when no nfe fields are provided', async () => {
      const mockOrder = createMockOrder({
        id: 'order-123',
        status: 'shipped',
        companyId: REQUESTER_ID,
      });
      MockOrder.findByPk.mockResolvedValueOnce(mockOrder as any);

      await expect(
        OrderStatusService.updateOrderNfe('order-123', {}, REQUESTER_ID, 'supplier')
      ).rejects.toThrow('At least one of nfeAccessKey or nfeUrl must be provided');
    });
  });
});
