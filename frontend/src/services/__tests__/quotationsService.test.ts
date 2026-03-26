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
import { quotationsService } from '../quotationsService';

const mockApi = vi.mocked(apiService);

const mockQuotation = {
  id: 1,
  companyId: 10,
  items: [
    {
      id: 1,
      quotationId: 1,
      productId: 5,
      product: {
        id: 5,
        name: 'Test Product',
        description: 'Description',
        price: 100,
        unitPrice: 100,
        imageUrl: 'https://example.com/img.jpg',
        category: 'Tools',
        supplierId: 2,
        tierPricing: [],
        specifications: {},
        minimumOrderQuantity: 1,
        leadTime: 7,
        availability: 'in_stock' as const,
      },
      quantity: 10,
    },
  ],
  status: 'pending' as const,
  adminNotes: null,
};

describe('QuotationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createQuotation', () => {
    it('should create quotation with items and return it', async () => {
      const requestData = { items: [{ productId: 5, quantity: 10 }] };
      mockApi.post.mockResolvedValue({ success: true, data: mockQuotation });

      const result = await quotationsService.createQuotation(requestData);

      expect(mockApi.post).toHaveBeenCalledWith('/quotations', requestData);
      expect(result).toEqual(mockQuotation);
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.post.mockResolvedValue({
        success: false,
        error: 'Minimum quantity not met',
      });

      await expect(
        quotationsService.createQuotation({ items: [{ productId: 1, quantity: 0 }] })
      ).rejects.toThrow('Minimum quantity not met');
    });

    it('should throw default message when no error field', async () => {
      mockApi.post.mockResolvedValue({ success: false });

      await expect(
        quotationsService.createQuotation({ items: [{ productId: 1, quantity: 1 }] })
      ).rejects.toThrow('Failed to create quotation');
    });
  });

  describe('getCustomerQuotations', () => {
    it('should fetch customer quotations', async () => {
      const quotations = [mockQuotation, { ...mockQuotation, id: 2, status: 'completed' as const }];
      mockApi.get.mockResolvedValue({ success: true, data: quotations });

      const result = await quotationsService.getCustomerQuotations();

      expect(mockApi.get).toHaveBeenCalledWith('/quotations');
      expect(result).toHaveLength(2);
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'Not authorized' });

      await expect(quotationsService.getCustomerQuotations()).rejects.toThrow('Not authorized');
    });

    it('should throw default message when no error field', async () => {
      mockApi.get.mockResolvedValue({ success: false });

      await expect(quotationsService.getCustomerQuotations()).rejects.toThrow(
        'Failed to fetch quotations'
      );
    });
  });

  describe('getQuotationById', () => {
    it('should fetch a single quotation by ID', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: mockQuotation });

      const result = await quotationsService.getQuotationById(1);

      expect(mockApi.get).toHaveBeenCalledWith('/quotations/1');
      expect(result).toEqual(mockQuotation);
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'Quotation not found' });

      await expect(quotationsService.getQuotationById(999)).rejects.toThrow('Quotation not found');
    });

    it('should throw default message when no error field', async () => {
      mockApi.get.mockResolvedValue({ success: false });

      await expect(quotationsService.getQuotationById(999)).rejects.toThrow(
        'Failed to fetch quotation'
      );
    });
  });

  describe('calculateQuote', () => {
    const mockCalculation = {
      calculations: {
        items: [
          {
            productId: 5,
            basePrice: 100,
            quantity: 10,
            tierDiscount: 5,
            unitPriceAfterDiscount: 95,
            subtotal: 950,
            shippingCost: 50,
            tax: 171,
            total: 1171,
            savings: 50,
            appliedTier: { minQuantity: 10, maxQuantity: 50, discount: 5 },
          },
        ],
        totalSubtotal: 950,
        totalShipping: 50,
        totalTax: 171,
        grandTotal: 1171,
        totalSavings: 50,
      },
      summary: {
        totalItems: 1,
        subtotal: 'R$ 950,00',
        shipping: 'R$ 50,00',
        tax: 'R$ 171,00',
        total: 'R$ 1.171,00',
        savings: 'R$ 50,00',
      },
    };

    it('should calculate quote with items only', async () => {
      mockApi.post.mockResolvedValue({ success: true, data: mockCalculation });

      const items = [{ productId: 5, quantity: 10 }];
      const result = await quotationsService.calculateQuote(items);

      expect(mockApi.post).toHaveBeenCalledWith('/quotations/calculate', { items });
      expect(result).toEqual(mockCalculation);
    });

    it('should calculate quote with options', async () => {
      mockApi.post.mockResolvedValue({ success: true, data: mockCalculation });

      const items = [{ productId: 5, quantity: 10 }];
      const options = {
        buyerLocation: '01001-000',
        supplierLocation: '04001-000',
        shippingMethod: 'express' as const,
      };

      const result = await quotationsService.calculateQuote(items, options);

      expect(mockApi.post).toHaveBeenCalledWith('/quotations/calculate', {
        items,
        buyerLocation: '01001-000',
        supplierLocation: '04001-000',
        shippingMethod: 'express',
      });
      expect(result).toEqual(mockCalculation);
    });

    it('should calculate quote with partial options', async () => {
      mockApi.post.mockResolvedValue({ success: true, data: mockCalculation });

      const items = [{ productId: 5, quantity: 10 }];
      await quotationsService.calculateQuote(items, { shippingMethod: 'economy' });

      expect(mockApi.post).toHaveBeenCalledWith('/quotations/calculate', {
        items,
        shippingMethod: 'economy',
      });
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.post.mockResolvedValue({ success: false, error: 'Product not available' });

      await expect(
        quotationsService.calculateQuote([{ productId: 999, quantity: 1 }])
      ).rejects.toThrow('Product not available');
    });

    it('should throw default message when no error field', async () => {
      mockApi.post.mockResolvedValue({ success: false });

      await expect(
        quotationsService.calculateQuote([{ productId: 1, quantity: 1 }])
      ).rejects.toThrow('Failed to calculate quote');
    });
  });

  describe('getAllQuotations', () => {
    it('should fetch all quotations for admin', async () => {
      const quotations = [mockQuotation];
      mockApi.get.mockResolvedValue({ success: true, data: quotations });

      const result = await quotationsService.getAllQuotations();

      expect(mockApi.get).toHaveBeenCalledWith('/quotations/admin/all');
      expect(result).toHaveLength(1);
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'Admin access required' });

      await expect(quotationsService.getAllQuotations()).rejects.toThrow('Admin access required');
    });

    it('should throw default message when no error field', async () => {
      mockApi.get.mockResolvedValue({ success: false });

      await expect(quotationsService.getAllQuotations()).rejects.toThrow(
        'Failed to fetch all quotations'
      );
    });
  });

  describe('updateQuotation', () => {
    it('should update quotation status', async () => {
      const updatedQuotation = { ...mockQuotation, status: 'processed' as const };
      mockApi.put.mockResolvedValue({ success: true, data: updatedQuotation });

      const result = await quotationsService.updateQuotation(1, { status: 'processed' });

      expect(mockApi.put).toHaveBeenCalledWith('/quotations/admin/1', { status: 'processed' });
      expect(result.status).toBe('processed');
    });

    it('should update quotation with admin notes', async () => {
      const updatedQuotation = {
        ...mockQuotation,
        status: 'completed' as const,
        adminNotes: 'Approved with discount',
      };
      mockApi.put.mockResolvedValue({ success: true, data: updatedQuotation });

      const result = await quotationsService.updateQuotation(1, {
        status: 'completed',
        adminNotes: 'Approved with discount',
      });

      expect(mockApi.put).toHaveBeenCalledWith('/quotations/admin/1', {
        status: 'completed',
        adminNotes: 'Approved with discount',
      });
      expect(result.adminNotes).toBe('Approved with discount');
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.put.mockResolvedValue({
        success: false,
        error: 'Quotation not found',
      });

      await expect(quotationsService.updateQuotation(999, { status: 'rejected' })).rejects.toThrow(
        'Quotation not found'
      );
    });

    it('should throw default message when no error field', async () => {
      mockApi.put.mockResolvedValue({ success: false });

      await expect(quotationsService.updateQuotation(999, { status: 'rejected' })).rejects.toThrow(
        'Failed to update quotation'
      );
    });
  });

  describe('compareSupplierQuotes', () => {
    const mockComparison = {
      quotes: [
        {
          supplier: {
            id: 1,
            companyName: 'Supplier A',
            corporateName: 'Supplier A Corp',
            averageRating: 4.5,
            totalRatings: 20,
            industrySector: 'Manufacturing',
          },
          quote: {
            productId: 5,
            basePrice: 100,
            quantity: 10,
            tierDiscount: 5,
            unitPriceAfterDiscount: 95,
            subtotal: 950,
            shippingCost: 30,
            tax: 171,
            total: 1151,
            savings: 50,
            appliedTier: null,
          },
        },
        {
          supplier: {
            id: 2,
            companyName: 'Supplier B',
            corporateName: 'Supplier B Corp',
            industrySector: 'Distribution',
          },
          quote: null,
          error: 'Product not available from this supplier',
        },
      ],
      productId: 5,
      quantity: 10,
      buyerLocation: '01001-000',
      shippingMethod: 'standard',
    };

    it('should compare supplier quotes', async () => {
      mockApi.post.mockResolvedValue({ success: true, data: mockComparison });

      const requestData = {
        productId: 5,
        quantity: 10,
        buyerLocation: '01001-000',
      };

      const result = await quotationsService.compareSupplierQuotes(requestData);

      expect(mockApi.post).toHaveBeenCalledWith('/quotations/compare-suppliers', requestData);
      expect(result.quotes).toHaveLength(2);
      expect(result.productId).toBe(5);
    });

    it('should compare with supplier IDs and shipping method', async () => {
      mockApi.post.mockResolvedValue({ success: true, data: mockComparison });

      const requestData = {
        productId: 5,
        quantity: 10,
        supplierIds: [1, 2, 3],
        shippingMethod: 'express' as const,
      };

      await quotationsService.compareSupplierQuotes(requestData);

      expect(mockApi.post).toHaveBeenCalledWith('/quotations/compare-suppliers', requestData);
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.post.mockResolvedValue({
        success: false,
        error: 'No suppliers found',
      });

      await expect(
        quotationsService.compareSupplierQuotes({ productId: 5, quantity: 10 })
      ).rejects.toThrow('No suppliers found');
    });

    it('should throw default message when no error field', async () => {
      mockApi.post.mockResolvedValue({ success: false });

      await expect(
        quotationsService.compareSupplierQuotes({ productId: 5, quantity: 10 })
      ).rejects.toThrow('Failed to compare supplier quotes');
    });
  });
});
