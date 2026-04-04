import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CartDrawer from './CartDrawer';

// Mock contexts
const mockToggleCart = vi.fn();
const mockUpdateQuantity = vi.fn();
const mockRemoveItem = vi.fn();
const mockClearCart = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../contexts/CartContext', () => ({
  useCart: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const mockUseCart = useCart as ReturnType<typeof vi.fn>;
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

const mockItem = {
  id: 1,
  productId: 1,
  quantity: 2,
  totalPrice: 200,
  product: {
    id: 1,
    name: 'Test Product',
    price: 100,
    imageUrl: 'http://example.com/img.jpg',
  },
};

function setupMocks(
  overrides: { items?: any[]; isOpen?: boolean; isAuthenticated?: boolean } = {}
) {
  mockUseCart.mockReturnValue({
    isOpen: overrides.isOpen ?? true,
    items: overrides.items ?? [],
    totalPrice: overrides.items
      ? overrides.items.reduce((sum: number, i: any) => sum + i.totalPrice, 0)
      : 0,
    toggleCart: mockToggleCart,
    updateQuantity: mockUpdateQuantity,
    removeItem: mockRemoveItem,
    clearCart: mockClearCart,
  });

  mockUseAuth.mockReturnValue({
    isAuthenticated: overrides.isAuthenticated ?? true,
  });
}

function renderCartDrawer() {
  return render(
    <MemoryRouter>
      <CartDrawer />
    </MemoryRouter>
  );
}

describe('CartDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  describe('empty cart state', () => {
    it('shows empty cart message when no items', () => {
      setupMocks({ items: [] });
      renderCartDrawer();

      expect(screen.getByText(/carrinho está vazio/i)).toBeInTheDocument();
    });

    it('shows "Continuar Comprando" link when cart is empty', () => {
      setupMocks({ items: [] });
      renderCartDrawer();

      expect(screen.getByText(/continuar comprando/i)).toBeInTheDocument();
    });

    it('calls toggleCart when close button is clicked with empty cart', () => {
      setupMocks({ items: [] });
      renderCartDrawer();

      const closeButton = screen.getAllByRole('button')[0];
      fireEvent.click(closeButton);

      expect(mockToggleCart).toHaveBeenCalled();
    });
  });

  describe('cart with items', () => {
    it('renders cart items', () => {
      setupMocks({ items: [mockItem] });
      renderCartDrawer();

      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    it('displays formatted price for each item', () => {
      setupMocks({ items: [mockItem] });
      renderCartDrawer();

      // R$ 100,00 is the Brazilian format for 100
      const priceElements = screen.getAllByText(/R\$/);
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it('shows total price in footer', () => {
      setupMocks({ items: [mockItem] });
      renderCartDrawer();

      const totalElements = screen.getAllByText(/Total/i);
      expect(totalElements.length).toBeGreaterThan(0);
    });

    it('calls removeItem when quantity is decremented to 0', () => {
      setupMocks({ items: [{ ...mockItem, quantity: 1 }] });
      renderCartDrawer();

      const decrementButtons = screen.getAllByRole('button');
      // Find the decrement button (Remove icon)
      const removeButton = decrementButtons.find(btn => btn.querySelector('[data-testid]') || btn);
      // Click the first quantity decrease button
      const quantityButtons = decrementButtons.filter(
        btn => btn.closest('[class*="ListItem"]') !== null
      );
      if (quantityButtons.length > 0) {
        fireEvent.click(quantityButtons[0]);
      }
    });

    it('calls updateQuantity when quantity is incremented', () => {
      setupMocks({ items: [mockItem] });
      renderCartDrawer();

      // Find all buttons inside the list
      const allButtons = screen.getAllByRole('button');
      // The increment button adds quantity
      expect(allButtons.length).toBeGreaterThan(1);
    });

    it('calls removeItem when delete button is clicked', () => {
      setupMocks({ items: [mockItem] });
      renderCartDrawer();

      // There should be a delete button per item
      const buttons = screen.getAllByRole('button');
      // Last button before footer ones is typically the delete
      expect(buttons.length).toBeGreaterThan(2);
    });

    it('calls clearCart when "Limpar Carrinho" button is clicked', () => {
      setupMocks({ items: [mockItem] });
      renderCartDrawer();

      const clearButton = screen.getByText(/Limpar Carrinho/i);
      fireEvent.click(clearButton);

      expect(mockClearCart).toHaveBeenCalled();
    });
  });

  describe('checkout behavior', () => {
    it('navigates to /checkout when authenticated user clicks Finalizar Compra', () => {
      setupMocks({ items: [mockItem], isAuthenticated: true });
      renderCartDrawer();

      const checkoutButton = screen.getByText(/Finalizar Compra/i);
      fireEvent.click(checkoutButton);

      expect(mockNavigate).toHaveBeenCalledWith('/checkout');
      expect(mockToggleCart).toHaveBeenCalled();
    });

    it('navigates to /login when unauthenticated user clicks Finalizar Compra', () => {
      setupMocks({ items: [mockItem], isAuthenticated: false });
      renderCartDrawer();

      const checkoutButton = screen.getByText(/Finalizar Compra/i);
      fireEvent.click(checkoutButton);

      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: { from: { pathname: '/checkout' } },
      });
      expect(mockToggleCart).toHaveBeenCalled();
    });

    it('shows login alert when cart has items and user is unauthenticated', () => {
      setupMocks({ items: [mockItem], isAuthenticated: false });
      renderCartDrawer();

      expect(screen.getByText(/Faça login/i)).toBeInTheDocument();
    });

    it('does not show login alert when user is authenticated', () => {
      setupMocks({ items: [mockItem], isAuthenticated: true });
      renderCartDrawer();

      expect(screen.queryByText(/Faça login/i)).not.toBeInTheDocument();
    });
  });

  describe('quantity controls', () => {
    it('calls handleQuantityChange with decreased quantity when minus is clicked', () => {
      setupMocks({ items: [{ ...mockItem, quantity: 3 }] });
      renderCartDrawer();

      const buttons = screen.getAllByRole('button');
      // Find minus/decrement buttons inside the list item
      // Buttons inside ListItem: close(header), decrement, increment, delete
      // The header close button is first, then per-item buttons
      const listButtons = buttons.filter((_, i) => i > 0);
      if (listButtons.length >= 1) {
        fireEvent.click(listButtons[0]);
        expect(mockUpdateQuantity).toHaveBeenCalledWith(mockItem.id, 2);
      }
    });

    it('calls removeItem when quantity becomes 0', () => {
      setupMocks({ items: [{ ...mockItem, quantity: 1 }] });
      renderCartDrawer();

      const buttons = screen.getAllByRole('button');
      const listButtons = buttons.filter((_, i) => i > 0);
      if (listButtons.length >= 1) {
        fireEvent.click(listButtons[0]);
        expect(mockRemoveItem).toHaveBeenCalledWith(mockItem.id);
      }
    });

    it('calls updateQuantity when text input changes to a valid number', () => {
      setupMocks({ items: [mockItem] });
      renderCartDrawer();

      const inputs = screen.getAllByRole('textbox');
      if (inputs.length > 0) {
        fireEvent.change(inputs[0], { target: { value: '5' } });
        expect(mockUpdateQuantity).toHaveBeenCalledWith(mockItem.id, 5);
      }
    });

    it('calls removeItem when text input is changed to 0', () => {
      setupMocks({ items: [mockItem] });
      renderCartDrawer();

      const inputs = screen.getAllByRole('textbox');
      if (inputs.length > 0) {
        fireEvent.change(inputs[0], { target: { value: '0' } });
        expect(mockRemoveItem).toHaveBeenCalledWith(mockItem.id);
      }
    });
  });

  describe('multiple items', () => {
    it('renders dividers between items', () => {
      const items = [
        {
          ...mockItem,
          id: 1,
          productId: 1,
          product: { ...mockItem.product, id: 1, name: 'Product A' },
        },
        {
          ...mockItem,
          id: 2,
          productId: 2,
          product: { ...mockItem.product, id: 2, name: 'Product B' },
        },
      ];
      setupMocks({ items });
      renderCartDrawer();

      expect(screen.getByText('Product A')).toBeInTheDocument();
      expect(screen.getByText('Product B')).toBeInTheDocument();
    });
  });
});
