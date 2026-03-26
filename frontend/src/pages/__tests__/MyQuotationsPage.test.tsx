import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyQuotationsPage from '../MyQuotationsPage';
import { quotationsService } from '../../services/quotationsService';
import { ordersService } from '../../services/ordersService';

vi.mock('../../services/quotationsService', () => ({
  quotationsService: {
    getCustomerQuotations: vi.fn(),
  },
}));

vi.mock('../../services/ordersService', () => ({
  ordersService: {
    createOrderFromQuotation: vi.fn(),
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'customer' }, isAuthenticated: true }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const mockQuotations = [
  {
    id: 1,
    companyId: 1,
    status: 'pending',
    adminNotes: null,
    items: [
      {
        id: 1,
        quotationId: 1,
        productId: 10,
        product: {
          id: 10,
          name: 'Parafuso M8',
          imageUrl: '/img/parafuso.jpg',
          price: 2.5,
          description: 'Parafuso de aço',
          category: 'Fixadores',
          companyId: 2,
        },
        quantity: 100,
      },
    ],
    createdAt: new Date('2026-01-10T12:00:00Z'),
  },
  {
    id: 2,
    companyId: 1,
    status: 'processed',
    adminNotes: 'Cotacao aprovada',
    items: [
      {
        id: 2,
        quotationId: 2,
        productId: 20,
        product: {
          id: 20,
          name: 'Porca Sextavada',
          imageUrl: '/img/porca.jpg',
          price: 1.0,
          description: 'Porca de aço',
          category: 'Fixadores',
          companyId: 2,
        },
        quantity: 200,
      },
    ],
    createdAt: new Date('2026-01-12T09:00:00Z'),
  },
  {
    id: 3,
    companyId: 1,
    status: 'rejected',
    adminNotes: 'Produto indisponivel',
    items: [
      {
        id: 3,
        quotationId: 3,
        productId: 30,
        product: {
          id: 30,
          name: 'Arruela Lisa',
          imageUrl: '/img/arruela.jpg',
          price: 0.5,
          description: 'Arruela de aço',
          category: 'Fixadores',
          companyId: 2,
        },
        quantity: 500,
      },
    ],
    createdAt: new Date('2026-01-14T15:00:00Z'),
  },
];

const renderPage = async () => {
  await act(async () => {
    render(
      <BrowserRouter>
        <MyQuotationsPage />
      </BrowserRouter>
    );
  });
};

describe('MyQuotationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('shows loading spinner while fetching quotations', async () => {
    vi.mocked(quotationsService.getCustomerQuotations).mockImplementation(
      () => new Promise(() => {})
    );

    await act(async () => {
      render(
        <BrowserRouter>
          <MyQuotationsPage />
        </BrowserRouter>
      );
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders quotations list with data', async () => {
    vi.mocked(quotationsService.getCustomerQuotations).mockResolvedValue(mockQuotations);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Minhas Cotações')).toBeInTheDocument();
    });

    expect(screen.getByText('Cotação #1')).toBeInTheDocument();
    expect(screen.getByText('Cotação #2')).toBeInTheDocument();
    expect(screen.getByText('Cotação #3')).toBeInTheDocument();
    expect(screen.getByText('Parafuso M8')).toBeInTheDocument();
    expect(screen.getByText('Porca Sextavada')).toBeInTheDocument();
  });

  it('shows empty state when no quotations exist', async () => {
    vi.mocked(quotationsService.getCustomerQuotations).mockResolvedValue([]);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Nenhuma cotação encontrada')).toBeInTheDocument();
    });

    expect(screen.getByText('Navegar Produtos')).toBeInTheDocument();
  });

  it('displays correct status chips for each quotation', async () => {
    vi.mocked(quotationsService.getCustomerQuotations).mockResolvedValue(mockQuotations);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Pendente')).toBeInTheDocument();
    });

    expect(screen.getByText('Processada')).toBeInTheDocument();
    expect(screen.getByText('Rejeitada')).toBeInTheDocument();
  });

  it('creates order from processed quotation', async () => {
    vi.mocked(quotationsService.getCustomerQuotations).mockResolvedValue(mockQuotations);
    vi.mocked(ordersService.createOrderFromQuotation).mockResolvedValue({
      id: 'new-order-id',
      companyId: 1,
      quotationId: 2,
      items: [],
      totalAmount: 200,
      status: 'pending',
      shippingAddress: 'Rua Teste',
      notes: null,
    });

    const toast = (await import('react-hot-toast')).default;

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Create Order')).toBeInTheDocument();
    });

    const createOrderButton = screen.getByText('Create Order');
    await act(async () => {
      fireEvent.click(createOrderButton);
    });

    await waitFor(() => {
      expect(ordersService.createOrderFromQuotation).toHaveBeenCalledWith({ quotationId: 2 });
      expect(toast.success).toHaveBeenCalledWith('Order created successfully!');
      expect(mockNavigate).toHaveBeenCalledWith('/my-orders');
    });
  });

  it('shows error toast when loading quotations fails', async () => {
    const toast = (await import('react-hot-toast')).default;
    vi.mocked(quotationsService.getCustomerQuotations).mockRejectedValue(
      new Error('Erro ao carregar cotações')
    );

    await renderPage();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao carregar cotações');
    });
  });
});
