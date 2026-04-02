import { useState, useEffect, useCallback } from 'react';
import { productsService } from '../services/productsService';
import { Product } from '@shared/types';
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

export const useProduct = (id: number) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await productsService.getProductById(id);
        setProduct(data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  return { product, loading, error };
};
