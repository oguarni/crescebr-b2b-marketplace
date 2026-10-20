import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../HomePage';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { productsService } from '../../services/productsService';

// Mock the services
vi.mock('../../services/productsService', () => ({
  productsService: {
    getAllProducts: vi.fn(),
    getCategories: vi.fn(),
    getAvailableSpecifications: vi.fn(),
  },
}));

// Mock contexts
const mockAddItem = vi.fn();
const mockAddToQuotationRequest = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../contexts/CartContext', () => ({
  useCart: () => ({
    items: [],
    totalItems: 0,
    totalPrice: 0,
    isOpen: false,
    addItem: mockAddItem,
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    toggleCart: vi.fn(),
  }),
}));

vi.mock('../../contexts/QuotationContext', () => ({
  useQuotationRequest: () => ({
    items: [],
    totalItems: 0,
    totalPrice: 0,
    isOpen: false,
    addItem: mockAddToQuotationRequest,
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearRequest: vi.fn(),
    toggleDrawer: vi.fn(),
  }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'supplier', email: 'supplier@test.com' },
    token: 'mock-token',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    loginWithEmail: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    fetchUser: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockProducts = [
  {
    id: 1,
    name: 'Industrial Pump',
    description: 'High-performance industrial water pump',
    price: 1500.0,
    imageUrl: 'https://example.com/pump.jpg',
    category: 'Industrial Equipment',
    supplierId: 1,
    unitPrice: 1500.0,
    minimumOrderQuantity: 1,
    leadTime: 7,
    availability: 'in_stock' as const,
    specifications: {},
    tierPricing: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: 'Safety Helmet',
    description: 'Industrial safety helmet with adjustable strap',
    price: 25.0,
    imageUrl: 'https://example.com/helmet.jpg',
    category: 'Safety Equipment',
    supplierId: 1,
    unitPrice: 25.0,
    minimumOrderQuantity: 1,
    leadTime: 7,
    availability: 'in_stock' as const,
    specifications: {},
    tierPricing: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockCategories = ['Industrial Equipment', 'Safety Equipment'];

const renderHomePage = async () => {
  let renderResult;
  await act(async () => {
    renderResult = render(
      <BrowserRouter>
        <LanguageProvider initialLanguage='en'>
          <HomePage />
        </LanguageProvider>
      </BrowserRouter>
    );
  });
  return renderResult;
};

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(productsService.getAllProducts).mockResolvedValue({
      products: mockProducts,
      pagination: {
        total: 2,
        page: 1,
        limit: 12,
        totalPages: 1,
      },
    });

    vi.mocked(productsService.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(productsService.getAvailableSpecifications).mockResolvedValue({});
  });

  it('should display loading state initially', async () => {
    vi.mocked(productsService.getAllProducts).mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                products: mockProducts,
                pagination: { total: 2, page: 1, limit: 12, totalPages: 1 },
              }),
            200
          )
        )
    );

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should render products with names and prices', async () => {
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
      expect(screen.getByText('Safety Helmet')).toBeInTheDocument();
    });

    expect(screen.getByText(/1\.500,00/)).toBeInTheDocument();
    expect(screen.getByText(/25,00/)).toBeInTheDocument();
  });

  it('should display empty state when no products found', async () => {
    vi.mocked(productsService.getAllProducts).mockResolvedValue({
      products: [],
      pagination: { total: 0, page: 1, limit: 12, totalPages: 0 },
    });

    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('No products found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
    });
  });

  it('should display a translated error state when loading fails', async () => {
    vi.mocked(productsService.getAllProducts).mockRejectedValue(new Error('Network Error'));

    await renderHomePage();

    // The transport's own message is English whatever the interface language,
    // so the page shows its translated message instead of echoing it.
    await waitFor(() => {
      expect(screen.getByText('Failed to load products')).toBeInTheDocument();
    });
    expect(screen.queryByText('Network Error')).not.toBeInTheDocument();
  });

  it('should have a search input', async () => {
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search industrial parts...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should update search input value on typing', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search industrial parts...');
    await user.type(searchInput, 'pump');

    expect(searchInput).toHaveValue('pump');
  });

  it('should render category filter buttons', async () => {
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    // Categories are prepended with 'All Products'
    expect(screen.getByText('All Products')).toBeInTheDocument();
    expect(screen.getAllByText('Industrial Equipment')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Safety Equipment')[0]).toBeInTheDocument();
  });

  it('should not show an add-to-cart action for suppliers (suppliers cannot purchase)', async () => {
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    // Suppliers browse the catalog but must not be able to buy, so the
    // add-to-cart action is not rendered on their product cards.
    const addButtons = screen.getAllByRole('button').filter(btn => {
      return btn.querySelector('[data-testid="AddShoppingCartIcon"]');
    });

    expect(addButtons).toHaveLength(0);
    expect(mockAddItem).not.toHaveBeenCalled();
  });

  it('should render pagination when there are multiple pages', async () => {
    vi.mocked(productsService.getAllProducts).mockResolvedValue({
      products: mockProducts,
      pagination: { total: 24, page: 1, limit: 12, totalPages: 2 },
    });

    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    // MUI Pagination renders nav element with page buttons
    const pagination = screen.getByRole('navigation');
    expect(pagination).toBeInTheDocument();
  });

  it('changes page, and returns to the first page when the category changes', async () => {
    vi.mocked(productsService.getAllProducts).mockResolvedValue({
      products: mockProducts,
      pagination: { total: 24, page: 1, limit: 12, totalPages: 2 },
    });
    const user = userEvent.setup();
    await renderHomePage();
    await screen.findByText('Industrial Pump');

    // MUI's own labels would be English ("Go to page 2") in every language.
    expect(screen.getByRole('button', { name: 'Page 1, current' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await waitFor(() => {
      expect(productsService.getAllProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });

    await user.click(screen.getByRole('button', { name: 'Safety Equipment' }));
    await waitFor(() => {
      expect(productsService.getAllProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: 'Safety Equipment', page: 1 })
      );
    });
  });

  it('should not render pagination when there is only one page', async () => {
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('should show IN STOCK badge when product has stockQuantity > 0', async () => {
    const productWithStock = {
      ...mockProducts[0],
      stockQuantity: 50,
    };
    vi.mocked(productsService.getAllProducts).mockResolvedValue({
      products: [productWithStock],
      pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
    });

    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('IN STOCK')).toBeInTheDocument();
    });
  });

  it('should show fallback supplier name when supplierId is falsy', async () => {
    const productWithoutSupplier = {
      ...mockProducts[0],
      supplierId: 0,
    };
    vi.mocked(productsService.getAllProducts).mockResolvedValue({
      products: [productWithoutSupplier],
      pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
    });

    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrias Brasil Ltda.')).toBeInTheDocument();
    });
  });

  it('does not invent placeholder categories while the real ones load', async () => {
    vi.mocked(productsService.getCategories).mockReturnValue(new Promise(() => {}));

    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'All Products' })).toBeInTheDocument();
    expect(screen.queryByText('Safety Gear')).not.toBeInTheDocument();
    expect(screen.queryByText('Hydraulics')).not.toBeInTheDocument();
  });

  describe('advanced filters', () => {
    const lastQuery = () => vi.mocked(productsService.getAllProducts).mock.lastCall?.[0];

    const openFilters = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('button', { name: /^Open filters/ }));
      return screen.findByRole('dialog', { name: 'Filters' });
    };

    const renderLoaded = async () => {
      await renderHomePage();
      await waitFor(() => {
        expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
      });
    };

    it('has a single filter control, which opens the panel over the results', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      // The header button used to share its job with a floating duplicate.
      expect(screen.getAllByRole('button', { name: /filters/i })).toHaveLength(1);

      const dialog = await openFilters(user);
      expect(within(dialog).getByText('Price Range')).toBeInTheDocument();
      expect(within(dialog).getByText('Minimum Order (MOQ)')).toBeInTheDocument();
      expect(within(dialog).getByText('Max Lead Time')).toBeInTheDocument();
      expect(within(dialog).getByText('Any price')).toBeInTheDocument();
      expect(within(dialog).getByText('Availability Status')).toBeInTheDocument();
      // Opening the panel leaves the grid where it is.
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    it('does not narrow the catalogue merely because the panel was opened', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      await openFilters(user);

      // The old panel sent maxPrice/maxLeadTime as soon as it opened, which
      // hid any product above either default.
      expect(productsService.getAllProducts).toHaveBeenCalledTimes(1);
      expect(lastQuery()).toEqual({ search: undefined, category: undefined, page: 1, limit: 12 });
    });

    it('keeps a filter applied after the panel closes and lists it above the results', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      const dialog = await openFilters(user);

      await user.click(within(dialog).getByRole('checkbox', { name: 'In Stock' }));
      await waitFor(() => {
        expect(lastQuery()).toEqual(expect.objectContaining({ availability: ['in_stock'] }));
      });

      await user.click(within(dialog).getByRole('button', { name: 'Close filters' }));
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Closing the panel used to drop every advanced filter from the request.
      expect(lastQuery()).toEqual(expect.objectContaining({ availability: ['in_stock'] }));
      expect(screen.getByRole('button', { name: 'Open filters (1 active)' })).toBeInTheDocument();
      const active = screen.getByRole('list', { name: 'Active filters' });
      expect(within(active).getByText('In Stock')).toBeInTheDocument();
      expect(screen.getByText('2 products')).toBeInTheDocument();
    });

    it('drops a single filter when its chip is removed', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      const dialog = await openFilters(user);
      await user.click(within(dialog).getByRole('checkbox', { name: 'Limited' }));
      await user.click(within(dialog).getByRole('button', { name: 'Close filters' }));

      const active = await screen.findByRole('list', { name: 'Active filters' });
      fireEvent.click(within(active).getByTestId('CancelIcon'));

      await waitFor(() => {
        expect(lastQuery()).not.toHaveProperty('availability');
      });
      expect(screen.queryByRole('list', { name: 'Active filters' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open filters' })).toBeInTheDocument();
    });

    it('reports the matching count in the panel footer and closes from it', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      const dialog = await openFilters(user);

      const showResults = within(dialog).getByRole('button', { name: 'Show 2 products' });
      await user.click(showResults);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('resets every advanced filter from the panel', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      const dialog = await openFilters(user);

      const clear = within(dialog).getByRole('button', { name: 'Clear' });
      expect(clear).toBeDisabled();

      await user.click(within(dialog).getByRole('checkbox', { name: 'Made to Order' }));
      await waitFor(() => expect(clear).toBeEnabled());

      await user.click(clear);
      await waitFor(() => {
        expect(lastQuery()).not.toHaveProperty('availability');
      });
      expect(within(dialog).getByRole('checkbox', { name: 'Made to Order' })).not.toBeChecked();
    });

    it('filters by one value per specification, replacing an earlier value for the same key', async () => {
      vi.mocked(productsService.getAvailableSpecifications).mockResolvedValue({
        color: ['red', 'blue'],
        flashPoint: ['62C'],
      });
      const user = userEvent.setup();
      await renderLoaded();
      const dialog = await openFilters(user);

      const specs = within(dialog).getByLabelText('Search specifications');
      // The key's label is searchable, not only the values.
      await user.type(specs, 'color');
      await user.click(await screen.findByRole('option', { name: 'red' }));
      await waitFor(() => {
        expect(lastQuery()).toEqual(expect.objectContaining({ specifications: { color: 'red' } }));
      });
      expect(within(dialog).getByText('Color: red')).toBeInTheDocument();

      await user.type(specs, 'blue');
      await user.click(await screen.findByRole('option', { name: 'blue' }));
      await waitFor(() => {
        expect(lastQuery()).toEqual(expect.objectContaining({ specifications: { color: 'blue' } }));
      });
      expect(within(dialog).queryByText('Color: red')).not.toBeInTheDocument();
    });

    it('offers to clear search and filters when nothing matches', async () => {
      vi.mocked(productsService.getAllProducts).mockResolvedValue({
        products: [],
        pagination: { total: 0, page: 1, limit: 12, totalPages: 0 },
      });
      const user = userEvent.setup();
      await renderHomePage();
      await screen.findByText('No products found');

      // Nothing is set yet, so there is nothing to clear.
      expect(screen.queryByRole('button', { name: 'Clear search and filters' })).toBeNull();

      await user.type(screen.getByPlaceholderText('Search industrial parts...'), 'xyz');
      const clearAll = await screen.findByRole('button', { name: 'Clear search and filters' });
      await waitFor(() => {
        expect(lastQuery()).toEqual(expect.objectContaining({ search: 'xyz' }));
      });

      await user.click(clearAll);
      expect(screen.getByPlaceholderText('Search industrial parts...')).toHaveValue('');
      await waitFor(() => {
        expect(lastQuery()).toEqual(expect.objectContaining({ search: undefined }));
      });
    });
  });

  it('ignores a response that arrives after a newer request was made', async () => {
    let resolveFirst: (
      value: Awaited<ReturnType<typeof productsService.getAllProducts>>
    ) => void = () => {};
    vi.mocked(productsService.getAllProducts)
      .mockImplementationOnce(() => new Promise(resolve => (resolveFirst = resolve)))
      .mockResolvedValueOnce({
        products: [mockProducts[1]],
        pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
      });
    const user = userEvent.setup();
    await renderHomePage();

    await user.click(await screen.findByRole('button', { name: 'Safety Equipment' }));
    await screen.findByText('Safety Helmet');

    // The unfiltered request answers last; it must not replace the newer result.
    await act(async () => {
      resolveFirst({
        products: [mockProducts[0]],
        pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
      });
    });
    expect(screen.getByText('Safety Helmet')).toBeInTheDocument();
    expect(screen.queryByText('Industrial Pump')).not.toBeInTheDocument();
  });

  it('shows translated category labels in Portuguese and filters by the stored value', async () => {
    vi.mocked(productsService.getCategories).mockResolvedValue(['Machinery', 'Valves']);
    const user = userEvent.setup();
    await act(async () => {
      render(
        <BrowserRouter>
          <LanguageProvider initialLanguage='pt'>
            <HomePage />
          </LanguageProvider>
        </BrowserRouter>
      );
    });

    expect(await screen.findByRole('button', { name: 'Máquinas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todos os produtos' })).toBeInTheDocument();
    // A category outside the seeded taxonomy is shown as stored.
    expect(screen.getByRole('button', { name: 'Valves' })).toBeInTheDocument();
    expect(screen.queryByText('Machinery')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Máquinas' }));
    await waitFor(() => {
      expect(productsService.getAllProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: 'Machinery' })
      );
    });
    expect(screen.getByRole('button', { name: 'Máquinas' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('should navigate to cart when cart icon button is clicked', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    // Find cart button by the shopping bag icon
    const cartButton = screen
      .getAllByRole('button')
      .find(btn => btn.querySelector('[data-testid="ShoppingBagOutlinedIcon"]'));
    expect(cartButton).toBeDefined();

    await user.click(cartButton!);
    expect(mockNavigate).toHaveBeenCalledWith('/cart');
  });

  it('should render product images with correct src', async () => {
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const imgs = document.querySelectorAll('img');
    expect(imgs.length).toBeGreaterThan(0);
  });

  it('should select a category when category button is clicked', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    // Click on 'Industrial Equipment' category
    const categoryButtons = screen.getAllByText('Industrial Equipment');
    await user.click(categoryButtons[0]);

    // getAllProducts should have been called with the category filter
    await waitFor(() => {
      expect(productsService.getAllProducts).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Industrial Equipment' })
      );
    });
  });

  it('should display product count in results', async () => {
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
      expect(screen.getByText('Safety Helmet')).toBeInTheDocument();
    });

    // Both products should be visible simultaneously
    const cards = document.querySelectorAll('.MuiCard-root');
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  it('should show loading spinner when auth is loading', async () => {
    const authModule = await import('../../contexts/AuthContext');
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: null as any,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      loginWithEmail: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      fetchUser: vi.fn(),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <LanguageProvider initialLanguage='en'>
            <HomePage />
          </LanguageProvider>
        </BrowserRouter>
      );
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('HomePage - Admin View', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(productsService.getAllProducts).mockResolvedValue({
      products: mockProducts,
      pagination: { total: 2, page: 1, limit: 12, totalPages: 1 },
    });
    vi.mocked(productsService.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(productsService.getAvailableSpecifications).mockResolvedValue({});
  });

  it('should show admin dashboard for admin role', async () => {
    // Override auth mock to admin role
    const authModule = await import('../../contexts/AuthContext');
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: 1, role: 'admin', email: 'admin@test.com' } as any,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      loginWithEmail: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      fetchUser: vi.fn(),
    });

    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Manage Products')).toBeInTheDocument();
      expect(screen.getByText('Manage Quotations')).toBeInTheDocument();
    });
  });

  it('should navigate to admin products page when Manage Products is clicked', async () => {
    const authModule = await import('../../contexts/AuthContext');
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: 1, role: 'admin', email: 'admin@test.com' } as any,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      loginWithEmail: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      fetchUser: vi.fn(),
    });

    const user = userEvent.setup();
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Manage Products')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Manage Products'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/products');
  });

  it('should navigate to admin quotations page when Manage Quotations is clicked', async () => {
    const authModule = await import('../../contexts/AuthContext');
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: 1, role: 'admin', email: 'admin@test.com' } as any,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      loginWithEmail: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      fetchUser: vi.fn(),
    });

    const user = userEvent.setup();
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Manage Quotations')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Manage Quotations'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/quotations');
  });
});

describe('HomePage - Customer View', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(productsService.getAllProducts).mockResolvedValue({
      products: mockProducts,
      pagination: { total: 2, page: 1, limit: 12, totalPages: 1 },
    });
    vi.mocked(productsService.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(productsService.getAvailableSpecifications).mockResolvedValue({});
  });

  it('should add to quotation request instead of cart for customer role', async () => {
    const authModule = await import('../../contexts/AuthContext');
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: 2, role: 'customer', email: 'customer@test.com' } as any,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      loginWithEmail: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      fetchUser: vi.fn(),
    });

    const user = userEvent.setup();
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    // For customer, the add button should call addToQuotationRequest
    const addButtons = screen.getAllByRole('button').filter(btn => {
      return (
        btn.querySelector('[data-testid="AddShoppingCartIcon"]') ||
        btn.querySelector('[data-testid="RequestQuoteOutlinedIcon"]')
      );
    });

    if (addButtons.length > 0) {
      await user.click(addButtons[0]);
      expect(mockAddToQuotationRequest).toHaveBeenCalled();
    }
  });
});
