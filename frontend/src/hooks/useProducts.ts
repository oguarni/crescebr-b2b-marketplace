import { useState, useEffect, useCallback } from 'react';
import { productsService } from '../services/productsService';
import { Product } from '@shared/types';
import { isAxiosError } from 'axios';
import { getErrorMessage } from '../utils/errorHandler';

interface UseProductsOptions {
  autoFetch?: boolean;
  filters?: Record<string, string | number | boolean>;
}

export const useProducts = (options: UseProductsOptions = {}) => {
  const { autoFetch = true, filters } = options;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productsService.getAllProducts(filters || {});
      setProducts(response.products);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (autoFetch) {
      fetchProducts();
    }
  }, [autoFetch, fetchProducts]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  };
};

interface ProductState {
  product: Product | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
}

export interface UseProductResult extends ProductState {
  refetch: () => void;
}

/** Product ids are positive integers; anything else can never match one. */
export const isValidProductId = (id: number): boolean => Number.isInteger(id) && id > 0;

/**
 * Loads one product by id.
 *
 * A 404 and an id that cannot exist both report `notFound` rather than an
 * error, so a page can tell a missing product from a failure worth retrying.
 * Only the response for the latest id may update the state: navigating from
 * one product to the next must never show the previous product's answer.
 */
export const useProduct = (id: number): UseProductResult => {
  const validId = isValidProductId(id);
  const [state, setState] = useState<ProductState>({
    product: null,
    loading: validId,
    error: null,
    notFound: false,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!validId) return;
    let current = true;
    setState({ product: null, loading: true, error: null, notFound: false });

    productsService
      .getProductById(id)
      .then(product => {
        if (current) setState({ product, loading: false, error: null, notFound: false });
      })
      .catch((err: unknown) => {
        if (!current) return;
        const notFound = isAxiosError(err) && err.response?.status === 404;
        setState({
          product: null,
          loading: false,
          error: notFound ? null : getErrorMessage(err),
          notFound,
        });
      });

    return () => {
      current = false;
    };
  }, [id, validId, attempt]);

  const refetch = useCallback(() => setAttempt(n => n + 1), []);

  if (!validId) {
    return { product: null, loading: false, error: null, notFound: true, refetch };
  }
  return { ...state, refetch };
};
