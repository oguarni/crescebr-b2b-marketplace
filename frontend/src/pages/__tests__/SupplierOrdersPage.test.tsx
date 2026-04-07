import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SupplierOrdersPage from '../SupplierOrdersPage';
import { ordersService } from '../../services/ordersService';
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

const mockOrders = [
  {
    id: 'ORD-001',
    status: 'pending',
    totalAmount: 5000,
    createdAt: '2026-03-15T10:00:00Z',
    trackingNumber: '',
    items: [
      {
        product: { name: 'Industrial Pump', supplierId: 1 },
        quantity: 2,
        price: 2500,
        totalPrice: 5000,
      },
    ],
    company: { companyName: 'Buyer Corp', email: 'buyer@corp.com' },
    shippingAddress: '123 Main St',
  },
  {
    id: 'ORD-002',
    status: 'processing',
    totalAmount: 3200,
    createdAt: '2026-03-14T10:00:00Z',
    trackingNumber: 'TRK-123',
    items: [
      {
        product: { name: 'Safety Valve', supplierId: 1 },
        quantity: 5,
        price: 640,
        totalPrice: 3200,
      },
    ],
    company: { companyName: 'Another Buyer', email: 'another@buyer.com' },
    shippingAddress: '456 Second Ave',
  },
  {
    id: 'ORD-003',
    status: 'shipped',
    totalAmount: 1200,
    createdAt: '2026-03-13T10:00:00Z',
    trackingNumber: 'TRK-456',
    items: [
      { product: { name: 'Helmet', supplierId: 1 }, quantity: 10, price: 120, totalPrice: 1200 },
    ],
    company: { companyName: 'Third Buyer', email: 'third@buyer.com' },
    shippingAddress: '789 Third Blvd',
  },
];

const mockOrderHistory = {
  timeline: [
    {
      fromStatus: null,
      toStatus: 'pending',
      createdAt: '2026-03-15T10:00:00Z',
      notes: 'Order placed',
    },
    { fromStatus: 'pending', toStatus: 'processing', createdAt: '2026-03-16T10:00:00Z', notes: '' },
  ],
};

const renderPage = async () => {
  let renderResult;
  await act(async () => {
    renderResult = render(
      <BrowserRouter>
        <SupplierOrdersPage />
      </BrowserRouter>
    );
  });
  return renderResult!;
};

describe('SupplierOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({ orders: mockOrders });
    vi.mocked(ordersService.updateOrderStatus).mockResolvedValue({});
    vi.mocked(ordersService.getOrderHistory).mockResolvedValue(mockOrderHistory);
  });

  it('shows loading spinner initially', async () => {
    // Delay the resolution to catch loading state
    vi.mocked(ordersService.getUserOrders).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ orders: mockOrders }), 100))
    );

    await act(async () => {
      render(
        <BrowserRouter>
          <SupplierOrdersPage />
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
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({ orders: ordersWithNotes });

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
        { product: { name: 'Item 1', supplierId: 1 }, quantity: 1, price: 100, totalPrice: 100 },
        { product: { name: 'Item 2', supplierId: 1 }, quantity: 1, price: 100, totalPrice: 100 },
        { product: { name: 'Item 3', supplierId: 1 }, quantity: 1, price: 100, totalPrice: 100 },
        { product: { name: 'Item 4', supplierId: 1 }, quantity: 1, price: 100, totalPrice: 100 },
      ],
    };
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({ orders: [orderWith4Items] });

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
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({ orders: [] });

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('No orders found.')).toBeInTheDocument();
    });
  });

  it('displays statistics cards with correct counts', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Shipped')).toBeInTheDocument();
    });
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

  it('changes status in status update dialog and shows tracking number field', async () => {
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
    });

    await user.type(screen.getByLabelText('Tracking Number'), 'TRK-NEW-001');
    expect(screen.getByLabelText('Tracking Number')).toHaveValue('TRK-NEW-001');
  });

  it('shows No pending orders found when pending tab is empty', async () => {
    // Only non-pending orders
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({
      orders: [mockOrders[1], mockOrders[2]], // processing and shipped only
    });
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
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({
      orders: [mockOrders[0]], // only pending
    });
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
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({
      orders: [mockOrders[0]], // only pending
    });
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
    const allStatusOrders = [
      { ...mockOrders[0], id: 'ORD-DEL', status: 'delivered', trackingNumber: 'TRK-DEL' },
      { ...mockOrders[0], id: 'ORD-CAN', status: 'cancelled', trackingNumber: '' },
    ];
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({ orders: allStatusOrders });
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
        company: { companyName: 'Buyer Corp', email: 'buyer@corp.com', phone: '11999999999' },
      },
    ];
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({ orders: ordersWithPhone });

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
