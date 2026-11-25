/**
 * Quote pricing for the browser-side demo API.
 *
 * A direct port of `backend/src/services/quoteService.ts`. The constants and the
 * order of operations are kept identical so the hosted demo quotes the same
 * numbers a real deployment would; change this file only to track that service.
 */

import type { PricingTier, Product, ShippingMethod, SystemSettings } from '@shared/types';
import { DEFAULT_SYSTEM_SETTINGS } from '../utils/systemSettingsRules';

export type { ShippingMethod };

export interface QuoteCalculationResult {
  productId: number;
  basePrice: number;
  quantity: number;
  tierDiscount: number;
  unitPriceAfterDiscount: number;
  subtotal: number;
  shippingCost: number;
  tax: number;
  taxRate: number;
  total: number;
  savings: number;
  appliedTier: PricingTier | null;
}

export interface QuoteComparisonResult {
  items: QuoteCalculationResult[];
  totalSubtotal: number;
  totalShipping: number;
  totalTax: number;
  taxRate: number;
  grandTotal: number;
  totalSavings: number;
}

// Tax, freight and default tiers come from the demo's system settings, which the
// admin settings page edits; DEFAULT_SYSTEM_SETTINGS holds the original values.

const CITY_DISTANCES: Record<string, Record<string, number>> = {
  Curitiba: { Londrina: 380, Maringá: 430, Cascavel: 500, 'Foz do Iguaçu': 640 },
  Londrina: { Curitiba: 380, Maringá: 120, Cascavel: 380, 'Foz do Iguaçu': 490 },
  Maringá: { Curitiba: 430, Londrina: 120, Cascavel: 280, 'Foz do Iguaçu': 370 },
  Cascavel: { Curitiba: 500, Londrina: 380, Maringá: 280, 'Foz do Iguaçu': 140 },
  'Foz do Iguaçu': { Curitiba: 640, Londrina: 490, Maringá: 370, Cascavel: 140 },
};

export const getPricingTier = (
  quantity: number,
  customTiers?: PricingTier[],
  defaultTiers: PricingTier[] = DEFAULT_SYSTEM_SETTINGS.pricingTiers
): PricingTier | null => {
  const tiers = customTiers || defaultTiers;

  for (const tier of tiers) {
    if (quantity >= tier.minQuantity && (tier.maxQuantity === null || quantity <= tier.maxQuantity))
      return tier;
  }

  return null;
};

export const calculateShippingCost = (
  quantity: number,
  shippingMethod: ShippingMethod = 'standard',
  distance = 100,
  shippingMethods: SystemSettings['shippingMethods'] = DEFAULT_SYSTEM_SETTINGS.shippingMethods
): number => {
  const rates = shippingMethods[shippingMethod];
  const estimatedWeight = quantity * 0.5;
  const distanceMultiplier = Math.max(1, distance / 100);

  return (rates.baseRate + estimatedWeight * rates.perKgRate) * distanceMultiplier;
};

export const calculateDistanceBetweenCities = (city1?: string, city2?: string): number => {
  if (!city1 || !city2) return 100;
  return CITY_DISTANCES[city1]?.[city2] || 100;
};

/**
 * Prices one line item. Throws below the product's minimum order quantity,
 * matching the backend's validation so the demo surfaces the same error.
 */
export const calculateQuoteForItem = (
  product: Product,
  quantity: number,
  options: {
    buyerLocation?: string;
    supplierLocation?: string;
    shippingMethod?: ShippingMethod;
  } = {},
  settings: SystemSettings = DEFAULT_SYSTEM_SETTINGS
): QuoteCalculationResult => {
  if (product.minimumOrderQuantity && quantity < product.minimumOrderQuantity) {
    throw new Error(`Minimum order quantity is ${product.minimumOrderQuantity} units`);
  }

  const basePrice = product.unitPrice ? Number(product.unitPrice) : Number(product.price);

  // A product's own tiers win; an empty list means it has none, so the
  // platform's default tiers apply -- the backend behaves the same way.
  const customTiers =
    product.tierPricing && product.tierPricing.length > 0 ? product.tierPricing : undefined;
  const appliedTier = getPricingTier(quantity, customTiers, settings.pricingTiers);
  const tierDiscount = appliedTier ? appliedTier.discount : 0;
  const unitPriceAfterDiscount = basePrice * (1 - tierDiscount);
  const subtotal = unitPriceAfterDiscount * quantity;

  const distance = calculateDistanceBetweenCities(options.buyerLocation, options.supplierLocation);
  const shippingCost = calculateShippingCost(
    quantity,
    options.shippingMethod,
    distance,
    settings.shippingMethods
  );

  const tax = subtotal * settings.taxRate;

  return {
    productId: product.id,
    basePrice,
    quantity,
    tierDiscount,
    unitPriceAfterDiscount,
    subtotal,
    shippingCost,
    tax,
    taxRate: settings.taxRate,
    total: subtotal + shippingCost + tax,
    savings: basePrice * quantity - subtotal,
    appliedTier,
  };
};

export const calculateQuoteComparison = (
  items: QuoteCalculationResult[],
  taxRate: number = DEFAULT_SYSTEM_SETTINGS.taxRate
): QuoteComparisonResult => {
  const sum = (pick: (item: QuoteCalculationResult) => number): number =>
    items.reduce((acc, item) => acc + pick(item), 0);

  return {
    items,
    totalSubtotal: sum(i => i.subtotal),
    totalShipping: sum(i => i.shippingCost),
    totalTax: sum(i => i.tax),
    taxRate,
    grandTotal: sum(i => i.total),
    totalSavings: sum(i => i.savings),
  };
};
