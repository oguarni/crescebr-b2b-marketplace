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
  }, 30000);

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
  }, 30000);

  it('should show error toast on registration failure', async () => {
    mockRegister.mockRejectedValue({
      response: { data: { error: 'CNPJ já cadastrado' } },
    });
    await renderPage();

    fillRequiredFields();

    const sectorSelect = screen.getByLabelText(/Setor da Indústria/);
    fireEvent.mouseDown(sectorSelect);
    const electronicsOption = await screen.findByRole('option', { name: 'Eletrônicos' });
    await act(async () => {
      fireEvent.click(electronicsOption);
    });

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
  }, 30000);

  it('should change annualRevenue and companyType selects', async () => {
    await renderPage();

    // Change Annual Revenue select
    const revenueSelect = screen.getByLabelText(/Faturamento Anual/);
    fireEvent.mouseDown(revenueSelect);
    const revenueOption = await screen.findByRole('option', { name: /500\.000 - R\$ 2/ });
    fireEvent.click(revenueOption);

    // Change Company Type select
    const companyTypeSelect = screen.getByLabelText(/Tipo de Empresa/);
    fireEvent.mouseDown(companyTypeSelect);
    const supplierOption = await screen.findByRole('option', { name: /Fornecedor/ });
    fireEvent.click(supplierOption);

    // Just verify no error was thrown (onChange handlers executed)
    expect(screen.getByText('Cadastro Empresarial - B2B')).toBeInTheDocument();
  }, 15000);

  it('should show error when industrySector is empty on submit', async () => {
    await renderPage();

    fillRequiredFields();
    // Do NOT select a sector — industrySector remains ''

    await act(async () => {
      const form = document.querySelector('form');
      fireEvent.submit(form!);
    });

    await waitFor(
      () => {
        expect(screen.getByText('Setor da indústria é obrigatório')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    expect(mockRegister).not.toHaveBeenCalled();
  }, 30000);

  it('should change companySize select value', async () => {
    await renderPage();

    const companySizeSelect = screen.getByLabelText(/Porte da Empresa/);
    fireEvent.mouseDown(companySizeSelect);
    const smallOption = await screen.findByRole('option', { name: 'Pequena' });
    fireEvent.click(smallOption);

    // onChange fires, state updates — no error expected
    expect(screen.getByText('Cadastro Empresarial - B2B')).toBeInTheDocument();
  }, 15000);

  it('should return original value when CPF input exceeds 11 digits', async () => {
    await renderPage();

    const cpfField = screen.getByLabelText(/CPF/);
    // Type a value with more than 11 digits (after stripping non-digits)
    fireEvent.change(cpfField, { target: { value: '123456789012' } });

    // The formatCpf function returns the original value when cleanValue.length > 11
    // The field should contain the value as-is (no formatting applied)
    expect(cpfField).toHaveValue('123456789012');
  });

  it('should return original value when CNPJ input exceeds 14 digits', async () => {
    await renderPage();

    const cnpjField = screen.getByLabelText(/CNPJ/);
    // Type a value with more than 14 digits (after stripping non-digits)
    fireEvent.change(cnpjField, { target: { value: '123456780001901' } });

    // The formatCnpj function returns the original value when cleanValue.length > 14
    expect(cnpjField).toHaveValue('123456780001901');
  });

  it('should show error when companyName is empty on submit', async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'test@company.com' } });
    fireEvent.change(screen.getByLabelText('Senha *'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirmar Senha *'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/CPF/), { target: { value: '12345678901' } });
    fireEvent.change(screen.getByLabelText(/CNPJ/), { target: { value: '12345678000190' } });
    // Leave companyName empty
    fireEvent.change(screen.getByLabelText(/Nome da Empresa/), { target: { value: '' } });
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
        expect(screen.getByText('Nome da empresa é obrigatório')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    expect(mockRegister).not.toHaveBeenCalled();
  }, 30000);

  it('should show error when corporateName is empty on submit', async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'test@company.com' } });
    fireEvent.change(screen.getByLabelText('Senha *'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirmar Senha *'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/CPF/), { target: { value: '12345678901' } });
    fireEvent.change(screen.getByLabelText(/CNPJ/), { target: { value: '12345678000190' } });
    fireEvent.change(screen.getByLabelText(/Nome da Empresa/), {
      target: { value: 'Test Company' },
    });
    // Leave corporateName empty
    fireEvent.change(screen.getByLabelText(/Razão Social/), { target: { value: '' } });
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
        expect(screen.getByText('Razão social é obrigatória')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    expect(mockRegister).not.toHaveBeenCalled();
  }, 30000);

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
