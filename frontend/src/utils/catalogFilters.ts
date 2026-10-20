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
  /** The values a slider can rest on, from `min` to `max`, evenly spaced on its track. */
  stops: readonly number[];
}

const fromStops = (stops: readonly number[]): RangeLimits => ({
  min: stops[0],
  max: stops[stops.length - 1],
  stops,
});

// Catalogue values cluster at the low end: every seeded MOQ is 20 or less and
// most prices are under R$ 10.000. On a linear 1–1000 or 0–50,000 track, a
// phone-width slider packed all of them into its first few pixels, so most of
// a drag changed nothing. Stops on a rising scale give each step of the track
// an effect while still reaching the high values.
export const PRICE_LIMITS = fromStops([0, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000]);
export const MOQ_LIMITS = fromStops([1, 5, 10, 25, 50, 100, 250, 500, 1000]);
export const LEAD_TIME_LIMITS = fromStops([1, 3, 5, 7, 10, 14, 21, 30, 60, 90]);

/** Slider position of a value: the first stop at or above it. */
export const toStopIndex = (limits: RangeLimits, value: number): number => {
  const index = limits.stops.findIndex(stop => stop >= value);
  return index === -1 ? limits.stops.length - 1 : index;
};

/** The value at a slider position. */
export const fromStopIndex = (limits: RangeLimits, index: number): number =>
  limits.stops[index] ?? limits.max;

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
