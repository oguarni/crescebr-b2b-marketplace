import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { AuthProvider } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { QuotationProvider } from '../contexts/QuotationContext';
import Navbar from './Navbar';
import theme from '../theme';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
  },
}));

// Mock useAuth hook
const mockAuthContext: {
  user: Record<string, unknown> | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  fetchUser: ReturnType<typeof vi.fn>;
} = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  fetchUser: vi.fn(),
};

vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext,
}));

// Mock useCart hook
const mockCartContext = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  isOpen: false,
  addItem: vi.fn(),
  removeItem: vi.fn(),
  updateQuantity: vi.fn(),
  clearCart: vi.fn(),
  toggleCart: vi.fn(),
};

vi.mock('../contexts/CartContext', () => ({
  CartProvider: ({ children }: { children: React.ReactNode }) => children,
  useCart: () => mockCartContext,
}));

// Mock useQuotationRequest hook
const mockQuotationContext = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  isOpen: false,
  addItem: vi.fn(),
  removeItem: vi.fn(),
  updateQuantity: vi.fn(),
  clearCart: vi.fn(),
  toggleDrawer: vi.fn(),
};

vi.mock('../contexts/QuotationContext', () => ({
  QuotationProvider: ({ children }: { children: React.ReactNode }) => children,
  useQuotationRequest: () => mockQuotationContext,
}));

const renderNavbar = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <CartProvider>
            <QuotationProvider>
              <Navbar />
            </QuotationProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Navbar', () => {
  it('renders CresceBR logo', () => {
    renderNavbar();
    expect(screen.getByText('CresceBR')).toBeInTheDocument();
  });

  it('shows login and register buttons when user is not authenticated', () => {
    renderNavbar();
    expect(screen.getByText('Entrar')).toBeInTheDocument();
    expect(screen.getByText('Cadastrar')).toBeInTheDocument();
  });

  it('shows user menu when user is authenticated', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = {
      id: 1,
      email: 'test@example.com',
      cpf: '123.456.789-00',
      address: 'Test Address',
      role: 'customer',
      companyName: 'Test Company',
      corporateName: 'Test Corporate',
      cnpj: '12.345.678/0001-90',
      cnpjValidated: false,
      industrySector: 'Test Sector',
      companyType: 'buyer',
      status: 'approved',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    renderNavbar();

    // Should show account icon instead of login/register buttons
    expect(screen.getByLabelText('account of current user')).toBeInTheDocument();
    expect(screen.queryByText('Entrar')).not.toBeInTheDocument();
    expect(screen.queryByText('Cadastrar')).not.toBeInTheDocument();
  });

  it('shows admin panel option for admin users', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = {
      id: 1,
      email: 'admin@example.com',
      cpf: '123.456.789-00',
      address: 'Test Address',
      role: 'admin',
      companyName: 'Admin Company',
      corporateName: 'Admin Corporate',
      cnpj: '12.345.678/0001-90',
      cnpjValidated: true,
      industrySector: 'Admin Sector',
      companyType: 'both',
      status: 'approved',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    renderNavbar();

    // Click on user menu to open it
    const accountButton = screen.getByLabelText('account of current user');
    accountButton.click();

    expect(screen.getByText('Painel Admin')).toBeInTheDocument();
  });

  it('shows quotation request button for customers', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = {
      id: 1,
      email: 'customer@example.com',
      cpf: '123.456.789-00',
      address: 'Test Address',
      role: 'customer',
      companyName: 'Customer Company',
      corporateName: 'Customer Corporate',
      cnpj: '12.345.678/0001-90',
      cnpjValidated: false,
      industrySector: 'Customer Sector',
      companyType: 'buyer',
      status: 'approved',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    renderNavbar();

    expect(screen.getByLabelText('quotation request')).toBeInTheDocument();
  });
});
