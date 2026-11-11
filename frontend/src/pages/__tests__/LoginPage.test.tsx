import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../LoginPage';
import toast from 'react-hot-toast';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
    user: null,
    loading: false,
  }),
}));

let mockLocationState: { from?: { pathname: string } } | null = null;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockLocationState, pathname: '/login' }),
  };
});

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const renderPage = async () => {
  await act(async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
  });
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationState = null;
  });

  it('offers the three demo accounts as the only way to sign in', async () => {
    await renderPage();

    expect(screen.getByAltText('CresceBR')).toBeInTheDocument();
    expect(screen.getByText('Empresas de demonstração')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acessar como Comprador' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acessar como Fornecedor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acessar como Administrador' })).toBeInTheDocument();
  });

  it('renders no manual credential form, tabs or sign-up link', async () => {
    await renderPage();

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(document.querySelector('input')).toBeNull();
    expect(document.querySelector('form')).toBeNull();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText(/Cadastre-se/i)).not.toBeInTheDocument();
    expect(screen.getByText(/O cadastro público está desativado/)).toBeInTheDocument();
  });

  it.each([
    ['Comprador', '33.333.333/0001-33', 'buyer123', 'Buyer Corp'],
    ['Fornecedor', '22.222.222/0001-22', 'supplier123', 'Industrial Solutions'],
    ['Administrador', '00.000.000/0001-00', 'admin123', 'CresceBR Admin'],
  ])('signs in as the %s demo company', async (role, cnpj, password, company) => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({});
    await renderPage();

    await user.click(screen.getByRole('button', { name: `Acessar como ${role}` }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(cnpj, password);
    });
    expect(toast.success).toHaveBeenCalledWith(`Você entrou como ${company}.`);
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('returns to the page that required sign-in', async () => {
    const user = userEvent.setup();
    mockLocationState = { from: { pathname: '/my-orders' } };
    mockLogin.mockResolvedValue({});
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'Acessar como Comprador' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/my-orders', { replace: true });
    });
  });

  it('disables every demo account while one sign-in is pending', async () => {
    const user = userEvent.setup();
    let finish: () => void = () => {};
    mockLogin.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'Acessar como Comprador' }));

    expect(screen.getByRole('button', { name: 'Acessar como Fornecedor' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Acessar como Administrador' })).toBeDisabled();

    await act(async () => finish());
  });

  it.each([
    [{ response: { data: { error: 'Credenciais inválidas' } } }, 'Credenciais inválidas'],
    [{ message: 'Network Error' }, 'Network Error'],
    [{}, 'Erro ao fazer login'],
  ])('reports a failed demo sign-in (%o)', async (failure, message) => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(failure);
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'Acessar como Comprador' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(message);
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Acessar como Comprador' })).toBeEnabled();
  });
});
