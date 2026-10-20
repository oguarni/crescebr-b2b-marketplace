import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { LanguageProvider, useT } from '../contexts/LanguageContext';
import type { Language } from '../locales';
import { orderStatusLabel, orderTimelineDescription } from './orderStatus';

const translatorFor = (language: Language) =>
  renderHook(() => useT(), {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(LanguageProvider, { initialLanguage: language, children }),
  }).result.current;

describe('orderStatusLabel', () => {
  it('translates known statuses and keeps unknown ones as sent', () => {
    expect(orderStatusLabel(translatorFor('pt'), 'shipped')).toBe('Enviado');
    expect(orderStatusLabel(translatorFor('en'), 'shipped')).toBe('Shipped');
    expect(orderStatusLabel(translatorFor('pt'), 'returned')).toBe('returned');
  });
});

describe('orderTimelineDescription', () => {
  it('replaces the API sentence with the translation for its status', () => {
    expect(orderTimelineDescription(translatorFor('pt'), 'shipped', 'Order has been shipped')).toBe(
      'Pedido enviado'
    );
  });

  // The English dictionary must stay word-for-word with
  // OrderStatusService.getStatusDescription, or English visitors would see
  // different text from what the API sends.
  it('matches the API wording in English', () => {
    const t = translatorFor('en');
    expect(orderTimelineDescription(t, 'pending', '')).toBe('Order placed, awaiting processing');
    expect(orderTimelineDescription(t, 'shipped', '')).toBe('Order has been shipped');
  });

  it('keeps the API text for a status the client does not know', () => {
    expect(orderTimelineDescription(translatorFor('pt'), 'returned', 'Order returned')).toBe(
      'Order returned'
    );
  });
});
