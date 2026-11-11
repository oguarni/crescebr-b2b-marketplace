import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from '../Navbar';
import ProtectedRoute from '../ProtectedRoute';
import { AuthProvider } from '../../contexts/AuthContext';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }));

// A stateful stand-in for the auth context: logging out really clears the user,
// so ProtectedRoute re-renders the way it does in the app.
vi.mock('../../contexts/AuthContext', async () => {
  const ReactModule = await import('react');
  type Session = { id: number; role: string; status: string; companyName: string; email: string };
  const Context = ReactModule.createContext<Record<string, unknown>>({});
  const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = ReactModule.useState<Session | null>({
      id: 2,
      role: 'supplier',
      status: 'approved',
      companyName: 'Industrial Solutions',
      email: 'supplier@example.com',
    });
    const value = {
      user,
      isAuthenticated: Boolean(user),
      isLoading: false,
      logout: () => setUser(null),
    };
    return ReactModule.createElement(Context.Provider, { value }, children);
  };
  return { AuthProvider, useAuth: () => ReactModule.useContext(Context) };
});

vi.mock('../../contexts/CartContext', () => ({
  useCart: () => ({ items: [], totalItems: 0 }),
}));

vi.mock('../../contexts/QuotationContext', () => ({
  useQuotationRequest: () => ({ items: [], totalItems: 0, toggleDrawer: vi.fn() }),
}));

const LoginProbe = () => {
  const state = useLocation().state as { from?: { pathname: string } } | null;
  return <div>login, returning to {state?.from?.pathname ?? 'nothing'}</div>;
};

describe('Navbar logout from a protected page', () => {
  it('lands on the catalog and leaves no return path to the previous role', async () => {
    render(
      <MemoryRouter initialEntries={['/supplier/dashboard']}>
        <AuthProvider>
          <Navbar />
          <Routes>
            <Route path='/' element={<div>Catalog home</div>} />
            <Route path='/login' element={<LoginProbe />} />
            <Route
              path='/supplier/dashboard'
              element={
                <ProtectedRoute allowedRoles={['supplier']}>
                  <div>Supplier dashboard</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Supplier dashboard')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Menu da conta'));
    fireEvent.click(await screen.findByText('Sair'));

    // Signing in next as another demo role must not send it to the supplier's
    // page: before the fix, ProtectedRoute redirected to /login with this page
    // as the return path, and the admin landed on "access denied".
    await waitFor(() => expect(screen.getByText('Catalog home')).toBeInTheDocument());
    expect(screen.queryByText(/login, returning to/)).not.toBeInTheDocument();
  });
});
