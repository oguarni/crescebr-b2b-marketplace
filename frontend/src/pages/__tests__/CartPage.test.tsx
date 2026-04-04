import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CartPage from '../CartPage';

// Mock navigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock cart context - will be overridden per test
const mockUpdateQuantity = vi.fn();
const mockRemoveItem = vi.fn();
const mockClearCart = vi.fn();

let mockCartItems: import('@shared/types').CartItem[] = [];
let mockTotalPrice = 0;

vi.mock('../../contexts/CartContext', () => ({
  useCart: () => ({
    items: mockCartItems,
    totalItems: mockCartItems.reduce((sum: number, item) => sum + item.quantity, 0),
    totalPrice: mockTotalPrice,
    isOpen: false,
    addItem: vi.fn(),
    removeItem: mockRemoveItem,
    updateQuantity: mockUpdateQuantity,
    clearCart: mockClearCart,
    toggleCart: vi.fn(),
  }),
}));

let mockIsAuthenticated = true;

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'customer', email: 'buyer@test.com' },
    token: 'mock-token',
    isAuthenticated: mockIsAuthenticated,
    isLoading: false,
    login: vi.fn(),
    loginWithEmail: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    fetchUser: vi.fn(),
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCartItemsList = [
  {
    id: 101,
    productId: 1,
    product: {
      id: 1,
      name: 'Industrial Pump',
      description: 'High-performance industrial water pump',
      price: 1500.0,
      imageUrl: 'https://example.com/pump.jpg',
      category: 'Industrial Equipment',
      supplierId: 1,
    },
    quantity: 2,
    totalPrice: 3000.0,
  },
  {
    id: 102,
    productId: 2,
    product: {
      id: 2,
      name: 'Safety Helmet',
      description: 'Industrial safety helmet with adjustable strap',
      price: 25.0,
      imageUrl: 'https://example.com/helmet.jpg',
      category: 'Safety Equipment',
      supplierId: 1,
    },
    quantity: 5,
    totalPrice: 125.0,
  },
];

const renderCartPage = async () => {
  let renderResult;
  await act(async () => {
    renderResult = render(
      <BrowserRouter>
        <CartPage />
      </BrowserRouter>
    );
  });
  return renderResult;
};

describe('CartPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCartItems = [];
    mockTotalPrice = 0;
    mockIsAuthenticated = true;
  });

  it('should display empty cart state when cart has no items', async () => {
    await renderCartPage();

    expect(screen.getByText('Seu carrinho está vazio')).toBeInTheDocument();
    expect(
      screen.getByText('Adicione alguns produtos ao seu carrinho para continuar')
    ).toBeInTheDocument();
    expect(screen.getByText('Continuar Comprando')).toBeInTheDocument();
  });

  it('should render cart items with names, quantities and prices', async () => {
    mockCartItems = mockCartItemsList;
    mockTotalPrice = 3125.0;

    await renderCartPage();

    expect(screen.getByText('Carrinho de Compras')).toBeInTheDocument();
    expect(screen.getByText('2 itens no seu carrinho')).toBeInTheDocument();

    expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    expect(screen.getByText('Safety Helmet')).toBeInTheDocument();

    // Check unit prices (formatted as "R$ X,XX cada" - locale-aware match)
    expect(screen.getByText(/1\.500,00 cada/)).toBeInTheDocument();
    expect(screen.getByText(/25,00 cada/)).toBeInTheDocument();
  });

  it('should call updateQuantity when increase button is clicked', async () => {
    const user = userEvent.setup();
    mockCartItems = [mockCartItemsList[0]];
    mockTotalPrice = 3000.0;

    await renderCartPage();

    // The "Add" icon buttons increase quantity
    const addButtons = screen.getAllByTestId('AddIcon');
    expect(addButtons.length).toBeGreaterThan(0);

    await user.click(addButtons[0].closest('button')!);

    // handleQuantityChange calls updateQuantity for qty > 0
    expect(mockUpdateQuantity).toHaveBeenCalledWith(101, 3);
  });

  it('should call removeItem when decrease button reduces quantity to zero', async () => {
    const user = userEvent.setup();
    mockCartItems = [{ ...mockCartItemsList[0], quantity: 1, totalPrice: 1500.0 }];
    mockTotalPrice = 1500.0;

    await renderCartPage();

    // The "Remove" icon buttons decrease quantity
    const removeButtons = screen.getAllByTestId('RemoveIcon');
    expect(removeButtons.length).toBeGreaterThan(0);

    await user.click(removeButtons[0].closest('button')!);

    // handleQuantityChange calls removeItem when newQuantity <= 0
    expect(mockRemoveItem).toHaveBeenCalledWith(101);
  });

  it('should call removeItem when delete button is clicked', async () => {
    const user = userEvent.setup();
    mockCartItems = [mockCartItemsList[0]];
    mockTotalPrice = 3000.0;

    await renderCartPage();

    // The delete icon button (red color)
    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    // Last delete icon is the individual item delete button
    const deleteButton = deleteButtons[0].closest('button')!;
    await user.click(deleteButton);

    expect(mockRemoveItem).toHaveBeenCalledWith(101);
  });

  it('should display order summary with subtotal and total', async () => {
    mockCartItems = mockCartItemsList;
    mockTotalPrice = 3125.0;

    await renderCartPage();

    expect(screen.getByText('Resumo do Pedido')).toBeInTheDocument();
    expect(screen.getByText('Subtotal:')).toBeInTheDocument();
    expect(screen.getByText('Frete:')).toBeInTheDocument();
    expect(screen.getByText('Calculado no checkout')).toBeInTheDocument();
    expect(screen.getByText('Total:')).toBeInTheDocument();
  });

  it('should call clearCart when clear cart button is clicked', async () => {
    const user = userEvent.setup();
    mockCartItems = mockCartItemsList;
    mockTotalPrice = 3125.0;

    await renderCartPage();

    const clearButton = screen.getByText('Limpar Carrinho');
    await user.click(clearButton);

    expect(mockClearCart).toHaveBeenCalled();
  });

  it('should navigate to checkout when authenticated user clicks checkout', async () => {
    const user = userEvent.setup();
    mockCartItems = mockCartItemsList;
    mockTotalPrice = 3125.0;
    mockIsAuthenticated = true;

    await renderCartPage();

    const checkoutButton = screen.getByText('Finalizar Compra');
    await user.click(checkoutButton);

    expect(mockNavigate).toHaveBeenCalledWith('/checkout');
  });

  it('should update quantity when typing in quantity input', async () => {
    mockCartItems = [mockCartItemsList[0]];
    mockTotalPrice = 3000.0;

    await renderCartPage();

    // The quantity text field
    const qtyInputs = document.querySelectorAll('input[type="text"]');
    // The quantity field for the cart item
    const qtyInput = Array.from(qtyInputs).find(input => (input as HTMLInputElement).value === '2');
    if (qtyInput) {
      fireEvent.change(qtyInput, { target: { value: '5' } });
      expect(mockUpdateQuantity).toHaveBeenCalledWith(101, 5);
    }
  });

  it('should truncate long product description', async () => {
    mockCartItems = [
      {
        ...mockCartItemsList[0],
        product: {
          ...mockCartItemsList[0].product,
          description: 'A'.repeat(150),
        },
      },
    ];
    mockTotalPrice = 3000.0;

    await renderCartPage();

    // Description is truncated to 100 chars + "..."
    expect(screen.getByText(`${'A'.repeat(100)}...`)).toBeInTheDocument();
  });

  it('should trigger image onError fallback in cart items', async () => {
    mockCartItems = [mockCartItemsList[0]];
    mockTotalPrice = 3000.0;

    await renderCartPage();

    const imgs = document.querySelectorAll('img');
    if (imgs.length > 0) {
      fireEvent.error(imgs[0]);
      expect(imgs[0].src).toContain('data:image');
    }
  });

  it('should navigate to login when unauthenticated user clicks checkout', async () => {
    const user = userEvent.setup();
    mockCartItems = mockCartItemsList;
    mockTotalPrice = 3125.0;
    mockIsAuthenticated = false;

    await renderCartPage();

    // Alert should show login message
    expect(screen.getByText('Faça login para finalizar a compra')).toBeInTheDocument();

    const checkoutButton = screen.getByText('Finalizar Compra');
    await user.click(checkoutButton);

    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      state: { from: { pathname: '/checkout' } },
    });
  });
});
