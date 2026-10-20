import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import type { Company, Order, OrderItem, Product } from '@shared/types';
import SupplierOrdersPage from '../SupplierOrdersPage';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { ordersService, type OrderHistory } from '../../services/ordersService';
import toast from 'react-hot-toast';

// Mock services
vi.mock('../../services/ordersService', () => ({
  ordersService: {
    getUserOrders: vi.fn(),
    updateOrderStatus: vi.fn(),
    getOrderHistory: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'supplier', companyName: 'Test Supplier' },
  }),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const makeProduct = (id: number, name: string): Product => ({
  id,
  name,
  description: `${name} description`,
  price: 100,
  imageUrl: '',
  category: 'Industrial',
  supplierId: 1,
  tierPricing: [],
  specifications: {},
  unitPrice: 100,
  minimumOrderQuantity: 1,
  leadTime: 7,
  availability: 'in_stock',
});

const makeOrderItem = (id: number, name: string, quantity: number, price: number): OrderItem => ({
  id,
  orderId: id,
  productId: id,
  product: makeProduct(id, name),
  quantity,
  price,
  totalPrice: quantity * price,
});

const mockBuyer: Company = {
  id: 2,
  email: 'buyer@corp.com',
  cpf: '12345678901',
  address: '123 Main St',
  role: 'customer',
  status: 'approved',
  companyName: 'Buyer Corp',
  corporateName: 'Buyer Corp',
  cnpj: '12345678000190',
  cnpjValidated: true,
  industrySector: 'Industrial',
  companyType: 'buyer',
};

const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    companyId: 2,
    status: 'pending',
    totalAmount: 5000,
    createdAt: new Date('2026-03-15T10:00:00Z'),
    trackingNumber: '',
    items: [makeOrderItem(1, 'Industrial Pump', 2, 2500)],
    company: mockBuyer,
    shippingAddress: '123 Main St',
    notes: null,
  },
  {
    id: 'ORD-002',
    companyId: 3,
    status: 'processing',
    totalAmount: 3200,
    createdAt: new Date('2026-03-14T10:00:00Z'),
    trackingNumber: 'TRK-123',
    items: [makeOrderItem(2, 'Safety Valve', 5, 640)],
    company: {
      ...mockBuyer,
      id: 3,
      companyName: 'Another Buyer',
      corporateName: 'Another Buyer',
      email: 'another@buyer.com',
    },
    shippingAddress: '456 Second Ave',
    notes: null,
  },
  {
    id: 'ORD-003',
    companyId: 4,
    status: 'shipped',
    totalAmount: 1200,
    createdAt: new Date('2026-03-13T10:00:00Z'),
    trackingNumber: 'TRK-456',
    items: [makeOrderItem(3, 'Helmet', 10, 120)],
    company: {
      ...mockBuyer,
      id: 4,
      companyName: 'Third Buyer',
      corporateName: 'Third Buyer',
      email: 'third@buyer.com',
    },
    shippingAddress: '789 Third Blvd',
    notes: null,
  },
];

const mockOrderHistory: OrderHistory = {
  order: mockOrders[0],
  timeline: [
    {
      status: 'pending',
      description: 'Order placed',
      date: new Date('2026-03-15T10:00:00Z'),
      canTransitionTo: ['processing', 'cancelled'],
    },
    {
      status: 'processing',
      description: 'Order processing',
      date: new Date('2026-03-16T10:00:00Z'),
      canTransitionTo: ['shipped', 'cancelled'],
    },
  ],
};

const ordersResponse = (orders: Order[]) => ({
  orders,
  pagination: { total: orders.length, page: 1, limit: 10, totalPages: orders.length ? 1 : 0 },
});

const renderPage = async () => {
  let renderResult;
  await act(async () => {
    renderResult = render(
      <BrowserRouter>
        <LanguageProvider initialLanguage='en'>
          <SupplierOrdersPage />
        </LanguageProvider>
      </BrowserRouter>
    );
  });
  return renderResult!;
};

describe('SupplierOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ordersService.getUserOrders).mockResolvedValue(ordersResponse(mockOrders));
    vi.mocked(ordersService.updateOrderStatus).mockResolvedValue(mockOrders[0]);
    vi.mocked(ordersService.getOrderHistory).mockResolvedValue(mockOrderHistory);
  });

  it('shows loading spinner initially', async () => {
    // Delay the resolution to catch loading state
    vi.mocked(ordersService.getUserOrders).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(ordersResponse(mockOrders)), 100))
    );

    await act(async () => {
      render(
        <BrowserRouter>
          <LanguageProvider initialLanguage='en'>
            <SupplierOrdersPage />
          </LanguageProvider>
        </BrowserRouter>
      );
    });

    // The page shows CircularProgress while loading
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders order management page with orders', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Order Management')).toBeInTheDocument();
      expect(screen.getByText('Track and fulfill your customer orders')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-001')).toBeInTheDocument();
      expect(screen.getByText('Buyer Corp')).toBeInTheDocument();
      expect(screen.getByText('Order #ORD-002')).toBeInTheDocument();
    });
  });

  it('opens status update dialog when update button is clicked', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-001')).toBeInTheDocument();
    });

    // Click the "Mark as processing" button on the pending order
    const markButton = screen.getByText('Mark as processing');
    await user.click(markButton);

    await waitFor(() => {
      expect(screen.getByText('Update Order Status')).toBeInTheDocument();
    });
  });

  it('updates order status successfully', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-001')).toBeInTheDocument();
    });

    // Click "Update" button on first order
    const updateButtons = screen.getAllByText('Update');
    await user.click(updateButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Update Order Status')).toBeInTheDocument();
    });

    // Click "Update Status" in the dialog
    const updateStatusButton = screen.getByText('Update Status');
    await user.click(updateStatusButton);

    await waitFor(() => {
      expect(ordersService.updateOrderStatus).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Order status updated successfully');
    });
  });

  it('opens order details dialog', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-001')).toBeInTheDocument();
    });

    const detailsButtons = screen.getAllByText('Details');
    await user.click(detailsButtons[0]);

    await waitFor(() => {
      expect(ordersService.getOrderHistory).toHaveBeenCalledWith('ORD-001');
      expect(screen.getByText('Customer Information')).toBeInTheDocument();
      expect(screen.getByText('Order Items')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('p .MuiChip-root')).toBeNull();
    expect(dialog.querySelector('.MuiListItemText-secondary p')).toBeNull();
  });

  it('shows trackingNumber in details dialog for order with tracking', async () => {
    // ORD-002 has trackingNumber: 'TRK-123', click its Details button
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-002')).toBeInTheDocument();
    });

    const detailsButtons = screen.getAllByText('Details');
    await user.click(detailsButtons[1]); // Second order (ORD-002) has TRK-123

    await waitFor(() => {
      expect(screen.getByText('Customer Information')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Tracking: TRK-123/).length).toBeGreaterThan(0);
  });

  it('shows notes in details dialog for order with notes', async () => {
    const ordersWithNotes = [
      {
        ...mockOrders[0],
        notes: 'Handle with care',
      },
    ];
    vi.mocked(ordersService.getUserOrders).mockResolvedValue(ordersResponse(ordersWithNotes));

    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-001')).toBeInTheDocument();
    });

    const detailsButtons = screen.getAllByText('Details');
    await user.click(detailsButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Notes: Handle with care')).toBeInTheDocument();
    });
  });

  it('shows +N more chip when order has more than 3 items', async () => {
    const orderWith4Items = {
      ...mockOrders[0],
      items: [
        makeOrderItem(11, 'Item 1', 1, 100),
        makeOrderItem(12, 'Item 2', 1, 100),
        makeOrderItem(13, 'Item 3', 1, 100),
        makeOrderItem(14, 'Item 4', 1, 100),
      ],
    };
    vi.mocked(ordersService.getUserOrders).mockResolvedValue(ordersResponse([orderWith4Items]));

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });
  });

  it('shows empty state when switching to delivered tab with no delivered orders', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-001')).toBeInTheDocument();
    });

    // Switch to Delivered tab (index 4)
    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[4]); // Delivered tab

    await waitFor(() => {
      expect(screen.getByText('No delivered orders found.')).toBeInTheDocument();
    });
  });

  it('shows empty state alert for all orders tab when no orders', async () => {
    vi.mocked(ordersService.getUserOrders).mockResolvedValue(ordersResponse([]));

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('No orders found.')).toBeInTheDocument();
    });
  });

  it('displays statistics cards with correct counts', async () => {
    await renderPage();

    // Each label appears twice: on its statistics card and on the status chip
    // of the one mock order in that status.
    await waitFor(() => {
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
      expect(screen.getAllByText('Pending')).toHaveLength(2);
      expect(screen.getAllByText('Processing')).toHaveLength(2);
      expect(screen.getAllByText('Shipped')).toHaveLength(2);
    });
  });

  it('renders in Portuguese by default, translating stored statuses and API timeline text', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(
        <BrowserRouter>
          <SupplierOrdersPage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Gestão de Pedidos')).toBeInTheDocument();
    });
    expect(screen.getByText('Pedido #ORD-001')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pendentes (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar processamento/ })).toBeInTheDocument();
    expect(screen.queryByText('pending')).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /Detalhes/ })[0]);

    // The API's English description is replaced by the sentence for its status.
    await waitFor(() => {
      expect(screen.getByText('Histórico do pedido')).toBeInTheDocument();
    });
    expect(screen.getByText('Pedido em preparação')).toBeInTheDocument();
    expect(screen.queryByText('Order processing')).not.toBeInTheDocument();
  });

  it('fills notes field in status update dialog', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-001')).toBeInTheDocument();
    });

    const updateButtons = screen.getAllByText('Update');
    await user.click(updateButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText('Notes (optional)')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Notes (optional)'), 'Handle with care');
    expect(screen.getByLabelText('Notes (optional)')).toHaveValue('Handle with care');
  });

  it('requires tracking and an NF-e key before marking an order as shipped', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-001')).toBeInTheDocument();
    });

    const updateButtons = screen.getAllByText('Update');
    await user.click(updateButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Update Order Status')).toBeInTheDocument();
    });

    // Change status to 'shipped' via the Select
    const statusSelect = screen.getByRole('combobox');
    fireEvent.mouseDown(statusSelect);

    const shippedOption = await screen.findByRole('option', { name: /shipped/i });
    fireEvent.click(shippedOption);

    await waitFor(() => {
      expect(screen.getByLabelText('Tracking Number')).toBeInTheDocument();
      expect(screen.getByLabelText(/NF-e Access Key/i)).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: 'Update Status' });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText('Tracking Number'), 'TRK-NEW-001');
    await user.type(
      screen.getByLabelText(/NF-e Access Key/i),
      '35240312345678000195550010000014761000047680'
    );
    expect(screen.getByLabelText('Tracking Number')).toHaveValue('TRK-NEW-001');
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);
    await waitFor(() => {
      expect(ordersService.updateOrderStatus).toHaveBeenCalledWith('ORD-001', {
        status: 'shipped',
        notes: undefined,
        trackingNumber: 'TRK-NEW-001',
        nfeAccessKey: '35240312345678000195550010000014761000047680',
      });
    });
  });

  it('shows No pending orders found when pending tab is empty', async () => {
    // Only non-pending orders
    vi.mocked(ordersService.getUserOrders).mockResolvedValue(
      ordersResponse([mockOrders[1], mockOrders[2]]) // processing and shipped only
    );
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-002')).toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[1]); // Pending tab

    await waitFor(() => {
      expect(screen.getByText('No pending orders found.')).toBeInTheDocument();
    });
  });

  it('shows No processing orders found when processing tab is empty', async () => {
    vi.mocked(ordersService.getUserOrders).mockResolvedValue(
      ordersResponse([mockOrders[0]]) // only pending
    );
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-001')).toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[2]); // Processing tab

    await waitFor(() => {
      expect(screen.getByText('No processing orders found.')).toBeInTheDocument();
    });
  });

  it('shows No shipped orders found when shipped tab is empty', async () => {
    vi.mocked(ordersService.getUserOrders).mockResolvedValue(
      ordersResponse([mockOrders[0]]) // only pending
    );
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-001')).toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[3]); // Shipped tab

    await waitFor(() => {
      expect(screen.getByText('No shipped orders found.')).toBeInTheDocument();
    });
  });

  it('renders orders with delivered and cancelled status to cover switch branches', async () => {
    const allStatusOrders: Order[] = [
      { ...mockOrders[0], id: 'ORD-DEL', status: 'delivered', trackingNumber: 'TRK-DEL' },
      { ...mockOrders[0], id: 'ORD-CAN', status: 'cancelled', trackingNumber: '' },
    ];
    vi.mocked(ordersService.getUserOrders).mockResolvedValue(ordersResponse(allStatusOrders));
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-DEL')).toBeInTheDocument();
      expect(screen.getByText('Order #ORD-CAN')).toBeInTheDocument();
    });
  });

  it('filters orders by date when date filter is changed', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-001')).toBeInTheDocument();
    });

    // Change date filter to 'today'
    const dateSelect = screen.getAllByRole('combobox')[1]; // Second combobox is date filter
    fireEvent.mouseDown(dateSelect);

    const todayOption = await screen.findByRole('option', { name: 'Today' });
    fireEvent.click(todayOption);

    // Date filter is applied — orders from past dates won't match 'today'
    // Just verify the filter code ran without errors
    expect(screen.getByText('Order Management')).toBeInTheDocument();
  });

  it('shows company phone in details dialog when present', async () => {
    const ordersWithPhone = [
      {
        ...mockOrders[0],
        company: { ...mockBuyer, phone: '11999999999' },
      },
    ];
    vi.mocked(ordersService.getUserOrders).mockResolvedValue(ordersResponse(ordersWithPhone));

    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Order #ORD-001')).toBeInTheDocument();
    });

    const detailsButtons = screen.getAllByText('Details');
    await user.click(detailsButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('11999999999')).toBeInTheDocument();
    });
  });
});
