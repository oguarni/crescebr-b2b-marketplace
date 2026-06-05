import { describe, it, expect } from 'vitest';
import { formatBRL } from './currency';

// Non-breaking space (U+00A0) is what Intl.NumberFormat inserts after "R$".
const nbsp = ' ';

describe('formatBRL', () => {
  it('formats a number as Brazilian Real', () => {
    expect(formatBRL(1500)).toBe(`R$${nbsp}1.500,00`);
  });

  it('formats zero', () => {
    expect(formatBRL(0)).toBe(`R$${nbsp}0,00`);
  });

  // Sequelize returns DECIMAL columns as strings under PostgreSQL; these must
  // not collapse to "R$ 0,00" the way Number.isFinite(string) would force.
  it('coerces numeric strings (PostgreSQL DECIMAL serialization)', () => {
    expect(formatBRL('15000.00')).toBe(`R$${nbsp}15.000,00`);
    expect(formatBRL('850')).toBe(`R$${nbsp}850,00`);
  });

  it('falls back to 0 for nullish values', () => {
    expect(formatBRL(null)).toBe(`R$${nbsp}0,00`);
    expect(formatBRL(undefined)).toBe(`R$${nbsp}0,00`);
  });

  it('falls back to 0 for non-numeric strings', () => {
    expect(formatBRL('not-a-number')).toBe(`R$${nbsp}0,00`);
  });
});
