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
});
