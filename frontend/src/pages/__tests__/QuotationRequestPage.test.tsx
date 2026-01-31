import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import QuotationRequestPage from '../QuotationRequestPage';
import { quotationsService } from '../../services/quotationsService';
import toast from 'react-hot-toast';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock services
vi.mock('../../services/quotationsService', () => ({
  quotationsService: {
    createQuotation: vi.fn(),
    calculateQuote: vi.fn().mockResolvedValue({
      items: [],
      totalSubtotal: 0,
      totalSavings: 0,
      grandTotal: 0,
    }),
  },
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock contexts
const mockQuotationContext = {
  items: [] as any[],
  totalItems: 0,
  isOpen: false,
  updateQuantity: vi.fn(),
  removeItem: vi.fn(),
  clearRequest: vi.fn(),
  addItem: vi.fn(),
  toggleDrawer: vi.fn(),
};

const mockAuthContext = {
  user: null as any,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  fetchUser: vi.fn(),
};

vi.mock('../../contexts/QuotationContext', () => ({
  useQuotationRequest: () => mockQuotationContext,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

const mockProducts = [
  {
    id: 1,
    name: 'Industrial Pump',
    description: 'High-performance industrial water pump suitable for heavy-duty applications',
    price: 1500.0,
    imageUrl: 'https://example.com/pump.jpg',
    category: 'Industrial Equipment',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: 'Safety Helmet',
    description: 'Industrial safety helmet with adjustable strap, meets safety standards',
    price: 25.0,
    imageUrl: 'https://example.com/helmet.jpg',
    category: 'Safety Equipment',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockQuotationItems = [
  {
    id: 1,
    productId: 1,
    product: mockProducts[0],
    quantity: 10,
  },
  {
    id: 2,
    productId: 2,
    product: mockProducts[1],
    quantity: 25,
  },
];

const renderQuotationRequestPage = () => {
  return render(
    <BrowserRouter>
      <QuotationRequestPage />
    </BrowserRouter>
  );
};

describe('QuotationRequestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Empty State', () => {
    it('should render empty state when no items in quotation request', () => {
      renderQuotationRequestPage();

      expect(screen.getByText('Sua solicitação de cotação está vazia')).toBeInTheDocument();
      expect(
        screen.getByText('Adicione alguns produtos à sua solicitação de cotação para continuar')
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /navegar produtos/i })).toBeInTheDocument();
    });

    it('should navigate to home page when clicking browse products button', async () => {
      const user = userEvent.setup();
      renderQuotationRequestPage();

      const browseButton = screen.getByRole('link', { name: /navegar produtos/i });
      await user.click(browseButton);

      // Note: Since this is a Link component, it won't actually navigate in tests
      // But we can check that the link has the correct href
      expect(browseButton.closest('a')).toHaveAttribute('href', '/');
    });
  });

  describe('Quotation Items Display', () => {
    beforeEach(() => {
      mockQuotationContext.items = mockQuotationItems;
      mockQuotationContext.totalItems = 35; // 10 + 25
    });

    it('should render quotation request page with items', () => {
      renderQuotationRequestPage();

      expect(screen.getByText('Solicitação de Cotação')).toBeInTheDocument();
      expect(screen.getByText('35 itens na sua solicitação')).toBeInTheDocument();
    });

    it('should display product details correctly', () => {
      renderQuotationRequestPage();

      // Check product names
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
      expect(screen.getByText('Safety Helmet')).toBeInTheDocument();

      // Check product descriptions (truncated)
      expect(
        screen.getByText(
          'High-performance industrial water pump suitable for heavy-duty applications'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText('Industrial safety helmet with adjustable strap, meets safety standards')
      ).toBeInTheDocument();

      // Check categories
      expect(screen.getByText('Categoria: Industrial Equipment')).toBeInTheDocument();
      expect(screen.getByText('Categoria: Safety Equipment')).toBeInTheDocument();

      // Check reference prices
      expect(screen.getByText('Preço de referência: R$ 1.500,00')).toBeInTheDocument();
      expect(screen.getByText('Preço de referência: R$ 25,00')).toBeInTheDocument();
    });

    it('should display quantities correctly', () => {
      renderQuotationRequestPage();

      // Check quantity displays
      expect(screen.getByText('10 unidades')).toBeInTheDocument();
      expect(screen.getByText('25 unidades')).toBeInTheDocument();

      // Check quantity input fields
      const quantityInputs = screen.getAllByRole('textbox');
      expect(quantityInputs[0]).toHaveValue('10');
      expect(quantityInputs[1]).toHaveValue('25');
    });

    it('should display summary information correctly', () => {
      renderQuotationRequestPage();

      expect(screen.getByText('Resumo da Solicitação')).toBeInTheDocument();
      expect(screen.getByText('Total de itens:')).toBeInTheDocument();
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(
        screen.getByText(
          '* Os preços mostrados são apenas de referência. O preço final será definido após a análise da sua solicitação de cotação.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Quantity Management', () => {
    beforeEach(() => {
      mockQuotationContext.items = mockQuotationItems;
      mockQuotationContext.totalItems = 35;
    });

    it('should increase quantity when clicking plus button', async () => {
      const user = userEvent.setup();
      renderQuotationRequestPage();

      const plusButtons = screen.getAllByLabelText(/add/i);
      await user.click(plusButtons[0]);

      expect(mockQuotationContext.updateQuantity).toHaveBeenCalledWith(1, 11);
    });

    it('should decrease quantity when clicking minus button', async () => {
      const user = userEvent.setup();
      renderQuotationRequestPage();

      const minusButtons = screen.getAllByLabelText(/remove/i);
      await user.click(minusButtons[0]);

      expect(mockQuotationContext.updateQuantity).toHaveBeenCalledWith(1, 9);
    });

    it('should update quantity when typing in quantity field', async () => {
      renderQuotationRequestPage();

      const quantityInputs = screen.getAllByRole('textbox');
      const firstQuantityInput = quantityInputs[0];

      fireEvent.change(firstQuantityInput, { target: { value: '15' } });

      expect(mockQuotationContext.updateQuantity).toHaveBeenCalledWith(1, 15);
    });

    it('should handle invalid quantity input gracefully', async () => {
      renderQuotationRequestPage();

      const quantityInputs = screen.getAllByRole('textbox');
      const firstQuantityInput = quantityInputs[0];

      fireEvent.change(firstQuantityInput, { target: { value: 'abc' } });

      // Should remove item when input is invalid (quantity becomes 0)
      expect(mockQuotationContext.removeItem).toHaveBeenCalledWith(1);
    });

    it('should remove item when clicking delete button', async () => {
      const user = userEvent.setup();
      renderQuotationRequestPage();

      const deleteButtons = screen.getAllByLabelText(/delete/i);
      await user.click(deleteButtons[0]);

      expect(mockQuotationContext.removeItem).toHaveBeenCalledWith(1);
    });

    it('should show singular form for quantity of 1', () => {
      mockQuotationContext.items = [
        {
          id: 1,
          productId: 1,
          product: mockProducts[0],
          quantity: 1,
        },
      ];
      mockQuotationContext.totalItems = 1;

      renderQuotationRequestPage();

      expect(screen.getByText('1 item na sua solicitação')).toBeInTheDocument();
      expect(screen.getByText('1 unidade')).toBeInTheDocument();
    });
  });

  describe('Authentication and Authorization', () => {
    beforeEach(() => {
      mockQuotationContext.items = mockQuotationItems;
      mockQuotationContext.totalItems = 35;
    });

    it('should show login alert for unauthenticated users', () => {
      mockAuthContext.isAuthenticated = false;
      mockAuthContext.user = null;

      renderQuotationRequestPage();

      expect(
        screen.getByText('Faça login para enviar a solicitação de cotação')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /solicitar cotação/i })).toBeDisabled();
    });

    it('should show role warning for non-customer users', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = {
        id: 1,
        email: 'supplier@test.com',
        role: 'supplier',
        companyName: 'Test Supplier',
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      renderQuotationRequestPage();

      expect(screen.getByText('Apenas clientes podem solicitar cotações')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /solicitar cotação/i })).toBeDisabled();
    });

    it('should enable submit button for authenticated customers', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = {
        id: 1,
        email: 'customer@test.com',
        role: 'customer',
        companyName: 'Test Customer',
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      renderQuotationRequestPage();

      expect(screen.getByRole('button', { name: /solicitar cotação/i })).not.toBeDisabled();
    });

    it('should disable submit button for unauthenticated users', async () => {
      mockAuthContext.isAuthenticated = false;
      mockAuthContext.user = null;

      renderQuotationRequestPage();

      const submitButton = screen.getByRole('button', { name: /solicitar cotação/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Quotation Submission', () => {
    beforeEach(() => {
      mockQuotationContext.items = mockQuotationItems;
      mockQuotationContext.totalItems = 35;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = {
        id: 1,
        email: 'customer@test.com',
        role: 'customer',
        companyName: 'Test Customer',
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    it('should submit quotation request successfully', async () => {
      const user = userEvent.setup();
      vi.mocked(quotationsService.createQuotation).mockResolvedValue({
        id: 1,
        userId: 1,
        status: 'pending',
        totalAmount: 0,
        adminNotes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      renderQuotationRequestPage();

      const submitButton = screen.getByRole('button', { name: /solicitar cotação/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(quotationsService.createQuotation).toHaveBeenCalledWith({
          items: [
            { productId: 1, quantity: 10 },
            { productId: 2, quantity: 25 },
          ],
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Solicitação de cotação enviada com sucesso!');
      expect(mockQuotationContext.clearRequest).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/my-quotations');
    });

    it('should show error when trying to submit with no items', async () => {
      const user = userEvent.setup();
      mockQuotationContext.items = [];
      mockQuotationContext.totalItems = 0;

      renderQuotationRequestPage();

      // This should render empty state instead
      expect(screen.getByText('Sua solicitação de cotação está vazia')).toBeInTheDocument();
    });

    it('should handle submission error gracefully', async () => {
      const user = userEvent.setup();
      vi.mocked(quotationsService.createQuotation).mockRejectedValue(
        new Error('Submission failed')
      );

      renderQuotationRequestPage();

      const submitButton = screen.getByRole('button', { name: /solicitar cotação/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Submission failed');
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      vi.mocked(quotationsService.createQuotation).mockReturnValue(promise);

      renderQuotationRequestPage();

      const submitButton = screen.getByRole('button', { name: /solicitar cotação/i });
      await user.click(submitButton);

      // Check loading state
      expect(screen.getByText('Enviando...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!({
        id: 1,
        userId: 1,
        status: 'pending',
        totalAmount: 0,
        adminNotes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await waitFor(() => {
        expect(screen.getByText('Solicitar Cotação')).toBeInTheDocument();
      });
    });

    it('should disable submit button for non-customer users', async () => {
      mockAuthContext.user = {
        id: 1,
        email: 'supplier@test.com',
        role: 'supplier',
        companyName: 'Test Supplier',
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      renderQuotationRequestPage();

      const submitButton = screen.getByRole('button', { name: /solicitar cotação/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Navigation and Actions', () => {
    beforeEach(() => {
      mockQuotationContext.items = mockQuotationItems;
      mockQuotationContext.totalItems = 35;
    });

    it('should have continue browsing button', () => {
      renderQuotationRequestPage();

      const continueButton = screen.getByRole('link', { name: /continuar navegando/i });
      expect(continueButton).toBeInTheDocument();
      expect(continueButton.closest('a')).toHaveAttribute('href', '/');
    });

    it('should clear request when clicking clear button', async () => {
      const user = userEvent.setup();
      renderQuotationRequestPage();

      const clearButton = screen.getByRole('button', { name: /limpar solicitação/i });
      await user.click(clearButton);

      expect(mockQuotationContext.clearRequest).toHaveBeenCalled();
    });
  });

  describe('Image Handling', () => {
    beforeEach(() => {
      mockQuotationContext.items = mockQuotationItems;
      mockQuotationContext.totalItems = 35;
    });

    it('should handle image load errors with fallback', () => {
      renderQuotationRequestPage();

      const productImages = screen.getAllByRole('img');
      const firstImage = productImages[0];

      // Simulate image error
      fireEvent.error(firstImage);

      // Check that the fallback image is set
      expect(firstImage).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));
    });

    it('should display product images correctly', () => {
      renderQuotationRequestPage();

      const productImages = screen.getAllByRole('img');
      expect(productImages[0]).toHaveAttribute('src', 'https://example.com/pump.jpg');
      expect(productImages[0]).toHaveAttribute('alt', 'Industrial Pump');
      expect(productImages[1]).toHaveAttribute('src', 'https://example.com/helmet.jpg');
      expect(productImages[1]).toHaveAttribute('alt', 'Safety Helmet');
    });
  });

  describe('Price Display', () => {
    beforeEach(() => {
      mockQuotationContext.items = mockQuotationItems;
      mockQuotationContext.totalItems = 35;
    });

    it('should format prices correctly in Brazilian Real', () => {
      renderQuotationRequestPage();

      // Check that prices are formatted correctly
      expect(screen.getByText('Preço base: R$ 1.500,00')).toBeInTheDocument();
      expect(screen.getByText('Preço base: R$ 25,00')).toBeInTheDocument();
    });

    it('should show reference price disclaimer', () => {
      renderQuotationRequestPage();

      expect(
        screen.getByText(
          /Calculando preços com descontos por volume|Preços com desconto por volume aplicado/i
        )
      ).toBeInTheDocument();

    });
  });
});
