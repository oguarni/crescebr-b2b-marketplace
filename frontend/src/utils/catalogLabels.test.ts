import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { LanguageProvider, useT } from '../contexts/LanguageContext';
import type { Language } from '../locales';
import { categoryLabel, formatSpecLabel } from './catalogLabels';

const translatorFor = (language: Language) =>
  renderHook(() => useT(), {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(LanguageProvider, { initialLanguage: language, children }),
  }).result.current;

describe('categoryLabel', () => {
  it('translates the seeded taxonomy', () => {
    const t = translatorFor('pt');
    expect(categoryLabel(t, 'Machinery')).toBe('Máquinas');
    expect(categoryLabel(t, 'Chemicals')).toBe('Químicos');
    expect(categoryLabel(translatorFor('en'), 'Machinery')).toBe('Machinery');
  });

  it('shows a category outside the taxonomy as stored', () => {
    const t = translatorFor('pt');
    expect(categoryLabel(t, 'Valves')).toBe('Valves');
    expect(categoryLabel(t, 'Raw Materials')).toBe('Raw Materials');
    // Names that collide with object internals are not mistaken for entries.
    expect(categoryLabel(t, 'constructor')).toBe('constructor');
  });
});

describe('formatSpecLabel', () => {
  it('turns camelCase and snake_case keys into readable labels', () => {
    expect(formatSpecLabel('flashPoint')).toBe('Flash point');
    expect(formatSpecLabel('io_count')).toBe('Io count');
    expect(formatSpecLabel('material')).toBe('Material');
  });
});
