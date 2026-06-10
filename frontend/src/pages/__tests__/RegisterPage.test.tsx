import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
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

// Fills every field that validateForm() requires, leaving the optional ones
// untouched. Industry sector is a MUI Select, so it is chosen via the listbox.
const fillRequiredFields = async (
  user: ReturnType<typeof userEvent.setup>,
  { confirmPassword = 'secret123' }: { confirmPassword?: string } = {}
) => {
  await user.type(screen.getByLabelText('Email *'), 'compras@metalpar.com.br');
  await user.type(screen.getByLabelText('Senha *'), 'secret123');
  await user.type(screen.getByLabelText('Confirmar Senha *'), confirmPassword);
  await user.type(screen.getByLabelText('CPF *'), '12345678901');
  await user.type(screen.getByLabelText('Endereço Completo *'), 'Rua das Indústrias, 100, Curitiba - PR');
  await user.type(screen.getByLabelText('Nome da Empresa *'), 'MetalPar');
  await user.type(screen.getByLabelText('Razão Social *'), 'MetalPar Indústria Ltda');
  await user.type(screen.getByLabelText('CNPJ *'), '12345678000190');

  await user.click(screen.getByRole('combobox', { name: /Setor da Indústria/ }));
  await user.click(await screen.findByRole('option', { name: 'Máquinas' }));
};

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the registration form with the required fields', async () => {
    await renderPage();

    expect(screen.getByText('Cadastro Empresarial - B2B')).toBeInTheDocument();
    expect(screen.getByLabelText('Email *')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha *')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar Senha *')).toBeInTheDocument();
    expect(screen.getByLabelText('CNPJ *')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cadastrar$/i })).toBeInTheDocument();
  });

  it('shows a validation error and does not register when passwords differ', async () => {
    const user = userEvent.setup();
    await renderPage();

    await fillRequiredFields(user, { confirmPassword: 'different456' });
    await user.click(screen.getByRole('button', { name: /^Cadastrar$/i }));

    expect(await screen.findByText('As senhas não coincidem')).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('registers the company and navigates home on success', async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await renderPage();

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /^Cadastrar$/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'compras@metalpar.com.br',
          password: 'secret123',
          companyName: 'MetalPar',
          corporateName: 'MetalPar Indústria Ltda',
          industrySector: 'machinery',
          companyType: 'buyer',
        })
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('links back to the login page', async () => {
    await renderPage();

    const loginLink = screen.getByRole('link', { name: 'Faça login' });
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});
