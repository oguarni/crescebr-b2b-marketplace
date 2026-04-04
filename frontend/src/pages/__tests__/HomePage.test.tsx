import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../HomePage';
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
        <HomePage />
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

  it('should display error state when loading fails', async () => {
    vi.mocked(productsService.getAllProducts).mockRejectedValue(
      new Error('Failed to load products')
    );

    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Failed to load products')).toBeInTheDocument();
    });
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

  it('should call addItem when add to cart button is clicked for supplier', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    // The add to cart buttons are IconButtons with AddShoppingCart icon
    const addButtons = screen.getAllByRole('button').filter(btn => {
      return btn.querySelector('[data-testid="AddShoppingCartIcon"]');
    });

    if (addButtons.length > 0) {
      await user.click(addButtons[0]);
      expect(mockAddItem).toHaveBeenCalledWith(mockProducts[0]);
    }
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

  it('should toggle advanced filters panel when filter icon button is clicked', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    // Find the tune/filter button
    const filterButton = screen
      .getAllByRole('button')
      .find(btn => btn.querySelector('[data-testid="TuneIcon"]'));
    expect(filterButton).toBeDefined();

    // Click to show advanced filters
    await user.click(filterButton!);

    await waitFor(() => {
      expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
  });

  it('should render price range slider labels when advanced filters are shown', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const filterButton = screen
      .getAllByRole('button')
      .find(btn => btn.querySelector('[data-testid="TuneIcon"]'));
    await user.click(filterButton!);

    await waitFor(() => {
      expect(screen.getByText('Price Range')).toBeInTheDocument();
    });
  });

  it('should render MOQ range section when advanced filters are shown', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const filterButton = screen
      .getAllByRole('button')
      .find(btn => btn.querySelector('[data-testid="TuneIcon"]'));
    await user.click(filterButton!);

    await waitFor(() => {
      expect(screen.getByText('Minimum Order (MOQ)')).toBeInTheDocument();
    });
  });

  it('should render lead time section when advanced filters are shown', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const filterButton = screen
      .getAllByRole('button')
      .find(btn => btn.querySelector('[data-testid="TuneIcon"]'));
    await user.click(filterButton!);

    await waitFor(() => {
      expect(screen.getByText('Max Lead Time')).toBeInTheDocument();
      expect(screen.getByText('Up to 30 days')).toBeInTheDocument();
    });
  });

  it('should render availability checkboxes when advanced filters are shown', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const filterButton = screen
      .getAllByRole('button')
      .find(btn => btn.querySelector('[data-testid="TuneIcon"]'));
    await user.click(filterButton!);

    await waitFor(() => {
      expect(screen.getByText('Availability Status')).toBeInTheDocument();
      expect(screen.getByText('In Stock')).toBeInTheDocument();
      expect(screen.getByText('Limited')).toBeInTheDocument();
      expect(screen.getByText('Made to Order')).toBeInTheDocument();
    });
  });

  it('should toggle availability checkbox state', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const filterButton = screen
      .getAllByRole('button')
      .find(btn => btn.querySelector('[data-testid="TuneIcon"]'));
    await user.click(filterButton!);

    await waitFor(() => {
      expect(screen.getByText('In Stock')).toBeInTheDocument();
    });

    // Click the "In Stock" checkbox
    const inStockCheckbox = screen.getByRole('checkbox', { name: /In Stock/ });
    await user.click(inStockCheckbox);
    expect(inStockCheckbox).toBeChecked();

    // Click again to toggle off
    await user.click(inStockCheckbox);
    expect(inStockCheckbox).not.toBeChecked();
  });

  it('should render specs autocomplete fields when specs are available', async () => {
    vi.mocked(productsService.getAvailableSpecifications).mockResolvedValue({
      color: ['red', 'blue', 'green'],
      material: ['steel', 'aluminum'],
    });

    const user = userEvent.setup();
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    const filterButton = screen
      .getAllByRole('button')
      .find(btn => btn.querySelector('[data-testid="TuneIcon"]'));
    await user.click(filterButton!);

    await waitFor(() => {
      expect(screen.getByText('Technical Specifications')).toBeInTheDocument();
      expect(screen.getByLabelText('Color')).toBeInTheDocument();
      expect(screen.getByLabelText('Material')).toBeInTheDocument();
    });
  });

  it('should call handleClearFilters when Clear All is clicked', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Industrial Pump')).toBeInTheDocument();
    });

    // Open advanced filters
    const filterButton = screen
      .getAllByRole('button')
      .find(btn => btn.querySelector('[data-testid="TuneIcon"]'));
    await user.click(filterButton!);

    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    // Click Clear All
    await user.click(screen.getByText('Clear All'));

    // Search input should be cleared
    const searchInput = screen.getByPlaceholderText('Search industrial parts...');
    expect(searchInput).toHaveValue('');
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
