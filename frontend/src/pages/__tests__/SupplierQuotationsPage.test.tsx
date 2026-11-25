import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import type { Company, Product, Quotation, QuotationItem } from '@shared/types';
import SupplierQuotationsPage from '../SupplierQuotationsPage';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { quotationsService } from '../../services/quotationsService';
import toast from 'react-hot-toast';

// Mock services
vi.mock('../../services/quotationsService', () => ({
  quotationsService: {
    getSupplierQuotations: vi.fn(),
    updateSupplierQuotation: vi.fn(),
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

const makeProduct = (
  id: number,
  name: string,
  price: number,
  category: string,
  leadTime: number,
  availability: Product['availability']
): Product => ({
  id,
  name,
  description: `${name} description`,
  price,
  imageUrl: '',
  category,
  supplierId: 1,
  tierPricing: [],
  specifications: {},
  unitPrice: price,
  minimumOrderQuantity: 1,
  leadTime,
  availability,
});

const makeItem = (
  id: number,
  quotationId: number,
  quantity: number,
  product: Product
): QuotationItem => ({ id, quotationId, productId: product.id, quantity, product });

const mockBuyer: Company = {
  id: 2,
  email: 'buyer@corp.com',
  cpf: '12345678901',
  address: 'Rua Teste, 123',
  phone: '11999999999',
  role: 'customer',
  status: 'approved',
  companyName: 'Buyer Corp',
  corporateName: 'Buyer Corp',
  cnpj: '12345678000190',
  cnpjValidated: true,
  industrySector: 'Industrial',
  companyType: 'buyer',
};

const mockQuotations: Quotation[] = [
  {
    id: 1,
    companyId: 2,
    status: 'pending',
    adminNotes: null,
    createdAt: new Date('2026-03-15T10:00:00Z'),
    totalAmount: 15000,
    requestedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now (urgent)
    company: mockBuyer,
    items: [
      makeItem(1, 1, 10, makeProduct(1, 'Industrial Pump', 1500, 'Industrial', 7, 'in_stock')),
    ],
  },
  {
    id: 2,
    companyId: 3,
    status: 'processed',
    adminNotes: null,
    createdAt: new Date('2026-03-14T10:00:00Z'),
    totalAmount: 5000,
    requestedDeliveryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days (low)
    company: {
      ...mockBuyer,
      id: 3,
      companyName: 'Another Buyer',
      corporateName: 'Another Buyer',
      email: 'another@buyer.com',
    },
    items: [makeItem(2, 2, 20, makeProduct(2, 'Safety Valve', 250, 'Safety', 3, 'in_stock'))],
  },
  {
    id: 3,
    companyId: 4,
    status: 'completed',
    adminNotes: null,
    createdAt: new Date('2026-03-10T10:00:00Z'),
    totalAmount: 8000,
    company: {
      ...mockBuyer,
      id: 4,
      companyName: 'Third Buyer',
      corporateName: 'Third Buyer',
      email: 'third@buyer.com',
    },
    items: [makeItem(3, 3, 5, makeProduct(3, 'Concrete Mix', 1600, 'Construction', 14, 'limited'))],
  },
];

// Assertions below are written against the English dictionary, so the locale is
// pinned explicitly — the app itself defaults to pt.
const renderPage = async (language: 'pt' | 'en' = 'en') => {
  let renderResult;
  await act(async () => {
    renderResult = render(
      <LanguageProvider initialLanguage={language}>
        <BrowserRouter>
          <SupplierQuotationsPage />
        </BrowserRouter>
      </LanguageProvider>
    );
  });
  return renderResult!;
};

describe('SupplierQuotationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(quotationsService.getSupplierQuotations).mockResolvedValue(mockQuotations);
  });

  it('shows loading spinner while fetching quotations', async () => {
    vi.mocked(quotationsService.getSupplierQuotations).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockQuotations), 100))
    );

    await act(async () => {
      render(
        <LanguageProvider initialLanguage='en'>
          <BrowserRouter>
            <SupplierQuotationsPage />
          </BrowserRouter>
        </LanguageProvider>
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

    // Scoped to the stats grid: 'Completed' also appears as a status chip on
    // each completed quotation card once statuses are rendered translated.
    await waitFor(() => {
      const stats = within(screen.getByTestId('quotation-stats'));
      expect(stats.getByText('Total Requests')).toBeInTheDocument();
      expect(stats.getByText('Pending Response')).toBeInTheDocument();
      expect(stats.getByText('Completed')).toBeInTheDocument();
      expect(stats.getByText('Win Rate')).toBeInTheDocument();
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
    vi.mocked(quotationsService.getSupplierQuotations).mockRejectedValue(
      new Error('Network error')
    );

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
      expect(quotationsService.updateSupplierQuotation).toHaveBeenCalled();
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
      expect(quotationsService.updateSupplierQuotation).toHaveBeenCalledWith(1, {
        status: 'completed',
      });
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
      expect(quotationsService.updateSupplierQuotation).toHaveBeenCalledWith(1, {
        status: 'rejected',
        adminNotes: 'Not available',
      });
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
    vi.mocked(quotationsService.getSupplierQuotations).mockResolvedValue(pendingOnly);

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
    vi.mocked(quotationsService.getSupplierQuotations).mockResolvedValue(pendingOnly);

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
    const quotationWithoutDeliveryDate: Quotation = {
      ...mockQuotations[0],
      requestedDeliveryDate: undefined,
    };
    vi.mocked(quotationsService.getSupplierQuotations).mockResolvedValue([
      quotationWithoutDeliveryDate,
    ]);

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

  it('shows adminNotes in details dialog', async () => {
    const quotationWithNotes: Quotation = {
      ...mockQuotations[0],
      adminNotes: 'Approved by admin',
    };
    vi.mocked(quotationsService.getSupplierQuotations).mockResolvedValue([quotationWithNotes]);

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
    const quotationWithSpecs: Quotation = {
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
    vi.mocked(quotationsService.getSupplierQuotations).mockResolvedValue([quotationWithSpecs]);

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
    vi.mocked(quotationsService.getSupplierQuotations).mockResolvedValue([
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
    const quotationWith4Items: Quotation = {
      ...mockQuotations[0],
      items: Array.from({ length: 4 }, (_, i) =>
        makeItem(i + 1, 1, 10, makeProduct(i + 1, `Product ${i + 1}`, 100, 'Test', 7, 'in_stock'))
      ),
    };
    vi.mocked(quotationsService.getSupplierQuotations).mockResolvedValue([quotationWith4Items]);

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
    const todayQuotation: Quotation = {
      ...mockQuotations[0],
      createdAt: new Date(),
    };
    vi.mocked(quotationsService.getSupplierQuotations).mockResolvedValue([todayQuotation]);

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
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const recentQuotation: Quotation = {
      ...mockQuotations[0],
      createdAt: threeDaysAgo,
    };
    // mockQuotations[1] has createdAt from 2026-03-14 which is older than a week
    vi.mocked(quotationsService.getSupplierQuotations).mockResolvedValue([
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
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const recentQuotation: Quotation = {
      ...mockQuotations[0],
      createdAt: tenDaysAgo,
    };
    // Create a quotation from 60 days ago (outside the month)
    const oldQuotation: Quotation = {
      ...mockQuotations[1],
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    };
    vi.mocked(quotationsService.getSupplierQuotations).mockResolvedValue([
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

  it('shows the supplier only its own lines, at catalogue price, and sends the notes', async () => {
    const otherSupplierProduct = { ...mockQuotations[0].items[0].product!, supplierId: 99 };
    vi.mocked(quotationsService.getSupplierQuotations).mockResolvedValue([
      {
        ...mockQuotations[0],
        validUntil: new Date('2026-12-31T12:00:00Z'),
        items: [
          ...mockQuotations[0].items,
          makeItem(99, 1, 4, { ...otherSupplierProduct, id: 99, name: 'Competitor Valve' }),
        ],
      },
      ...mockQuotations.slice(1),
    ]);
    await renderPage();
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText('Quote Request #1')).toBeInTheDocument());

    await user.click(screen.getByText('Respond'));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('Your items in this request')).toBeInTheDocument();
    expect(within(dialog).queryByText('Competitor Valve')).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Valid until 12\/31\/2026/)).toBeInTheDocument();
    // Nothing on the dialog pretends to set a price or terms the API would drop.
    expect(within(dialog).queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Additional Notes'), 'Ships from Curitiba');
    await user.click(within(dialog).getByText('Submit Quote'));

    await waitFor(() =>
      expect(quotationsService.updateSupplierQuotation).toHaveBeenCalledWith(1, {
        status: 'processed',
        adminNotes: 'Ships from Curitiba',
      })
    );
  });

  describe('localization', () => {
    it('renders Portuguese copy when the active language is pt', async () => {
      await renderPage('pt');

      await waitFor(() => {
        expect(screen.getByText('Gestão de Cotações')).toBeInTheDocument();
      });

      const stats = within(screen.getByTestId('quotation-stats'));
      expect(stats.getByText('Total de Solicitações')).toBeInTheDocument();
      expect(stats.getByText('Aguardando Resposta')).toBeInTheDocument();
      expect(screen.getByText('Solicitação de Cotação nº 1')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Detalhes' }).length).toBeGreaterThan(0);
    });

    it('keeps the priority filter working in pt, where labels are translated', async () => {
      // Regression guard: the filter compares a stable priority key. Comparing a
      // translated label instead would match nothing outside English.
      await renderPage('pt');

      await waitFor(() => {
        expect(screen.getByText('Solicitação de Cotação nº 1')).toBeInTheDocument();
      });

      const prioritySelect = screen.getAllByRole('combobox')[1];
      fireEvent.mouseDown(prioritySelect);
      fireEvent.click(await screen.findByRole('option', { name: 'Urgente' }));

      // Quotation #1 is due in 5 days, so it is the only urgent one.
      await waitFor(() => {
        expect(screen.getByText('Solicitação de Cotação nº 1')).toBeInTheDocument();
      });
      expect(screen.queryByText('Solicitação de Cotação nº 2')).not.toBeInTheDocument();
    });
  });
});
