import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '../CartContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Product } from '@shared/types';

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
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

describe('CartContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('has empty initial state with drawer closed', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.items).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
    expect(result.current.isOpen).toBe(false);
  });

  it('adds a new item to the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe(1);
    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.items[0].totalPrice).toBe(100);
    expect(result.current.totalItems).toBe(1);
    expect(result.current.totalPrice).toBe(100);
    expect(mockToast.success).toHaveBeenCalledWith('Test Product adicionado ao carrinho!');
  });

  it('increments quantity when adding an existing product', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

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

  it('adds multiple items with quantity parameter', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct, 3);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.items[0].totalPrice).toBe(300);
    expect(result.current.totalItems).toBe(3);
    expect(result.current.totalPrice).toBe(300);
  });

  it('adds different products as separate items', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });
    act(() => {
      result.current.addItem(mockProduct2);
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.totalItems).toBe(2);
    expect(result.current.totalPrice).toBe(300);
  });

  it('removes an item by id', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

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
    expect(mockToast.success).toHaveBeenCalledWith('Item removido do carrinho!');
  });

  it('updates quantity of an item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

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
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });

    const itemId = result.current.items[0].id;

    act(() => {
      result.current.updateQuantity(itemId, 0);
    });

    expect(result.current.items).toHaveLength(0);
    expect(mockToast.success).toHaveBeenCalledWith('Item removido do carrinho!');
  });

  it('removes item when updateQuantity is called with negative value', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });

    const itemId = result.current.items[0].id;

    act(() => {
      result.current.updateQuantity(itemId, -1);
    });

    expect(result.current.items).toHaveLength(0);
  });

  it('clears all items from the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });
    act(() => {
      result.current.addItem(mockProduct2);
    });

    expect(result.current.items).toHaveLength(2);

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
    expect(mockToast.success).toHaveBeenCalledWith('Carrinho limpo!');
  });

  it('toggles the cart drawer open and closed', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggleCart();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggleCart();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('persists items to localStorage', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });

    const stored = localStorage.getItem('crescebr_cart');
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
    localStorage.setItem('crescebr_cart', JSON.stringify(savedItems));

    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.totalItems).toBe(3);
    expect(result.current.totalPrice).toBe(300);
  });

  it('handles invalid JSON in localStorage gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('crescebr_cart', '{invalid json!!!');

    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.items).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('throws when useCart is used outside CartProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useCart());
    }).toThrow('useCart must be used within a CartProvider');

    consoleSpy.mockRestore();
  });

  it('updates localStorage when cart is cleared', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });

    expect(JSON.parse(localStorage.getItem('crescebr_cart')!)).toHaveLength(1);

    act(() => {
      result.current.clearCart();
    });

    expect(JSON.parse(localStorage.getItem('crescebr_cart')!)).toHaveLength(0);
  });

  it('correctly calculates totals with multiple different products', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct, 2);
    });
    act(() => {
      result.current.addItem(mockProduct2, 3);
    });

    // mockProduct: price=100, qty=2 → 200
    // mockProduct2: price=200, qty=3 → 600
    expect(result.current.totalItems).toBe(5);
    expect(result.current.totalPrice).toBe(800);
  });

  it('does not affect other items when removing one', () => {
    let callCount = 0;
    const dateSpy = vi.spyOn(Date, 'now').mockImplementation(() => 1000 + callCount++);

    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });
    act(() => {
      result.current.addItem(mockProduct2);
    });

    expect(result.current.items).toHaveLength(2);

    const firstItemId = result.current.items.find(i => i.productId === 1)!.id;

    act(() => {
      result.current.removeItem(firstItemId);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe(2);
    expect(result.current.totalItems).toBe(1);
    expect(result.current.totalPrice).toBe(200);

    dateSpy.mockRestore();
  });
});
