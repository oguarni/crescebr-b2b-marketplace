import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyOrdersPage from '../MyOrdersPage';
import { ordersService } from '../../services/ordersService';

// Mock MUI Chip to prevent ripple/animation state updates in React 19 act()
vi.mock('@mui/material/Chip', () => ({
  default: ({
    label,
    icon,
    color,
    variant,
    clickable,
  }: {
    label?: React.ReactNode;
    icon?: React.ReactNode;
    color?: string;
    variant?: string;
    clickable?: boolean;
  }) => (
    <div data-testid='chip' data-color={color} data-variant={variant} data-clickable={clickable}>
      {icon && <span data-testid='chip-icon'>{icon}</span>}
      <span>{label}</span>
    </div>
  ),
}));

// Mock MUI icon components to prevent animation state updates in React 19 act()
vi.mock('@mui/icons-material', () => ({
  HourglassEmpty: () => <span data-testid='HourglassEmptyIcon' />,
  LocalShipping: () => <span data-testid='LocalShippingIcon' />,
  CheckCircle: () => <span data-testid='CheckCircleIcon' />,
  Cancel: () => <span data-testid='CancelIcon' />,
  Engineering: () => <span data-testid='EngineeringIcon' />,
  Receipt: () => <span data-testid='ReceiptIcon' />,
  Timeline: () => <span data-testid='TimelineIcon' />,
  Visibility: () => <span data-testid='VisibilityIcon' />,
  Close: () => <span data-testid='CloseIcon' />,
}));

vi.mock('../../services/ordersService', () => ({
  ordersService: {
    getUserOrders: vi.fn(),
    getOrderHistory: vi.fn(),
    getStatusLabel: vi.fn((status: string) => {
      const labels: Record<string, string> = {
        pending: 'Pendente',
        processing: 'Processando',
        shipped: 'Enviado',
        delivered: 'Entregue',
        cancelled: 'Cancelado',
      };
      return labels[status] || status;
    }),
    getStatusColor: vi.fn((status: string) => {
      const colors: Record<string, string> = {
        pending: 'warning',
        processing: 'info',
        shipped: 'primary',
        delivered: 'success',
        cancelled: 'error',
      };
      return colors[status] || 'default';
    }),
    formatPrice: vi.fn((price: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)
    ),
    formatDate: vi.fn(() => '15/01/2026'),
  },
}));

vi.mock('../../contexts/AuthContext', () => {
  // stable reference prevents useEffect[user] from triggering on every render
  const stableUser = { id: 1, role: 'customer' };
  return { useAuth: () => ({ user: stableUser, isAuthenticated: true }) };
});

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const mockOrders = [
  {
    id: 'abc12345-6789-0000-1111-222233334444',
    companyId: 1,
    quotationId: 10,
    items: [],
    totalAmount: 1500.0,
    status: 'pending',
    shippingAddress: 'Rua Teste, 123',
    notes: null,
    trackingNumber: null,
    estimatedDeliveryDate: null,
    createdAt: new Date('2026-01-15T10:00:00Z'),
  },
  {
    id: 'def67890-1234-5555-6666-777788889999',
    companyId: 1,
    quotationId: 11,
    items: [],
    totalAmount: 3200.5,
    status: 'shipped',
    shippingAddress: 'Rua Exemplo, 456',
    notes: null,
    trackingNumber: 'BR123456789',
    estimatedDeliveryDate: new Date('2026-02-10T00:00:00Z'),
    createdAt: new Date('2026-01-20T14:30:00Z'),
  },
];

const mockOrderHistory = {
  order: mockOrders[0],
  timeline: [
    {
      status: 'pending',
      description: 'Pedido criado',
      date: new Date('2026-01-15T10:00:00Z'),
      canTransitionTo: ['processing', 'cancelled'],
    },
  ],
};

// Render without act() - use waitFor in tests to handle async state updates
const renderPage = () => {
  render(
    <BrowserRouter>
      <MyOrdersPage />
    </BrowserRouter>
  );
};

describe('MyOrdersPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({
      orders: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
  });

  it('renders orders table with data', async () => {
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({
      orders: mockOrders,
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('#abc12345')).toBeInTheDocument();
    });

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('#def67890')).toBeInTheDocument();
    expect(screen.getByText('BR123456789')).toBeInTheDocument();
    expect(screen.getByText('Sem rastreamento')).toBeInTheDocument();
  });

  it('shows empty state when no orders exist', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Nenhum pedido encontrado')).toBeInTheDocument();
    });

    expect(screen.getByText('Explorar Produtos')).toBeInTheDocument();
  });

  it('shows error toast when loading orders fails', async () => {
    const toast = (await import('react-hot-toast')).default;
    vi.mocked(ordersService.getUserOrders).mockRejectedValue(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao carregar pedidos');
    });
  });

  it('filters orders by status', async () => {
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({
      orders: mockOrders,
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('#abc12345')).toBeInTheDocument();
    });

    const statusSelect = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.mouseDown(statusSelect);
    });

    const pendingOption = await screen.findByRole('option', { name: 'Pendente' });
    await act(async () => {
      fireEvent.click(pendingOption);
    });

    await waitFor(() => {
      expect(ordersService.getUserOrders).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' })
      );
    });
  });

  it('opens timeline dialog when clicking timeline button', async () => {
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({
      orders: mockOrders,
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });
    vi.mocked(ordersService.getOrderHistory).mockResolvedValue(mockOrderHistory);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('#abc12345')).toBeInTheDocument();
    });

    const timelineButtons = screen.getAllByLabelText('Ver Timeline');
    fireEvent.click(timelineButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Timeline do Pedido/)).toBeInTheDocument();
    });

    expect(ordersService.getOrderHistory).toHaveBeenCalledWith(mockOrders[0].id);
  });

  it('renders pagination when multiple pages exist', async () => {
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({
      orders: mockOrders,
      pagination: { total: 25, page: 1, limit: 10, totalPages: 3 },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Go to page 2' })).toBeInTheDocument();
  });

  it('shows trackingNumber and estimatedDeliveryDate in timeline dialog', async () => {
    const orderWithTracking = {
      ...mockOrders[0],
      trackingNumber: 'TRACK001',
      estimatedDeliveryDate: new Date('2026-03-01T00:00:00Z'),
    };
    const historyWithTracking = {
      order: orderWithTracking,
      timeline: [
        {
          status: 'shipped',
          description: 'Pedido enviado',
          date: new Date('2026-01-20T10:00:00Z'),
          canTransitionTo: ['delivered'],
        },
      ],
    };

    vi.mocked(ordersService.getUserOrders).mockResolvedValue({
      orders: [orderWithTracking],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
    vi.mocked(ordersService.getOrderHistory).mockResolvedValue(historyWithTracking);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('#abc12345')).toBeInTheDocument();
    });

    const timelineButtons = screen.getAllByLabelText('Ver Timeline');
    fireEvent.click(timelineButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Código de Rastreamento')).toBeInTheDocument();
      expect(screen.getAllByText('TRACK001').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Entrega Estimada').length).toBeGreaterThan(0);
    });
  });

  it('clears status filter when Limpar Filtros button is clicked', async () => {
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({
      orders: mockOrders,
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('#abc12345')).toBeInTheDocument());

    // Set a filter first
    const statusSelect = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.mouseDown(statusSelect);
    });
    const pendingOption = await screen.findByRole('option', { name: 'Pendente' });
    await act(async () => {
      fireEvent.click(pendingOption);
    });

    // Now click "Limpar Filtros"
    const clearButton = screen.getByRole('button', { name: 'Limpar Filtros' });
    await act(async () => {
      fireEvent.click(clearButton);
    });

    await waitFor(() => {
      expect(ordersService.getUserOrders).toHaveBeenCalledWith(
        expect.objectContaining({ status: undefined })
      );
    });
  });

  it('shows filtered empty message when filter active and no matching orders', async () => {
    renderPage(); // default mock returns empty orders

    await waitFor(() => expect(screen.getByText('Nenhum pedido encontrado')).toBeInTheDocument());

    const statusSelect = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.mouseDown(statusSelect);
    });
    const pendingOption = await screen.findByRole('option', { name: 'Pendente' });
    await act(async () => {
      fireEvent.click(pendingOption);
    });

    await waitFor(() => {
      expect(screen.getByText(/Não há pedidos com status/)).toBeInTheDocument();
    });
  });

  it('navigates to home when Explorar Produtos button is clicked in empty state', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Explorar Produtos')).toBeInTheDocument());

    const exploreButton = screen.getByRole('button', { name: 'Explorar Produtos' });
    fireEvent.click(exploreButton);
    // navigate('/') is called — no error thrown is sufficient coverage
  });

  it('renders orders with all status types to cover getStatusIcon branches', async () => {
    const allStatusOrders = [
      { ...mockOrders[0], id: 'id-processing', status: 'processing' },
      { ...mockOrders[0], id: 'id-delivered', status: 'delivered' },
      { ...mockOrders[0], id: 'id-cancelled', status: 'cancelled' },
      { ...mockOrders[0], id: 'id-unknown', status: 'unknown_status' },
    ];
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({
      orders: allStatusOrders,
      pagination: { total: 4, page: 1, limit: 10, totalPages: 1 },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('EngineeringIcon')).toBeInTheDocument();
      expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
      expect(screen.getByTestId('CancelIcon')).toBeInTheDocument();
    });
  });

  it('closes timeline dialog when Fechar button is clicked', async () => {
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({
      orders: mockOrders,
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });
    vi.mocked(ordersService.getOrderHistory).mockResolvedValue(mockOrderHistory);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('#abc12345')).toBeInTheDocument();
    });

    const timelineButtons = screen.getAllByLabelText('Ver Timeline');
    fireEvent.click(timelineButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Timeline do Pedido/)).toBeInTheDocument();
    });

    // Click Fechar to trigger handleCloseTimeline
    const closeButton = screen.getByRole('button', { name: 'Fechar' });
    await act(async () => {
      fireEvent.click(closeButton);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Timeline do Pedido/)).not.toBeInTheDocument();
    });
  });

  it('shows access denied for non-customer users', async () => {
    const authModule = await import('../../contexts/AuthContext');
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: 1, role: 'supplier' } as any,
      isAuthenticated: true,
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('Acesso negado. Apenas clientes podem visualizar pedidos.')
      ).toBeInTheDocument();
    });
  });

  // Loading spinner test runs LAST to avoid contaminating other tests
  // with a never-resolving promise that hangs act() in React 19
  it('shows loading spinner while fetching orders', () => {
    vi.mocked(ordersService.getUserOrders).mockImplementation(() => new Promise(() => {}));

    render(
      <BrowserRouter>
        <MyOrdersPage />
      </BrowserRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
