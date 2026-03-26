import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CheckoutPage from '../CheckoutPage';
import { ordersService } from '../../services/ordersService';
import { viaCepService } from '../../services/viaCepService';
import toast from 'react-hot-toast';

// Mock services
vi.mock('../../services/ordersService', () => ({
  ordersService: {
    createOrderFromQuotation: vi.fn(),
  },
}));

vi.mock('../../services/viaCepService', () => ({
  viaCepService: {
    getAddressByCep: vi.fn(),
    isValidCep: vi.fn(),
    formatCep: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock navigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock cart context
const mockClearCart = vi.fn();
let mockCartItems: any[] = [];
let mockTotalPrice = 0;

vi.mock('../../contexts/CartContext', () => ({
  useCart: () => ({
    items: mockCartItems,
    totalItems: mockCartItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
    totalPrice: mockTotalPrice,
    isOpen: false,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: mockClearCart,
    toggleCart: vi.fn(),
  }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'customer', email: 'buyer@test.com', address: '' },
    token: 'mock-token',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    loginWithEmail: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    fetchUser: vi.fn(),
  }),
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

const renderCheckoutPage = async () => {
  let renderResult;
  await act(async () => {
    renderResult = render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>
    );
  });
  return renderResult;
};

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCartItems = [...mockCartItemsList];
    mockTotalPrice = 3125.0;

    vi.mocked(viaCepService.isValidCep).mockReturnValue(false);
  });

  it('should redirect to home when cart is empty', async () => {
    mockCartItems = [];
    mockTotalPrice = 0;

    await renderCheckoutPage();

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should render the order summary with items', async () => {
    await renderCheckoutPage();

    expect(screen.getByText('Finalizar Compra')).toBeInTheDocument();
    expect(screen.getByText('Resumo do Pedido')).toBeInTheDocument();

    // Product names in summary
    expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    expect(screen.getByText('Safety Helmet')).toBeInTheDocument();

    // Subtotal label
    expect(screen.getByText('Subtotal:')).toBeInTheDocument();
  });

  it('should render shipping info section with CEP field', async () => {
    await renderCheckoutPage();

    expect(screen.getByText('Informações de Entrega')).toBeInTheDocument();
    expect(screen.getByLabelText('CEP')).toBeInTheDocument();
    expect(screen.getByLabelText('Endereço Completo')).toBeInTheDocument();
  });

  it('should auto-fill address when valid CEP is entered', async () => {
    const user = userEvent.setup();

    vi.mocked(viaCepService.isValidCep).mockReturnValue(true);
    vi.mocked(viaCepService.getAddressByCep).mockResolvedValue({
      cep: '01001-000',
      logradouro: 'Praça da Sé',
      complemento: 'lado ímpar',
      bairro: 'Sé',
      localidade: 'São Paulo',
      uf: 'SP',
      ibge: '3550308',
      gia: '1004',
      ddd: '11',
      siafi: '7107',
    });

    await renderCheckoutPage();

    const cepInput = screen.getByLabelText('CEP');
    await user.type(cepInput, '01001000');

    await waitFor(() => {
      expect(viaCepService.getAddressByCep).toHaveBeenCalledWith('01001000');
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Frete calculado com sucesso!');
    });
  });

  it('should show credit card payment fields by default', async () => {
    await renderCheckoutPage();

    expect(screen.getByText('Informações de Pagamento')).toBeInTheDocument();
    expect(screen.getByText('Método de Pagamento')).toBeInTheDocument();
    expect(screen.getByLabelText('Cartão de Crédito')).toBeInTheDocument();
    expect(screen.getByLabelText('PIX')).toBeInTheDocument();

    // Credit card fields should be visible by default
    expect(screen.getByLabelText('Número do Cartão')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome no Cartão')).toBeInTheDocument();
    expect(screen.getByLabelText('Validade')).toBeInTheDocument();
    expect(screen.getByLabelText('CVV')).toBeInTheDocument();
  });

  it('should show PIX fields when PIX payment method is selected', async () => {
    const user = userEvent.setup();
    await renderCheckoutPage();

    const pixRadio = screen.getByLabelText('PIX');
    await user.click(pixRadio);

    await waitFor(() => {
      expect(screen.getByLabelText('Email para PIX')).toBeInTheDocument();
    });

    // Credit card fields should not be visible
    expect(screen.queryByLabelText('Número do Cartão')).not.toBeInTheDocument();
  });

  it('should create order successfully and show success screen', async () => {
    const user = userEvent.setup();

    // Setup CEP mock for valid shipping
    vi.mocked(viaCepService.isValidCep).mockReturnValue(true);
    vi.mocked(viaCepService.getAddressByCep).mockResolvedValue({
      cep: '01001-000',
      logradouro: 'Praça da Sé',
      complemento: '',
      bairro: 'Sé',
      localidade: 'São Paulo',
      uf: 'SP',
      ibge: '3550308',
      gia: '1004',
      ddd: '11',
      siafi: '7107',
    });

    vi.mocked(ordersService.createOrderFromQuotation).mockResolvedValue({
      id: 42,
      quotationId: 1,
      customerId: 1,
      supplierId: 1,
      status: 'pending',
      totalAmount: 3125.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await renderCheckoutPage();

    // Fill CEP to trigger shipping calculation
    const cepInput = screen.getByLabelText('CEP');
    await user.type(cepInput, '01001000');

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Frete calculado com sucesso!');
    });

    // Fill credit card fields
    await user.type(screen.getByLabelText('Número do Cartão'), '4111111111111111');
    await user.type(screen.getByLabelText('Nome no Cartão'), 'Test User');
    await user.type(screen.getByLabelText('Validade'), '1228');
    await user.type(screen.getByLabelText('CVV'), '123');

    // Submit the form - find the submit button by its text
    const submitButton = screen.getByRole('button', { name: /finalizar pedido/i });
    await user.click(submitButton);

    await waitFor(
      () => {
        expect(ordersService.createOrderFromQuotation).toHaveBeenCalledWith({
          quotationId: 1,
        });
      },
      { timeout: 5000 }
    );

    await waitFor(
      () => {
        expect(toast.success).toHaveBeenCalledWith('Pedido realizado com sucesso!');
      },
      { timeout: 5000 }
    );
  }, 15000);

  it('should handle order creation failure', async () => {
    const user = userEvent.setup();

    vi.mocked(viaCepService.isValidCep).mockReturnValue(true);
    vi.mocked(viaCepService.getAddressByCep).mockResolvedValue({
      cep: '01001-000',
      logradouro: 'Praça da Sé',
      complemento: '',
      bairro: 'Sé',
      localidade: 'São Paulo',
      uf: 'SP',
      ibge: '3550308',
      gia: '1004',
      ddd: '11',
      siafi: '7107',
    });

    vi.mocked(ordersService.createOrderFromQuotation).mockRejectedValue(
      new Error('Erro ao processar pedido')
    );

    await renderCheckoutPage();

    // Fill CEP
    const cepInput = screen.getByLabelText('CEP');
    await user.type(cepInput, '01001000');

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Frete calculado com sucesso!');
    });

    // Fill credit card fields
    await user.type(screen.getByLabelText('Número do Cartão'), '4111111111111111');
    await user.type(screen.getByLabelText('Nome no Cartão'), 'Test User');
    await user.type(screen.getByLabelText('Validade'), '1228');
    await user.type(screen.getByLabelText('CVV'), '123');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /finalizar pedido/i });
    await user.click(submitButton);

    await waitFor(
      () => {
        expect(toast.error).toHaveBeenCalledWith('Erro ao processar pedido');
      },
      { timeout: 5000 }
    );
  }, 15000);

  it('should show validation error when shipping info is missing', async () => {
    const user = userEvent.setup();
    await renderCheckoutPage();

    // Fill card fields but skip CEP
    await user.type(screen.getByLabelText('Número do Cartão'), '4111111111111111');
    await user.type(screen.getByLabelText('Nome no Cartão'), 'Test User');
    await user.type(screen.getByLabelText('Validade'), '1228');
    await user.type(screen.getByLabelText('CVV'), '123');

    // Button is disabled without shippingInfo; submit the form directly
    const form = document.querySelector('form');
    fireEvent.submit(form!);

    await waitFor(
      () => {
        expect(toast.error).toHaveBeenCalled();
      },
      { timeout: 10000 }
    );
  }, 15000);

  it('should display security information', async () => {
    await renderCheckoutPage();

    expect(
      screen.getByText('Seus dados estão protegidos com criptografia SSL')
    ).toBeInTheDocument();
  });
});
