/**
 * Editable form state for the admin settings page, and the conversions between
 * it and the `SystemSettings` document the API stores.
 *
 * Inputs are strings so a half-typed value ("18,") is not lost, rates are shown
 * as percentages, and each pricing tier only exposes its upper bound: its lower
 * bound is always the previous tier's upper bound plus one, so the form cannot
 * produce a gap or an overlap in the first place.
 */

import type { ShippingMethod, SystemSettings } from '@shared/types';
import {
  SETTINGS_LIMITS,
  SHIPPING_METHODS,
  validateSystemSettings,
  type SettingsIssue,
} from './systemSettingsRules';

export interface ShippingMethodForm {
  baseRate: string;
  perKgRate: string;
  deliveryDays: string;
}

export interface PricingTierForm {
  /** Empty on the last tier, which is open-ended. */
  maxQuantity: string;
  discountPercent: string;
}

export interface SystemSettingsForm {
  taxRatePercent: string;
  quotationValidityDays: string;
  shippingMethods: Record<ShippingMethod, ShippingMethodForm>;
  pricingTiers: PricingTierForm[];
}

/** Field addresses used for error messages, e.g. `pricingTiers.2.discountPercent`. */
export type SettingsFieldErrors = Record<string, SettingsIssue>;

const PERCENT = 100;

/** Formats a number for a pt-BR or en input without float noise (0.1 * 100). */
const toInput = (value: number): string => String(Math.round(value * 10000) / 10000);

/** Reads "18,5", "18.5" or " 18 " as 18.5; anything else, empty included, as NaN. */
export const parseDecimal = (raw: string): number => {
  const normalized = raw.trim().replace(',', '.');
  return /^-?(\d+(\.\d*)?|\.\d+)$/.test(normalized) ? Number(normalized) : Number.NaN;
};

export const toSettingsForm = (settings: SystemSettings): SystemSettingsForm => ({
  taxRatePercent: toInput(settings.taxRate * PERCENT),
  quotationValidityDays: String(settings.quotationValidityDays),
  shippingMethods: Object.fromEntries(
    SHIPPING_METHODS.map(method => {
      const rates = settings.shippingMethods[method];
      return [
        method,
        {
          baseRate: toInput(rates.baseRate),
          perKgRate: toInput(rates.perKgRate),
          deliveryDays: String(rates.deliveryDays),
        },
      ];
    })
  ) as Record<ShippingMethod, ShippingMethodForm>,
  pricingTiers: settings.pricingTiers.map(tier => ({
    maxQuantity: tier.maxQuantity === null ? '' : String(tier.maxQuantity),
    discountPercent: toInput(tier.discount * PERCENT),
  })),
});

/**
 * The lower bound of each tier, derived from the upper bounds before it. A
 * previous bound that does not parse leaves the next tier starting one after
 * its own predecessor, so only the field the admin got wrong is flagged.
 */
export const tierMinimums = (tiers: PricingTierForm[]): number[] => {
  const minimums: number[] = [];
  tiers.forEach((_tier, index) => {
    if (index === 0) {
      minimums.push(1);
      return;
    }
    const previousMax = parseDecimal(tiers[index - 1].maxQuantity);
    minimums.push(
      Number.isInteger(previousMax) && previousMax >= minimums[index - 1]
        ? previousMax + 1
        : minimums[index - 1] + 1
    );
  });
  return minimums;
};

/** Builds the document the API expects; unparseable inputs become NaN and fail validation. */
export const fromSettingsForm = (form: SystemSettingsForm): SystemSettings => {
  const minimums = tierMinimums(form.pricingTiers);
  const lastIndex = form.pricingTiers.length - 1;

  return {
    taxRate: parseDecimal(form.taxRatePercent) / PERCENT,
    quotationValidityDays: parseDecimal(form.quotationValidityDays),
    shippingMethods: Object.fromEntries(
      SHIPPING_METHODS.map(method => {
        const rates = form.shippingMethods[method];
        return [
          method,
          {
            baseRate: parseDecimal(rates.baseRate),
            perKgRate: parseDecimal(rates.perKgRate),
            deliveryDays: parseDecimal(rates.deliveryDays),
          },
        ];
      })
    ) as SystemSettings['shippingMethods'],
    pricingTiers: form.pricingTiers.map((tier, index) => ({
      minQuantity: minimums[index],
      maxQuantity: index === lastIndex ? null : parseDecimal(tier.maxQuantity),
      discount: parseDecimal(tier.discountPercent) / PERCENT,
    })),
  };
};

/**
 * Maps an API/rules path to the form field that shows it.
 *
 * `settings.taxRate` -> `taxRatePercent`, `settings.pricingTiers[2].discount`
 * -> `pricingTiers.2.discountPercent`, and so on.
 */
export const fieldForIssuePath = (path: string): string =>
  path
    .replace(/^settings\./, '')
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/^taxRate$/, 'taxRatePercent')
    .replace(/\.discount$/, '.discountPercent');

/** Groups issues by form field, keeping the first issue reported for each. */
export const toFieldErrors = (issues: SettingsIssue[]): SettingsFieldErrors =>
  issues.reduce<SettingsFieldErrors>((errors, issue) => {
    const field = fieldForIssuePath(issue.path);
    if (!errors[field]) errors[field] = issue;
    return errors;
  }, {});

export type SettingsFormValidation =
  { valid: true; settings: SystemSettings } | { valid: false; errors: SettingsFieldErrors };

export const validateSettingsForm = (form: SystemSettingsForm): SettingsFormValidation => {
  const result = validateSystemSettings(fromSettingsForm(form));
  return result.valid
    ? { valid: true, settings: result.settings }
    : { valid: false, errors: toFieldErrors(result.issues) };
};

/**
 * Splits the open-ended last tier: it gets an upper bound ten units above its
 * start, and a new open-ended tier with the same discount follows it.
 */
export const addPricingTier = (form: SystemSettingsForm): SystemSettingsForm => {
  const tiers = form.pricingTiers;
  if (tiers.length >= SETTINGS_LIMITS.tiers.max) return form;
  const last = tiers[tiers.length - 1];
  const lastMin = tierMinimums(tiers)[tiers.length - 1];
  return {
    ...form,
    pricingTiers: [
      ...tiers.slice(0, -1),
      { ...last, maxQuantity: String(lastMin + 9) },
      { maxQuantity: '', discountPercent: last.discountPercent },
    ],
  };
};

/** Removes a tier; when the last one goes, the one before it becomes open-ended. */
export const removePricingTier = (form: SystemSettingsForm, index: number): SystemSettingsForm => {
  const tiers = form.pricingTiers;
  if (tiers.length <= SETTINGS_LIMITS.tiers.min) return form;
  const remaining = tiers.filter((_tier, position) => position !== index);
  remaining[remaining.length - 1] = { ...remaining[remaining.length - 1], maxQuantity: '' };
  return { ...form, pricingTiers: remaining };
};

/** True when the form would save something different from `settings`. */
export const isSettingsFormDirty = (form: SystemSettingsForm, settings: SystemSettings): boolean =>
  JSON.stringify(form) !== JSON.stringify(toSettingsForm(settings));
