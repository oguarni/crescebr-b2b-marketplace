import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { LanguageProvider, useT } from '../contexts/LanguageContext';
import type { Language } from '../locales';
import {
  DEFAULT_CATALOG_FILTERS,
  LEAD_TIME_LIMITS,
  MOQ_LIMITS,
  PRICE_LIMITS,
  describeLeadTime,
  fromSpecOptions,
  fromStopIndex,
  getActiveFilters,
  toProductQuery,
  toSpecOptions,
  toStopIndex,
  type CatalogFilters,
} from './catalogFilters';

// The real translator, so labels are asserted as visitors read them.
const translatorFor = (language: Language) =>
  renderHook(() => useT(), {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(LanguageProvider, { initialLanguage: language, children }),
  }).result.current;

const tPt = translatorFor('pt');
const tEn = translatorFor('en');

// Intl.NumberFormat puts a non-breaking space (U+00A0) after "R$".
const nbsp = '\u00a0';

const withFilters = (patch: Partial<CatalogFilters>): CatalogFilters => ({
  ...DEFAULT_CATALOG_FILTERS,
  ...patch,
});

describe('slider stops', () => {
  it.each([
    ['price', PRICE_LIMITS],
    ['MOQ', MOQ_LIMITS],
    ['lead time', LEAD_TIME_LIMITS],
  ])('%s stops rise strictly from min to max', (_, limits) => {
    expect(limits.stops[0]).toBe(limits.min);
    expect(limits.stops[limits.stops.length - 1]).toBe(limits.max);
    limits.stops.slice(1).forEach((stop, i) => expect(stop).toBeGreaterThan(limits.stops[i]));
  });

  it('maps values and positions both ways', () => {
    expect(toStopIndex(MOQ_LIMITS, 10)).toBe(2);
    expect(fromStopIndex(MOQ_LIMITS, 2)).toBe(10);
    // A value between stops takes the next stop up; one past the end, the last.
    expect(toStopIndex(MOQ_LIMITS, 11)).toBe(3);
    expect(toStopIndex(MOQ_LIMITS, 5000)).toBe(MOQ_LIMITS.stops.length - 1);
    expect(fromStopIndex(MOQ_LIMITS, 99)).toBe(MOQ_LIMITS.max);
  });
});

describe('toProductQuery', () => {
  it('sends nothing while every control rests on its default', () => {
    expect(toProductQuery(DEFAULT_CATALOG_FILTERS)).toEqual({});
  });

  it('treats a slider resting on its outer limit as no bound', () => {
    expect(
      toProductQuery(
        withFilters({ priceRange: [PRICE_LIMITS.min, 5000], moqRange: [10, MOQ_LIMITS.max] })
      )
    ).toEqual({ maxPrice: 5000, minMoq: 10 });
  });

  it('sends every narrowed constraint', () => {
    expect(
      toProductQuery({
        priceRange: [500, 5000],
        moqRange: [10, 100],
        maxLeadTime: 10,
        availability: ['in_stock', 'limited'],
        specifications: { material: 'Steel' },
      })
    ).toEqual({
      minPrice: 500,
      maxPrice: 5000,
      minMoq: 10,
      maxMoq: 100,
      maxLeadTime: 10,
      availability: ['in_stock', 'limited'],
      specifications: { material: 'Steel' },
    });
  });

  it('omits the lead time only at the slider maximum', () => {
    expect(toProductQuery(withFilters({ maxLeadTime: LEAD_TIME_LIMITS.max }))).toEqual({});
    expect(toProductQuery(withFilters({ maxLeadTime: 60 }))).toEqual({ maxLeadTime: 60 });
  });
});

describe('getActiveFilters', () => {
  it('is empty for the default filters', () => {
    expect(getActiveFilters(DEFAULT_CATALOG_FILTERS, tPt)).toEqual([]);
  });

  it('labels each constraint in Portuguese, in panel order', () => {
    const labels = getActiveFilters(
      {
        priceRange: [1000, 5000],
        moqRange: [MOQ_LIMITS.min, 100],
        maxLeadTime: 10,
        availability: ['custom_order'],
        specifications: { flashPoint: '62C' },
      },
      tPt
    ).map(filter => filter.label);

    expect(labels).toEqual([
      `Preço: R$${nbsp}1.000 – R$${nbsp}5.000`,
      'Pedido mínimo: até 100 un.',
      'Entrega em até 10 dias',
      'Sob encomenda',
      'Flash point: 62C',
    ]);
  });

  it('uses the singular for a one-day lead time', () => {
    expect(getActiveFilters(withFilters({ maxLeadTime: 1 }), tPt)[0].label).toBe(
      'Entrega em até 1 dia'
    );
    expect(getActiveFilters(withFilters({ maxLeadTime: 1 }), tEn)[0].label).toBe(
      'Delivery within 1 day'
    );
  });

  it('describes a one-sided price bound', () => {
    const [from] = getActiveFilters(withFilters({ priceRange: [2000, PRICE_LIMITS.max] }), tEn);
    expect(from.label).toBe(`Price: from R$${nbsp}2.000`);
  });

  it('removes exactly one constraint when cleared', () => {
    const filters = withFilters({
      availability: ['in_stock', 'limited'],
      specifications: { material: 'Steel', color: 'Yellow' },
    });
    const active = getActiveFilters(filters, tEn);

    const withoutLimited = active.find(f => f.id === 'availability:limited')!.clear(filters);
    expect(withoutLimited.availability).toEqual(['in_stock']);

    const withoutMaterial = active.find(f => f.id === 'spec:material')!.clear(filters);
    expect(withoutMaterial.specifications).toEqual({ color: 'Yellow' });

    // The input is never mutated.
    expect(filters.availability).toEqual(['in_stock', 'limited']);
  });

  it('returns a range to its slider limits when cleared', () => {
    const filters = withFilters({ priceRange: [500, 5000], moqRange: [10, 100], maxLeadTime: 7 });
    const active = getActiveFilters(filters, tEn);
    const cleared = (id: string) => active.find(f => f.id === id)!.clear(filters);

    expect(cleared('price').priceRange).toEqual(DEFAULT_CATALOG_FILTERS.priceRange);
    expect(cleared('moq').moqRange).toEqual(DEFAULT_CATALOG_FILTERS.moqRange);
    expect(cleared('leadTime').maxLeadTime).toBe(DEFAULT_CATALOG_FILTERS.maxLeadTime);
    // Clearing one range keeps the others.
    expect(cleared('price').maxLeadTime).toBe(7);
  });
});

describe('describeLeadTime', () => {
  it('reads as no limit at the slider maximum', () => {
    expect(describeLeadTime(tPt, LEAD_TIME_LIMITS.max)).toBe('Qualquer prazo');
  });

  it('handles singular and plural', () => {
    expect(describeLeadTime(tPt, 1)).toBe('Até 1 dia');
    expect(describeLeadTime(tPt, 7)).toBe('Até 7 dias');
  });
});

describe('specification options', () => {
  it('flattens values and orders groups by their label', () => {
    expect(
      toSpecOptions({ voltage: ['24V'], flashPoint: ['62C'], material: ['HDPE', 'Steel'] })
    ).toEqual([
      { key: 'flashPoint', value: '62C' },
      { key: 'material', value: 'HDPE' },
      { key: 'material', value: 'Steel' },
      { key: 'voltage', value: '24V' },
    ]);
  });

  it('keeps the last value chosen for a key', () => {
    expect(
      fromSpecOptions([
        { key: 'material', value: 'Steel' },
        { key: 'color', value: 'Yellow' },
        { key: 'material', value: 'HDPE' },
      ])
    ).toEqual({ material: 'HDPE', color: 'Yellow' });
  });
});
