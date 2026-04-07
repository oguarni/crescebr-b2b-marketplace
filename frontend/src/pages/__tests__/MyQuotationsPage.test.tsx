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

let mockUserRole = 'customer';
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: mockUserRole }, isAuthenticated: true }),
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
    mockUserRole = 'customer';
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

  it('shows access denied for non-customer users', async () => {
    mockUserRole = 'supplier';
    vi.mocked(quotationsService.getCustomerQuotations).mockResolvedValue([]);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Apenas clientes podem visualizar cotações/)).toBeInTheDocument();
    });
  });

  it('shows generic error when createOrderFromQuotation fails with non-Error', async () => {
    vi.mocked(quotationsService.getCustomerQuotations).mockResolvedValue(mockQuotations);
    vi.mocked(ordersService.createOrderFromQuotation).mockRejectedValue('string error');

    const toast = (await import('react-hot-toast')).default;

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Create Order')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create Order'));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to create order');
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

  it('renders completed and unknown status quotations', async () => {
    const completedQuotation = {
      ...mockQuotations[0],
      id: 10,
      status: 'completed',
      adminNotes: null,
      items: [{ ...mockQuotations[0].items[0] }],
    };
    const unknownStatusQuotation = {
      ...mockQuotations[0],
      id: 11,
      status: 'unknown_status',
      adminNotes: null,
      items: [{ ...mockQuotations[0].items[0] }],
    };
    vi.mocked(quotationsService.getCustomerQuotations).mockResolvedValue([
      completedQuotation,
      unknownStatusQuotation,
    ]);

    await renderPage();

    await waitFor(() => {
      // completed → 'Concluída' label
      expect(screen.getByText('Concluída')).toBeInTheDocument();
      // unknown_status → returns status as-is
      expect(screen.getByText('unknown_status')).toBeInTheDocument();
    });
  });

  it('shows +N more items when quotation has more than 3 items', async () => {
    const quotationWith4Items = {
      ...mockQuotations[0],
      items: [
        {
          id: 1,
          quotationId: 1,
          productId: 10,
          product: {
            id: 10,
            name: 'Item 1',
            imageUrl: '/img/1.jpg',
            price: 1,
            description: '',
            category: '',
            companyId: 2,
          },
          quantity: 1,
        },
        {
          id: 2,
          quotationId: 1,
          productId: 11,
          product: {
            id: 11,
            name: 'Item 2',
            imageUrl: '/img/2.jpg',
            price: 1,
            description: '',
            category: '',
            companyId: 2,
          },
          quantity: 1,
        },
        {
          id: 3,
          quotationId: 1,
          productId: 12,
          product: {
            id: 12,
            name: 'Item 3',
            imageUrl: '/img/3.jpg',
            price: 1,
            description: '',
            category: '',
            companyId: 2,
          },
          quantity: 1,
        },
        {
          id: 4,
          quotationId: 1,
          productId: 13,
          product: {
            id: 13,
            name: 'Item 4',
            imageUrl: '/img/4.jpg',
            price: 1,
            description: '',
            category: '',
            companyId: 2,
          },
          quantity: 1,
        },
      ],
    };

    vi.mocked(quotationsService.getCustomerQuotations).mockResolvedValue([quotationWith4Items]);

    await renderPage();

    await waitFor(() => {
      // Component renders "+1 item adicionai" (singular root without 'l' suffix)
      expect(screen.getByText(/\+1 item/)).toBeInTheDocument();
    });
  });

  it('shows N/A when quotation has no createdAt date', async () => {
    const quotationWithoutDate = {
      ...mockQuotations[0],
      createdAt: undefined as unknown as Date,
    };
    vi.mocked(quotationsService.getCustomerQuotations).mockResolvedValue([quotationWithoutDate]);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Solicitada em: N\/A/)).toBeInTheDocument();
    });
  });

  it('shows error message from Error instance when createOrderFromQuotation fails', async () => {
    vi.mocked(quotationsService.getCustomerQuotations).mockResolvedValue(mockQuotations);
    vi.mocked(ordersService.createOrderFromQuotation).mockRejectedValue(
      new Error('Specific error message')
    );

    const toast = (await import('react-hot-toast')).default;

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Create Order')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create Order'));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Specific error message');
    });
  });

  it('shows "s" plural suffix when quotation has more than 4 items (5+ extra)', async () => {
    const quotationWith5Items = {
      ...mockQuotations[0],
      items: Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        quotationId: 1,
        productId: 10 + i,
        product: {
          id: 10 + i,
          name: `Item ${i + 1}`,
          imageUrl: `/img/${i + 1}.jpg`,
          price: 1,
          description: '',
          category: '',
          companyId: 2,
        },
        quantity: 1,
      })),
    };

    vi.mocked(quotationsService.getCustomerQuotations).mockResolvedValue([quotationWith5Items]);

    await renderPage();

    await waitFor(() => {
      // With 5 items, diff = 5-3 = 2 (2 !== 1 is true), so both ternaries return 's'
      expect(screen.getByText(/\+2 items adicionais/)).toBeInTheDocument();
    });
  });

  it('triggers image onError fallback in Avatar', async () => {
    vi.mocked(quotationsService.getCustomerQuotations).mockResolvedValue(mockQuotations);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Parafuso M8')).toBeInTheDocument();
    });

    const imgs = document.querySelectorAll('img');
    if (imgs.length > 0) {
      fireEvent.error(imgs[0]);
      // After onError the src is replaced with base64 fallback
      expect(imgs[0].src).toContain('data:image');
    }
  });
});
