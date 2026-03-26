import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useProducts, useProduct } from '../useProducts';

vi.mock('../../services/productsService', () => ({
  productsService: {
    getAllProducts: vi.fn(),
    getProductById: vi.fn(),
  },
}));

import { productsService } from '../../services/productsService';

const mockProducts = [
  {
    id: 1,
    name: 'Product A',
    description: 'Description A',
    price: 100,
    imageUrl: 'https://example.com/a.jpg',
    category: 'Electronics',
    supplierId: 1,
    unitPrice: 100,
    minimumOrderQuantity: 1,
    leadTime: 7,
    availability: 'in_stock',
    specifications: {},
    tierPricing: [],
  },
  {
    id: 2,
    name: 'Product B',
    description: 'Description B',
    price: 200,
    imageUrl: 'https://example.com/b.jpg',
    category: 'Electronics',
    supplierId: 2,
    unitPrice: 200,
    minimumOrderQuantity: 5,
    leadTime: 14,
    availability: 'in_stock',
    specifications: {},
    tierPricing: [],
  },
];

describe('useProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch products on mount with autoFetch=true (default)', async () => {
    vi.mocked(productsService.getAllProducts).mockResolvedValueOnce({
      products: mockProducts,
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    const { result } = renderHook(() => useProducts());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.products).toEqual(mockProducts);
    expect(result.current.error).toBeNull();
    expect(productsService.getAllProducts).toHaveBeenCalledTimes(1);
  });

  it('should not fetch products with autoFetch=false', async () => {
    const { result } = renderHook(() => useProducts({ autoFetch: false }));

    // Give a tick for any potential async effects
    await waitFor(() => {
      expect(productsService.getAllProducts).not.toHaveBeenCalled();
    });

    expect(result.current.products).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('should handle fetch error', async () => {
    vi.mocked(productsService.getAllProducts).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.products).toEqual([]);
  });

  it('should handle non-Error fetch failure', async () => {
    vi.mocked(productsService.getAllProducts).mockRejectedValueOnce('unknown error');

    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch products');
  });

  it('should refetch products when refetch is called', async () => {
    vi.mocked(productsService.getAllProducts).mockResolvedValueOnce({
      products: mockProducts,
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatedProducts = [mockProducts[0]];
    vi.mocked(productsService.getAllProducts).mockResolvedValueOnce({
      products: updatedProducts,
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.products).toEqual(updatedProducts);
    expect(productsService.getAllProducts).toHaveBeenCalledTimes(2);
  });

  it('should pass filters to getAllProducts', async () => {
    vi.mocked(productsService.getAllProducts).mockResolvedValueOnce({
      products: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });

    const filters = { category: 'Electronics' };
    renderHook(() => useProducts({ autoFetch: true, filters }));

    await waitFor(() => {
      expect(productsService.getAllProducts).toHaveBeenCalledWith(filters);
    });
  });

  it('should clear error on refetch', async () => {
    vi.mocked(productsService.getAllProducts).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    vi.mocked(productsService.getAllProducts).mockResolvedValueOnce({
      products: mockProducts,
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.products).toEqual(mockProducts);
  });
});

describe('useProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch product by id', async () => {
    const mockProduct = mockProducts[0];
    vi.mocked(productsService.getProductById).mockResolvedValueOnce(mockProduct);

    const { result } = renderHook(() => useProduct(1));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.product).toEqual(mockProduct);
    expect(result.current.error).toBeNull();
    expect(productsService.getProductById).toHaveBeenCalledWith(1);
  });

  it('should handle fetch error', async () => {
    vi.mocked(productsService.getProductById).mockRejectedValueOnce(new Error('Product not found'));

    const { result } = renderHook(() => useProduct(999));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Product not found');
    expect(result.current.product).toBeNull();
  });

  it('should handle non-Error fetch failure', async () => {
    vi.mocked(productsService.getProductById).mockRejectedValueOnce('unknown');

    const { result } = renderHook(() => useProduct(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch product');
  });

  it('should not fetch when id is falsy', async () => {
    const { result } = renderHook(() => useProduct(0));

    // Wait a tick to confirm no call was made
    await waitFor(() => {
      expect(productsService.getProductById).not.toHaveBeenCalled();
    });

    expect(result.current.product).toBeNull();
    expect(result.current.loading).toBe(true);
  });
});
