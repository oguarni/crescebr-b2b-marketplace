import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useQuoteCalculation } from '../useQuoteCalculation';

vi.mock('../../services/quotationsService', () => ({
  quotationsService: {
    calculateQuote: vi.fn(),
  },
}));

import { quotationsService } from '../../services/quotationsService';

const mockItems = [
  { productId: 1, quantity: 10 },
  { productId: 2, quantity: 5 },
];

const mockCalculationResult = {
  calculations: {
    items: [
      {
        productId: 1,
        basePrice: 100,
        quantity: 10,
        tierDiscount: 0.1,
        unitPriceAfterDiscount: 90,
        subtotal: 900,
        shippingCost: 50,
        tax: 90,
        total: 1040,
        savings: 100,
        appliedTier: null,
      },
    ],
    totalSubtotal: 900,
    totalShipping: 50,
    totalTax: 90,
    grandTotal: 1040,
    totalSavings: 100,
  },
  summary: {
    totalItems: 1,
    subtotal: '900.00',
    shipping: '50.00',
    tax: '90.00',
    total: '1040.00',
    savings: '100.00',
  },
};

describe('useQuoteCalculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useQuoteCalculation());

    expect(result.current.calculation).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should calculate quote successfully', async () => {
    vi.mocked(quotationsService.calculateQuote).mockResolvedValueOnce(mockCalculationResult);

    const { result } = renderHook(() => useQuoteCalculation());

    let returnedResult: unknown;
    await act(async () => {
      returnedResult = await result.current.calculate(mockItems);
    });

    expect(result.current.calculation).toEqual(mockCalculationResult);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(returnedResult).toEqual(mockCalculationResult);
    expect(quotationsService.calculateQuote).toHaveBeenCalledWith(mockItems, undefined);
  });

  it('should pass options to calculateQuote', async () => {
    vi.mocked(quotationsService.calculateQuote).mockResolvedValueOnce(mockCalculationResult);

    const { result } = renderHook(() => useQuoteCalculation());
    const options = { buyerLocation: 'SP', shippingMethod: 'express' as const };

    await act(async () => {
      await result.current.calculate(mockItems, options);
    });

    expect(quotationsService.calculateQuote).toHaveBeenCalledWith(mockItems, options);
  });

  it('should handle calculation error', async () => {
    const error = new Error('Calculation failed');
    vi.mocked(quotationsService.calculateQuote).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useQuoteCalculation());

    await act(async () => {
      try {
        await result.current.calculate(mockItems);
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('Calculation failed');
    expect(result.current.calculation).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should handle non-Error calculation failure', async () => {
    vi.mocked(quotationsService.calculateQuote).mockRejectedValueOnce('unknown error');

    const { result } = renderHook(() => useQuoteCalculation());

    await act(async () => {
      try {
        await result.current.calculate(mockItems);
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('An unexpected error occurred');
  });

  it('should set loading state during calculation', async () => {
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    vi.mocked(quotationsService.calculateQuote).mockReturnValueOnce(pendingPromise as never);

    const { result } = renderHook(() => useQuoteCalculation());

    expect(result.current.loading).toBe(false);

    let calculatePromise: Promise<unknown>;
    act(() => {
      calculatePromise = result.current.calculate(mockItems);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolvePromise!(mockCalculationResult);
      await calculatePromise!;
    });

    expect(result.current.loading).toBe(false);
  });

  it('should reset calculation and error', async () => {
    vi.mocked(quotationsService.calculateQuote).mockResolvedValueOnce(mockCalculationResult);

    const { result } = renderHook(() => useQuoteCalculation());

    await act(async () => {
      await result.current.calculate(mockItems);
    });

    expect(result.current.calculation).toEqual(mockCalculationResult);

    act(() => {
      result.current.reset();
    });

    expect(result.current.calculation).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should re-throw error on failure', async () => {
    const error = new Error('Calculation failed');
    vi.mocked(quotationsService.calculateQuote).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useQuoteCalculation());

    let caughtError: unknown;
    await act(async () => {
      try {
        await result.current.calculate(mockItems);
      } catch (err) {
        caughtError = err;
      }
    });

    expect(caughtError).toBe(error);
  });

  it('should clear previous error on new calculation', async () => {
    vi.mocked(quotationsService.calculateQuote).mockRejectedValueOnce(new Error('First error'));

    const { result } = renderHook(() => useQuoteCalculation());

    await act(async () => {
      try {
        await result.current.calculate(mockItems);
      } catch {
        // Expected
      }
    });

    expect(result.current.error).toBe('First error');

    vi.mocked(quotationsService.calculateQuote).mockResolvedValueOnce(mockCalculationResult);

    await act(async () => {
      await result.current.calculate(mockItems);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.calculation).toEqual(mockCalculationResult);
  });
});
