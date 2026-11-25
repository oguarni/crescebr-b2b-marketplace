/**
 * The rules that make a set of system settings valid, kept pure so the HTTP
 * boundary, the service and the tests all judge a document the same way.
 *
 * `frontend/src/utils/systemSettingsRules.ts` is a line-for-line port used by
 * the settings form and the browser-side demo API. Change both together.
 */

import type { PricingTier, ShippingMethod, SystemSettings } from '../types';

export const SHIPPING_METHODS: readonly ShippingMethod[] = ['express', 'standard', 'economy'];

/**
 * The values the marketplace priced with before they became editable. A fresh
 * database is seeded with them, and an install without a settings row uses
 * them, so introducing the feature changes no quote.
 */
export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  taxRate: 0.18,
  quotationValidityDays: 30,
  shippingMethods: {
    express: { baseRate: 100, perKgRate: 5, deliveryDays: 2 },
    standard: { baseRate: 50, perKgRate: 2.5, deliveryDays: 5 },
    economy: { baseRate: 25, perKgRate: 1.5, deliveryDays: 10 },
  },
  pricingTiers: [
    { minQuantity: 1, maxQuantity: 10, discount: 0 },
    { minQuantity: 11, maxQuantity: 50, discount: 0.05 },
    { minQuantity: 51, maxQuantity: 100, discount: 0.1 },
    { minQuantity: 101, maxQuantity: 500, discount: 0.15 },
    { minQuantity: 501, maxQuantity: null, discount: 0.2 },
  ],
};

/**
 * Bounds chosen to catch a slipped decimal (18 typed for 0.18, a fee with
 * three extra zeros) rather than to model real tax law. A tax rate above 50%
 * or a discount above 90% is far more likely a typo than a policy.
 */
export const SETTINGS_LIMITS = {
  taxRate: { min: 0, max: 0.5 },
  quotationValidityDays: { min: 1, max: 180 },
  baseRate: { min: 0, max: 100000 },
  perKgRate: { min: 0, max: 10000 },
  deliveryDays: { min: 1, max: 60 },
  tiers: { min: 1, max: 10 },
  minQuantity: { min: 1, max: 1000000 },
  discount: { min: 0, max: 0.9 },
} as const;

export type SettingsIssueCode =
  | 'invalid'
  | 'integer'
  | 'range'
  | 'tierCount'
  | 'tierFirstMin'
  | 'tierGap'
  | 'tierMaxBelowMin'
  | 'tierOpenEnded'
  | 'tierDiscountOrder'
  | 'deliveryOrder';

/** One problem with a submitted document, addressed by its JSON path. */
export interface SettingsIssue {
  path: string;
  code: SettingsIssueCode;
  params?: Record<string, number>;
}

const ISSUE_MESSAGES: Record<SettingsIssueCode, (params: Record<string, number>) => string> = {
  invalid: () => 'Must be a number',
  integer: () => 'Must be a whole number',
  range: ({ min, max }) => `Must be between ${min} and ${max}`,
  tierCount: ({ min, max }) => `Define between ${min} and ${max} tiers`,
  tierFirstMin: () => 'The first tier must start at quantity 1',
  tierGap: ({ expected }) => `Must be ${expected}, right after the previous tier`,
  tierMaxBelowMin: () => 'Must be greater than or equal to the minimum quantity',
  tierOpenEnded: () => 'Only the last tier is open-ended, and it must be',
  tierDiscountOrder: () => 'A larger volume cannot get a smaller discount',
  deliveryOrder: () => 'Express must be at most standard, and standard at most economy',
};

export const describeSettingsIssue = (issue: SettingsIssue): string =>
  ISSUE_MESSAGES[issue.code](issue.params ?? {});

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

type Range = { readonly min: number; readonly max: number };

/** Reads one numeric field, recording an issue and returning null when it is unusable. */
const readNumber = (
  value: unknown,
  path: string,
  range: Range,
  issues: SettingsIssue[],
  options: { integer?: boolean; decimals?: number }
): number | null => {
  if (!isFiniteNumber(value)) {
    issues.push({ path, code: 'invalid' });
    return null;
  }
  if (options.integer && !Number.isInteger(value)) {
    issues.push({ path, code: 'integer' });
    return null;
  }
  if (value < range.min || value > range.max) {
    issues.push({ path, code: 'range', params: { min: range.min, max: range.max } });
    return null;
  }
  return options.decimals === undefined ? value : roundTo(value, options.decimals);
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const validateTiers = (value: unknown, issues: SettingsIssue[]): PricingTier[] => {
  const path = 'settings.pricingTiers';
  const { min, max } = SETTINGS_LIMITS.tiers;
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    issues.push({ path, code: 'tierCount', params: { min, max } });
    return [];
  }

  const tiers: PricingTier[] = [];
  value.forEach((raw, index) => {
    const tierPath = `${path}[${index}]`;
    const tier = asRecord(raw);
    const isLast = index === value.length - 1;

    const minQuantity = readNumber(
      tier.minQuantity,
      `${tierPath}.minQuantity`,
      SETTINGS_LIMITS.minQuantity,
      issues,
      { integer: true }
    );
    const discount = readNumber(
      tier.discount,
      `${tierPath}.discount`,
      SETTINGS_LIMITS.discount,
      issues,
      { decimals: 4 }
    );

    let maxQuantity: number | null = null;
    if (tier.maxQuantity === null || tier.maxQuantity === undefined) {
      // Open-ended: prices every quantity from minQuantity upwards.
      if (!isLast) issues.push({ path: `${tierPath}.maxQuantity`, code: 'tierOpenEnded' });
    } else if (isLast) {
      issues.push({ path: `${tierPath}.maxQuantity`, code: 'tierOpenEnded' });
    } else {
      maxQuantity = readNumber(
        tier.maxQuantity,
        `${tierPath}.maxQuantity`,
        SETTINGS_LIMITS.minQuantity,
        issues,
        { integer: true }
      );
      if (maxQuantity !== null && minQuantity !== null && maxQuantity < minQuantity) {
        issues.push({ path: `${tierPath}.maxQuantity`, code: 'tierMaxBelowMin' });
      }
    }

    if (minQuantity !== null && index === 0 && minQuantity !== 1) {
      issues.push({ path: `${tierPath}.minQuantity`, code: 'tierFirstMin' });
    }

    if (index > 0) {
      // Tiers must tile the quantity line: each starts right after the last one
      // ends, so no quantity is left unpriced and none is priced twice.
      const previous = tiers[index - 1];
      if (
        minQuantity !== null &&
        previous.maxQuantity !== null &&
        minQuantity !== previous.maxQuantity + 1
      ) {
        issues.push({
          path: `${tierPath}.minQuantity`,
          code: 'tierGap',
          params: { expected: previous.maxQuantity + 1 },
        });
      }
      if (discount !== null && discount < previous.discount) {
        issues.push({ path: `${tierPath}.discount`, code: 'tierDiscountOrder' });
      }
    }

    tiers.push({ minQuantity: minQuantity ?? 0, maxQuantity, discount: discount ?? 0 });
  });

  return tiers;
};

export type SettingsValidation =
  { valid: true; settings: SystemSettings } | { valid: false; issues: SettingsIssue[] };

/**
 * Checks a submitted settings document and returns a clean copy of it.
 *
 * Only known fields are read, so anything extra in the input is dropped rather
 * than stored. Money is rounded to cents and rates to four decimals, which is
 * the precision the form offers.
 *
 * @example
 * const result = validateSystemSettings(req.body.settings);
 * if (!result.valid) return res.status(400).json({ details: result.issues });
 */
export const validateSystemSettings = (input: unknown): SettingsValidation => {
  const issues: SettingsIssue[] = [];
  const source = asRecord(input);

  const taxRate = readNumber(source.taxRate, 'settings.taxRate', SETTINGS_LIMITS.taxRate, issues, {
    decimals: 4,
  });
  const quotationValidityDays = readNumber(
    source.quotationValidityDays,
    'settings.quotationValidityDays',
    SETTINGS_LIMITS.quotationValidityDays,
    issues,
    { integer: true }
  );

  const methods = asRecord(source.shippingMethods);
  const shippingMethods = {} as SystemSettings['shippingMethods'];
  for (const method of SHIPPING_METHODS) {
    const rates = asRecord(methods[method]);
    const path = `settings.shippingMethods.${method}`;
    shippingMethods[method] = {
      baseRate:
        readNumber(rates.baseRate, `${path}.baseRate`, SETTINGS_LIMITS.baseRate, issues, {
          decimals: 2,
        }) ?? 0,
      perKgRate:
        readNumber(rates.perKgRate, `${path}.perKgRate`, SETTINGS_LIMITS.perKgRate, issues, {
          decimals: 2,
        }) ?? 0,
      deliveryDays:
        readNumber(
          rates.deliveryDays,
          `${path}.deliveryDays`,
          SETTINGS_LIMITS.deliveryDays,
          issues,
          {
            integer: true,
          }
        ) ?? 0,
    };
  }

  const { express, standard, economy } = shippingMethods;
  const daysKnown = [express, standard, economy].every(rates => rates.deliveryDays > 0);
  if (
    daysKnown &&
    (express.deliveryDays > standard.deliveryDays || standard.deliveryDays > economy.deliveryDays)
  ) {
    issues.push({ path: 'settings.shippingMethods', code: 'deliveryOrder' });
  }

  const pricingTiers = validateTiers(source.pricingTiers, issues);

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  // With no issues recorded, every readNumber above returned a number.
  return {
    valid: true,
    settings: {
      taxRate: taxRate as number,
      quotationValidityDays: quotationValidityDays as number,
      shippingMethods,
      pricingTiers,
    },
  };
};
