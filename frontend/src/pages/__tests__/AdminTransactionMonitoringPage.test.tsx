import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminTransactionMonitoringPage from '../AdminTransactionMonitoringPage';

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='line-chart'>{children}</div>
  ),
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='pie-chart'>{children}</div>
  ),
  Pie: () => <div />,
  Cell: () => <div />,
}));

const mockAdminRequest = vi.fn();

vi.mock('../../services/authService', () => ({
  authService: {
    adminRequest: (...args: unknown[]) => mockAdminRequest(...args),
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

  it('opens order detail dialog when Visibility icon is clicked', async () => {
    mockAdminRequest.mockResolvedValue({ data: mockTransactionData });
    render(<AdminTransactionMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText('Buyer Corp')).toBeInTheDocument();
    });

    const visibilityButtons = screen.getAllByTitle('Ver detalhes');
    fireEvent.click(visibilityButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('TR123456')).toBeInTheDocument();
      expect(screen.getAllByText('Empresa').length).toBeGreaterThan(0);
      expect(screen.getByText('Número de Rastreamento')).toBeInTheDocument();
      expect(screen.getByText('ID da Cotação')).toBeInTheDocument();
    });
  });

  it('shows Não definida when order has no estimatedDeliveryDate', async () => {
    const dataWithoutDelivery = {
      ...mockTransactionData,
      orders: [{ ...mockTransactionData.orders[1], estimatedDeliveryDate: undefined }],
    };
    mockAdminRequest.mockResolvedValue({ data: dataWithoutDelivery });
    render(<AdminTransactionMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText('Another Corp')).toBeInTheDocument();
    });

    const visibilityButtons = screen.getAllByTitle('Ver detalhes');
    fireEvent.click(visibilityButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Não definida')).toBeInTheDocument();
      expect(screen.getByText('Não disponível')).toBeInTheDocument();
    });
  });

  it('closes order detail dialog when Fechar is clicked', async () => {
    mockAdminRequest.mockResolvedValue({ data: mockTransactionData });
    render(<AdminTransactionMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText('Buyer Corp')).toBeInTheDocument();
    });

    const visibilityButtons = screen.getAllByTitle('Ver detalhes');
    fireEvent.click(visibilityButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Fechar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Fechar'));

    await waitFor(() => {
      expect(screen.queryByText('Fechar')).not.toBeInTheDocument();
    });
  });

  it('exports data when Exportar button is clicked', async () => {
    mockAdminRequest.mockResolvedValue({ data: mockTransactionData });

    const mockUrl = 'blob:mock-url';
    const mockClick = vi.fn();
    const mockCreateObjectURL = vi.fn().mockReturnValue(mockUrl);
    const mockRevokeObjectURL = vi.fn();

    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    render(<AdminTransactionMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText('Exportar')).toBeInTheDocument();
    });

    // Mock createElement after render so React's internal calls are not affected
    const mockCreateElement = vi.spyOn(document, 'createElement').mockImplementationOnce(() => {
      return { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement;
    });

    fireEvent.click(screen.getByText('Exportar'));

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockUrl);

    mockCreateElement.mockRestore();
  });

  it('shows empty state when no orders', async () => {
    mockAdminRequest.mockResolvedValue({
      data: { ...mockTransactionData, orders: [], totalOrders: 0 },
    });
    render(<AdminTransactionMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma transação encontrada')).toBeInTheDocument();
    });
  });

  it('changes status filter select', async () => {
    mockAdminRequest.mockResolvedValue({ data: mockTransactionData });
    render(<AdminTransactionMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText('Filtros')).toBeInTheDocument();
    });

    const statusSelect = screen.getByRole('combobox');
    fireEvent.mouseDown(statusSelect);

    const processingOption = await screen.findByRole('option', { name: 'Processando' });
    fireEvent.click(processingOption);

    // Verify the select now shows the selected value (Processando not already in table)
    expect(screen.getAllByText('Processando').length).toBeGreaterThan(0);
  });

  it('changes date range filter inputs', async () => {
    mockAdminRequest.mockResolvedValue({ data: mockTransactionData });
    render(<AdminTransactionMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Data Inicial')).toBeInTheDocument();
    });

    const startDateInput = screen.getByLabelText('Data Inicial');
    fireEvent.change(startDateInput, { target: { value: '2026-01-01' } });

    const endDateInput = screen.getByLabelText('Data Final');
    fireEvent.change(endDateInput, { target: { value: '2026-03-31' } });

    expect(startDateInput).toHaveValue('2026-01-01');
    expect(endDateInput).toHaveValue('2026-03-31');
  });

  it('covers processing and shipped status colors via order detail', async () => {
    const dataWithAllStatuses = {
      ...mockTransactionData,
      orders: [
        { ...mockTransactionData.orders[0], status: 'processing' },
        { ...mockTransactionData.orders[1], status: 'shipped' },
      ],
    };
    mockAdminRequest.mockResolvedValue({ data: dataWithAllStatuses });
    render(<AdminTransactionMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText('Processando')).toBeInTheDocument();
      expect(screen.getByText('Enviado')).toBeInTheDocument();
    });
  });

  it('covers cancelled status label', async () => {
    const dataWithCancelled = {
      ...mockTransactionData,
      orders: [{ ...mockTransactionData.orders[0], status: 'cancelled' }],
    };
    mockAdminRequest.mockResolvedValue({ data: dataWithCancelled });
    render(<AdminTransactionMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText('Cancelado')).toBeInTheDocument();
    });
  });
});
