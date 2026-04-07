import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../LoginPage';
import toast from 'react-hot-toast';

const mockLogin = vi.fn();
const mockLoginWithEmail = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    loginWithEmail: mockLoginWithEmail,
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

  it('should render the login form', async () => {
    await renderPage();
    expect(screen.getByText('CresceBR')).toBeInTheDocument();
    expect(screen.getByText('Faça login em sua conta')).toBeInTheDocument();
    expect(screen.getByLabelText(/CNPJ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
  });

  it('should switch between CNPJ and Email tabs', async () => {
    const user = userEvent.setup();
    await renderPage();

    // Initially shows CNPJ field
    expect(screen.getByLabelText(/CNPJ/)).toBeInTheDocument();

    // Click Email tab
    await user.click(screen.getByRole('tab', { name: /Email/i }));
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();
    await renderPage();

    const passwordField = screen.getByLabelText(/Senha/);
    expect(passwordField).toHaveAttribute('type', 'password');

    await user.click(screen.getByLabelText('toggle password visibility'));
    expect(passwordField).toHaveAttribute('type', 'text');
  });

  it('should login with CNPJ successfully', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({});
    await renderPage();

    await user.type(screen.getByLabelText(/CNPJ/), '11.222.333/0001-81');
    await user.type(screen.getByLabelText(/Senha/), 'password123');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('11.222.333/0001-81', 'password123');
      expect(toast.success).toHaveBeenCalledWith('Login realizado com sucesso!');
    });
  });

  it('should login with email successfully', async () => {
    const user = userEvent.setup();
    mockLoginWithEmail.mockResolvedValue({});
    await renderPage();

    await user.click(screen.getByRole('tab', { name: /Email/i }));
    await user.type(screen.getByLabelText(/Email/), 'test@example.com');
    await user.type(screen.getByLabelText(/Senha/), 'password123');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(mockLoginWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(toast.success).toHaveBeenCalledWith('Login realizado com sucesso!');
    });
  });

  it('should show error toast on login failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue({ response: { data: { error: 'Credenciais inválidas' } } });
    await renderPage();

    await user.type(screen.getByLabelText(/CNPJ/), '11.222.333/0001-81');
    await user.type(screen.getByLabelText(/Senha/), 'wrong');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Credenciais inválidas');
    });
  });

  it('should use axiosErr.message when response.data.error is absent', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue({ message: 'Network Error' });
    await renderPage();

    await user.type(screen.getByLabelText(/CNPJ/), '11.222.333/0001-81');
    await user.type(screen.getByLabelText(/Senha/), 'wrong');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network Error');
    });
  });

  it('should use default message when no error details available', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue({});
    await renderPage();

    await user.type(screen.getByLabelText(/CNPJ/), '11.222.333/0001-81');
    await user.type(screen.getByLabelText(/Senha/), 'wrong');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao fazer login');
    });
  });

  it('should redirect to from path when location state has from', async () => {
    const user = userEvent.setup();
    mockLocationState = { from: { pathname: '/dashboard' } };
    mockLogin.mockResolvedValue({});
    await renderPage();

    await user.type(screen.getByLabelText(/CNPJ/), '11.222.333/0001-81');
    await user.type(screen.getByLabelText(/Senha/), 'password123');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('should display test accounts section', async () => {
    await renderPage();
    expect(screen.getByText('Contas de teste:')).toBeInTheDocument();
    expect(screen.getByText(/admin@crescebr.com/)).toBeInTheDocument();
  });

  it('should show register link', async () => {
    await renderPage();
    expect(screen.getByText('Cadastre-se')).toBeInTheDocument();
  });
});
