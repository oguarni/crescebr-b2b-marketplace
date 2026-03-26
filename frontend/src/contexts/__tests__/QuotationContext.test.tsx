import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QuotationRequestProvider, useQuotationRequest } from '../QuotationContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Product } from '@shared/types';

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QuotationRequestProvider>{children}</QuotationRequestProvider>
);

const mockProduct: Product = {
  id: 1,
  name: 'Test Product',
  price: 100,
  description: 'Test description',
  imageUrl: 'https://example.com/img.jpg',
  category: 'Test',
  supplierId: 1,
  unitPrice: 100,
  minimumOrderQuantity: 1,
  leadTime: 7,
  availability: 'in_stock' as const,
  specifications: {},
  tierPricing: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProduct2: Product = {
  ...mockProduct,
  id: 2,
  name: 'Another Product',
  price: 200,
};

describe('QuotationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('has empty initial state with drawer closed', () => {
    const { result } = renderHook(() => useQuotationRequest(), { wrapper });

    expect(result.current.items).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
    expect(result.current.isOpen).toBe(false);
  });

  it('adds a new item', () => {
    const { result } = renderHook(() => useQuotationRequest(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe(1);
    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.items[0].totalPrice).toBe(100);
    expect(result.current.totalItems).toBe(1);
    expect(result.current.totalPrice).toBe(100);
    expect(mockToast.success).toHaveBeenCalled();
  });

  it('increments quantity when adding an existing product', () => {
    const { result } = renderHook(() => useQuotationRequest(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });
    act(() => {
      result.current.addItem(mockProduct);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.items[0].totalPrice).toBe(200);
    expect(result.current.totalItems).toBe(2);
    expect(result.current.totalPrice).toBe(200);
  });

  it('removes an item by id', () => {
    const { result } = renderHook(() => useQuotationRequest(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });

    const itemId = result.current.items[0].id;

    act(() => {
      result.current.removeItem(itemId);
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
    expect(mockToast.success).toHaveBeenCalledWith('Item removido da solicitação de cotação!');
  });

  it('updates quantity of an item', () => {
    const { result } = renderHook(() => useQuotationRequest(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });

    const itemId = result.current.items[0].id;

    act(() => {
      result.current.updateQuantity(itemId, 5);
    });

    expect(result.current.items[0].quantity).toBe(5);
    expect(result.current.items[0].totalPrice).toBe(500);
    expect(result.current.totalItems).toBe(5);
    expect(result.current.totalPrice).toBe(500);
  });

  it('removes item when updateQuantity is called with 0', () => {
    const { result } = renderHook(() => useQuotationRequest(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });

    const itemId = result.current.items[0].id;

    act(() => {
      result.current.updateQuantity(itemId, 0);
    });

    expect(result.current.items).toHaveLength(0);
    expect(mockToast.success).toHaveBeenCalledWith('Item removido da solicitação de cotação!');
  });

  it('clears all items', () => {
    const { result } = renderHook(() => useQuotationRequest(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });
    act(() => {
      result.current.addItem(mockProduct2);
    });

    expect(result.current.items).toHaveLength(2);

    act(() => {
      result.current.clearRequest();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
    expect(mockToast.success).toHaveBeenCalledWith('Solicitação de cotação limpa!');
  });

  it('toggles the drawer open and closed', () => {
    const { result } = renderHook(() => useQuotationRequest(), { wrapper });

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggleDrawer();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggleDrawer();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('persists items to localStorage', () => {
    const { result } = renderHook(() => useQuotationRequest(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });

    const stored = localStorage.getItem('crescebr_quotation_request');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].productId).toBe(1);
  });

  it('loads items from localStorage on mount', () => {
    const savedItems = [
      {
        id: 999,
        productId: 1,
        product: mockProduct,
        quantity: 3,
        totalPrice: 300,
      },
    ];
    localStorage.setItem('crescebr_quotation_request', JSON.stringify(savedItems));

    const { result } = renderHook(() => useQuotationRequest(), { wrapper });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.totalItems).toBe(3);
    expect(result.current.totalPrice).toBe(300);
  });

  it('handles invalid JSON in localStorage gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('crescebr_quotation_request', '{invalid json!!!');

    const { result } = renderHook(() => useQuotationRequest(), { wrapper });

    expect(result.current.items).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('throws when useQuotationRequest is used outside provider', () => {
    // Suppress console.error from React for expected error boundary
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useQuotationRequest());
    }).toThrow('useQuotationRequest must be used within a QuotationRequestProvider');

    consoleSpy.mockRestore();
  });
});
