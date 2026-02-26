import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '../contexts/CartContext';
import { Product } from '@shared/types';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

const mockProduct: Product = {
  id: 1,
  name: 'Test Product',
  description: 'A test product',
  price: 100.0,
  imageUrl: 'https://example.com/image.jpg',
  category: 'Test Category',
  supplierId: 1,
  unitPrice: 100.0,
  minimumOrderQuantity: 1,
  leadTime: 7,
  availability: 'in_stock',
  specifications: {},
  tierPricing: [],
};

const mockProduct2: Product = {
  id: 2,
  name: 'Test Product 2',
  description: 'Another test product',
  price: 200.0,
  imageUrl: 'https://example.com/image2.jpg',
  category: 'Test Category',
  supplierId: 1,
  unitPrice: 200.0,
  minimumOrderQuantity: 1,
  leadTime: 7,
  availability: 'in_stock',
  specifications: {},
  tierPricing: [],
};

describe('useCart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('initializes with empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.items).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
    expect(result.current.isOpen).toBe(false);
  });

  it('adds item to cart correctly', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe(mockProduct.id);
    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.items[0].totalPrice).toBe(mockProduct.price);
    expect(result.current.totalItems).toBe(1);
    expect(result.current.totalPrice).toBe(mockProduct.price);
  });

  it('adds multiple quantities of the same item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct, 3);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.items[0].totalPrice).toBe(mockProduct.price * 3);
    expect(result.current.totalItems).toBe(3);
    expect(result.current.totalPrice).toBe(mockProduct.price * 3);
  });

  it('increments quantity when adding existing item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem(mockProduct);
    });

    act(() => {
      result.current.addItem(mockProduct);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.items[0].totalPrice).toBe(mockProduct.price * 2);
    expect(result.current.totalItems).toBe(2);
    expect(result.current.totalPrice).toBe(mockProduct.price * 2);
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
    expect(result.current.totalPrice).toBe(mockProduct.price + mockProduct2.price);
  });

  it('removes item from cart correctly', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    // Add item first
    act(() => {
      result.current.addItem(mockProduct);
    });

    const itemId = result.current.items[0].id;

    // Remove item
    act(() => {
      result.current.removeItem(itemId);
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('updates quantity correctly', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    // Add item first
    act(() => {
      result.current.addItem(mockProduct);
    });

    const itemId = result.current.items[0].id;

    // Update quantity
    act(() => {
      result.current.updateQuantity(itemId, 5);
    });

    expect(result.current.items[0].quantity).toBe(5);
    expect(result.current.items[0].totalPrice).toBe(mockProduct.price * 5);
    expect(result.current.totalItems).toBe(5);
    expect(result.current.totalPrice).toBe(mockProduct.price * 5);
  });

  it('removes item when updating quantity to 0 or less', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    // Add item first
    act(() => {
      result.current.addItem(mockProduct);
    });

    const itemId = result.current.items[0].id;

    // Update quantity to 0
    act(() => {
      result.current.updateQuantity(itemId, 0);
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('clears cart correctly', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    // Add multiple items
    act(() => {
      result.current.addItem(mockProduct);
      result.current.addItem(mockProduct2);
    });

    // Clear cart
    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('toggles cart drawer', () => {
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
});
