import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SupplierQuotationsPage from '../SupplierQuotationsPage';
import { quotationsService } from '../../services/quotationsService';
import toast from 'react-hot-toast';

// Mock services
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

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockQuotations = [
  {
    id: 1,
    status: 'pending',
    createdAt: '2026-03-15T10:00:00Z',
    totalAmount: 15000,
    requestedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now (urgent)
    company: {
      companyName: 'Buyer Corp',
      email: 'buyer@corp.com',
      phone: '11999999999',
    },
    items: [
      {
        productId: 1,
        quantity: 10,
        product: {
          name: 'Industrial Pump',
          price: 1500,
          supplierId: 1,
          category: 'Industrial',
          unitPrice: 1500,
          leadTime: 7,
          availability: 'in_stock',
          specifications: {},
        },
      },
    ],
  },
  {
    id: 2,
    status: 'processed',
    createdAt: '2026-03-14T10:00:00Z',
    totalAmount: 5000,
    requestedDeliveryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days (low)
    company: {
      companyName: 'Another Buyer',
      email: 'another@buyer.com',
    },
    items: [
      {
        productId: 2,
        quantity: 20,
        product: {
          name: 'Safety Valve',
          price: 250,
          supplierId: 1,
          category: 'Safety',
          unitPrice: 250,
          leadTime: 3,
          availability: 'in_stock',
          specifications: {},
        },
      },
    ],
  },
  {
    id: 3,
    status: 'completed',
    createdAt: '2026-03-10T10:00:00Z',
    totalAmount: 8000,
    company: {
      companyName: 'Third Buyer',
      email: 'third@buyer.com',
    },
    items: [
      {
        productId: 3,
        quantity: 5,
        product: {
          name: 'Concrete Mix',
          price: 1600,
          supplierId: 1,
          category: 'Construction',
          unitPrice: 1600,
          leadTime: 14,
          availability: 'limited',
          specifications: {},
        },
      },
    ],
  },
];

const renderPage = async () => {
  let renderResult;
  await act(async () => {
    renderResult = render(
      <BrowserRouter>
        <SupplierQuotationsPage />
      </BrowserRouter>
    );
  });
  return renderResult!;
};

describe('SupplierQuotationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(quotationsService.getAllQuotations).mockResolvedValue(mockQuotations);
  });

  it('shows loading spinner while fetching quotations', async () => {
    vi.mocked(quotationsService.getAllQuotations).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockQuotations), 100))
    );

    await act(async () => {
      render(
        <BrowserRouter>
          <SupplierQuotationsPage />
        </BrowserRouter>
      );
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders quotation management page with quotations', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Quotation Management')).toBeInTheDocument();
      expect(
        screen.getByText('Manage quotation requests from buyers and send competitive quotes')
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
      expect(screen.getByText('Buyer Corp')).toBeInTheDocument();
      expect(screen.getByText('Quote Request #2')).toBeInTheDocument();
    });
  });

  it('displays statistics cards with correct counts', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Total Requests')).toBeInTheDocument();
      expect(screen.getByText('Pending Response')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Win Rate')).toBeInTheDocument();
    });
  });

  it('opens details dialog when Details button is clicked', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    const detailsButtons = screen.getAllByText('Details');
    await user.click(detailsButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Customer Information')).toBeInTheDocument();
      expect(screen.getByText('Request Information')).toBeInTheDocument();
      expect(screen.getByText('Requested Items')).toBeInTheDocument();
    });
  });

  it('shows respond button only for pending quotations', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    // Pending quotation should have Respond, Accept, Decline buttons
    expect(screen.getByText('Respond')).toBeInTheDocument();
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
  });

  it('handles error when loading quotations fails', async () => {
    vi.mocked(quotationsService.getAllQuotations).mockRejectedValue(new Error('Network error'));

    await renderPage();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error loading quotations');
    });
  });
});
