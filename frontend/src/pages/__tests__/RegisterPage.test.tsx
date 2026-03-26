import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterPage from '../RegisterPage';
import toast from 'react-hot-toast';
import { viaCepService } from '../../services/viaCepService';

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
    formatCep: vi.fn((cep: string) => {
      if (cep.length === 8) return `${cep.slice(0, 5)}-${cep.slice(5)}`;
      return cep;
    }),
    isValidCep: vi.fn(() => false),
    getAddressByCep: vi.fn(),
  },
}));

const renderPage = async () => {
  await act(async () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );
  });
};

// Helper to fill required form fields quickly using fireEvent.change
const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'test@company.com' } });
  fireEvent.change(screen.getByLabelText('Senha *'), { target: { value: 'password123' } });
  fireEvent.change(screen.getByLabelText('Confirmar Senha *'), {
    target: { value: 'password123' },
  });
  fireEvent.change(screen.getByLabelText(/CPF/), { target: { value: '12345678901' } });
  fireEvent.change(screen.getByLabelText(/CNPJ/), { target: { value: '12345678000190' } });
  fireEvent.change(screen.getByLabelText(/Nome da Empresa/), { target: { value: 'Test Company' } });
  fireEvent.change(screen.getByLabelText(/Razão Social/), {
    target: { value: 'Test Company LTDA' },
  });
  fireEvent.change(screen.getByLabelText(/Endereço Completo/), {
    target: { value: 'Rua Teste, 123, Centro, Curitiba - PR' },
  });
};

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the registration form with key fields', async () => {
    await renderPage();

    expect(screen.getByText('CresceBR')).toBeInTheDocument();
    expect(screen.getByText('Cadastro Empresarial - B2B')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText('Senha *')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar Senha *')).toBeInTheDocument();
    expect(screen.getByLabelText(/CPF/)).toBeInTheDocument();
    expect(screen.getByLabelText(/CEP/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome da Empresa/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Razão Social/)).toBeInTheDocument();
    expect(screen.getByLabelText(/CNPJ/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cadastrar/i })).toBeInTheDocument();
    expect(screen.getByText('Faça login')).toBeInTheDocument();
  });

  it('should register successfully with valid data', async () => {
    mockRegister.mockResolvedValue({});
    await renderPage();

    fillRequiredFields();

    // Select industry sector using MUI Select pattern
    const sectorSelect = screen.getByLabelText(/Setor da Indústria/);
    fireEvent.mouseDown(sectorSelect);
    const electronicsOption = await screen.findByRole('option', { name: 'Eletrônicos' });
    fireEvent.click(electronicsOption);

    await act(async () => {
      const form = document.querySelector('form');
      fireEvent.submit(form!);
    });

    await waitFor(
      () => {
        expect(mockRegister).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Empresa cadastrada com sucesso!');
        expect(mockNavigate).toHaveBeenCalledWith('/');
      },
      { timeout: 10000 }
    );
  }, 15000);

  it('should show error when passwords do not match', async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'test@company.com' } });
    fireEvent.change(screen.getByLabelText('Senha *'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirmar Senha *'), {
      target: { value: 'differentpassword' },
    });
    fireEvent.change(screen.getByLabelText(/CPF/), { target: { value: '12345678901' } });
    fireEvent.change(screen.getByLabelText(/CNPJ/), { target: { value: '12345678000190' } });
    fireEvent.change(screen.getByLabelText(/Nome da Empresa/), {
      target: { value: 'Test Company' },
    });
    fireEvent.change(screen.getByLabelText(/Razão Social/), {
      target: { value: 'Test Company LTDA' },
    });
    fireEvent.change(screen.getByLabelText(/Endereço Completo/), {
      target: { value: 'Rua Teste, 123' },
    });

    const sectorSelect = screen.getByLabelText(/Setor da Indústria/);
    fireEvent.mouseDown(sectorSelect);
    const electronicsOption = await screen.findByRole('option', { name: 'Eletrônicos' });
    fireEvent.click(electronicsOption);

    await act(async () => {
      const form = document.querySelector('form');
      fireEvent.submit(form!);
    });

    await waitFor(
      () => {
        expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    expect(mockRegister).not.toHaveBeenCalled();
  }, 15000);

  it('should show error toast on registration failure', async () => {
    mockRegister.mockRejectedValue({
      response: { data: { error: 'CNPJ já cadastrado' } },
    });
    await renderPage();

    fillRequiredFields();

    const sectorSelect = screen.getByLabelText(/Setor da Indústria/);
    fireEvent.mouseDown(sectorSelect);
    const electronicsOption = await screen.findByRole('option', { name: 'Eletrônicos' });
    fireEvent.click(electronicsOption);

    await act(async () => {
      const form = document.querySelector('form');
      fireEvent.submit(form!);
    });

    await waitFor(
      () => {
        expect(toast.error).toHaveBeenCalledWith('CNPJ já cadastrado');
      },
      { timeout: 10000 }
    );
  }, 15000);

  it('should auto-fill address fields when a valid CEP is entered', async () => {
    vi.mocked(viaCepService.isValidCep).mockReturnValue(true);
    vi.mocked(viaCepService.getAddressByCep).mockResolvedValue({
      logradouro: 'Rua XV de Novembro',
      bairro: 'Centro',
      localidade: 'Curitiba',
      uf: 'PR',
      cep: '80020-310',
      complemento: '',
      ibge: '',
      gia: '',
      ddd: '',
      siafi: '',
    });
    await renderPage();

    const cepField = screen.getByLabelText(/CEP/);
    await act(async () => {
      fireEvent.change(cepField, { target: { value: '80020310' } });
    });

    await waitFor(() => {
      expect(viaCepService.getAddressByCep).toHaveBeenCalledWith('80020310');
      expect(toast.success).toHaveBeenCalledWith('Endereço preenchido automaticamente!');
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Logradouro/).closest('input')).toHaveValue(
        'Rua XV de Novembro'
      );
      expect(screen.getByLabelText(/Bairro/).closest('input')).toHaveValue('Centro');
      expect(screen.getByLabelText(/Cidade/).closest('input')).toHaveValue('Curitiba');
      expect(screen.getByLabelText(/Estado/).closest('input')).toHaveValue('PR');
    });
  });
});
