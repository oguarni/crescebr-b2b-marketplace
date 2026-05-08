import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { act } from '@testing-library/react';
import { beforeEach, afterEach } from 'vitest';

// Configure testing library to better handle async updates
configure({
  // Automatically wrap async operations in act()
  asyncUtilTimeout: 5000,
});

// Global act wrapper for all tests
(global as unknown as Record<string, unknown>).act = act;

// Mock recharts to avoid heavy SVG rendering in JSDOM
import React from 'react';
import { vi } from 'vitest';
vi.mock('recharts', async () => {
  const Original = await vi.importActual('recharts');
  return {
    ...(Original as Record<string, unknown>),
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
    LineChart: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'mock-line-chart' }, children),
    BarChart: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'mock-bar-chart' }, children),
    PieChart: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'mock-pie-chart' }, children),
  };
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
};

// Bypass heavy layout calculations in tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // Deprecated
    removeListener: () => {}, // Deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

window.getComputedStyle = (element: Element) => {
  return {
    ...element,
    getPropertyValue: (prop: string) => {
      const htmlElement = element as HTMLElement;
      if (htmlElement.style && typeof htmlElement.style.getPropertyValue === 'function') {
        const val = htmlElement.style.getPropertyValue(prop);
        if (val) return val;
        // Fallback for some inline styles accessed as camelCase
        const camelProp = prop.replace(/-([a-z])/g, g => g[1].toUpperCase());
        return (htmlElement.style as unknown as Record<string, string>)[camelProp] || '';
      }
      return '';
    },
  } as unknown as Record<string, unknown>;
};

// Suppress React Router warnings in tests
const originalError = console.error;
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('React Router Future Flag Warning')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  console.error = originalError;
});
