/**
 * Advanced filters for the public catalogue on the home page.
 *
 * Pure and separate from the UI so the two rules that matter can be tested
 * without rendering anything: which filters reach the API, and which ones count
 * as active (the badge on the filter button and the chips above the results).
 */

import type { Product } from '@shared/types';
import type { Translate } from '../contexts/LanguageContext';
import type { TranslationKey } from '../locales';
import type { ProductsQueryParams } from '../services/productsService';
import { formatBRLWhole } from './currency';
import { formatSpecLabel } from './catalogLabels';

export interface RangeLimits {
  min: number;
  max: number;
  step: number;
}

export const PRICE_LIMITS: RangeLimits = { min: 0, max: 50000, step: 500 };
export const MOQ_LIMITS: RangeLimits = { min: 1, max: 1000, step: 10 };
export const LEAD_TIME_LIMITS: RangeLimits = { min: 1, max: 90, step: 1 };

export type Availability = Product['availability'];

/** The states a buyer can filter by; out-of-stock items are not offered. */
export const AVAILABILITY_OPTIONS: Availability[] = ['in_stock', 'limited', 'custom_order'];

const AVAILABILITY_KEYS: Record<Availability, TranslationKey> = {
  in_stock: 'home.inStockOption',
  out_of_stock: 'home.outOfStockOption',
  limited: 'home.limitedOption',
  custom_order: 'home.madeToOrderOption',
};

export const availabilityLabel = (t: Translate, availability: Availability): string =>
  t(AVAILABILITY_KEYS[availability]);

export interface CatalogFilters {
  priceRange: [number, number];
  moqRange: [number, number];
  maxLeadTime: number;
  availability: Availability[];
  /** One selected value per specification key. */
  specifications: Record<string, string>;
}

/** Every slider at its outer limits and nothing selected: no constraint at all. */
export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  priceRange: [PRICE_LIMITS.min, PRICE_LIMITS.max],
  moqRange: [MOQ_LIMITS.min, MOQ_LIMITS.max],
  maxLeadTime: LEAD_TIME_LIMITS.max,
  availability: [],
  specifications: {},
};

export type CatalogFilterQuery = Pick<
  ProductsQueryParams,
  'minPrice' | 'maxPrice' | 'minMoq' | 'maxMoq' | 'maxLeadTime' | 'availability' | 'specifications'
>;

/**
 * Query parameters for the filters that actually narrow the catalogue.
 *
 * A slider resting on its outer limit means "no bound" and is left out. The
 * previous panel sent `maxPrice=50000` and `maxLeadTime=30` as soon as it was
 * opened, which hid every product above either value although the visitor had
 * not touched a control.
 */
export const toProductQuery = (filters: CatalogFilters): CatalogFilterQuery => {
  const query: CatalogFilterQuery = {};
  const [minPrice, maxPrice] = filters.priceRange;
  const [minMoq, maxMoq] = filters.moqRange;

  if (minPrice > PRICE_LIMITS.min) query.minPrice = minPrice;
  if (maxPrice < PRICE_LIMITS.max) query.maxPrice = maxPrice;
  if (minMoq > MOQ_LIMITS.min) query.minMoq = minMoq;
  if (maxMoq < MOQ_LIMITS.max) query.maxMoq = maxMoq;
  if (filters.maxLeadTime < LEAD_TIME_LIMITS.max) query.maxLeadTime = filters.maxLeadTime;
  if (filters.availability.length > 0) query.availability = [...filters.availability];
  if (Object.keys(filters.specifications).length > 0) {
    query.specifications = { ...filters.specifications };
  }

  return query;
};

/**
 * Describes a range as "a – b", "from a" or "up to b", or returns null when
 * both ends rest on the slider limits.
 */
const describeRange = (
  t: Translate,
  [min, max]: [number, number],
  limits: RangeLimits,
  format: (value: number) => string
): string | null => {
  const hasMin = min > limits.min;
  const hasMax = max < limits.max;

  if (hasMin && hasMax) return t('home.filters.between', { min: format(min), max: format(max) });
  if (hasMin) return t('home.filters.from', { min: format(min) });
  if (hasMax) return t('home.filters.upTo', { max: format(max) });
  return null;
};

export const describePriceRange = (t: Translate, range: [number, number]): string | null =>
  describeRange(t, range, PRICE_LIMITS, formatBRLWhole);

export const describeMoqRange = (t: Translate, range: [number, number]): string | null =>
  describeRange(t, range, MOQ_LIMITS, String);

/** "Any lead time" at the slider's limit, otherwise "Up to N days". */
export const describeLeadTime = (t: Translate, days: number): string => {
  if (days >= LEAD_TIME_LIMITS.max) return t('home.filters.anyLeadTime');
  return days === 1 ? t('home.filters.upToOneDay') : t('home.maxLeadTimeValue', { days });
};

export interface ActiveFilter {
  /** Stable React key. */
  id: string;
  label: string;
  /** Returns the filters with this one removed. */
  clear: (filters: CatalogFilters) => CatalogFilters;
}

/**
 * One entry per constraint the visitor has set, in the order the filter panel
 * lists them. Its length is the count shown on the filter button.
 */
export const getActiveFilters = (filters: CatalogFilters, t: Translate): ActiveFilter[] => {
  const active: ActiveFilter[] = [];

  const price = describePriceRange(t, filters.priceRange);
  if (price) {
    active.push({
      id: 'price',
      label: t('home.filters.priceChip', { range: price }),
      clear: f => ({ ...f, priceRange: DEFAULT_CATALOG_FILTERS.priceRange }),
    });
  }

  const moq = describeMoqRange(t, filters.moqRange);
  if (moq) {
    active.push({
      id: 'moq',
      label: t('home.filters.moqChip', { range: moq }),
      clear: f => ({ ...f, moqRange: DEFAULT_CATALOG_FILTERS.moqRange }),
    });
  }

  if (filters.maxLeadTime < LEAD_TIME_LIMITS.max) {
    active.push({
      id: 'leadTime',
      label:
        filters.maxLeadTime === 1
          ? t('home.filters.leadTimeChipOne')
          : t('home.filters.leadTimeChip', { days: filters.maxLeadTime }),
      clear: f => ({ ...f, maxLeadTime: DEFAULT_CATALOG_FILTERS.maxLeadTime }),
    });
  }

  for (const availability of filters.availability) {
    active.push({
      id: `availability:${availability}`,
      label: availabilityLabel(t, availability),
      clear: f => ({ ...f, availability: f.availability.filter(a => a !== availability) }),
    });
  }

  for (const [key, value] of Object.entries(filters.specifications)) {
    active.push({
      id: `spec:${key}`,
      label: `${formatSpecLabel(key)}: ${value}`,
      clear: f => ({
        ...f,
        specifications: Object.fromEntries(
          Object.entries(f.specifications).filter(([specKey]) => specKey !== key)
        ),
      }),
    });
  }

  return active;
};

export interface SpecOption {
  key: string;
  value: string;
}

/**
 * Flattens `{ material: ['Steel', 'HDPE'] }` into one option per value,
 * ordered by label so an Autocomplete grouped by key shows each group once.
 */
export const toSpecOptions = (specs: Record<string, string[]>): SpecOption[] =>
  Object.entries(specs)
    .sort(([a], [b]) => formatSpecLabel(a).localeCompare(formatSpecLabel(b)))
    .flatMap(([key, values]) => values.map(value => ({ key, value })));

export const toSelectedSpecOptions = (specifications: Record<string, string>): SpecOption[] =>
  Object.entries(specifications).map(([key, value]) => ({ key, value }));

/**
 * Keeps one value per key. A selection is appended to the end of the list, so
 * picking a second value for the same key replaces the first.
 */
export const fromSpecOptions = (options: SpecOption[]): Record<string, string> =>
  Object.fromEntries(options.map(option => [option.key, option.value]));
