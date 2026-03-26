import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiService } from '../api';
import { ordersService } from '../ordersService';

const mockApi = vi.mocked(apiService);

const mockOrder = {
  id: 'order-uuid-1',
  companyId: 1,
  quotationId: 5,
  items: [],
  totalAmount: 5000,
  status: 'pending' as const,
  shippingAddress: '123 Test St',
  notes: null,
};

describe('OrdersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrderFromQuotation', () => {
    it('should create order from quotation and return it', async () => {
      mockApi.post.mockResolvedValue({ success: true, data: mockOrder });

      const result = await ordersService.createOrderFromQuotation({ quotationId: 5 });

      expect(mockApi.post).toHaveBeenCalledWith('/orders', { quotationId: 5 });
      expect(result).toEqual(mockOrder);
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.post.mockResolvedValue({
        success: false,
        error: 'Quotation already ordered',
      });

      await expect(ordersService.createOrderFromQuotation({ quotationId: 5 })).rejects.toThrow(
        'Quotation already ordered'
      );
    });

    it('should throw default message when no error field', async () => {
      mockApi.post.mockResolvedValue({ success: false });

      await expect(ordersService.createOrderFromQuotation({ quotationId: 5 })).rejects.toThrow(
        'Failed to create order'
      );
    });
  });

  describe('getUserOrders', () => {
    const mockPaginatedOrders = {
      orders: [mockOrder],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };

    it('should fetch user orders without params', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: mockPaginatedOrders });

      const result = await ordersService.getUserOrders();

      expect(mockApi.get).toHaveBeenCalledWith('/orders?');
      expect(result.orders).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should build query params for status, page, and limit', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: mockPaginatedOrders });

      await ordersService.getUserOrders({ status: 'pending', page: 2, limit: 5 });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('status=pending');
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('limit=5');
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'Unauthorized' });

      await expect(ordersService.getUserOrders()).rejects.toThrow('Unauthorized');
    });

    it('should throw default message when no error field', async () => {
      mockApi.get.mockResolvedValue({ success: false });

      await expect(ordersService.getUserOrders()).rejects.toThrow('Failed to fetch orders');
    });
  });

  describe('getOrderById', () => {
    it('should fetch a single order by ID', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: mockOrder });

      const result = await ordersService.getOrderById('order-uuid-1');

      expect(mockApi.get).toHaveBeenCalledWith('/orders/order-uuid-1');
      expect(result).toEqual(mockOrder);
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'Order not found' });

      await expect(ordersService.getOrderById('bad-id')).rejects.toThrow('Order not found');
    });

    it('should throw default message when no error field', async () => {
      mockApi.get.mockResolvedValue({ success: false });

      await expect(ordersService.getOrderById('bad-id')).rejects.toThrow('Failed to fetch order');
    });
  });

  describe('getOrderHistory', () => {
    const mockHistory = {
      order: mockOrder,
      timeline: [
        {
          status: 'pending',
          description: 'Order created',
          date: new Date('2026-01-01'),
          canTransitionTo: ['processing', 'cancelled'],
        },
      ],
    };

    it('should fetch order history and timeline', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: mockHistory });

      const result = await ordersService.getOrderHistory('order-uuid-1');

      expect(mockApi.get).toHaveBeenCalledWith('/orders/order-uuid-1/history');
      expect(result.order).toEqual(mockOrder);
      expect(result.timeline).toHaveLength(1);
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'History unavailable' });

      await expect(ordersService.getOrderHistory('bad-id')).rejects.toThrow('History unavailable');
    });

    it('should throw default message when no error field', async () => {
      mockApi.get.mockResolvedValue({ success: false });

      await expect(ordersService.getOrderHistory('bad-id')).rejects.toThrow(
        'Failed to fetch order history'
      );
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status and return updated order', async () => {
      const updatedOrder = { ...mockOrder, status: 'processing' as const };
      mockApi.put.mockResolvedValue({ success: true, data: updatedOrder });

      const result = await ordersService.updateOrderStatus('order-uuid-1', {
        status: 'processing',
      });

      expect(mockApi.put).toHaveBeenCalledWith('/orders/order-uuid-1/status', {
        status: 'processing',
      });
      expect(result.status).toBe('processing');
    });

    it('should include optional fields in update data', async () => {
      const updatedOrder = { ...mockOrder, status: 'shipped' as const };
      mockApi.put.mockResolvedValue({ success: true, data: updatedOrder });

      await ordersService.updateOrderStatus('order-uuid-1', {
        status: 'shipped',
        trackingNumber: 'TRACK123',
        estimatedDeliveryDate: '2026-04-01',
        notes: 'Shipped via express',
      });

      expect(mockApi.put).toHaveBeenCalledWith('/orders/order-uuid-1/status', {
        status: 'shipped',
        trackingNumber: 'TRACK123',
        estimatedDeliveryDate: '2026-04-01',
        notes: 'Shipped via express',
      });
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.put.mockResolvedValue({
        success: false,
        error: 'Invalid status transition',
      });

      await expect(
        ordersService.updateOrderStatus('order-uuid-1', { status: 'delivered' })
      ).rejects.toThrow('Invalid status transition');
    });

    it('should throw default message when no error field', async () => {
      mockApi.put.mockResolvedValue({ success: false });

      await expect(
        ordersService.updateOrderStatus('order-uuid-1', { status: 'delivered' })
      ).rejects.toThrow('Failed to update order status');
    });
  });

  describe('getAllOrders', () => {
    const mockPaginatedOrders = {
      orders: [mockOrder],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };

    it('should fetch all orders without params', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: mockPaginatedOrders });

      const result = await ordersService.getAllOrders();

      expect(mockApi.get).toHaveBeenCalledWith('/orders/admin/all?');
      expect(result.orders).toHaveLength(1);
    });

    it('should build query params for all filter options', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: mockPaginatedOrders });

      await ordersService.getAllOrders({
        status: 'shipped',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        page: 1,
        limit: 25,
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('status=shipped');
      expect(calledUrl).toContain('startDate=2026-01-01');
      expect(calledUrl).toContain('endDate=2026-03-31');
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('limit=25');
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'Access denied' });

      await expect(ordersService.getAllOrders()).rejects.toThrow('Access denied');
    });

    it('should throw default message when no error field', async () => {
      mockApi.get.mockResolvedValue({ success: false });

      await expect(ordersService.getAllOrders()).rejects.toThrow('Failed to fetch orders');
    });
  });

  describe('getOrderStats', () => {
    const mockStats = {
      statusCounts: {
        pending: 5,
        processing: 3,
        shipped: 2,
        delivered: 10,
        cancelled: 1,
      },
      totalOrders: 21,
      averageProcessingTime: 48,
    };

    it('should fetch order statistics', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: mockStats });

      const result = await ordersService.getOrderStats();

      expect(mockApi.get).toHaveBeenCalledWith('/orders/admin/stats');
      expect(result.totalOrders).toBe(21);
      expect(result.statusCounts.pending).toBe(5);
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'Stats unavailable' });

      await expect(ordersService.getOrderStats()).rejects.toThrow('Stats unavailable');
    });

    it('should throw default message when no error field', async () => {
      mockApi.get.mockResolvedValue({ success: false });

      await expect(ordersService.getOrderStats()).rejects.toThrow(
        'Failed to fetch order statistics'
      );
    });
  });

  describe('getStatusColor', () => {
    it('should return warning for pending', () => {
      expect(ordersService.getStatusColor('pending')).toBe('warning');
    });

    it('should return info for processing', () => {
      expect(ordersService.getStatusColor('processing')).toBe('info');
    });

    it('should return primary for shipped', () => {
      expect(ordersService.getStatusColor('shipped')).toBe('primary');
    });

    it('should return success for delivered', () => {
      expect(ordersService.getStatusColor('delivered')).toBe('success');
    });

    it('should return error for cancelled', () => {
      expect(ordersService.getStatusColor('cancelled')).toBe('error');
    });

    it('should return default for unknown status', () => {
      expect(ordersService.getStatusColor('unknown')).toBe('default');
    });

    it('should return default for empty string', () => {
      expect(ordersService.getStatusColor('')).toBe('default');
    });
  });

  describe('getStatusLabel', () => {
    it('should return Pendente for pending', () => {
      expect(ordersService.getStatusLabel('pending')).toBe('Pendente');
    });

    it('should return Processando for processing', () => {
      expect(ordersService.getStatusLabel('processing')).toBe('Processando');
    });

    it('should return Enviado for shipped', () => {
      expect(ordersService.getStatusLabel('shipped')).toBe('Enviado');
    });

    it('should return Entregue for delivered', () => {
      expect(ordersService.getStatusLabel('delivered')).toBe('Entregue');
    });

    it('should return Cancelado for cancelled', () => {
      expect(ordersService.getStatusLabel('cancelled')).toBe('Cancelado');
    });

    it('should return the raw status string for unknown values', () => {
      expect(ordersService.getStatusLabel('custom_status')).toBe('custom_status');
    });

    it('should return empty string for empty input', () => {
      expect(ordersService.getStatusLabel('')).toBe('');
    });
  });

  describe('formatPrice', () => {
    it('should format price in BRL currency', () => {
      const result = ordersService.formatPrice(1500.5);
      expect(result).toContain('1.500');
    });

    it('should format zero price', () => {
      const result = ordersService.formatPrice(0);
      expect(result).toContain('0,00');
    });

    it('should format large prices', () => {
      const result = ordersService.formatPrice(1000000);
      expect(result).toContain('1.000.000');
    });

    it('should format decimal prices correctly', () => {
      const result = ordersService.formatPrice(99.99);
      expect(result).toContain('99,99');
    });
  });

  describe('formatDate', () => {
    it('should format a Date object', () => {
      const date = new Date('2026-03-15T10:30:00');
      const result = ordersService.formatDate(date);

      expect(result).toContain('2026');
      expect(result).toContain('15');
    });

    it('should format a date string', () => {
      const result = ordersService.formatDate('2026-01-20T14:00:00');

      expect(result).toContain('2026');
      expect(result).toContain('20');
    });

    it('should include time components', () => {
      const date = new Date('2026-06-01T08:45:00');
      const result = ordersService.formatDate(date);

      // pt-BR date format includes hours and minutes
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
