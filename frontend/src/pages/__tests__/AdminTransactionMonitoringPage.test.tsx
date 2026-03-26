import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminTransactionMonitoringPage from '../AdminTransactionMonitoringPage';

vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid='line-chart'>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div data-testid='pie-chart'>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
}));

const mockAdminRequest = vi.fn();

vi.mock('../../services/authService', () => ({
  authService: {
    adminRequest: (...args: any[]) => mockAdminRequest(...args),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockTransactionData = {
  orders: [
    {
      id: 'abc12345-6789-0000-1111-222233334444',
      status: 'delivered',
      companyId: 1,
      quotationId: 10,
      totalAmount: 5000,
      estimatedDeliveryDate: '2026-04-01T00:00:00.000Z',
      trackingNumber: 'TR123456',
      createdAt: '2026-03-15T10:00:00.000Z',
      updatedAt: '2026-03-16T10:00:00.000Z',
      user: {
        id: 1,
        email: 'buyer@example.com',
        companyName: 'Buyer Corp',
        role: 'customer',
      },
      quotation: {
        id: 10,
        totalAmount: 5000,
        status: 'completed',
      },
    },
    {
      id: 'def12345-6789-0000-1111-222233334444',
      status: 'pending',
      companyId: 2,
      quotationId: 11,
      totalAmount: 3000,
      createdAt: '2026-03-14T10:00:00.000Z',
      updatedAt: '2026-03-14T10:00:00.000Z',
      user: {
        id: 2,
        email: 'another@example.com',
        companyName: 'Another Corp',
        role: 'customer',
      },
      quotation: {
        id: 11,
        totalAmount: 3000,
        status: 'pending',
      },
    },
  ],
  totalRevenue: 8000,
  ordersByStatus: { delivered: 1, pending: 1 },
  totalOrders: 2,
};

describe('AdminTransactionMonitoringPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while fetching data', () => {
    mockAdminRequest.mockReturnValue(new Promise(() => {}));
    render(<AdminTransactionMonitoringPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays metrics cards after data loads', async () => {
    mockAdminRequest.mockResolvedValue({ data: mockTransactionData });
    render(<AdminTransactionMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText('Receita Total')).toBeInTheDocument();
    });
    expect(screen.getByText('Total de Pedidos')).toBeInTheDocument();
    expect(screen.getByText('Valor Médio do Pedido')).toBeInTheDocument();
    expect(screen.getByText('Taxa de Conclusão')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // totalOrders
  });

  it('renders line chart and pie chart', async () => {
    mockAdminRequest.mockResolvedValue({ data: mockTransactionData });
    render(<AdminTransactionMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('displays transactions table with order data', async () => {
    mockAdminRequest.mockResolvedValue({ data: mockTransactionData });
    render(<AdminTransactionMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText('Transações Recentes')).toBeInTheDocument();
    });
    expect(screen.getByText('Buyer Corp')).toBeInTheDocument();
    expect(screen.getByText('buyer@example.com')).toBeInTheDocument();
    expect(screen.getByText('Another Corp')).toBeInTheDocument();
  });

  it('shows error alert when API call fails', async () => {
    mockAdminRequest.mockRejectedValue(new Error('Network error'));
    render(<AdminTransactionMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('renders filter controls with date inputs and status select', async () => {
    mockAdminRequest.mockResolvedValue({ data: mockTransactionData });
    render(<AdminTransactionMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText('Filtros')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Data Inicial')).toBeInTheDocument();
    expect(screen.getByLabelText('Data Final')).toBeInTheDocument();
    expect(screen.getByText('Aplicar Filtros')).toBeInTheDocument();
  });

  it('calls loadTransactionData again when refresh button is clicked', async () => {
    mockAdminRequest.mockResolvedValue({ data: mockTransactionData });
    render(<AdminTransactionMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText('Atualizar')).toBeInTheDocument();
    });

    mockAdminRequest.mockClear();
    mockAdminRequest.mockResolvedValue({ data: mockTransactionData });

    fireEvent.click(screen.getByText('Atualizar'));

    await waitFor(() => {
      expect(mockAdminRequest).toHaveBeenCalledWith(
        '/admin/transaction-monitoring',
        expect.objectContaining({ params: expect.any(Object) })
      );
    });
  });
});
