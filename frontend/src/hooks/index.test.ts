import { describe, it, expect } from 'vitest';

// Importing from the barrel index exercises the re-export statements.
import * as HooksIndex from './index';

describe('hooks/index barrel exports', () => {
  it('exports useQuotations', () => {
    expect(HooksIndex.useQuotations).toBeDefined();
    expect(typeof HooksIndex.useQuotations).toBe('function');
  });

  it('exports useQuotation', () => {
    expect(HooksIndex.useQuotation).toBeDefined();
    expect(typeof HooksIndex.useQuotation).toBe('function');
  });

  it('exports useProducts', () => {
    expect(HooksIndex.useProducts).toBeDefined();
    expect(typeof HooksIndex.useProducts).toBe('function');
  });

  it('exports useProduct', () => {
    expect(HooksIndex.useProduct).toBeDefined();
    expect(typeof HooksIndex.useProduct).toBe('function');
  });

  it('exports useOrders', () => {
    expect(HooksIndex.useOrders).toBeDefined();
    expect(typeof HooksIndex.useOrders).toBe('function');
  });

  it('exports useOrder', () => {
    expect(HooksIndex.useOrder).toBeDefined();
    expect(typeof HooksIndex.useOrder).toBe('function');
  });

  it('exports useQuoteCalculation', () => {
    expect(HooksIndex.useQuoteCalculation).toBeDefined();
    expect(typeof HooksIndex.useQuoteCalculation).toBe('function');
  });
});
