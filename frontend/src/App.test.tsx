import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Mock all lazy-loaded pages
vi.mock('./pages/LoginPage', () => ({ default: () => <div>LoginPage</div> }));
vi.mock('./pages/RegisterPage', () => ({ default: () => <div>RegisterPage</div> }));
vi.mock('./pages/HomePage', () => ({ default: () => <div>HomePage</div> }));
vi.mock('./pages/CartPage', () => ({ default: () => <div>CartPage</div> }));
vi.mock('./pages/CheckoutPage', () => ({ default: () => <div>CheckoutPage</div> }));
vi.mock('./pages/QuotationRequestPage', () => ({ default: () => <div>QuotationRequestPage</div> }));
vi.mock('./pages/MyQuotationsPage', () => ({ default: () => <div>MyQuotationsPage</div> }));
vi.mock('./pages/AdminProductsPage', () => ({ default: () => <div>AdminProductsPage</div> }));
vi.mock('./pages/AdminQuotationsPage', () => ({ default: () => <div>AdminQuotationsPage</div> }));
vi.mock('./pages/AdminCompanyVerificationPage', () => ({
  default: () => <div>AdminCompanyVerificationPage</div>,
}));
vi.mock('./pages/AdminTransactionMonitoringPage', () => ({
  default: () => <div>AdminTransactionMonitoringPage</div>,
}));
vi.mock('./pages/QuotationDetailPage', () => ({
  default: () => <div>QuotationDetailPage</div>,
}));
vi.mock('./pages/QuoteComparisonPage', () => ({
  default: () => <div>QuoteComparisonPage</div>,
}));
vi.mock('./pages/MyOrdersPage', () => ({ default: () => <div>MyOrdersPage</div> }));
vi.mock('./pages/SupplierDashboardPage', () => ({
  default: () => <div>SupplierDashboardPage</div>,
}));
vi.mock('./pages/SupplierProductsPage', () => ({
  default: () => <div>SupplierProductsPage</div>,
}));
vi.mock('./pages/SupplierOrdersPage', () => ({ default: () => <div>SupplierOrdersPage</div> }));
vi.mock('./pages/SupplierQuotationsPage', () => ({
  default: () => <div>SupplierQuotationsPage</div>,
}));

// Mock components used inside Layout
vi.mock('./components/Navbar', () => ({ default: () => <nav>Navbar</nav> }));
vi.mock('./components/CartDrawer', () => ({ default: () => <div>CartDrawer</div> }));

// Mock contexts with minimal implementations
vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    fetchUser: vi.fn(),
  }),
}));

vi.mock('./contexts/CartContext', () => ({
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCart: () => ({
    items: [],
    totalItems: 0,
    totalPrice: 0,
    isOpen: false,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    toggleCart: vi.fn(),
  }),
}));

vi.mock('./contexts/QuotationContext', () => ({
  QuotationRequestProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useQuotationRequest: () => ({
    items: [],
    addItem: vi.fn(),
    removeItem: vi.fn(),
    clearItems: vi.fn(),
  }),
}));

function renderApp(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>
  );
}

describe('App', () => {
  describe('public routes', () => {
    it('renders LoginPage at /login', async () => {
      renderApp('/login');

      await waitFor(() => {
        expect(screen.getByText('LoginPage')).toBeInTheDocument();
      });
    });

    it('renders RegisterPage at /register', async () => {
      renderApp('/register');

      await waitFor(() => {
        expect(screen.getByText('RegisterPage')).toBeInTheDocument();
      });
    });
  });

  describe('layout wrapped routes', () => {
    it('renders HomePage at / with Layout', async () => {
      renderApp('/');

      await waitFor(() => {
        expect(screen.getByText('HomePage')).toBeInTheDocument();
      });
    });

    it('renders CartPage at /cart', async () => {
      renderApp('/cart');

      await waitFor(() => {
        expect(screen.getByText('CartPage')).toBeInTheDocument();
      });
    });

    it('renders QuotationRequestPage at /quotation-request', async () => {
      renderApp('/quotation-request');

      await waitFor(() => {
        expect(screen.getByText('QuotationRequestPage')).toBeInTheDocument();
      });
    });
  });

  describe('catch-all redirect', () => {
    it('redirects unknown paths to /', async () => {
      renderApp('/some-unknown-path-xyz');

      await waitFor(() => {
        expect(screen.getByText('HomePage')).toBeInTheDocument();
      });
    });
  });

  describe('PageFallback', () => {
    it('renders app structure with providers', async () => {
      renderApp('/');

      // App renders without crashing and wraps with providers
      await waitFor(() => {
        expect(screen.getByText('HomePage')).toBeInTheDocument();
      });
    });
  });

  describe('admin settings route', () => {
    it('redirects unauthenticated user to /login when accessing admin route', async () => {
      renderApp('/admin/settings');

      await waitFor(() => {
        // Unauthenticated → ProtectedRoute redirects to /login
        expect(screen.getByText('LoginPage')).toBeInTheDocument();
      });
    });
  });
});
