import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminQuotationsPage from '../AdminQuotationsPage';
import { Quotation } from '@shared/types';

const mockGetAllQuotations = vi.fn();
const mockUpdateQuotation = vi.fn();

vi.mock('../../services/quotationsService', () => ({
  quotationsService: {
    getAllQuotations: (...args: any[]) => mockGetAllQuotations(...args),
    updateQuotation: (...args: any[]) => mockUpdateQuotation(...args),
  },
}));

const mockUseAuth = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

const mockQuotations: Quotation[] = [
  {
    id: 1,
    companyId: 10,
    company: {
      id: 10,
      email: 'buyer@example.com',
      cnpj: '12345678000100',
      companyName: 'Buyer Corp',
      role: 'customer',
    } as any,
    items: [
      {
        id: 100,
        quotationId: 1,
        productId: 5,
        product: {
          id: 5,
          name: 'Widget',
          price: 50,
          imageUrl: 'https://example.com/img.jpg',
          description: '',
          category: '',
          supplierId: 1,
          unitPrice: 50,
          minimumOrderQuantity: 1,
          leadTime: 7,
          availability: 'in_stock' as const,
          specifications: {},
          tierPricing: [],
        },
        quantity: 10,
      },
    ],
    status: 'pending',
    adminNotes: null,
    createdAt: new Date('2026-03-10'),
  },
  {
    id: 2,
    companyId: 11,
    company: {
      id: 11,
      email: 'other@example.com',
      cnpj: '98765432000100',
      companyName: 'Other Corp',
      role: 'customer',
    } as any,
    items: [],
    status: 'completed',
    adminNotes: 'Approved',
    createdAt: new Date('2026-03-12'),
  },
];

const adminUser = { id: 1, email: 'admin@crescebr.com', role: 'admin', companyName: 'Admin Co' };
const buyerUser = { id: 2, email: 'buyer@example.com', role: 'customer', companyName: 'Buyer Co' };

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminQuotationsPage />
    </MemoryRouter>
  );

describe('AdminQuotationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: adminUser });
  });

  it('shows loading spinner while fetching quotations', () => {
    mockGetAllQuotations.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays quotations table after data loads', async () => {
    mockGetAllQuotations.mockResolvedValue(mockQuotations);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Gerenciar Cotações')).toBeInTheDocument();
    });
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('buyer@example.com')).toBeInTheDocument();
  });

  it('opens update dialog when edit button is clicked', async () => {
    mockGetAllQuotations.mockResolvedValue(mockQuotations);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Editar');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Atualizar Cotação #1')).toBeInTheDocument();
    });
  });

  it('calls updateQuotation on dialog submit and shows success toast', async () => {
    mockGetAllQuotations.mockResolvedValue(mockQuotations);
    const updatedQuotation = { ...mockQuotations[0], status: 'processed' as const };
    mockUpdateQuotation.mockResolvedValue(updatedQuotation);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Editar');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Atualizar Cotação #1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Atualizar'));

    await waitFor(() => {
      expect(mockUpdateQuotation).toHaveBeenCalledWith(1, {
        status: 'pending',
        adminNotes: '',
      });
    });
    expect(mockToast.success).toHaveBeenCalledWith('Cotação atualizada com sucesso!');
  });

  it('shows error toast when update fails', async () => {
    mockGetAllQuotations.mockResolvedValue(mockQuotations);
    mockUpdateQuotation.mockRejectedValue(new Error('Update failed'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Editar');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Atualizar Cotação #1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Atualizar'));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Update failed');
    });
  });

  it('shows access denied alert for non-admin users', () => {
    mockUseAuth.mockReturnValue({ user: buyerUser });
    renderPage();
    expect(screen.getByText(/Acesso negado/)).toBeInTheDocument();
  });

  it('shows empty state when no quotations exist', async () => {
    mockGetAllQuotations.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Nenhuma cotação encontrada')).toBeInTheDocument();
    });
  });
});
