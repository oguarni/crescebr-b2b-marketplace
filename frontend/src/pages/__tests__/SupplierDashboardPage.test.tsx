import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SupplierDashboardPage from '../SupplierDashboardPage';
import { ordersService } from '../../services/ordersService';
import { quotationsService } from '../../services/quotationsService';
import toast from 'react-hot-toast';

// Mock services
vi.mock('../../services/ordersService', () => ({
  ordersService: {
    getUserOrders: vi.fn(),
  },
}));

vi.mock('../../services/quotationsService', () => ({
  quotationsService: {
    getAllQuotations: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'supplier', companyName: 'Test Supplier' },
  }),
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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
    items: [{ product: { name: 'Pump', supplierId: 1 }, quantity: 2 }],
    company: { companyName: 'Buyer Corp' },
  },
  {
    id: 'ORD-002',
    status: 'processing',
    totalAmount: 3200,
    createdAt: '2026-03-14T10:00:00Z',
    items: [{ product: { name: 'Valve', supplierId: 1 }, quantity: 5 }],
    company: { companyName: 'Another Buyer' },
  },
];

const mockQuotations = [
  {
    id: 1,
    status: 'pending',
    createdAt: '2026-03-15T10:00:00Z',
    company: { companyName: 'Buyer Corp' },
    items: [
      {
        productId: 1,
        quantity: 10,
        product: { name: 'Pump', price: 500, supplierId: 1 },
      },
    ],
  },
  {
    id: 2,
    status: 'processed',
    createdAt: '2026-03-14T10:00:00Z',
    company: { companyName: 'Another Buyer' },
    items: [
      {
        productId: 2,
        quantity: 20,
        product: { name: 'Valve', price: 100, supplierId: 1 },
      },
    ],
  },
];

const renderPage = async () => {
  let renderResult;
  await act(async () => {
    renderResult = render(
      <BrowserRouter>
        <SupplierDashboardPage />
      </BrowserRouter>
    );
  });
  return renderResult!;
};

describe('SupplierDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ordersService.getUserOrders).mockResolvedValue({ orders: mockOrders });
    vi.mocked(quotationsService.getAllQuotations).mockResolvedValue(mockQuotations);
  });

  it('renders dashboard header with supplier branding', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('CresceBR Supplier')).toBeInTheDocument();
    });
  });

  it('displays metrics cards after loading', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Revenue')).toBeInTheDocument();
    });
  });

  it('renders recent orders from the service', async () => {
    await renderPage();

    await waitFor(() => {
      expect(ordersService.getUserOrders).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText('Recent Orders')).toBeInTheDocument();
      expect(screen.getByText('Order #ORD-001')).toBeInTheDocument();
      expect(screen.getByText('Order #ORD-002')).toBeInTheDocument();
    });
  });

  it('renders quotation queue from the service', async () => {
    await renderPage();

    await waitFor(() => {
      expect(quotationsService.getAllQuotations).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText('Quotation Queue')).toBeInTheDocument();
      expect(screen.getByText('#QT-1')).toBeInTheDocument();
      expect(screen.getByText('#QT-2')).toBeInTheDocument();
    });
  });

  it('shows user avatar initials from companyName', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('TE')).toBeInTheDocument();
    });
  });

  it('handles error when loading dashboard data', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(ordersService.getUserOrders).mockRejectedValue(new Error('Network error'));
    vi.mocked(quotationsService.getAllQuotations).mockRejectedValue(new Error('Network error'));

    await renderPage();

    await waitFor(
      () => {
        expect(ordersService.getUserOrders).toHaveBeenCalled();
        expect(quotationsService.getAllQuotations).toHaveBeenCalled();
      },
      { timeout: 10000 }
    );

    consoleSpy.mockRestore();
  }, 15000);
});
