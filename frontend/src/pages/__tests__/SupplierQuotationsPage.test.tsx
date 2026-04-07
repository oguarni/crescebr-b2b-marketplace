import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
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

  it('opens response dialog when Respond button is clicked', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    const respondButton = screen.getByText('Respond');
    await user.click(respondButton);

    await waitFor(() => {
      expect(screen.getByText('Respond to Quote Request #1')).toBeInTheDocument();
    });
  });

  it('closes response dialog when Cancel is clicked', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Respond'));

    await waitFor(() => {
      expect(screen.getByText('Respond to Quote Request #1')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Respond to Quote Request #1')).not.toBeInTheDocument();
    });
  });

  it('submits response when Submit Quote is clicked', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Respond'));

    await waitFor(() => {
      expect(screen.getByText('Submit Quote')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Submit Quote'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Quotation response submitted successfully');
    });
  });

  it('handles Accept button click', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Accept')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Accept'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Quotation accepted successfully');
    });
  });

  it('handles Decline button click', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Decline')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Decline'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Quotation rejected');
    });
  });

  it('switches to Pending tab and shows only pending quotations', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[1]); // Pending tab

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });
    expect(screen.queryByText('Quote Request #2')).not.toBeInTheDocument();
  });

  it('shows empty state when Rejected tab has no items', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[4]); // Rejected tab

    await waitFor(() => {
      expect(screen.getByText('No rejected quotations found.')).toBeInTheDocument();
    });
  });

  it('shows empty state when Processed tab is selected and filtered', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[2]); // Processed tab

    await waitFor(() => {
      expect(screen.getByText('Quote Request #2')).toBeInTheDocument();
    });
  });

  it('switches to Completed tab', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[3]); // Completed tab

    await waitFor(() => {
      expect(screen.getByText('Quote Request #3')).toBeInTheDocument();
    });
  });

  it('closes details dialog when Close is clicked', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    const detailsButtons = screen.getAllByText('Details');
    await user.click(detailsButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Customer Information')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByText('Quotation Details - #1')).not.toBeInTheDocument();
    });
  });

  it('filters quotations by search term', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search quotations...');
    await user.type(searchInput, 'Buyer Corp');

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });
    expect(screen.queryByText('Quote Request #2')).not.toBeInTheDocument();
  });

  it('shows empty state for processed tab when no processed quotations', async () => {
    const pendingOnly = [mockQuotations[0]]; // only pending
    vi.mocked(quotationsService.getAllQuotations).mockResolvedValue(pendingOnly);

    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[2]); // Processed tab

    await waitFor(() => {
      expect(screen.getByText('No processed quotations found.')).toBeInTheDocument();
    });
  });

  it('shows empty state for completed tab when no completed quotations', async () => {
    const pendingOnly = [mockQuotations[0]];
    vi.mocked(quotationsService.getAllQuotations).mockResolvedValue(pendingOnly);

    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[3]); // Completed tab

    await waitFor(() => {
      expect(screen.getByText('No completed quotations found.')).toBeInTheDocument();
    });
  });

  it('shows Not specified when quotation has no requestedDeliveryDate in response dialog', async () => {
    const quotationWithoutDeliveryDate = {
      ...mockQuotations[0],
      requestedDeliveryDate: undefined,
    };
    vi.mocked(quotationsService.getAllQuotations).mockResolvedValue([quotationWithoutDeliveryDate]);

    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Respond'));

    await waitFor(() => {
      expect(screen.getByText('Customer Information')).toBeInTheDocument();
    });

    expect(screen.getByText(/Not specified/)).toBeInTheDocument();
  });

  it('shows "Urgent" priority for quotation with delivery < 7 days', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });
  });

  it('shows "Low" priority for quotation with delivery > 30 days', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  it('fills all response dialog fields', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Respond'));

    await waitFor(() => {
      expect(screen.getByLabelText('Delivery Terms')).toBeInTheDocument();
    });

    // validUntil field (date input - not accessible via getByLabelText in jsdom)
    const dateInput = document.querySelector('input[type="date"]');
    if (dateInput) {
      fireEvent.change(dateInput, { target: { value: '2026-12-31' } });
    }

    // paymentTerms starts as 'Net 30'
    const paymentField = screen.getByLabelText('Payment Terms');
    await user.clear(paymentField);
    await user.type(paymentField, 'Net 60');

    // deliveryTerms starts as 'FOB Origin'
    const deliveryField = screen.getByLabelText('Delivery Terms');
    await user.clear(deliveryField);
    await user.type(deliveryField, 'CIF');

    // notes starts as ''
    const notesField = screen.getByLabelText('Additional Notes');
    await user.type(notesField, 'In stock');

    expect(screen.getByLabelText('Delivery Terms')).toHaveValue('CIF');
    expect(screen.getByLabelText('Payment Terms')).toHaveValue('Net 60');
    expect(screen.getByLabelText('Additional Notes')).toHaveValue('In stock');
  });

  it('shows adminNotes in details dialog', async () => {
    const quotationWithNotes = {
      ...mockQuotations[0],
      adminNotes: 'Approved by admin',
    };
    vi.mocked(quotationsService.getAllQuotations).mockResolvedValue([quotationWithNotes]);

    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    const detailsButtons = screen.getAllByText('Details');
    await user.click(detailsButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Notes: Approved by admin')).toBeInTheDocument();
    });
  });

  it('shows product specifications in details dialog', async () => {
    const quotationWithSpecs = {
      ...mockQuotations[0],
      items: [
        {
          ...mockQuotations[0].items[0],
          product: {
            ...mockQuotations[0].items[0].product,
            specifications: { material: 'Steel', pressure: '10 bar' },
          },
        },
      ],
    };
    vi.mocked(quotationsService.getAllQuotations).mockResolvedValue([quotationWithSpecs]);

    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    const detailsButtons = screen.getAllByText('Details');
    await user.click(detailsButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('material: Steel')).toBeInTheDocument();
      expect(screen.getByText('pressure: 10 bar')).toBeInTheDocument();
    });
  });

  it('shows No pending quotations found when pending tab is empty', async () => {
    // Only non-pending quotations
    vi.mocked(quotationsService.getAllQuotations).mockResolvedValue([
      mockQuotations[1],
      mockQuotations[2],
    ]);

    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #2')).toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[1]); // Pending tab

    await waitFor(() => {
      expect(screen.getByText('No pending quotations found.')).toBeInTheDocument();
    });
  });

  it('shows +N more chip when quotation has more than 3 items', async () => {
    const quotationWith4Items = {
      ...mockQuotations[0],
      items: Array.from({ length: 4 }, (_, i) => ({
        productId: i + 1,
        quantity: 10,
        product: {
          name: `Product ${i + 1}`,
          price: 100,
          supplierId: 1,
          category: 'Test',
          unitPrice: 100,
          leadTime: 7,
          availability: 'in_stock',
          specifications: {},
        },
      })),
    };
    vi.mocked(quotationsService.getAllQuotations).mockResolvedValue([quotationWith4Items]);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });
  });

  it('closes response dialog via Escape key (onClose handler)', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Respond'));

    await waitFor(() => {
      expect(screen.getByText('Respond to Quote Request #1')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('Respond to Quote Request #1')).not.toBeInTheDocument();
    });
  });

  it('filters quotations by date range "today" and shows empty when none match', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    // Open the Date Range select
    // MUI v7 Select comboboxes lack accessible names; order: Status[0], Priority[1], Date Range[2]
    const dateRangeSelect = screen.getAllByRole('combobox')[2];
    fireEvent.mouseDown(dateRangeSelect);

    // Click "Today" option
    const todayOption = await screen.findByRole('option', { name: 'Today' });
    fireEvent.click(todayOption);

    // All mock quotations have dates from 2026-03-10 to 2026-03-15, which are not today
    await waitFor(() => {
      expect(screen.getByText('No quotation requests found.')).toBeInTheDocument();
    });
  });

  it('filters quotations by date range "today" and shows matching quotations', async () => {
    const todayQuotation = {
      ...mockQuotations[0],
      createdAt: new Date().toISOString(),
    };
    vi.mocked(quotationsService.getAllQuotations).mockResolvedValue([todayQuotation]);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    // MUI v7 Select comboboxes: Status[0], Priority[1], Date Range[2]
    const dateRangeSelect = screen.getAllByRole('combobox')[2];
    fireEvent.mouseDown(dateRangeSelect);

    const todayOption = await screen.findByRole('option', { name: 'Today' });
    fireEvent.click(todayOption);

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });
  });

  it('filters quotations by date range "week"', async () => {
    // Create a quotation from 3 days ago (within the week)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const recentQuotation = {
      ...mockQuotations[0],
      createdAt: threeDaysAgo,
    };
    // mockQuotations[1] has createdAt from 2026-03-14 which is older than a week
    vi.mocked(quotationsService.getAllQuotations).mockResolvedValue([
      recentQuotation,
      mockQuotations[1],
    ]);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    // MUI v7 Select comboboxes: Status[0], Priority[1], Date Range[2]
    const dateRangeSelect = screen.getAllByRole('combobox')[2];
    fireEvent.mouseDown(dateRangeSelect);

    const weekOption = await screen.findByRole('option', { name: 'This Week' });
    fireEvent.click(weekOption);

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });
    // The old quotation should be filtered out
    expect(screen.queryByText('Quote Request #2')).not.toBeInTheDocument();
  });

  it('filters quotations by date range "month"', async () => {
    // Create a quotation from 10 days ago (within the month)
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const recentQuotation = {
      ...mockQuotations[0],
      createdAt: tenDaysAgo,
    };
    // Create a quotation from 60 days ago (outside the month)
    const oldQuotation = {
      ...mockQuotations[1],
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    };
    vi.mocked(quotationsService.getAllQuotations).mockResolvedValue([
      recentQuotation,
      oldQuotation,
    ]);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    // MUI v7 Select comboboxes: Status[0], Priority[1], Date Range[2]
    const dateRangeSelect = screen.getAllByRole('combobox')[2];
    fireEvent.mouseDown(dateRangeSelect);

    const monthOption = await screen.findByRole('option', { name: 'This Month' });
    fireEvent.click(monthOption);

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });
    expect(screen.queryByText('Quote Request #2')).not.toBeInTheDocument();
  });

  it('filters quotations by priority "low"', async () => {
    // mockQuotations[0] has delivery 5 days from now = Urgent
    // mockQuotations[1] has delivery 45 days from now = Low
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
      expect(screen.getByText('Quote Request #2')).toBeInTheDocument();
    });

    // MUI v7 Select comboboxes: Status[0], Priority[1], Date Range[2]
    const prioritySelect = screen.getAllByRole('combobox')[1];
    fireEvent.mouseDown(prioritySelect);

    const lowOption = await screen.findByRole('option', { name: 'Low' });
    fireEvent.click(lowOption);

    await waitFor(() => {
      expect(screen.getByText('Quote Request #2')).toBeInTheDocument();
    });
    // Urgent quotation should be filtered out
    expect(screen.queryByText('Quote Request #1')).not.toBeInTheDocument();
  });

  it('filters quotations by priority "urgent"', async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    // MUI v7 Select comboboxes: Status[0], Priority[1], Date Range[2]
    const prioritySelect = screen.getAllByRole('combobox')[1];
    fireEvent.mouseDown(prioritySelect);

    const urgentOption = await screen.findByRole('option', { name: 'Urgent' });
    fireEvent.click(urgentOption);

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });
    // Low priority quotation should be filtered out
    expect(screen.queryByText('Quote Request #2')).not.toBeInTheDocument();
  });

  it('updates item unit price in response dialog', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Respond'));

    await waitFor(() => {
      expect(screen.getByText('Respond to Quote Request #1')).toBeInTheDocument();
    });

    // Find the unit price input (type="number" in the items table)
    const priceInput = screen.getByDisplayValue('1500');
    expect(priceInput).toBeInTheDocument();

    // Change the price
    fireEvent.change(priceInput, { target: { value: '2000' } });

    // Verify updated value
    await waitFor(() => {
      expect(screen.getByDisplayValue('2000')).toBeInTheDocument();
    });

    // Total should be updated: 2000 * 10 = 20000
    expect(screen.getByText(/R\$ 20,000/)).toBeInTheDocument();
  });

  it('updates item availability in response dialog', async () => {
    await renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Quote Request #1')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Respond'));

    await waitFor(() => {
      expect(screen.getByText('Respond to Quote Request #1')).toBeInTheDocument();
    });

    // The availability select starts at 'in_stock' (shown as "In Stock")
    // MUI Select renders as a combobox role; find the one displaying "In Stock"
    const comboboxes = screen.getAllByRole('combobox');
    const availabilitySelect = comboboxes.find(el => el.textContent === 'In Stock')!;
    expect(availabilitySelect).toBeDefined();
    fireEvent.mouseDown(availabilitySelect);

    const limitedOption = await screen.findByRole('option', { name: 'Limited' });
    fireEvent.click(limitedOption);

    await waitFor(() => {
      const updatedComboboxes = screen.getAllByRole('combobox');
      const updated = updatedComboboxes.find(el => el.textContent === 'Limited');
      expect(updated).toBeDefined();
    });
  });
});
