import { useState, useEffect, useCallback } from 'react';
import { quotationsService } from '../services/quotationsService';
import { Quotation } from '@shared/types';

interface UseQuotationsOptions {
  autoFetch?: boolean;
}

export const useQuotations = (options: UseQuotationsOptions = { autoFetch: true }) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await quotationsService.getCustomerQuotations();
      setQuotations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options.autoFetch) {
      fetchQuotations();
    }
  }, [options.autoFetch, fetchQuotations]);

  return {
    quotations,
    loading,
    error,
    refetch: fetchQuotations,
  };
};

export const useQuotation = (id: number) => {
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        const data = await quotationsService.getQuotationById(id);
        setQuotation(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch quotation');
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [id]);

  return { quotation, loading, error };
};
