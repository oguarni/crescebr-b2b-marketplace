import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

// Mock useAuth
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);

const makeUser = (
  role: 'admin' | 'supplier' | 'customer',
  status: 'pending' | 'approved' | 'rejected' = 'approved'
) => ({
  id: 1,
  email: 'test@example.com',
  role,
  status,
  companyName: 'Test Co',
  corporateName: 'Test Corp LLC',
  cnpj: '12.345.678/0001-00',
  cnpjValidated: true,
  cpf: '123.456.789-00',
  address: '123 Test St',
  industrySector: 'Technology',
  companyType: 'buyer' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Wrap with router + Routes so Navigate has a target and won't loop
const renderProtected = (props: React.ComponentProps<typeof ProtectedRoute>, path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path='/login' element={<div>Login Page</div>} />
        <Route path='/*' element={<ProtectedRoute {...props} />} />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  describe('loading state', () => {
    it('should show spinner while loading', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        token: null,
        login: vi.fn(),
        loginWithEmail: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        fetchUser: vi.fn(),
      });

      const { container } = renderProtected({ children: <div>Protected Content</div> });
      expect(screen.queryByText('Protected Content')).toBeNull();
      // Should show spinner (CircularProgress renders an svg)
      expect(container.querySelector('svg')).toBeTruthy();
    });
  });

  describe('unauthenticated state', () => {
    it('should redirect to /login when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
        login: vi.fn(),
        loginWithEmail: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        fetchUser: vi.fn(),
      });

      renderProtected({ children: <div>Protected Content</div> });
      // Navigate redirected us to login page
      expect(screen.getByText('Login Page')).toBeTruthy();
      expect(screen.queryByText('Protected Content')).toBeNull();
    });
  });

  describe('authenticated state - no role restriction', () => {
    it('should render children when authenticated with no role restriction', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('customer'),
        token: 'token',
        login: vi.fn(),
        loginWithEmail: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        fetchUser: vi.fn(),
      });

      renderProtected({ children: <div>Protected Content</div> });
      expect(screen.getByText('Protected Content')).toBeTruthy();
    });
  });

  describe('role-based access control', () => {
    it('should render children when user has allowed role', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('admin'),
        token: 'token',
        login: vi.fn(),
        loginWithEmail: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        fetchUser: vi.fn(),
      });

      renderProtected({
        children: <div>Admin Content</div>,
        allowedRoles: ['admin'],
      });

      expect(screen.getByText('Admin Content')).toBeTruthy();
    });

    it('should show access denied when user role is not in allowedRoles', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('customer'),
        token: 'token',
        login: vi.fn(),
        loginWithEmail: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        fetchUser: vi.fn(),
      });

      renderProtected({
        children: <div>Admin Only</div>,
        allowedRoles: ['admin'],
      });

      expect(screen.queryByText('Admin Only')).toBeNull();
      expect(screen.getByText(/acesso negado/i)).toBeTruthy();
    });

    it('should render fallbackComponent when provided and access denied', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('customer'),
        token: 'token',
        login: vi.fn(),
        loginWithEmail: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        fetchUser: vi.fn(),
      });

      const Fallback = () => <div>Custom Fallback</div>;

      renderProtected({
        children: <div>Admin Only</div>,
        allowedRoles: ['admin'],
        fallbackComponent: Fallback,
      });

      expect(screen.getByText('Custom Fallback')).toBeTruthy();
      expect(screen.queryByText('Admin Only')).toBeNull();
    });

    it('should allow access when user has one of multiple allowed roles', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('supplier'),
        token: 'token',
        login: vi.fn(),
        loginWithEmail: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        fetchUser: vi.fn(),
      });

      renderProtected({
        children: <div>Supplier or Admin Content</div>,
        allowedRoles: ['supplier', 'admin'],
      });

      expect(screen.getByText('Supplier or Admin Content')).toBeTruthy();
    });
  });

  describe('requireApproved', () => {
    it('should show pending warning for unapproved supplier', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('supplier', 'pending'),
        token: 'token',
        login: vi.fn(),
        loginWithEmail: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        fetchUser: vi.fn(),
      });

      renderProtected({
        children: <div>Approved Supplier Content</div>,
        allowedRoles: ['supplier'],
        requireApproved: true,
      });

      expect(screen.queryByText('Approved Supplier Content')).toBeNull();
      expect(screen.getByText(/pendente de aprovação/i)).toBeTruthy();
    });

    it('should render children for approved supplier with requireApproved', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('supplier', 'approved'),
        token: 'token',
        login: vi.fn(),
        loginWithEmail: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        fetchUser: vi.fn(),
      });

      renderProtected({
        children: <div>Approved Supplier Content</div>,
        allowedRoles: ['supplier'],
        requireApproved: true,
      });

      expect(screen.getByText('Approved Supplier Content')).toBeTruthy();
    });
  });

  describe('requireAdmin (legacy)', () => {
    it('should show access denied for non-admin when requireAdmin is true', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('customer'),
        token: 'token',
        login: vi.fn(),
        loginWithEmail: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        fetchUser: vi.fn(),
      });

      renderProtected({
        children: <div>Admin Only</div>,
        requireAdmin: true,
      });

      expect(screen.queryByText('Admin Only')).toBeNull();
      expect(screen.getByText(/acesso negado/i)).toBeTruthy();
    });

    it('should render children for admin when requireAdmin is true', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('admin'),
        token: 'token',
        login: vi.fn(),
        loginWithEmail: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        fetchUser: vi.fn(),
      });

      renderProtected({
        children: <div>Admin Only</div>,
        requireAdmin: true,
      });

      expect(screen.getByText('Admin Only')).toBeTruthy();
    });
  });
});

// Tests for withPermissions HOC and usePermissions hook
import { withPermissions, usePermissions } from '../ProtectedRoute';
import { renderHook } from '@testing-library/react';

describe('withPermissions HOC', () => {
  const makeAuthUser = (role: 'admin' | 'supplier' | 'customer') => ({
    isAuthenticated: true,
    isLoading: false,
    user: makeUser(role),
    token: 'token',
    login: vi.fn(),
    loginWithEmail: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    fetchUser: vi.fn(),
  });

  it('renders wrapped component when user has required role', () => {
    mockUseAuth.mockReturnValue(makeAuthUser('admin'));

    const WrappedComponent = withPermissions(['admin'])(() => <div>Admin Component</div>);
    render(<WrappedComponent />);

    expect(screen.getByText('Admin Component')).toBeInTheDocument();
  });

  it('returns null when user lacks required role', () => {
    mockUseAuth.mockReturnValue(makeAuthUser('customer'));

    const WrappedComponent = withPermissions(['admin'])(() => <div>Admin Component</div>);
    const { container } = render(<WrappedComponent />);

    expect(screen.queryByText('Admin Component')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it('returns null when user is null', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
      login: vi.fn(),
      loginWithEmail: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      fetchUser: vi.fn(),
    });

    const WrappedComponent = withPermissions(['admin'])(() => <div>Admin Component</div>);
    const { container } = render(<WrappedComponent />);

    expect(container.firstChild).toBeNull();
  });

  it('renders fallback ReactElement when provided and user lacks role', () => {
    mockUseAuth.mockReturnValue(makeAuthUser('customer'));

    const fallback = <div>Fallback Element</div>;
    const WrappedComponent = withPermissions(['admin'], fallback)(() => <div>Admin</div>);
    render(<WrappedComponent />);

    expect(screen.getByText('Fallback Element')).toBeInTheDocument();
  });

  it('renders fallback Component when provided and user lacks role', () => {
    mockUseAuth.mockReturnValue(makeAuthUser('customer'));

    const FallbackComponent = () => <div>Fallback Component</div>;
    const WrappedComponent = withPermissions(['admin'], FallbackComponent)(() => <div>Admin</div>);
    render(<WrappedComponent />);

    expect(screen.getByText('Fallback Component')).toBeInTheDocument();
  });
});

describe('usePermissions hook', () => {
  function makeAuthReturn(role: 'admin' | 'supplier' | 'customer', status = 'approved') {
    return {
      isAuthenticated: true,
      isLoading: false,
      user: makeUser(role, status as any),
      token: 'token',
      login: vi.fn(),
      loginWithEmail: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      fetchUser: vi.fn(),
    };
  }

  it('hasRole returns true for matching role', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('admin'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasRole('admin')).toBe(true);
  });

  it('hasRole returns false for non-matching role', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('customer'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasRole('admin')).toBe(false);
  });

  it('hasAnyRole returns true when user has one of the roles', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('supplier'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasAnyRole(['admin', 'supplier'])).toBe(true);
  });

  it('hasAnyRole returns false when user has none of the roles', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('customer'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasAnyRole(['admin', 'supplier'])).toBe(false);
  });

  it('hasAnyRole returns false when user is null', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
      login: vi.fn(),
      loginWithEmail: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      fetchUser: vi.fn(),
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasAnyRole(['admin'])).toBe(false);
  });

  it('isAdmin returns true for admin', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('admin'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isAdmin()).toBe(true);
  });

  it('isAdmin returns false for non-admin', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('customer'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isAdmin()).toBe(false);
  });

  it('isSupplier returns true for supplier', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('supplier'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isSupplier()).toBe(true);
  });

  it('isCustomer returns true for customer', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('customer'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isCustomer()).toBe(true);
  });

  it('isApprovedSupplier returns true for approved supplier', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('supplier', 'approved'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isApprovedSupplier()).toBe(true);
  });

  it('isApprovedSupplier returns false for unapproved supplier', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('supplier', 'pending'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isApprovedSupplier()).toBe(false);
  });

  it('canManageProducts returns true for admin', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('admin'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canManageProducts()).toBe(true);
  });

  it('canManageProducts returns true for approved supplier', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('supplier', 'approved'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canManageProducts()).toBe(true);
  });

  it('canManageProducts returns false for unapproved supplier', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('supplier', 'pending'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canManageProducts()).toBe(false);
  });

  it('canAccessAdminPanel returns true for admin', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('admin'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canAccessAdminPanel()).toBe(true);
  });

  it('canAccessAdminPanel returns false for non-admin', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('customer'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canAccessAdminPanel()).toBe(false);
  });

  it('canModifyOrders returns true for admin', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('admin'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canModifyOrders()).toBe(true);
  });

  it('canModifyOrders returns true for supplier', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('supplier'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canModifyOrders()).toBe(true);
  });

  it('canModifyOrders returns false for customer', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('customer'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canModifyOrders()).toBe(false);
  });

  it('canRequestQuotes returns true for customer', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('customer'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canRequestQuotes()).toBe(true);
  });

  it('canRequestQuotes returns true for admin', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('admin'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canRequestQuotes()).toBe(true);
  });

  it('canRequestQuotes returns false for supplier', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('supplier'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canRequestQuotes()).toBe(false);
  });

  it('exposes user from auth context', () => {
    mockUseAuth.mockReturnValue(makeAuthReturn('admin'));
    const { result } = renderHook(() => usePermissions());
    expect(result.current.user).toBeDefined();
    expect(result.current.user?.role).toBe('admin');
  });
});
