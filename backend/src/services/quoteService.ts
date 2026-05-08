import Product from '../models/Product';
import QuotationItem from '../models/QuotationItem';
import Quotation from '../models/Quotation';

interface PricingTier {
  minQuantity: number;
  maxQuantity: number | null;
  discount: number;
}

interface QuoteCalculationInput {
  productId: number;
  quantity: number;
  buyerLocation?: string;
  supplierLocation?: string;
  shippingMethod?: 'standard' | 'express' | 'economy';
}

interface QuoteCalculationResult {
  productId: number;
  basePrice: number;
  quantity: number;
  tierDiscount: number;
  unitPriceAfterDiscount: number;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  savings: number;
  appliedTier: PricingTier | null;
}

interface QuoteComparisonResult {
  items: QuoteCalculationResult[];
  totalSubtotal: number;
  totalShipping: number;
  totalTax: number;
  grandTotal: number;
  totalSavings: number;
}

export class QuoteService {
  private static readonly DEFAULT_PRICING_TIERS: PricingTier[] = [
    { minQuantity: 1, maxQuantity: 10, discount: 0 },
    { minQuantity: 11, maxQuantity: 50, discount: 0.05 },
    { minQuantity: 51, maxQuantity: 100, discount: 0.1 },
    { minQuantity: 101, maxQuantity: 500, discount: 0.15 },
    { minQuantity: 501, maxQuantity: null, discount: 0.2 },
  ];

  private static readonly SHIPPING_RATES = {
    standard: { baseRate: 50, perKgRate: 2.5, deliveryDays: 5 },
    express: { baseRate: 100, perKgRate: 5.0, deliveryDays: 2 },
    economy: { baseRate: 25, perKgRate: 1.5, deliveryDays: 10 },
  };

  private static readonly TAX_RATE = 0.18;

  /**
   * Determines the appropriate pricing tier based on the quantity of items being purchased.
   * Applies volume discounts for bulk purchases according to predefined or custom tiers.
   *
   * @param quantity - The number of items being purchased
   * @param customTiers - Optional custom pricing tiers to use instead of defaults
   * @returns The matching pricing tier object or null if no tier matches
   */
  static getPricingTier(quantity: number, customTiers?: PricingTier[]): PricingTier | null {
    const tiers = customTiers || this.DEFAULT_PRICING_TIERS;

    for (const tier of tiers) {
      if (
        quantity >= tier.minQuantity &&
        (tier.maxQuantity === null || quantity <= tier.maxQuantity)
      ) {
        return tier;
      }
    }

    return null;
  }

  /**
   * Calculates the shipping cost for an order based on quantity, shipping method, and distance.
   * Uses predefined shipping rates and applies distance-based multipliers for accurate pricing.
   *
   * @param quantity - The number of items to be shipped
   * @param shippingMethod - The shipping method ('standard', 'express', or 'economy')
   * @param distance - The distance in kilometers between origin and destination
   * @returns The calculated shipping cost in the local currency
   */
  static calculateShippingCost(
    quantity: number,
    shippingMethod: 'standard' | 'express' | 'economy' = 'standard',
    distance: number = 100
  ): number {
    const rates = this.SHIPPING_RATES[shippingMethod];
    const estimatedWeight = quantity * 0.5;
    const distanceMultiplier = Math.max(1, distance / 100);

    return (rates.baseRate + estimatedWeight * rates.perKgRate) * distanceMultiplier;
  }

  /**
   * Calculates the distance between two cities using a predefined distance matrix.
   * Used for determining shipping costs and delivery logistics in the B2B marketplace.
   *
   * @param city1 - The origin city name
   * @param city2 - The destination city name
   * @returns The distance in kilometers, or 100 as default if cities are not found
   */
  static calculateDistanceBetweenCities(city1?: string, city2?: string): number {
    if (!city1 || !city2) return 100;

    const distances: { [key: string]: { [key: string]: number } } = {
      Curitiba: { Londrina: 380, Maringá: 430, Cascavel: 500, 'Foz do Iguaçu': 640 },
      Londrina: { Curitiba: 380, Maringá: 120, Cascavel: 380, 'Foz do Iguaçu': 490 },
      Maringá: { Curitiba: 430, Londrina: 120, Cascavel: 280, 'Foz do Iguaçu': 370 },
      Cascavel: { Curitiba: 500, Londrina: 380, Maringá: 280, 'Foz do Iguaçu': 140 },
      'Foz do Iguaçu': { Curitiba: 640, Londrina: 490, Maringá: 370, Cascavel: 140 },
    };

    return distances[city1]?.[city2] || 100;
  }

  /**
   * Calculates a comprehensive quote for a single product item including pricing tiers,
   * shipping costs, taxes, and total savings. This is the core pricing calculation method.
   *
   * @param input - The quote calculation input containing product details and preferences
   * @returns A complete quote calculation result with all cost breakdowns
   * @throws Error if the product is not found in the database
   */
  static async calculateQuoteForItem(
    input: QuoteCalculationInput
  ): Promise<QuoteCalculationResult> {
    const product = await Product.findByPk(input.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check minimum order quantity if specified
    if (product.minimumOrderQuantity && input.quantity < product.minimumOrderQuantity) {
      throw new Error(`Minimum order quantity is ${product.minimumOrderQuantity} units`);
    }

    // Use unitPrice if available, otherwise fall back to regular price
    const basePrice = product.unitPrice
      ? parseFloat(product.unitPrice.toString())
      : parseFloat(product.price.toString());

    // Use product's custom tier pricing if available, otherwise use defaults
    const customTiers = product.tierPricing ? (product.tierPricing as PricingTier[]) : undefined;
    const appliedTier = this.getPricingTier(input.quantity, customTiers);
    const tierDiscount = appliedTier ? appliedTier.discount : 0;
    const unitPriceAfterDiscount = basePrice * (1 - tierDiscount);
    const subtotal = unitPriceAfterDiscount * input.quantity;

    const distance = this.calculateDistanceBetweenCities(
      input.buyerLocation,
      input.supplierLocation
    );
    const shippingCost = this.calculateShippingCost(input.quantity, input.shippingMethod, distance);

    const tax = subtotal * this.TAX_RATE;
    const total = subtotal + shippingCost + tax;
    const savings = basePrice * input.quantity - subtotal;

    return {
      productId: input.productId,
      basePrice,
      quantity: input.quantity,
      tierDiscount,
      unitPriceAfterDiscount,
      subtotal,
      shippingCost,
      tax,
      total,
      savings,
      appliedTier,
    };
  }

  /**
   * Calculates quotes for multiple items and provides a comprehensive comparison
   * with aggregated totals, shipping costs, taxes, and savings across all items.
   *
   * @param items - Array of quote calculation inputs for multiple products
   * @param options - Optional configuration for buyer/supplier locations and shipping method
   * @returns A comprehensive quote comparison with individual item calculations and totals
   */
  static async calculateQuoteComparison(
    items: QuoteCalculationInput[],
    options: {
      buyerLocation?: string;
      supplierLocation?: string;
      shippingMethod?: 'standard' | 'express' | 'economy';
    } = {}
  ): Promise<QuoteComparisonResult> {
    const calculatedItems = await Promise.all(
      items.map(item =>
        this.calculateQuoteForItem({
          ...item,
          buyerLocation: options.buyerLocation,
          supplierLocation: options.supplierLocation,
          shippingMethod: options.shippingMethod,
        })
      )
    );

    const totalSubtotal = calculatedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalShipping = calculatedItems.reduce((sum, item) => sum + item.shippingCost, 0);
    const totalTax = calculatedItems.reduce((sum, item) => sum + item.tax, 0);
    const grandTotal = totalSubtotal + totalShipping + totalTax;
    const totalSavings = calculatedItems.reduce((sum, item) => sum + item.savings, 0);

    return {
      items: calculatedItems,
      totalSubtotal,
      totalShipping,
      totalTax,
      grandTotal,
      totalSavings,
    };
  }

  /**
   * Updates an existing quotation record with the calculated quote results.
   * Marks the quotation as processed and adds summary information to admin notes.
   *
   * @param quotationId - The unique identifier of the quotation to update
   * @param calculations - The calculated quote comparison results to store
   * @returns Promise that resolves when the update is complete
   * @throws Error if the quotation is not found in the database
   */
  static async updateQuotationWithCalculations(
    quotationId: number,
    calculations: QuoteComparisonResult
  ): Promise<void> {
    const quotation = await Quotation.findByPk(quotationId);
    if (!quotation) {
      throw new Error('Quotation not found');
    }

    await quotation.update({
      status: 'processed',
      adminNotes: `Quote calculated - Total: R$ ${calculations.grandTotal.toFixed(2)}, Savings: R$ ${calculations.totalSavings.toFixed(2)}`,
    });
  }

  /**
   * Retrieves a quotation from the database and calculates fresh quote results
   * for all items in the quotation. Includes all related product information.
   *
   * @param quotationId - The unique identifier of the quotation to retrieve
   * @returns Object containing the quotation record and calculated quote results
   * @throws Error if the quotation is not found in the database
   */
  static async getQuotationWithCalculations(quotationId: number): Promise<{
    quotation: Quotation;
    calculations: QuoteComparisonResult;
  }> {
    const quotation = await Quotation.findByPk(quotationId, {
      include: [
        {
          model: QuotationItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
            },
          ],
        },
      ],
    });

    if (!quotation) {
      throw new Error('Quotation not found');
    }

    const items =
      (quotation as Quotation & { items?: Array<{ productId: number; quantity: number }> }).items ||
      [];
    const calculationInputs: QuoteCalculationInput[] = items.map(
      (item: { productId: number; quantity: number }) => ({
        productId: item.productId,
        quantity: item.quantity,
      })
    );

    const calculations = await this.calculateQuoteComparison(calculationInputs);

    return {
      quotation,
      calculations,
    };
  }

  /**
   * Formats the quote calculation results into a user-friendly response format
   * with properly formatted currency values and readable tier information.
   *
   * @param calculations - The quote comparison results to format
   * @returns Formatted quote response with summary totals and itemized details
   */
  static formatQuoteResponse(calculations: QuoteComparisonResult): {
    summary: {
      totalItems: number;
      subtotal: string;
      shipping: string;
      tax: string;
      total: string;
      savings: string;
    };
    items: Array<{
      productId: number;
      quantity: number;
      unitPrice: string;
      discount: string;
      subtotal: string;
      appliedTier: string;
    }>;
  } {
    return {
      summary: {
        totalItems: calculations.items.length,
        subtotal: `R$ ${calculations.totalSubtotal.toFixed(2)}`,
        shipping: `R$ ${calculations.totalShipping.toFixed(2)}`,
        tax: `R$ ${calculations.totalTax.toFixed(2)}`,
        total: `R$ ${calculations.grandTotal.toFixed(2)}`,
        savings: `R$ ${calculations.totalSavings.toFixed(2)}`,
      },
      items: calculations.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: `R$ ${item.unitPriceAfterDiscount.toFixed(2)}`,
        discount: `${(item.tierDiscount * 100).toFixed(1)}%`,
        subtotal: `R$ ${item.subtotal.toFixed(2)}`,
        appliedTier: item.appliedTier
          ? `${item.appliedTier.minQuantity}${item.appliedTier.maxQuantity ? `-${item.appliedTier.maxQuantity}` : '+'} units`
          : 'No tier applied',
      })),
    };
  }

  /**
   * Gets quotes from multiple suppliers for the same product request.
   * Allows buyers to compare offers from different suppliers.
   *
   * @param productId - The product to get quotes for
   * @param quantity - The quantity requested
   * @param buyerLocation - Buyer's location for shipping calculations
   * @param supplierIds - Array of supplier IDs to get quotes from
   * @param shippingMethod - The preferred shipping method
   * @returns Array of quotes from different suppliers with supplier information
   */
  static async getMultipleSupplierQuotes(
    productId: number,
    quantity: number,
    buyerLocation?: string,
    supplierIds?: number[],
    shippingMethod?: 'standard' | 'express' | 'economy'
  ): Promise<
    Array<{
      supplier: {
        id: number;
        companyName: string;
        corporateName?: string;
        averageRating?: number;
        totalRatings?: number;
        industrySector?: string;
      };
      quote: QuoteCalculationResult | null;
      error?: string;
    }>
  > {
    const User = (await import('../models/User')).default;

    // If no specific suppliers provided, find all suppliers who have this product
    let suppliers;
    if (supplierIds && supplierIds.length > 0) {
      suppliers = await User.findAll({
        where: {
          id: supplierIds,
          role: 'supplier',
          status: 'approved',
        },
      });
    } else {
      // Find suppliers who have this product
      const product = await Product.findByPk(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.supplierId) {
        suppliers = await User.findAll({
          where: {
            id: product.supplierId,
            role: 'supplier',
            status: 'approved',
          },
        });
      } else {
        // If no specific supplier, get all approved suppliers
        suppliers = await User.findAll({
          where: {
            role: 'supplier',
            status: 'approved',
          },
          limit: 5, // Limit to prevent too many quotes
        });
      }
    }

    const quotes = await Promise.all(
      suppliers.map(async supplier => {
        try {
          const quote = await this.calculateQuoteForItem({
            productId,
            quantity,
            buyerLocation,
            supplierLocation: supplier.address,
            shippingMethod,
          });

          return {
            supplier: {
              id: supplier.id,
              companyName: supplier.companyName,
              corporateName: supplier.corporateName,
              averageRating: supplier.averageRating,
              totalRatings: supplier.totalRatings,
              industrySector: supplier.industrySector,
            },
            quote,
          };
        } catch (error) {
          return {
            supplier: {
              id: supplier.id,
              companyName: supplier.companyName,
              corporateName: supplier.corporateName,
            },
            quote: null,
            error: error instanceof Error ? error.message : 'Failed to calculate quote',
          };
        }
      })
    );

    // Sort by total price (best deals first)
    return quotes.sort((a, b) => {
      if (!a.quote && !b.quote) return 0;
      if (!a.quote) return 1;
      if (!b.quote) return -1;
      return a.quote.total - b.quote.total;
    });
  }

  /**
   * Validates if a product meets minimum order requirements
   *
   * @param productId - The product to validate
   * @param quantity - The requested quantity
   * @returns Object with validation result and minimum quantity if applicable
   */
  static async validateMinimumOrderQuantity(
    productId: number,
    quantity: number
  ): Promise<{
    valid: boolean;
    minimumRequired?: number;
    message?: string;
  }> {
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.minimumOrderQuantity && quantity < product.minimumOrderQuantity) {
      return {
        valid: false,
        minimumRequired: product.minimumOrderQuantity,
        message: `Minimum order quantity is ${product.minimumOrderQuantity} units. Requested: ${quantity} units.`,
      };
    }

    return {
      valid: true,
      message: 'Order quantity meets requirements',
    };
  }
}
