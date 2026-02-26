import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiService before importing services
vi.mock('../api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiService } from '../api';
import { productsService } from '../productsService';
import { ordersService } from '../ordersService';
import { quotationsService } from '../quotationsService';

const mockApi = vi.mocked(apiService);

describe('productsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllProducts', () => {
    it('should fetch products without params', async () => {
      const mockResponse = {
        success: true,
        data: {
          products: [{ id: 1, name: 'Product 1' }],
          pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
        },
      };
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await productsService.getAllProducts();

      expect(mockApi.get).toHaveBeenCalledWith('/products');
      expect(result.products).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should build query params from filters', async () => {
      const mockResponse = {
        success: true,
        data: {
          products: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };
      mockApi.get.mockResolvedValue(mockResponse);

      await productsService.getAllProducts({
        category: 'Electronics',
        search: 'pump',
        page: 2,
        limit: 5,
      });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('category=Electronics'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('search=pump'));
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'Server error' });

      await expect(productsService.getAllProducts()).rejects.toThrow('Server error');
    });
  });

  describe('getCategories', () => {
    it('should fetch categories list', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        data: ['Electronics', 'Machinery', 'Tools'],
      });

      const result = await productsService.getCategories();

      expect(mockApi.get).toHaveBeenCalledWith('/products/categories');
      expect(result).toEqual(['Electronics', 'Machinery', 'Tools']);
    });

    it('should throw on failed categories fetch', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'Failed to load categories' });

      await expect(productsService.getCategories()).rejects.toThrow('Failed to load categories');
    });
  });

  describe('deleteProduct', () => {
    it('should call delete endpoint', async () => {
      mockApi.delete.mockResolvedValue({ success: true, data: null });

      await productsService.deleteProduct(42);

      expect(mockApi.delete).toHaveBeenCalledWith('/products/42');
    });

    it('should throw on failed delete', async () => {
      mockApi.delete.mockResolvedValue({ success: false, error: 'Not found' });

      await expect(productsService.deleteProduct(99)).rejects.toThrow('Not found');
    });
  });

  describe('createProduct', () => {
    it('should post product data and return created product', async () => {
      const productData = {
        name: 'New Product',
        description: 'A description',
        price: 99.99,
        unitPrice: 99.99,
        imageUrl: 'https://example.com/image.jpg',
        category: 'Tools',
        supplierId: 1,
        minimumOrderQuantity: 10,
        leadTime: 7,
        availability: 'in_stock' as const,
        specifications: {},
        tierPricing: [],
      };
      const mockProduct = { id: 1, ...productData };
      mockApi.post.mockResolvedValue({ success: true, data: mockProduct });

      const result = await productsService.createProduct(productData);

      expect(mockApi.post).toHaveBeenCalledWith('/products', productData);
      expect(result).toEqual(mockProduct);
    });

    it('should throw on failed product creation', async () => {
      mockApi.post.mockResolvedValue({ success: false, error: 'Validation failed' });

      await expect(
        productsService.createProduct({
          name: '',
          description: '',
          price: 0,
          unitPrice: 0,
          imageUrl: '',
          category: '',
          supplierId: 0,
          minimumOrderQuantity: 1,
          leadTime: 0,
          availability: 'out_of_stock' as const,
          specifications: {},
          tierPricing: [],
        })
      ).rejects.toThrow('Validation failed');
    });
  });
});

describe('ordersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrderFromQuotation', () => {
    it('should create order and return it', async () => {
      const mockOrder = { id: 'order-uuid', status: 'pending', totalAmount: 1000 };
      mockApi.post.mockResolvedValue({ success: true, data: mockOrder });

      const result = await ordersService.createOrderFromQuotation({ quotationId: 5 });

      expect(mockApi.post).toHaveBeenCalledWith('/orders', { quotationId: 5 });
      expect(result).toEqual(mockOrder);
    });

    it('should throw on failed order creation', async () => {
      mockApi.post.mockResolvedValue({ success: false, error: 'Quotation already ordered' });

      await expect(ordersService.createOrderFromQuotation({ quotationId: 5 })).rejects.toThrow(
        'Quotation already ordered'
      );
    });
  });

  describe('getUserOrders', () => {
    it('should fetch user orders with pagination', async () => {
      const mockData = {
        orders: [{ id: 'uuid-1', status: 'pending' }],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      mockApi.get.mockResolvedValue({ success: true, data: mockData });

      const result = await ordersService.getUserOrders();

      expect(mockApi.get).toHaveBeenCalled();
      expect(result.orders).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should throw on failed orders fetch', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'Unauthorized' });

      await expect(ordersService.getUserOrders()).rejects.toThrow('Unauthorized');
    });
  });

  describe('updateOrderStatus', () => {
    it('should update and return updated order', async () => {
      const mockOrder = { id: 'uuid-1', status: 'processing' };
      mockApi.put.mockResolvedValue({ success: true, data: mockOrder });

      const result = await ordersService.updateOrderStatus('uuid-1', {
        status: 'processing',
      });

      expect(mockApi.put).toHaveBeenCalledWith('/orders/uuid-1/status', { status: 'processing' });
      expect(result).toEqual(mockOrder);
    });

    it('should throw on failed status update', async () => {
      mockApi.put.mockResolvedValue({ success: false, error: 'Invalid status transition' });

      await expect(
        ordersService.updateOrderStatus('uuid-1', { status: 'delivered' })
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('helper methods', () => {
    it('getStatusColor should return correct colors', () => {
      expect(ordersService.getStatusColor('pending')).toBe('warning');
      expect(ordersService.getStatusColor('processing')).toBe('info');
      expect(ordersService.getStatusColor('shipped')).toBe('primary');
      expect(ordersService.getStatusColor('delivered')).toBe('success');
      expect(ordersService.getStatusColor('cancelled')).toBe('error');
      expect(ordersService.getStatusColor('unknown')).toBe('default');
    });

    it('formatPrice should format BRL currency', () => {
      const formatted = ordersService.formatPrice(1500.5);
      expect(formatted).toContain('1.500');
    });
  });
});

describe('quotationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createQuotation', () => {
    it('should create quotation with items', async () => {
      const items = [{ productId: 1, quantity: 10 }];
      const mockQuotation = { id: 1, status: 'pending', items };
      mockApi.post.mockResolvedValue({ success: true, data: mockQuotation });

      const result = await quotationsService.createQuotation({ items });

      expect(mockApi.post).toHaveBeenCalledWith('/quotations', { items });
      expect(result).toEqual(mockQuotation);
    });

    it('should throw on failed quotation creation', async () => {
      mockApi.post.mockResolvedValue({ success: false, error: 'Minimum quantity not met' });

      await expect(
        quotationsService.createQuotation({ items: [{ productId: 1, quantity: 0 }] })
      ).rejects.toThrow('Minimum quantity not met');
    });
  });

  describe('getCustomerQuotations', () => {
    it('should fetch customer quotations', async () => {
      const mockQuotations = [
        { id: 1, status: 'pending' },
        { id: 2, status: 'completed' },
      ];
      mockApi.get.mockResolvedValue({ success: true, data: mockQuotations });

      const result = await quotationsService.getCustomerQuotations();

      expect(mockApi.get).toHaveBeenCalledWith('/quotations');
      expect(result).toHaveLength(2);
    });

    it('should throw on fetch failure', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'Not found' });

      await expect(quotationsService.getCustomerQuotations()).rejects.toThrow('Not found');
    });
  });

  describe('getAllQuotations', () => {
    it('should fetch all quotations for admin', async () => {
      const mockQuotations = [{ id: 1, status: 'pending' }];
      mockApi.get.mockResolvedValue({ success: true, data: mockQuotations });

      const result = await quotationsService.getAllQuotations();

      expect(mockApi.get).toHaveBeenCalledWith('/quotations/admin/all');
      expect(result).toHaveLength(1);
    });
  });
});
