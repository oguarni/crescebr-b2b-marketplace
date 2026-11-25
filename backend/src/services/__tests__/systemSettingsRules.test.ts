import {
  DEFAULT_SYSTEM_SETTINGS,
  describeSettingsIssue,
  validateSystemSettings,
  type SettingsIssue,
} from '../systemSettingsRules';
import type { SystemSettings } from '../../types';

const clone = (): SystemSettings => JSON.parse(JSON.stringify(DEFAULT_SYSTEM_SETTINGS));

const issuesOf = (input: unknown): SettingsIssue[] => {
  const result = validateSystemSettings(input);
  if (result.valid) throw new Error('expected the document to be rejected');
  return result.issues;
};

describe('validateSystemSettings', () => {
  it('accepts the defaults unchanged', () => {
    expect(validateSystemSettings(clone())).toEqual({
      valid: true,
      settings: DEFAULT_SYSTEM_SETTINGS,
    });
  });

  it('drops unknown fields and rounds to the precision the form offers', () => {
    const input = {
      ...clone(),
      taxRate: 0.123456,
      injected: 'ignored',
      shippingMethods: {
        ...clone().shippingMethods,
        standard: { baseRate: 49.999, perKgRate: 2.555, deliveryDays: 5, extra: true },
      },
    };

    const result = validateSystemSettings(input);

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.settings).not.toHaveProperty('injected');
    expect(result.settings.taxRate).toBe(0.1235);
    expect(result.settings.shippingMethods.standard).toEqual({
      baseRate: 50,
      perKgRate: 2.56,
      deliveryDays: 5,
    });
  });

  it.each([null, undefined, 'settings', 42, []])('rejects a non-object document (%p)', input => {
    const paths = issuesOf(input).map(issue => issue.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'settings.taxRate',
        'settings.quotationValidityDays',
        'settings.shippingMethods.express.baseRate',
        'settings.pricingTiers',
      ])
    );
  });

  it.each([
    ['a string', '0.18', 'invalid'],
    ['NaN', Number.NaN, 'invalid'],
    ['Infinity', Number.POSITIVE_INFINITY, 'invalid'],
    ['a negative rate', -0.01, 'range'],
    ['18 typed for 18%', 18, 'range'],
  ])('rejects a tax rate given as %s', (_label, taxRate, code) => {
    expect(issuesOf({ ...clone(), taxRate })).toEqual([
      expect.objectContaining({ path: 'settings.taxRate', code }),
    ]);
  });

  it.each([
    [0, 'range'],
    [181, 'range'],
    [7.5, 'integer'],
  ])('rejects a quotation validity of %p days', (quotationValidityDays, code) => {
    expect(issuesOf({ ...clone(), quotationValidityDays })).toEqual([
      expect.objectContaining({ path: 'settings.quotationValidityDays', code }),
    ]);
  });

  it('accepts the boundary values', () => {
    const settings = clone();
    settings.taxRate = 0.5;
    settings.quotationValidityDays = 180;
    settings.shippingMethods.express = { baseRate: 0, perKgRate: 0, deliveryDays: 1 };
    settings.shippingMethods.economy.deliveryDays = 60;
    expect(validateSystemSettings(settings).valid).toBe(true);
  });

  it('names the exact field of an invalid shipping rate', () => {
    const settings = clone();
    settings.shippingMethods.express.baseRate = -1;
    settings.shippingMethods.economy.perKgRate = 10001;
    (settings.shippingMethods.standard as unknown as Record<string, unknown>).deliveryDays = 2.5;

    expect(issuesOf(settings)).toEqual([
      {
        path: 'settings.shippingMethods.express.baseRate',
        code: 'range',
        params: { min: 0, max: 100000 },
      },
      { path: 'settings.shippingMethods.standard.deliveryDays', code: 'integer' },
      {
        path: 'settings.shippingMethods.economy.perKgRate',
        code: 'range',
        params: { min: 0, max: 10000 },
      },
    ]);
  });

  it('rejects a missing shipping method', () => {
    const settings = clone() as unknown as { shippingMethods: Record<string, unknown> };
    delete settings.shippingMethods.economy;
    expect(issuesOf(settings).map(issue => issue.path)).toEqual([
      'settings.shippingMethods.economy.baseRate',
      'settings.shippingMethods.economy.perKgRate',
      'settings.shippingMethods.economy.deliveryDays',
    ]);
  });

  it('keeps express no slower than standard, and standard no slower than economy', () => {
    const slowExpress = clone();
    slowExpress.shippingMethods.express.deliveryDays = 6;
    expect(issuesOf(slowExpress)).toEqual([
      { path: 'settings.shippingMethods', code: 'deliveryOrder' },
    ]);

    const slowStandard = clone();
    slowStandard.shippingMethods.standard.deliveryDays = 11;
    expect(issuesOf(slowStandard)).toEqual([
      { path: 'settings.shippingMethods', code: 'deliveryOrder' },
    ]);

    const equal = clone();
    equal.shippingMethods.express.deliveryDays = 5;
    expect(validateSystemSettings(equal).valid).toBe(true);
  });

  describe('pricing tiers', () => {
    const withTiers = (pricingTiers: unknown) => ({ ...clone(), pricingTiers });

    it.each([[undefined], [[]], ['tiers'], [new Array(11).fill({})]])(
      'requires between 1 and 10 tiers (%p)',
      pricingTiers => {
        expect(issuesOf(withTiers(pricingTiers))).toEqual([
          { path: 'settings.pricingTiers', code: 'tierCount', params: { min: 1, max: 10 } },
        ]);
      }
    );

    it('accepts a single open-ended tier', () => {
      const tiers = [{ minQuantity: 1, maxQuantity: null, discount: 0 }];
      expect(validateSystemSettings(withTiers(tiers))).toMatchObject({ valid: true });
    });

    it('treats a missing maxQuantity on the last tier as open-ended', () => {
      const tiers = [{ minQuantity: 1, discount: 0.1 }];
      const result = validateSystemSettings(withTiers(tiers));
      expect(result.valid && result.settings.pricingTiers).toEqual([
        { minQuantity: 1, maxQuantity: null, discount: 0.1 },
      ]);
    });

    it('requires the first tier to start at 1', () => {
      const tiers = [{ minQuantity: 2, maxQuantity: null, discount: 0 }];
      expect(issuesOf(withTiers(tiers))).toEqual([
        { path: 'settings.pricingTiers[0].minQuantity', code: 'tierFirstMin' },
      ]);
    });

    it('rejects gaps and overlaps between tiers', () => {
      const gap = [
        { minQuantity: 1, maxQuantity: 10, discount: 0 },
        { minQuantity: 12, maxQuantity: null, discount: 0.1 },
      ];
      expect(issuesOf(withTiers(gap))).toEqual([
        {
          path: 'settings.pricingTiers[1].minQuantity',
          code: 'tierGap',
          params: { expected: 11 },
        },
      ]);

      const overlap = [
        { minQuantity: 1, maxQuantity: 10, discount: 0 },
        { minQuantity: 10, maxQuantity: null, discount: 0.1 },
      ];
      expect(issuesOf(withTiers(overlap))[0]).toMatchObject({ code: 'tierGap' });
    });

    it('requires only the last tier to be open-ended', () => {
      const earlyOpen = [
        { minQuantity: 1, maxQuantity: null, discount: 0 },
        { minQuantity: 11, maxQuantity: null, discount: 0.1 },
      ];
      expect(issuesOf(withTiers(earlyOpen))).toEqual([
        { path: 'settings.pricingTiers[0].maxQuantity', code: 'tierOpenEnded' },
      ]);

      const closedLast = [{ minQuantity: 1, maxQuantity: 10, discount: 0 }];
      expect(issuesOf(withTiers(closedLast))).toEqual([
        { path: 'settings.pricingTiers[0].maxQuantity', code: 'tierOpenEnded' },
      ]);
    });

    it('rejects a maximum below the minimum', () => {
      const tiers = [
        { minQuantity: 1, maxQuantity: 0, discount: 0 },
        { minQuantity: 1, maxQuantity: null, discount: 0 },
      ];
      expect(issuesOf(withTiers(tiers))).toEqual(
        expect.arrayContaining([
          {
            path: 'settings.pricingTiers[0].maxQuantity',
            code: 'range',
            params: { min: 1, max: 1000000 },
          },
        ])
      );

      const below = [
        { minQuantity: 1, maxQuantity: 5, discount: 0 },
        { minQuantity: 6, maxQuantity: 3, discount: 0 },
        { minQuantity: 4, maxQuantity: null, discount: 0 },
      ];
      expect(issuesOf(withTiers(below))).toEqual([
        { path: 'settings.pricingTiers[1].maxQuantity', code: 'tierMaxBelowMin' },
      ]);
    });

    it('never lets a larger volume earn a smaller discount', () => {
      const tiers = [
        { minQuantity: 1, maxQuantity: 10, discount: 0.1 },
        { minQuantity: 11, maxQuantity: null, discount: 0.05 },
      ];
      expect(issuesOf(withTiers(tiers))).toEqual([
        { path: 'settings.pricingTiers[1].discount', code: 'tierDiscountOrder' },
      ]);
    });

    it('reports invalid tier fields without cascading errors', () => {
      const tiers = [
        { minQuantity: 'one', maxQuantity: 10, discount: 0.95 },
        { minQuantity: 11, maxQuantity: 'many', discount: 0.1 },
        { minQuantity: 2.5, maxQuantity: null, discount: 'x' },
        'not a tier',
      ];
      expect(issuesOf(withTiers(tiers))).toEqual([
        { path: 'settings.pricingTiers[0].minQuantity', code: 'invalid' },
        { path: 'settings.pricingTiers[0].discount', code: 'range', params: { min: 0, max: 0.9 } },
        { path: 'settings.pricingTiers[1].maxQuantity', code: 'invalid' },
        { path: 'settings.pricingTiers[2].minQuantity', code: 'integer' },
        { path: 'settings.pricingTiers[2].discount', code: 'invalid' },
        { path: 'settings.pricingTiers[2].maxQuantity', code: 'tierOpenEnded' },
        { path: 'settings.pricingTiers[3].minQuantity', code: 'invalid' },
        { path: 'settings.pricingTiers[3].discount', code: 'invalid' },
      ]);
    });
  });
});

describe('describeSettingsIssue', () => {
  it.each<[SettingsIssue, string]>([
    [{ path: 'p', code: 'invalid' }, 'Must be a number'],
    [{ path: 'p', code: 'integer' }, 'Must be a whole number'],
    [{ path: 'p', code: 'range', params: { min: 1, max: 9 } }, 'Must be between 1 and 9'],
    [
      { path: 'p', code: 'tierCount', params: { min: 1, max: 10 } },
      'Define between 1 and 10 tiers',
    ],
    [{ path: 'p', code: 'tierFirstMin' }, 'The first tier must start at quantity 1'],
    [
      { path: 'p', code: 'tierGap', params: { expected: 11 } },
      'Must be 11, right after the previous tier',
    ],
    [
      { path: 'p', code: 'tierMaxBelowMin' },
      'Must be greater than or equal to the minimum quantity',
    ],
    [{ path: 'p', code: 'tierOpenEnded' }, 'Only the last tier is open-ended, and it must be'],
    [{ path: 'p', code: 'tierDiscountOrder' }, 'A larger volume cannot get a smaller discount'],
    [
      { path: 'p', code: 'deliveryOrder' },
      'Express must be at most standard, and standard at most economy',
    ],
  ])('describes %j', (issue, message) => {
    expect(describeSettingsIssue(issue)).toBe(message);
  });
});
