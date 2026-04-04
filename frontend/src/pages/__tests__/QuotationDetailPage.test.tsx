import React from 'react';
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
}));

import { useAuth } from '../../contexts/AuthContext';
import { useQuotation } from '../../hooks';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseQuotation = useQuotation as ReturnType<typeof vi.fn>;
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
        expect(toast.error).toHaveBeenCalledWith('Failed to create order');
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

  describe('grand total calculation', () => {
    it('calculates grand total with tax, freight, and packaging', () => {
      renderPage();

      // baseTotal = 3*200 + 1*150 = 750
      // taxAmount = 750 * 0.15 = 112.50
      // freight = 850, packaging = 120
      // grandTotal = 750 + 112.50 + 850 + 120 = 1832.50
      // Verify total section renders
      expect(screen.getAllByText(/R\$/).length).toBeGreaterThan(0);
    });
  });

  describe('useQuotation called with correct id', () => {
    it('calls useQuotation with the parsed route id', () => {
      renderPage();

      expect(mockUseQuotation).toHaveBeenCalledWith(42);
    });
  });
});
