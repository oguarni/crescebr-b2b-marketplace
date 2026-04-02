import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOrders, useOrder } from '../useOrders';

vi.mock('../../services/ordersService', () => ({
  ordersService: {
    getUserOrders: vi.fn(),
    getOrderById: vi.fn(),
  },
}));

import { ordersService } from '../../services/ordersService';

const mockOrders = [
  {
    id: 1,
    userId: 1,
    quotationId: 1,
    status: 'pending' as const,
    totalAmount: 1000,
    items: [{ productId: 1, quantity: 10, unitPrice: 100 }],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 2,
    userId: 1,
    quotationId: 2,
    status: 'processing' as const,
    totalAmount: 500,
    items: [{ productId: 2, quantity: 5, unitPrice: 100 }],
    createdAt: new Date('2026-01-02'),
    updatedAt: new Date('2026-01-02'),
  },
];

const mockPagination = { total: 2, page: 1, limit: 10, totalPages: 1 };

describe('useOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch orders on mount with autoFetch=true (default)', async () => {
    vi.mocked(ordersService.getUserOrders).mockResolvedValueOnce({
      orders: mockOrders,
      pagination: mockPagination,
    });

    const { result } = renderHook(() => useOrders());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.orders).toEqual(mockOrders);
    expect(result.current.error).toBeNull();
    expect(result.current.pagination).toEqual(mockPagination);
    expect(ordersService.getUserOrders).toHaveBeenCalledTimes(1);
  });

  it('should pass status, page, limit params', async () => {
    vi.mocked(ordersService.getUserOrders).mockResolvedValueOnce({
      orders: [mockOrders[0]],
      pagination: { total: 1, page: 2, limit: 5, totalPages: 1 },
    });

    renderHook(() => useOrders({ autoFetch: true, status: 'pending', page: 2, limit: 5 }));

    await waitFor(() => {
      expect(ordersService.getUserOrders).toHaveBeenCalledWith({
        status: 'pending',
        page: 2,
        limit: 5,
      });
    });
  });

  it('should not fetch with autoFetch=false', async () => {
    const { result } = renderHook(() => useOrders({ autoFetch: false }));

    await waitFor(() => {
      expect(ordersService.getUserOrders).not.toHaveBeenCalled();
    });

    expect(result.current.orders).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('should handle error', async () => {
    vi.mocked(ordersService.getUserOrders).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.orders).toEqual([]);
  });

  it('should handle non-Error failure', async () => {
    vi.mocked(ordersService.getUserOrders).mockRejectedValueOnce('unknown');

    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('An unexpected error occurred');
  });

  it('should return pagination data', async () => {
    const customPagination = { total: 50, page: 3, limit: 10, totalPages: 5 };
    vi.mocked(ordersService.getUserOrders).mockResolvedValueOnce({
      orders: mockOrders,
      pagination: customPagination,
    });

    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pagination).toEqual(customPagination);
  });

  it('should refetch orders when refetch is called', async () => {
    vi.mocked(ordersService.getUserOrders).mockResolvedValueOnce({
      orders: mockOrders,
      pagination: mockPagination,
    });

    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatedOrders = [mockOrders[0]];
    vi.mocked(ordersService.getUserOrders).mockResolvedValueOnce({
      orders: updatedOrders,
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.orders).toEqual(updatedOrders);
    expect(ordersService.getUserOrders).toHaveBeenCalledTimes(2);
  });

  it('should clear error on refetch', async () => {
    vi.mocked(ordersService.getUserOrders).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    vi.mocked(ordersService.getUserOrders).mockResolvedValueOnce({
      orders: mockOrders,
      pagination: mockPagination,
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.orders).toEqual(mockOrders);
  });
});

describe('useOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch order by id', async () => {
    const mockOrder = mockOrders[0];
    vi.mocked(ordersService.getOrderById).mockResolvedValueOnce(mockOrder);

    const { result } = renderHook(() => useOrder('1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.order).toEqual(mockOrder);
    expect(result.current.error).toBeNull();
    expect(ordersService.getOrderById).toHaveBeenCalledWith('1');
  });

  it('should handle error', async () => {
    vi.mocked(ordersService.getOrderById).mockRejectedValueOnce(new Error('Order not found'));

    const { result } = renderHook(() => useOrder('999'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Order not found');
    expect(result.current.order).toBeNull();
  });

  it('should handle non-Error failure', async () => {
    vi.mocked(ordersService.getOrderById).mockRejectedValueOnce('unknown');

    const { result } = renderHook(() => useOrder('1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('An unexpected error occurred');
  });

  it('should not fetch when id is falsy', async () => {
    const { result } = renderHook(() => useOrder(''));

    await waitFor(() => {
      expect(ordersService.getOrderById).not.toHaveBeenCalled();
    });

    expect(result.current.order).toBeNull();
    expect(result.current.loading).toBe(true);
  });
});
