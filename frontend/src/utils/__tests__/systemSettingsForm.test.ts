import { describe, expect, it } from 'vitest';
import type { SystemSettings } from '@shared/types';
import { DEFAULT_SYSTEM_SETTINGS } from '../systemSettingsRules';
import {
  addPricingTier,
  fieldForIssuePath,
  fromSettingsForm,
  isSettingsFormDirty,
  parseDecimal,
  removePricingTier,
  tierMinimums,
  toFieldErrors,
  toSettingsForm,
  validateSettingsForm,
  type SystemSettingsForm,
} from '../systemSettingsForm';

const defaultsForm = (): SystemSettingsForm => toSettingsForm(DEFAULT_SYSTEM_SETTINGS);

describe('parseDecimal', () => {
  it.each([
    ['18', 18],
    ['18,5', 18.5],
    ['18.5', 18.5],
    [' 7 ', 7],
    ['.5', 0.5],
    ['3.', 3],
    ['-1', -1],
  ])('reads %p as %p', (raw, expected) => {
    expect(parseDecimal(raw)).toBe(expected);
  });

  it.each(['', '  ', 'abc', '1,2,3', '1e3', '18%'])('rejects %p', raw => {
    expect(parseDecimal(raw)).toBeNaN();
  });
});

describe('toSettingsForm / fromSettingsForm', () => {
  it('shows rates as percentages without float noise and round-trips', () => {
    const settings: SystemSettings = {
      ...DEFAULT_SYSTEM_SETTINGS,
      taxRate: 0.07,
      pricingTiers: [
        { minQuantity: 1, maxQuantity: 10, discount: 0.1 },
        { minQuantity: 11, maxQuantity: null, discount: 0.15 },
      ],
    };

    const form = toSettingsForm(settings);

    expect(form.taxRatePercent).toBe('7');
    expect(form.pricingTiers).toEqual([
      { maxQuantity: '10', discountPercent: '10' },
      { maxQuantity: '', discountPercent: '15' },
    ]);
    expect(validateSettingsForm(form)).toEqual({ valid: true, settings });
  });

  it('accepts a comma as the decimal separator', () => {
    const form = { ...defaultsForm(), taxRatePercent: '12,5' };
    expect(fromSettingsForm(form).taxRate).toBe(0.125);
  });

  it('derives each tier start from the previous upper bound', () => {
    expect(tierMinimums(defaultsForm().pricingTiers)).toEqual([1, 11, 51, 101, 501]);
  });

  it('keeps later tiers sane when an upper bound does not parse', () => {
    const tiers = [
      { maxQuantity: 'ten', discountPercent: '0' },
      { maxQuantity: '', discountPercent: '5' },
    ];
    expect(tierMinimums(tiers)).toEqual([1, 2]);
  });
});

describe('validateSettingsForm', () => {
  it('places each problem on the field the admin edits', () => {
    const form = defaultsForm();
    form.taxRatePercent = '80';
    form.shippingMethods.express.deliveryDays = '';
    form.pricingTiers[2].discountPercent = '1';

    const result = validateSettingsForm(form);

    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(Object.keys(result.errors).sort()).toEqual([
      'pricingTiers.2.discountPercent',
      'shippingMethods.express.deliveryDays',
      'taxRatePercent',
    ]);
    expect(result.errors.taxRatePercent).toMatchObject({
      code: 'range',
      params: { min: 0, max: 0.5 },
    });
  });

  it('flags an upper bound below the start of its tier', () => {
    const form = defaultsForm();
    form.pricingTiers[1].maxQuantity = '5';
    const result = validateSettingsForm(form);
    expect(!result.valid && result.errors['pricingTiers.1.maxQuantity']?.code).toBe(
      'tierMaxBelowMin'
    );
  });
});

describe('fieldForIssuePath / toFieldErrors', () => {
  it.each([
    ['settings.taxRate', 'taxRatePercent'],
    ['settings.quotationValidityDays', 'quotationValidityDays'],
    ['settings.shippingMethods.economy.perKgRate', 'shippingMethods.economy.perKgRate'],
    ['settings.shippingMethods', 'shippingMethods'],
    ['settings.pricingTiers', 'pricingTiers'],
    ['settings.pricingTiers[3].discount', 'pricingTiers.3.discountPercent'],
    ['settings.pricingTiers[0].maxQuantity', 'pricingTiers.0.maxQuantity'],
  ])('maps %s to %s', (path, field) => {
    expect(fieldForIssuePath(path)).toBe(field);
  });

  it('keeps the first issue reported for a field', () => {
    const errors = toFieldErrors([
      { path: 'settings.taxRate', code: 'invalid' },
      { path: 'settings.taxRate', code: 'range' },
    ]);
    expect(errors).toEqual({ taxRatePercent: { path: 'settings.taxRate', code: 'invalid' } });
  });
});

describe('addPricingTier / removePricingTier', () => {
  it('splits the open-ended tier and keeps its discount', () => {
    const next = addPricingTier(defaultsForm());
    expect(next.pricingTiers.slice(-2)).toEqual([
      { maxQuantity: '510', discountPercent: '20' },
      { maxQuantity: '', discountPercent: '20' },
    ]);
    expect(validateSettingsForm(next).valid).toBe(true);
  });

  it('stops at the maximum number of tiers', () => {
    let form = defaultsForm();
    for (let i = 0; i < 10; i += 1) form = addPricingTier(form);
    expect(form.pricingTiers).toHaveLength(10);
    expect(addPricingTier(form)).toBe(form);
  });

  it('makes the new last tier open-ended when the last one is removed', () => {
    const next = removePricingTier(defaultsForm(), 4);
    expect(next.pricingTiers).toHaveLength(4);
    expect(next.pricingTiers[3]).toEqual({ maxQuantity: '', discountPercent: '15' });
    expect(validateSettingsForm(next).valid).toBe(true);
  });

  it('closes the gap when a middle tier is removed', () => {
    const next = removePricingTier(defaultsForm(), 1);
    expect(tierMinimums(next.pricingTiers)).toEqual([1, 11, 101, 501]);
  });

  it('never removes the only tier', () => {
    const single = toSettingsForm({
      ...DEFAULT_SYSTEM_SETTINGS,
      pricingTiers: [{ minQuantity: 1, maxQuantity: null, discount: 0 }],
    });
    expect(removePricingTier(single, 0)).toBe(single);
  });
});

describe('isSettingsFormDirty', () => {
  it('compares the form against saved settings', () => {
    const form = defaultsForm();
    expect(isSettingsFormDirty(form, DEFAULT_SYSTEM_SETTINGS)).toBe(false);
    expect(isSettingsFormDirty({ ...form, taxRatePercent: '19' }, DEFAULT_SYSTEM_SETTINGS)).toBe(
      true
    );
  });
});
