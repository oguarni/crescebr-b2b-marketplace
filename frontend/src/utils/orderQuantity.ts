import { Product } from '@shared/types';

/**
 * Resolves the order step for a product, which is its minimum order quantity
 * (MOQ). Buyers add and adjust quantities in whole multiples of this step, so a
 * product with an MOQ of 10 starts at 10 and steps 10 → 20 → 30. Falls back to 1
 * when a product has no positive MOQ defined, so products without an explicit MOQ
 * keep the classic one-by-one behaviour.
 */
export const getOrderStep = (product: Pick<Product, 'minimumOrderQuantity'>): number => {
  const moq = Number(product?.minimumOrderQuantity);
  return Number.isFinite(moq) && moq > 0 ? Math.floor(moq) : 1;
};
