import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import QuotationDetailPage from '../QuotationDetailPage';
import { ordersService } from '../../services/ordersService';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services/ordersService', () => ({
  ordersService: {
    createOrderFromQuotation: vi.fn(),
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks', () => ({
  useQuotation: vi.fn(),
  useQuoteCalculation: vi.fn(),
}));

import { useAuth } from '../../contexts/AuthContext';
import { useQuotation, useQuoteCalculation } from '../../hooks';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseQuotation = useQuotation as ReturnType<typeof vi.fn>;
const mockUseQuoteCalculation = vi.mocked(useQuoteCalculation);
const mockCalculate = vi.fn();
const mockReset = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '42' }),
  };
});

const mockQuotation = {
  id: 42,
  status: 'processed',
  companyName: 'Supplier Corp',
  adminNotes: 'Approved',
  user: {
    id: 10,
    companyName: 'Supplier Corp',
    email: 'supplier@corp.com',
    cnpj: '12.345.678/0001-90',
    industrySector: 'Tech',
  },
  company: null,
  items: [
    {
      id: 1,
      productId: 1,
      quantity: 3,
      product: {
        id: 1,
        name: 'Widget A',
        price: 200,
        supplierId: 10,
      },
    },
    {
      id: 2,
      productId: 2,
      quantity: 1,
      product: {
        id: 2,
        name: 'Widget B',
        price: 150,
        supplierId: 10,
      },
    },
  ],
};

const mockCalculation = {
  calculations: {
    items: [
      {
        productId: 1,
        basePrice: 200,
        quantity: 3,
        tierDiscount: 0,
        unitPriceAfterDiscount: 200,
        subtotal: 600,
        shippingCost: 53.75,
        tax: 108,
        total: 761.75,
        savings: 0,
        appliedTier: null,
      },
      {
        productId: 2,
        basePrice: 150,
        quantity: 1,
        tierDiscount: 0,
        unitPriceAfterDiscount: 150,
        subtotal: 150,
        shippingCost: 51.25,
        tax: 27,
        total: 228.25,
        savings: 0,
        appliedTier: null,
      },
    ],
    totalSubtotal: 750,
    totalShipping: 105,
    totalTax: 135,
    grandTotal: 990,
    totalSavings: 0,
  },
  summary: {
    totalItems: 4,
    subtotal: '750.00',
    shipping: '105.00',
    tax: '135.00',
    total: '990.00',
    savings: '0.00',
  },
};

// Totals from the completed quotation 2 probe, before and after a 10% catalog-price change.
const withGrandTotal = (grandTotal: number) => ({
  ...mockCalculation,
  calculations: { ...mockCalculation.calculations, grandTotal },
  summary: { ...mockCalculation.summary, total: grandTotal.toFixed(2) },
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/quotations/42']}>
      <Routes>
        <Route path='/quotations/:id' element={<QuotationDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('QuotationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 1, role: 'customer' } });
    mockUseQuotation.mockReturnValue({ quotation: mockQuotation, loading: false, error: null });
    mockCalculate.mockResolvedValue(mockCalculation);
    mockUseQuoteCalculation.mockReturnValue({
      calculation: mockCalculation,
      loading: false,
      error: null,
      calculate: mockCalculate,
      reset: mockReset,
    });
  });

  describe('loading state', () => {
    it('shows loading spinner while fetching', () => {
      mockUseQuotation.mockReturnValue({ quotation: null, loading: true, error: null });

      renderPage();

      // CircularProgress renders a progressbar role
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error alert when error occurs', () => {
      mockUseQuotation.mockReturnValue({
        quotation: null,
        loading: false,
        error: 'Quotation not found',
      });

      renderPage();

      expect(screen.getByText('Quotation not found')).toBeInTheDocument();
    });

    it('shows default message when quotation is null without error', () => {
      mockUseQuotation.mockReturnValue({ quotation: null, loading: false, error: null });

      renderPage();

      expect(screen.getByText(/Cotação não encontrada/i)).toBeInTheDocument();
    });

    it('shows back button on error state', () => {
      mockUseQuotation.mockReturnValue({
        quotation: null,
        loading: false,
        error: 'Not found',
      });

      renderPage();

      expect(screen.getByText(/Voltar para Início/i)).toBeInTheDocument();
    });
  });

  describe('quotation detail display', () => {
    it('renders quotation items', () => {
      renderPage();

      expect(screen.getByText('Widget A')).toBeInTheDocument();
      expect(screen.getByText('Widget B')).toBeInTheDocument();
    });

    it('renders supplier company name', () => {
      renderPage();

      expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
    });

    it('renders price totals for each item', () => {
      renderPage();

      // Widget A: 3 * 200 = 600 base, Widget B: 1 * 150 = 150 base
      // Prices are formatted in pt-BR currency
      expect(screen.getAllByText(/R\$/).length).toBeGreaterThan(0);
    });
  });

  describe('customer actions', () => {
    it('shows "Create Order" button for customer with processed quotation', () => {
      mockUseAuth.mockReturnValue({ user: { id: 1, role: 'customer' } });
      mockUseQuotation.mockReturnValue({
        quotation: { ...mockQuotation, status: 'processed' },
        loading: false,
        error: null,
      });

      renderPage();

      expect(screen.getByText(/Criar Pedido|Create Order|Gerar Pedido/i)).toBeInTheDocument();
    });

    it('does not show "Create Order" for customer with pending quotation', () => {
      mockUseAuth.mockReturnValue({ user: { id: 1, role: 'customer' } });
      mockUseQuotation.mockReturnValue({
        quotation: { ...mockQuotation, status: 'pending' },
        loading: false,
        error: null,
      });

      renderPage();

      expect(screen.queryByText(/Criar Pedido|Create Order/i)).not.toBeInTheDocument();
    });

    it('creates order successfully and navigates to my-orders', async () => {
      mockUseAuth.mockReturnValue({ user: { id: 1, role: 'customer' } });
      (ordersService.createOrderFromQuotation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'order-1',
      });

      renderPage();

      const createButton = screen.getByText(/Criar Pedido|Create Order|Gerar Pedido/i);
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(ordersService.createOrderFromQuotation).toHaveBeenCalledWith({ quotationId: 42 });
        expect(mockNavigate).toHaveBeenCalledWith('/my-orders');
        expect(toast.success).toHaveBeenCalled();
      });
    });

    it('shows error toast when order creation fails', async () => {
      mockUseAuth.mockReturnValue({ user: { id: 1, role: 'customer' } });
      (ordersService.createOrderFromQuotation as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Order failed')
      );

      renderPage();

      const createButton = screen.getByText(/Criar Pedido|Create Order|Gerar Pedido/i);
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Order failed');
      });
    });

    it('shows error toast with default message for non-Error throws', async () => {
      mockUseAuth.mockReturnValue({ user: { id: 1, role: 'customer' } });
      (ordersService.createOrderFromQuotation as ReturnType<typeof vi.fn>).mockRejectedValue(
        'unexpected'
      );

      renderPage();

      const createButton = screen.getByText(/Criar Pedido|Create Order|Gerar Pedido/i);
      fireEvent.click(createButton);

      await waitFor(() => {
        // Renders without a LanguageProvider, so the default pt-BR dictionary applies.
        expect(toast.error).toHaveBeenCalledWith('Erro ao criar pedido');
      });
    });
  });

  describe('admin actions', () => {
    it('shows Edit Quotation button for admin user', () => {
      mockUseAuth.mockReturnValue({ user: { id: 99, role: 'admin' } });

      renderPage();

      expect(screen.getByText(/Editar Cotação|Edit Quotation/i)).toBeInTheDocument();
    });

    it('does not show Create Order for admin user', () => {
      mockUseAuth.mockReturnValue({ user: { id: 99, role: 'admin' } });

      renderPage();

      expect(screen.queryByText(/Criar Pedido|Create Order/i)).not.toBeInTheDocument();
    });

    it('shows admin notes when present', () => {
      mockUseAuth.mockReturnValue({ user: { id: 99, role: 'admin' } });
      mockUseQuotation.mockReturnValue({
        quotation: { ...mockQuotation, adminNotes: 'Admin comment here' },
        loading: false,
        error: null,
      });

      renderPage();

      expect(screen.getByText('Admin comment here')).toBeInTheDocument();
    });
  });

  describe('API pricing', () => {
    it.each(['customer', 'supplier', 'admin'])(
      'shows the API totals for %s without invented fees',
      role => {
        mockUseAuth.mockReturnValue({ user: { id: 1, role } });
        renderPage();

        expect(mockCalculate).toHaveBeenCalledWith([
          { productId: 1, quantity: 3 },
          { productId: 2, quantity: 1 },
        ]);
        expect(screen.getByRole('heading', { name: /R\$\s*990,00/ })).toBeInTheDocument();
        expect(screen.getByText(/R\$\s*105,00/)).toBeInTheDocument();
        expect(screen.getByText(/R\$\s*135,00/)).toBeInTheDocument();
        expect(screen.queryByText(/Embalagem|Packaging|IPI|ICMS|FOB|15%/)).not.toBeInTheDocument();
        expect(screen.queryByText(/R\$\s*850,00/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Desconto por volume \(/)).not.toBeInTheDocument();
      }
    );

    it('shows the returned discount percentage and discounted item total', () => {
      const discounted = {
        ...mockCalculation,
        calculations: {
          ...mockCalculation.calculations,
          items: mockCalculation.calculations.items.map(item => ({ ...item })),
        },
      };
      Object.assign(discounted.calculations.items[0], {
        tierDiscount: 0.1,
        savings: 60,
        subtotal: 540,
        tax: 97.2,
      });
      Object.assign(discounted.calculations, {
        totalSubtotal: 690,
        totalTax: 124.2,
        grandTotal: 919.2,
        totalSavings: 60,
      });
      mockUseQuoteCalculation.mockReturnValue({
        calculation: discounted,
        loading: false,
        error: null,
        calculate: mockCalculate,
        reset: mockReset,
      });
      renderPage();

      expect(
        screen.getByRole('row', { name: /Desconto por volume \(10%\).*60,00/ })
      ).toBeInTheDocument();
      expect(screen.getByRole('row', { name: /Total do item.*637,20/ })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /R\$\s*919,20/ })).toBeInTheDocument();
    });

    it('formats a seven percent tier without floating-point noise', () => {
      const calculation = {
        ...mockCalculation,
        calculations: {
          ...mockCalculation.calculations,
          items: mockCalculation.calculations.items.map((item, index) =>
            index === 0 ? { ...item, tierDiscount: 0.07, savings: 42 } : item
          ),
        },
      };
      mockUseQuoteCalculation.mockReturnValue({
        calculation,
        loading: false,
        error: null,
        calculate: mockCalculate,
        reset: mockReset,
      });
      renderPage();
      expect(
        screen.getByRole('row', { name: /Desconto por volume \(7%\).*42,00/ })
      ).toBeInTheDocument();
      expect(screen.queryByText(/7\.0+\d/)).not.toBeInTheDocument();
    });

    it('hides a completed calculation whose quantities belong to an earlier quotation', () => {
      mockUseQuotation.mockReturnValue({
        quotation: {
          ...mockQuotation,
          items: mockQuotation.items.map(item => ({ ...item, quantity: item.quantity + 1 })),
        },
        loading: false,
        error: null,
      });
      renderPage();
      expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
      expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
    });

    it('keeps separate calculation rows for repeated products with different quantities', () => {
      mockUseQuotation.mockReturnValue({
        quotation: {
          ...mockQuotation,
          items: [mockQuotation.items[0], { ...mockQuotation.items[0], id: 2, quantity: 1 }],
        },
        loading: false,
        error: null,
      });
      mockUseQuoteCalculation.mockReturnValue({
        calculation: {
          ...mockCalculation,
          calculations: {
            ...mockCalculation.calculations,
            items: [
              mockCalculation.calculations.items[0],
              { ...mockCalculation.calculations.items[1], productId: 1 },
            ],
          },
        },
        loading: false,
        error: null,
        calculate: mockCalculate,
        reset: mockReset,
      });
      renderPage();
      expect(screen.getByRole('row', { name: /Total do item.*708,00/ })).toBeInTheDocument();
      expect(screen.getByRole('row', { name: /Total do item.*177,00/ })).toBeInTheDocument();
    });

    it('hides stale amounts while pricing is loading', () => {
      mockUseQuoteCalculation.mockReturnValue({
        calculation: mockCalculation,
        loading: true,
        error: null,
        calculate: mockCalculate,
        reset: mockReset,
      });
      renderPage();
      expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
      expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
    });

    it('reports pricing failure without displaying fallback amounts', async () => {
      mockCalculate.mockRejectedValue(new Error('Unavailable'));
      mockUseQuoteCalculation.mockReturnValue({
        calculation: mockCalculation,
        loading: false,
        error: 'Unavailable',
        calculate: mockCalculate,
        reset: mockReset,
      });
      renderPage();
      expect(screen.getByText(/Não foi possível calcular/)).toBeInTheDocument();
      expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
      await waitFor(() => expect(mockCalculate).toHaveBeenCalled());
    });
  });

  describe('historical pricing context', () => {
    const completedNotice = /Não são o total registrado do pedido/;
    const estimateLabel = 'Total estimado (preços atuais)';
    const mockCompletedCalculation = (grandTotal: number) => {
      mockUseQuotation.mockReturnValue({
        quotation: { ...mockQuotation, status: 'completed', totalAmount: 15000 },
        loading: false,
        error: null,
      });
      mockUseQuoteCalculation.mockReturnValue({
        calculation: withGrandTotal(grandTotal),
        loading: false,
        error: null,
        calculate: mockCalculate,
        reset: mockReset,
      });
    };

    it('identifies completed quotation amounts as current estimates, not recorded order totals', () => {
      mockCompletedCalculation(17751.25);
      renderPage();

      expect(screen.getByRole('heading', { name: /R\$\s*17\.751,25/ })).toBeInTheDocument();
      expect(screen.getByText(estimateLabel)).toBeInTheDocument();
      expect(screen.getByText(completedNotice)).toBeInTheDocument();
      expect(screen.queryByText(/recalculado ao ser criado|Total geral/)).not.toBeInTheDocument();
      expect(screen.queryByText(/15\.000,00/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Criar Pedido' })).not.toBeInTheDocument();
      expect(ordersService.createOrderFromQuotation).not.toHaveBeenCalled();
    });

    it('keeps the historical distinction when the catalog price changes before a later visit', () => {
      mockCompletedCalculation(17751.25);
      const firstVisit = renderPage();
      expect(screen.getByRole('heading', { name: /R\$\s*17\.751,25/ })).toBeInTheDocument();
      firstVisit.unmount();

      mockCompletedCalculation(19521.25);
      renderPage();

      expect(screen.getByRole('heading', { name: /R\$\s*19\.521,25/ })).toBeInTheDocument();
      expect(screen.queryByText(/17\.751,25|15\.000,00/)).not.toBeInTheDocument();
      expect(screen.getByText(estimateLabel)).toBeInTheDocument();
      expect(screen.getByText(completedNotice)).toBeInTheDocument();
      expect(screen.queryByText(/recalculado ao ser criado|Total geral/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Criar Pedido' })).not.toBeInTheDocument();
      expect(ordersService.createOrderFromQuotation).not.toHaveBeenCalled();
    });

    it('keeps the conversion-time explanation for processed quotations', () => {
      renderPage();
      expect(screen.getByText(/O pedido é recalculado ao ser criado/)).toBeInTheDocument();
      expect(screen.getByText(estimateLabel)).toBeInTheDocument();
      expect(screen.queryByText(completedNotice)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Criar Pedido' })).toBeInTheDocument();
    });

    it.each(['pending', 'rejected'])(
      'uses a neutral current-estimate explanation for %s quotations',
      status => {
        mockUseQuotation.mockReturnValue({
          quotation: { ...mockQuotation, status },
          loading: false,
          error: null,
        });
        renderPage();
        expect(screen.getByText(/Estes valores são uma estimativa/)).toBeInTheDocument();
        expect(screen.getByText(estimateLabel)).toBeInTheDocument();
        expect(
          screen.queryByText(/total registrado|recalculado ao ser criado/)
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Criar Pedido' })).not.toBeInTheDocument();
      }
    );
  });

  describe('useQuotation called with correct id', () => {
    it('calls useQuotation with the parsed route id', () => {
      renderPage();

      expect(mockUseQuotation).toHaveBeenCalledWith(42);
    });
  });
});
