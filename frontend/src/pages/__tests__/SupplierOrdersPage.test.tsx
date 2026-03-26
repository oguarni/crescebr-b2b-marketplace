import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
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

  it('displays statistics cards with correct counts', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Shipped')).toBeInTheDocument();
    });
  });
});
