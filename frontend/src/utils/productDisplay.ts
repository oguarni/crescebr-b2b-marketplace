/**
 * Display helpers shared by the catalog card preview and the product details
 * page, so both describe a product with the same words.
 */

import type { SyntheticEvent } from 'react';
import type { Product } from '@shared/types';
import type { Translate } from '../contexts/LanguageContext';
import type { TranslationKey } from '../locales';

// Self-contained inline SVG placeholder so missing images never depend on an
// external service (a remote placeholder host can fail and break the layout).
export const PRODUCT_PLACEHOLDER_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="225" viewBox="0 0 300 225">' +
      '<rect width="300" height="225" fill="#f1f5f9"/>' +
      '<g fill="none" stroke="#cbd5e1" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="105" y="78" width="90" height="70" rx="8"/>' +
      '<circle cx="128" cy="100" r="9"/>' +
      '<path d="M108 140l26-24 20 18 22-26 24 32"/>' +
      '</g></svg>'
  );

/** Swaps a failed remote image for the inline placeholder, once. */
export const showPlaceholderOnError = (event: SyntheticEvent<HTMLImageElement>): void => {
  const img = event.currentTarget;
  if (img.src !== PRODUCT_PLACEHOLDER_IMAGE) {
    img.src = PRODUCT_PLACEHOLDER_IMAGE;
  }
};

const AVAILABILITY_KEYS: Record<Product['availability'], TranslationKey> = {
  in_stock: 'home.inStockOption',
  out_of_stock: 'home.outOfStockOption',
  limited: 'home.limitedOption',
  custom_order: 'home.madeToOrderOption',
};

/** Human-readable label for every availability state in the Product type. */
export const availabilityLabel = (t: Translate, availability: Product['availability']): string => {
  const key = AVAILABILITY_KEYS[availability];
  return key ? t(key) : availability || '—';
};

/**
 * The supplier's display name from the identity the products API includes, or
 * a label built from the supplier id. Returns null when neither is present, so
 * a caller decides whether to show a fallback instead of inventing a name.
 */
export const supplierDisplayName = (t: Translate, product: Product): string | null =>
  product.supplier?.companyName ||
  product.supplier?.corporateName ||
  (product.supplierId ? t('home.supplierId', { id: product.supplierId }) : null);
