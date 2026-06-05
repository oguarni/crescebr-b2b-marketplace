import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import RegisterPage from '../RegisterPage';

const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    isAuthenticated: false,
    user: null,
    loading: false,
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
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../services/viaCepService', () => ({
  viaCepService: {
    formatCep: vi.fn((cep: string) => cep),
    isValidCep: vi.fn(() => false),
    getAddressByCep: vi.fn(),
  },
}));

const renderPage = async () => {
  await act(async () => {
    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RegisterPage />
      </BrowserRouter>
    );
  });
};

// Self-service registration is currently disabled (under construction). The page
// renders an informational notice instead of the registration form so visitors
// cannot attempt to create an account.
describe('RegisterPage (registration under construction)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the under-construction title and message', async () => {
    await renderPage();

    expect(screen.getByText('Cadastro em construção')).toBeInTheDocument();
    expect(screen.getByText(/ainda não está disponível/i)).toBeInTheDocument();
  });

  it('does not render the registration form fields or submit button', async () => {
    await renderPage();

    expect(screen.queryByLabelText('Senha *')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Confirmar Senha *')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/CNPJ/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Cadastrar$/i })).not.toBeInTheDocument();
  });

  it('never calls register because there is no form to submit', async () => {
    await renderPage();

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('navigates to the login page when the buyer clicks the action button', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole('button', { name: /Ir para o login/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
