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
