import { useState, useCallback } from 'react';
import { quotationsService } from '../services/quotationsService';

interface QuoteItem {
  productId: number;
  quantity: number;
}

interface CalculationOptions {
  buyerLocation?: string;
  supplierLocation?: string;
  shippingMethod?: 'standard' | 'express' | 'economy';
}

export const useQuoteCalculation = () => {
  const [calculation, setCalculation] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async (items: QuoteItem[], options?: CalculationOptions) => {
    setLoading(true);
    setError(null);
    try {
      const result = await quotationsService.calculateQuote(items, options);
      setCalculation(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Calculation failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setCalculation(null);
    setError(null);
  }, []);

  return { calculation, loading, error, calculate, reset };
};
