import { QuoteService } from '../quoteService';
import Product from '../../models/Product';
import Quotation from '../../models/Quotation';
import QuotationItem from '../../models/QuotationItem';

// Mock the models
jest.mock('../../models/Product');
jest.mock('../../models/Quotation');
jest.mock('../../models/QuotationItem');
jest.mock('../../models/User', () => ({
  __esModule: true,
  default: { findAll: jest.fn(), findByPk: jest.fn() },
}));

const MockProduct = Product as jest.Mocked<typeof Product>;
const MockQuotation = Quotation as jest.Mocked<typeof Quotation>;
const MockQuotationItem = QuotationItem as jest.Mocked<typeof QuotationItem>;

describe('QuoteService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPricingTier', () => {
    it('should return first tier for quantity 1', () => {
      const tier = QuoteService.getPricingTier(1);
      expect(tier).toEqual({ minQuantity: 1, maxQuantity: 10, discount: 0 });
    });

    it('should return second tier for quantity 11', () => {
      const tier = QuoteService.getPricingTier(11);
      expect(tier).toEqual({ minQuantity: 11, maxQuantity: 50, discount: 0.05 });
    });

    it('should return third tier for quantity 51', () => {
      const tier = QuoteService.getPricingTier(51);
      expect(tier).toEqual({ minQuantity: 51, maxQuantity: 100, discount: 0.1 });
    });

    it('should return fourth tier for quantity 101', () => {
      const tier = QuoteService.getPricingTier(101);
      expect(tier).toEqual({ minQuantity: 101, maxQuantity: 500, discount: 0.15 });
    });

    it('should return fifth tier for quantity 501', () => {
      const tier = QuoteService.getPricingTier(501);
      expect(tier).toEqual({ minQuantity: 501, maxQuantity: null, discount: 0.2 });
    });

    it('should return highest tier for very large quantity', () => {
      const tier = QuoteService.getPricingTier(1000);
      expect(tier).toEqual({ minQuantity: 501, maxQuantity: null, discount: 0.2 });
    });

    it('should handle boundary cases correctly', () => {
      // Test exact boundary between tiers
      const tier10 = QuoteService.getPricingTier(10);
      expect(tier10).toEqual({ minQuantity: 1, maxQuantity: 10, discount: 0 });

      const tier50 = QuoteService.getPricingTier(50);
      expect(tier50).toEqual({ minQuantity: 11, maxQuantity: 50, discount: 0.05 });

      const tier100 = QuoteService.getPricingTier(100);
      expect(tier100).toEqual({ minQuantity: 51, maxQuantity: 100, discount: 0.1 });

      const tier500 = QuoteService.getPricingTier(500);
      expect(tier500).toEqual({ minQuantity: 101, maxQuantity: 500, discount: 0.15 });
    });

    it('should return null for quantity below minimum', () => {
      const tier = QuoteService.getPricingTier(0);
      expect(tier).toBeNull();
    });

    it('should work with custom tiers', () => {
      const customTiers = [
        { minQuantity: 1, maxQuantity: 5, discount: 0 },
        { minQuantity: 6, maxQuantity: null, discount: 0.25 },
      ];

      const tier1 = QuoteService.getPricingTier(3, customTiers);
      expect(tier1).toEqual({ minQuantity: 1, maxQuantity: 5, discount: 0 });

      const tier2 = QuoteService.getPricingTier(10, customTiers);
      expect(tier2).toEqual({ minQuantity: 6, maxQuantity: null, discount: 0.25 });
    });
  });

  describe('calculateShippingCost', () => {
    it('should calculate standard shipping cost correctly', () => {
      const cost = QuoteService.calculateShippingCost(10, 'standard', 100);
      // baseRate: 50, perKgRate: 2.5, estimatedWeight: 10 * 0.5 = 5, distanceMultiplier: 1
      // (50 + 5 * 2.5) * 1 = 62.5
      expect(cost).toBe(62.5);
    });

    it('should calculate express shipping cost correctly', () => {
      const cost = QuoteService.calculateShippingCost(10, 'express', 100);
      // baseRate: 100, perKgRate: 5.0, estimatedWeight: 10 * 0.5 = 5, distanceMultiplier: 1
      // (100 + 5 * 5.0) * 1 = 125
      expect(cost).toBe(125);
    });

    it('should calculate economy shipping cost correctly', () => {
      const cost = QuoteService.calculateShippingCost(10, 'economy', 100);
      // baseRate: 25, perKgRate: 1.5, estimatedWeight: 10 * 0.5 = 5, distanceMultiplier: 1
      // (25 + 5 * 1.5) * 1 = 32.5
      expect(cost).toBe(32.5);
    });

    it('should apply distance multiplier correctly', () => {
      const cost = QuoteService.calculateShippingCost(10, 'standard', 200);
      // baseRate: 50, perKgRate: 2.5, estimatedWeight: 10 * 0.5 = 5, distanceMultiplier: 2
      // (50 + 5 * 2.5) * 2 = 125
      expect(cost).toBe(125);
    });

    it('should use minimum distance multiplier of 1', () => {
      const cost = QuoteService.calculateShippingCost(10, 'standard', 50);
      // Distance less than 100 should use multiplier of 1
      const costWithZeroDistance = QuoteService.calculateShippingCost(10, 'standard', 0);
      expect(cost).toBe(costWithZeroDistance);
    });

    it('should default to standard shipping when no method specified', () => {
      const cost = QuoteService.calculateShippingCost(10);
      const standardCost = QuoteService.calculateShippingCost(10, 'standard');
      expect(cost).toBe(standardCost);
    });

    it('should default to distance 100 when no distance specified', () => {
      const cost = QuoteService.calculateShippingCost(10, 'standard');
      const costWith100Distance = QuoteService.calculateShippingCost(10, 'standard', 100);
      expect(cost).toBe(costWith100Distance);
    });
  });

  describe('calculateDistanceBetweenCities', () => {
    it('should return correct distance between known cities', () => {
      const distance = QuoteService.calculateDistanceBetweenCities('Curitiba', 'Londrina');
      expect(distance).toBe(380);
    });

    it('should return correct distance for reverse order', () => {
      const distance = QuoteService.calculateDistanceBetweenCities('Londrina', 'Curitiba');
      expect(distance).toBe(380);
    });

    it('should return default distance for unknown cities', () => {
      const distance = QuoteService.calculateDistanceBetweenCities('Unknown City', 'Another City');
      expect(distance).toBe(100);
    });

    it('should return default distance when cities are not provided', () => {
      const distance1 = QuoteService.calculateDistanceBetweenCities();
      const distance2 = QuoteService.calculateDistanceBetweenCities('Curitiba');
      const distance3 = QuoteService.calculateDistanceBetweenCities(undefined, 'Londrina');

      expect(distance1).toBe(100);
      expect(distance2).toBe(100);
      expect(distance3).toBe(100);
    });

    it('should handle all city pairs correctly', () => {
      const testCases = [
        { from: 'Curitiba', to: 'Maringá', expected: 430 },
        { from: 'Maringá', to: 'Cascavel', expected: 280 },
        { from: 'Cascavel', to: 'Foz do Iguaçu', expected: 140 },
        { from: 'Londrina', to: 'Foz do Iguaçu', expected: 490 },
      ];

      testCases.forEach(({ from, to, expected }) => {
        const distance = QuoteService.calculateDistanceBetweenCities(from, to);
        expect(distance).toBe(expected);
      });
    });
  });

  describe('calculateQuoteForItem', () => {
    it('should calculate quote correctly for first tier', async () => {
      const mockProduct = createMockProduct({ id: 1, price: 100 });
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const input = {
        productId: 1,
        quantity: 5,
        buyerLocation: 'Curitiba',
        supplierLocation: 'Londrina',
        shippingMethod: 'standard' as const,
      };

      const result = await QuoteService.calculateQuoteForItem(input);

      expect(result.productId).toBe(1);
      expect(result.basePrice).toBe(100);
      expect(result.quantity).toBe(5);
      expect(result.tierDiscount).toBe(0);
      expect(result.unitPriceAfterDiscount).toBe(100);
      expect(result.subtotal).toBe(500);
      expect(result.tax).toBe(90); // 18% of 500
      expect(result.savings).toBe(0);
      expect(result.appliedTier).toEqual({ minQuantity: 1, maxQuantity: 10, discount: 0 });
    });

    it('should calculate quote correctly for second tier', async () => {
      const mockProduct = createMockProduct({ id: 1, price: 100 });
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const input = {
        productId: 1,
        quantity: 25,
        buyerLocation: 'Curitiba',
        supplierLocation: 'Londrina',
        shippingMethod: 'standard' as const,
      };

      const result = await QuoteService.calculateQuoteForItem(input);

      expect(result.tierDiscount).toBe(0.05);
      expect(result.unitPriceAfterDiscount).toBe(95);
      expect(result.subtotal).toBe(2375);
      expect(result.tax).toBe(427.5); // 18% of 2375
      expect(result.savings).toBe(125); // (100 * 25) - 2375
      expect(result.appliedTier).toEqual({ minQuantity: 11, maxQuantity: 50, discount: 0.05 });
    });

    it('should calculate quote correctly for highest tier', async () => {
      const mockProduct = createMockProduct({ id: 1, price: 100 });
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const input = {
        productId: 1,
        quantity: 1000,
        buyerLocation: 'Curitiba',
        supplierLocation: 'Londrina',
        shippingMethod: 'standard' as const,
      };

      const result = await QuoteService.calculateQuoteForItem(input);

      expect(result.tierDiscount).toBe(0.2);
      expect(result.unitPriceAfterDiscount).toBe(80);
      expect(result.subtotal).toBe(80000);
      expect(result.tax).toBe(14400); // 18% of 80000
      expect(result.savings).toBe(20000); // (100 * 1000) - 80000
      expect(result.appliedTier).toEqual({ minQuantity: 501, maxQuantity: null, discount: 0.2 });
    });

    it('should throw error when product not found', async () => {
      MockProduct.findByPk.mockResolvedValue(null);

      const input = {
        productId: 999,
        quantity: 10,
        buyerLocation: 'Curitiba',
        supplierLocation: 'Londrina',
        shippingMethod: 'standard' as const,
      };

      await expect(QuoteService.calculateQuoteForItem(input)).rejects.toThrow('Product not found');
    });

    it('should calculate shipping cost correctly based on locations', async () => {
      const mockProduct = createMockProduct({ id: 1, price: 100 });
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const input = {
        productId: 1,
        quantity: 10,
        buyerLocation: 'Curitiba',
        supplierLocation: 'Foz do Iguaçu', // Distance: 640km
        shippingMethod: 'standard' as const,
      };

      const result = await QuoteService.calculateQuoteForItem(input);

      // Expected shipping: (50 + 10 * 0.5 * 2.5) * (640/100) = (50 + 12.5) * 6.4 = 400
      expect(result.shippingCost).toBe(400);
    });

    it('should handle express shipping correctly', async () => {
      const mockProduct = createMockProduct({ id: 1, price: 100 });
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const input = {
        productId: 1,
        quantity: 10,
        buyerLocation: 'Curitiba',
        supplierLocation: 'Londrina',
        shippingMethod: 'express' as const,
      };

      const result = await QuoteService.calculateQuoteForItem(input);

      // Expected shipping: (100 + 10 * 0.5 * 5.0) * (380/100) = (100 + 25) * 3.8 = 475
      expect(result.shippingCost).toBe(475);
    });
  });

  describe('calculateQuoteComparison', () => {
    it('should calculate comparison for multiple items', async () => {
      const mockProduct1 = createMockProduct({ id: 1, price: 100 });
      const mockProduct2 = createMockProduct({ id: 2, price: 200 });

      MockProduct.findByPk
        .mockResolvedValueOnce(mockProduct1 as any)
        .mockResolvedValueOnce(mockProduct2 as any);

      const items = [
        { productId: 1, quantity: 10 },
        { productId: 2, quantity: 5 },
      ];

      const result = await QuoteService.calculateQuoteComparison(items, {
        buyerLocation: 'Curitiba',
        supplierLocation: 'Londrina',
        shippingMethod: 'standard',
      });

      expect(result.items).toHaveLength(2);
      expect(result.totalSubtotal).toBe(2000); // 1000 + 1000
      expect(result.totalTax).toBe(360); // 18% of 2000
      expect(result.totalSavings).toBe(0); // No discounts for these quantities
    });

    it('should handle options correctly', async () => {
      const mockProduct = createMockProduct({ id: 1, price: 100 });
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const items = [{ productId: 1, quantity: 10 }];

      const result = await QuoteService.calculateQuoteComparison(items, {
        buyerLocation: 'Curitiba',
        supplierLocation: 'Foz do Iguaçu',
        shippingMethod: 'express',
      });

      expect(result.items[0].shippingCost).toBeGreaterThan(0);
      // Should use express shipping and correct distance
    });

    it('should work with empty options', async () => {
      const mockProduct = createMockProduct({ id: 1, price: 100 });
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const items = [{ productId: 1, quantity: 10 }];

      const result = await QuoteService.calculateQuoteComparison(items);

      expect(result.items).toHaveLength(1);
      expect(result.totalSubtotal).toBe(1000);
    });
  });

  describe('updateQuotationWithCalculations', () => {
    it('should update quotation with calculations', async () => {
      const mockQuotation = {
        id: 1,
        update: jest.fn().mockResolvedValue(true),
      };

      MockQuotation.findByPk.mockResolvedValue(mockQuotation as any);

      const calculations = {
        items: [],
        totalSubtotal: 1000,
        totalShipping: 100,
        totalTax: 180,
        grandTotal: 1280,
        totalSavings: 200,
      };

      await QuoteService.updateQuotationWithCalculations(1, calculations);

      expect(mockQuotation.update).toHaveBeenCalledWith({
        status: 'processed',
        adminNotes: 'Quote calculated - Total: R$ 1280.00, Savings: R$ 200.00',
      });
    });

    it('should throw error when quotation not found', async () => {
      MockQuotation.findByPk.mockResolvedValue(null);

      const calculations = {
        items: [],
        totalSubtotal: 1000,
        totalShipping: 100,
        totalTax: 180,
        grandTotal: 1280,
        totalSavings: 200,
      };

      await expect(QuoteService.updateQuotationWithCalculations(999, calculations)).rejects.toThrow(
        'Quotation not found'
      );
    });
  });

  describe('formatQuoteResponse', () => {
    it('should format quote response correctly', () => {
      const calculations = {
        items: [
          {
            productId: 1,
            basePrice: 100,
            quantity: 10,
            tierDiscount: 0.05,
            unitPriceAfterDiscount: 95,
            subtotal: 950,
            shippingCost: 62.5,
            tax: 171,
            total: 1183.5,
            savings: 50,
            appliedTier: { minQuantity: 11, maxQuantity: 50, discount: 0.05 },
          },
        ],
        totalSubtotal: 950,
        totalShipping: 62.5,
        totalTax: 171,
        grandTotal: 1183.5,
        totalSavings: 50,
      };

      const result = QuoteService.formatQuoteResponse(calculations);

      expect(result.summary).toEqual({
        totalItems: 1,
        subtotal: 'R$ 950.00',
        shipping: 'R$ 62.50',
        tax: 'R$ 171.00',
        total: 'R$ 1183.50',
        savings: 'R$ 50.00',
      });

      expect(result.items[0]).toEqual({
        productId: 1,
        quantity: 10,
        unitPrice: 'R$ 95.00',
        discount: '5.0%',
        subtotal: 'R$ 950.00',
        appliedTier: '11-50 units',
      });
    });

    it('should handle unlimited tier correctly', () => {
      const calculations = {
        items: [
          {
            productId: 1,
            basePrice: 100,
            quantity: 1000,
            tierDiscount: 0.2,
            unitPriceAfterDiscount: 80,
            subtotal: 80000,
            shippingCost: 1000,
            tax: 14400,
            total: 95400,
            savings: 20000,
            appliedTier: { minQuantity: 501, maxQuantity: null, discount: 0.2 },
          },
        ],
        totalSubtotal: 80000,
        totalShipping: 1000,
        totalTax: 14400,
        grandTotal: 95400,
        totalSavings: 20000,
      };

      const result = QuoteService.formatQuoteResponse(calculations);

      expect(result.items[0].appliedTier).toBe('501+ units');
    });

    it('should handle no tier applied', () => {
      const calculations = {
        items: [
          {
            productId: 1,
            basePrice: 100,
            quantity: 10,
            tierDiscount: 0,
            unitPriceAfterDiscount: 100,
            subtotal: 1000,
            shippingCost: 62.5,
            tax: 180,
            total: 1242.5,
            savings: 0,
            appliedTier: null,
          },
        ],
        totalSubtotal: 1000,
        totalShipping: 62.5,
        totalTax: 180,
        grandTotal: 1242.5,
        totalSavings: 0,
      };

      const result = QuoteService.formatQuoteResponse(calculations);

      expect(result.items[0].appliedTier).toBe('No tier applied');
    });

    it('should format multiple items correctly', () => {
      const calculations = {
        items: [
          {
            productId: 1,
            basePrice: 50,
            quantity: 5,
            tierDiscount: 0,
            unitPriceAfterDiscount: 50,
            subtotal: 250,
            shippingCost: 30,
            tax: 45,
            total: 325,
            savings: 0,
            appliedTier: { minQuantity: 1, maxQuantity: 10, discount: 0 },
          },
          {
            productId: 2,
            basePrice: 200,
            quantity: 100,
            tierDiscount: 0.1,
            unitPriceAfterDiscount: 180,
            subtotal: 18000,
            shippingCost: 500,
            tax: 3240,
            total: 21740,
            savings: 2000,
            appliedTier: { minQuantity: 51, maxQuantity: 100, discount: 0.1 },
          },
        ],
        totalSubtotal: 18250,
        totalShipping: 530,
        totalTax: 3285,
        grandTotal: 22065,
        totalSavings: 2000,
      };

      const result = QuoteService.formatQuoteResponse(calculations);

      expect(result.summary.totalItems).toBe(2);
      expect(result.summary.subtotal).toBe('R$ 18250.00');
      expect(result.summary.total).toBe('R$ 22065.00');
      expect(result.items).toHaveLength(2);
      expect(result.items[1].discount).toBe('10.0%');
      expect(result.items[1].appliedTier).toBe('51-100 units');
    });
  });

  describe('calculateQuoteForItem - minimum order quantity', () => {
    it('should throw error when quantity is below minimum order quantity', async () => {
      const mockProduct = {
        ...createMockProduct({ id: 1, price: 100 }),
        unitPrice: 100,
        minimumOrderQuantity: 10,
        tierPricing: null,
      };
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const input = {
        productId: 1,
        quantity: 5,
        shippingMethod: 'standard' as const,
      };

      await expect(QuoteService.calculateQuoteForItem(input)).rejects.toThrow(
        'Minimum order quantity is 10 units'
      );
    });

    it('should accept quantity equal to minimum order quantity', async () => {
      const mockProduct = {
        ...createMockProduct({ id: 1, price: 100 }),
        unitPrice: 100,
        minimumOrderQuantity: 10,
        tierPricing: null,
      };
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const input = {
        productId: 1,
        quantity: 10,
        shippingMethod: 'standard' as const,
      };

      const result = await QuoteService.calculateQuoteForItem(input);
      expect(result.quantity).toBe(10);
    });

    it('should use unitPrice when available instead of price', async () => {
      const mockProduct = {
        ...createMockProduct({ id: 1, price: 200 }),
        unitPrice: 150,
        minimumOrderQuantity: 1,
        tierPricing: null,
      };
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const input = {
        productId: 1,
        quantity: 5,
        shippingMethod: 'standard' as const,
      };

      const result = await QuoteService.calculateQuoteForItem(input);
      expect(result.basePrice).toBe(150);
    });

    it('should fall back to price when unitPrice is not set', async () => {
      const mockProduct = {
        ...createMockProduct({ id: 1, price: 200 }),
        unitPrice: 0,
        minimumOrderQuantity: 1,
        tierPricing: null,
      };
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const input = {
        productId: 1,
        quantity: 5,
        shippingMethod: 'standard' as const,
      };

      const result = await QuoteService.calculateQuoteForItem(input);
      expect(result.basePrice).toBe(200);
    });

    it('should use custom tier pricing from product when available', async () => {
      const customTiers = [
        { minQuantity: 1, maxQuantity: 20, discount: 0.1 },
        { minQuantity: 21, maxQuantity: null, discount: 0.3 },
      ];
      const mockProduct = {
        ...createMockProduct({ id: 1, price: 100 }),
        unitPrice: 100,
        minimumOrderQuantity: 1,
        tierPricing: customTiers,
      };
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const input = {
        productId: 1,
        quantity: 5,
        shippingMethod: 'standard' as const,
      };

      const result = await QuoteService.calculateQuoteForItem(input);
      expect(result.tierDiscount).toBe(0.1);
      expect(result.appliedTier).toEqual(customTiers[0]);
    });

    it('should handle product with no minimumOrderQuantity', async () => {
      const mockProduct = {
        ...createMockProduct({ id: 1, price: 100 }),
        unitPrice: 100,
        minimumOrderQuantity: 0,
        tierPricing: null,
      };
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const input = {
        productId: 1,
        quantity: 1,
        shippingMethod: 'standard' as const,
      };

      const result = await QuoteService.calculateQuoteForItem(input);
      expect(result.quantity).toBe(1);
    });
  });

  describe('getQuotationWithCalculations', () => {
    it('should retrieve quotation and calculate quotes for all items', async () => {
      const mockItems = [
        { productId: 1, quantity: 10, product: createMockProduct({ id: 1, price: 100 }) },
        { productId: 2, quantity: 5, product: createMockProduct({ id: 2, price: 200 }) },
      ];

      const mockQuotation = {
        id: 1,
        companyId: 1,
        status: 'pending',
        items: mockItems,
      };

      MockQuotation.findByPk.mockResolvedValue(mockQuotation as any);

      // Mock Product.findByPk for each item calculation
      const mockProduct1 = {
        ...createMockProduct({ id: 1, price: 100 }),
        unitPrice: 100,
        minimumOrderQuantity: 1,
        tierPricing: null,
      };
      const mockProduct2 = {
        ...createMockProduct({ id: 2, price: 200 }),
        unitPrice: 200,
        minimumOrderQuantity: 1,
        tierPricing: null,
      };

      MockProduct.findByPk
        .mockResolvedValueOnce(mockProduct1 as any)
        .mockResolvedValueOnce(mockProduct2 as any);

      const result = await QuoteService.getQuotationWithCalculations(1);

      expect(result.quotation).toBe(mockQuotation);
      expect(result.calculations.items).toHaveLength(2);
      expect(result.calculations.totalSubtotal).toBeGreaterThan(0);
      expect(result.calculations.totalShipping).toBeGreaterThan(0);
      expect(result.calculations.totalTax).toBeGreaterThan(0);
      expect(result.calculations.grandTotal).toBeGreaterThan(0);
      expect(MockQuotation.findByPk).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          include: expect.any(Array),
        })
      );
    });

    it('should throw error when quotation is not found', async () => {
      MockQuotation.findByPk.mockResolvedValue(null);

      await expect(QuoteService.getQuotationWithCalculations(999)).rejects.toThrow(
        'Quotation not found'
      );
    });

    it('should handle quotation with no items', async () => {
      const mockQuotation = {
        id: 1,
        companyId: 1,
        status: 'pending',
        items: [],
      };

      MockQuotation.findByPk.mockResolvedValue(mockQuotation as any);

      const result = await QuoteService.getQuotationWithCalculations(1);

      expect(result.quotation).toBe(mockQuotation);
      expect(result.calculations.items).toHaveLength(0);
      expect(result.calculations.totalSubtotal).toBe(0);
      expect(result.calculations.grandTotal).toBe(0);
    });

    it('should handle quotation with undefined items', async () => {
      const mockQuotation = {
        id: 1,
        companyId: 1,
        status: 'pending',
        // items not present
      };

      MockQuotation.findByPk.mockResolvedValue(mockQuotation as any);

      const result = await QuoteService.getQuotationWithCalculations(1);

      expect(result.calculations.items).toHaveLength(0);
      expect(result.calculations.grandTotal).toBe(0);
    });
  });

  describe('getMultipleSupplierQuotes', () => {
    const setupUserMock = async (mockSuppliers: any[]) => {
      const UserModule = await import('../../models/User');
      (UserModule.default.findAll as jest.Mock).mockResolvedValue(mockSuppliers);
    };

    it('should get quotes from specified supplier IDs', async () => {
      const mockSuppliers = [
        {
          id: 10,
          companyName: 'Supplier A',
          corporateName: 'Supplier A LTDA',
          averageRating: 4.5,
          totalRatings: 20,
          industrySector: 'electronics',
          address: 'Curitiba',
          role: 'supplier',
          status: 'approved',
        },
      ];

      await setupUserMock(mockSuppliers);

      const mockProduct = {
        ...createMockProduct({ id: 1, price: 100 }),
        unitPrice: 100,
        minimumOrderQuantity: 1,
        tierPricing: null,
      };
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const result = await QuoteService.getMultipleSupplierQuotes(
        1,
        10,
        'Londrina',
        [10],
        'standard'
      );

      expect(result).toHaveLength(1);
      expect(result[0].supplier.id).toBe(10);
      expect(result[0].supplier.companyName).toBe('Supplier A');
      expect(result[0].quote).not.toBeNull();
      expect(result[0].quote!.productId).toBe(1);
      expect(result[0].error).toBeUndefined();
    });

    it('should find suppliers by product supplierId when no IDs provided', async () => {
      const mockProduct = {
        ...createMockProduct({ id: 1, price: 100, supplierId: 5 }),
        unitPrice: 100,
        minimumOrderQuantity: 1,
        tierPricing: null,
      };

      // First call for getMultipleSupplierQuotes to find the product
      MockProduct.findByPk.mockResolvedValueOnce(mockProduct as any);
      // Second call for calculateQuoteForItem
      MockProduct.findByPk.mockResolvedValueOnce(mockProduct as any);

      const mockSuppliers = [
        {
          id: 5,
          companyName: 'Product Supplier',
          corporateName: 'Product Supplier LTDA',
          averageRating: 4.0,
          totalRatings: 10,
          industrySector: 'machinery',
          address: 'Maringá',
          role: 'supplier',
          status: 'approved',
        },
      ];

      await setupUserMock(mockSuppliers);

      const result = await QuoteService.getMultipleSupplierQuotes(1, 10, 'Curitiba');

      expect(result).toHaveLength(1);
      expect(result[0].supplier.id).toBe(5);
      expect(result[0].quote).not.toBeNull();
    });

    it('should throw error when product not found and no supplier IDs provided', async () => {
      MockProduct.findByPk.mockResolvedValue(null);

      await expect(QuoteService.getMultipleSupplierQuotes(999, 10, 'Curitiba')).rejects.toThrow(
        'Product not found'
      );
    });

    it('should find all approved suppliers when product has no supplierId', async () => {
      const mockProduct = {
        ...createMockProduct({ id: 1, price: 100 }),
        supplierId: 0, // falsy supplierId
        unitPrice: 100,
        minimumOrderQuantity: 1,
        tierPricing: null,
      };

      MockProduct.findByPk
        .mockResolvedValueOnce(mockProduct as any) // for getMultipleSupplierQuotes
        .mockResolvedValue(mockProduct as any); // for calculateQuoteForItem calls

      const mockSuppliers = [
        {
          id: 1,
          companyName: 'Supplier 1',
          corporateName: 'Supplier 1 LTDA',
          averageRating: 3.5,
          totalRatings: 5,
          industrySector: 'raw_materials',
          address: 'Cascavel',
          role: 'supplier',
          status: 'approved',
        },
        {
          id: 2,
          companyName: 'Supplier 2',
          corporateName: 'Supplier 2 LTDA',
          averageRating: 4.8,
          totalRatings: 50,
          industrySector: 'chemicals',
          address: 'Londrina',
          role: 'supplier',
          status: 'approved',
        },
      ];

      await setupUserMock(mockSuppliers);

      const result = await QuoteService.getMultipleSupplierQuotes(1, 10, 'Curitiba');

      expect(result).toHaveLength(2);
    });

    it('should handle calculation errors for individual suppliers gracefully', async () => {
      const mockSuppliers = [
        {
          id: 10,
          companyName: 'Good Supplier',
          corporateName: 'Good Supplier LTDA',
          averageRating: 4.5,
          totalRatings: 20,
          industrySector: 'electronics',
          address: 'Curitiba',
        },
        {
          id: 11,
          companyName: 'Bad Supplier',
          corporateName: 'Bad Supplier LTDA',
          address: 'Londrina',
        },
      ];

      await setupUserMock(mockSuppliers);

      const mockProduct = {
        ...createMockProduct({ id: 1, price: 100 }),
        unitPrice: 100,
        minimumOrderQuantity: 1,
        tierPricing: null,
      };

      // First call succeeds, second call fails
      MockProduct.findByPk.mockResolvedValueOnce(mockProduct as any).mockResolvedValueOnce(null); // This will cause "Product not found" error

      const result = await QuoteService.getMultipleSupplierQuotes(
        1,
        10,
        'Curitiba',
        [10, 11],
        'standard'
      );

      expect(result).toHaveLength(2);
      // Successful quote should come first (sorted by price)
      const successEntry = result.find(r => r.quote !== null);
      const errorEntry = result.find(r => r.quote === null);
      expect(successEntry).toBeDefined();
      expect(errorEntry).toBeDefined();
      expect(errorEntry!.error).toBe('Product not found');
    });

    it('should sort results by total price (best deals first)', async () => {
      const mockSuppliers = [
        {
          id: 10,
          companyName: 'Expensive Supplier',
          corporateName: 'Expensive LTDA',
          averageRating: 4.0,
          totalRatings: 10,
          industrySector: 'electronics',
          address: 'Foz do Iguaçu', // farther = more expensive shipping
        },
        {
          id: 11,
          companyName: 'Cheap Supplier',
          corporateName: 'Cheap LTDA',
          averageRating: 4.5,
          totalRatings: 20,
          industrySector: 'electronics',
          address: 'Curitiba', // same city = cheaper shipping
        },
      ];

      await setupUserMock(mockSuppliers);

      const mockProduct = {
        ...createMockProduct({ id: 1, price: 100 }),
        unitPrice: 100,
        minimumOrderQuantity: 1,
        tierPricing: null,
      };
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const result = await QuoteService.getMultipleSupplierQuotes(
        1,
        10,
        'Curitiba',
        [10, 11],
        'standard'
      );

      expect(result).toHaveLength(2);
      // Both should have quotes
      expect(result[0].quote).not.toBeNull();
      expect(result[1].quote).not.toBeNull();
      // First result should have lower or equal total
      expect(result[0].quote!.total).toBeLessThanOrEqual(result[1].quote!.total);
    });

    it('should sort null quotes to the end', async () => {
      const mockSuppliers = [
        {
          id: 10,
          companyName: 'Failed Supplier',
          corporateName: 'Failed LTDA',
          address: 'Curitiba',
        },
        {
          id: 11,
          companyName: 'Good Supplier',
          corporateName: 'Good LTDA',
          averageRating: 4.0,
          totalRatings: 5,
          industrySector: 'machinery',
          address: 'Londrina',
        },
      ];

      await setupUserMock(mockSuppliers);

      const mockProduct = {
        ...createMockProduct({ id: 1, price: 100 }),
        unitPrice: 100,
        minimumOrderQuantity: 1,
        tierPricing: null,
      };

      // First supplier fails, second succeeds
      MockProduct.findByPk.mockResolvedValueOnce(null).mockResolvedValueOnce(mockProduct as any);

      const result = await QuoteService.getMultipleSupplierQuotes(
        1,
        10,
        'Curitiba',
        [10, 11],
        'standard'
      );

      // Successful quote should be first, failed should be last
      expect(result[0].quote).not.toBeNull();
      expect(result[1].quote).toBeNull();
    });

    it('should handle non-Error thrown during quote calculation', async () => {
      const mockSuppliers = [
        {
          id: 10,
          companyName: 'Failing Supplier',
          corporateName: 'Failing LTDA',
          address: 'Curitiba',
        },
      ];

      await setupUserMock(mockSuppliers);

      MockProduct.findByPk.mockRejectedValueOnce('string error');

      const result = await QuoteService.getMultipleSupplierQuotes(
        1,
        10,
        'Curitiba',
        [10],
        'standard'
      );

      expect(result).toHaveLength(1);
      expect(result[0].quote).toBeNull();
      expect(result[0].error).toBe('Failed to calculate quote');
    });
  });

  describe('validateMinimumOrderQuantity', () => {
    it('should return valid when quantity meets minimum', async () => {
      const mockProduct = {
        ...createMockProduct({ id: 1, price: 100 }),
        minimumOrderQuantity: 10,
      };
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const result = await QuoteService.validateMinimumOrderQuantity(1, 10);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Order quantity meets requirements');
      expect(result.minimumRequired).toBeUndefined();
    });

    it('should return valid when quantity exceeds minimum', async () => {
      const mockProduct = {
        ...createMockProduct({ id: 1, price: 100 }),
        minimumOrderQuantity: 5,
      };
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const result = await QuoteService.validateMinimumOrderQuantity(1, 20);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Order quantity meets requirements');
    });

    it('should return invalid when quantity is below minimum', async () => {
      const mockProduct = {
        ...createMockProduct({ id: 1, price: 100 }),
        minimumOrderQuantity: 50,
      };
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const result = await QuoteService.validateMinimumOrderQuantity(1, 10);

      expect(result.valid).toBe(false);
      expect(result.minimumRequired).toBe(50);
      expect(result.message).toBe('Minimum order quantity is 50 units. Requested: 10 units.');
    });

    it('should throw error when product not found', async () => {
      MockProduct.findByPk.mockResolvedValue(null);

      await expect(QuoteService.validateMinimumOrderQuantity(999, 10)).rejects.toThrow(
        'Product not found'
      );
    });

    it('should return valid when product has no minimumOrderQuantity set', async () => {
      const mockProduct = {
        ...createMockProduct({ id: 1, price: 100 }),
        minimumOrderQuantity: 0,
      };
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const result = await QuoteService.validateMinimumOrderQuantity(1, 1);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Order quantity meets requirements');
    });

    it('should return invalid when requesting quantity of 1 with high minimum', async () => {
      const mockProduct = {
        ...createMockProduct({ id: 1, price: 100 }),
        minimumOrderQuantity: 100,
      };
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const result = await QuoteService.validateMinimumOrderQuantity(1, 1);

      expect(result.valid).toBe(false);
      expect(result.minimumRequired).toBe(100);
      expect(result.message).toBe('Minimum order quantity is 100 units. Requested: 1 units.');
    });
  });

  describe('getPricingTier - additional edge cases', () => {
    it('should use custom tiers with null maxQuantity', () => {
      const customTiers = [{ minQuantity: 1, maxQuantity: null, discount: 0.15 }];

      const tier = QuoteService.getPricingTier(1, customTiers);
      expect(tier).toEqual({ minQuantity: 1, maxQuantity: null, discount: 0.15 });

      const tier1000 = QuoteService.getPricingTier(1000, customTiers);
      expect(tier1000).toEqual({ minQuantity: 1, maxQuantity: null, discount: 0.15 });
    });

    it('should return null for negative quantity', () => {
      const tier = QuoteService.getPricingTier(-1);
      expect(tier).toBeNull();
    });

    it('should return null when custom tiers have gaps', () => {
      const customTiers = [
        { minQuantity: 10, maxQuantity: 20, discount: 0.05 },
        { minQuantity: 30, maxQuantity: 50, discount: 0.1 },
      ];

      const tier = QuoteService.getPricingTier(25, customTiers);
      expect(tier).toBeNull();
    });

    it('should return null for empty custom tiers array', () => {
      const tier = QuoteService.getPricingTier(10, []);
      expect(tier).toBeNull();
    });
  });

  describe('calculateShippingCost - additional edge cases', () => {
    it('should handle very large distances', () => {
      const cost = QuoteService.calculateShippingCost(10, 'standard', 1000);
      // distanceMultiplier = 1000/100 = 10
      // (50 + 5*2.5) * 10 = 625
      expect(cost).toBe(625);
    });

    it('should handle quantity of 1', () => {
      const cost = QuoteService.calculateShippingCost(1, 'standard', 100);
      // estimatedWeight = 1 * 0.5 = 0.5
      // (50 + 0.5 * 2.5) * 1 = 51.25
      expect(cost).toBe(51.25);
    });

    it('should handle very large quantities', () => {
      const cost = QuoteService.calculateShippingCost(1000, 'economy', 100);
      // estimatedWeight = 1000 * 0.5 = 500
      // (25 + 500 * 1.5) * 1 = 775
      expect(cost).toBe(775);
    });

    it('should use distance multiplier of 1 when distance is exactly 100', () => {
      const cost = QuoteService.calculateShippingCost(10, 'standard', 100);
      // distanceMultiplier = max(1, 100/100) = 1
      // (50 + 5*2.5) * 1 = 62.5
      expect(cost).toBe(62.5);
    });
  });

  describe('calculateDistanceBetweenCities - additional cases', () => {
    it('should return default for one known and one unknown city', () => {
      const distance = QuoteService.calculateDistanceBetweenCities('Curitiba', 'Unknown');
      expect(distance).toBe(100);
    });

    it('should handle null inputs', () => {
      const distance = QuoteService.calculateDistanceBetweenCities(null as any, null as any);
      expect(distance).toBe(100);
    });

    it('should return default for same unknown city', () => {
      const distance = QuoteService.calculateDistanceBetweenCities('SameCity', 'SameCity');
      expect(distance).toBe(100);
    });
  });
});
