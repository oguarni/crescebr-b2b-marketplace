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
