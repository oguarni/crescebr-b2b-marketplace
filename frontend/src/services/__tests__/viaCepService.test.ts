import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockGet, mockIsAxiosError } = vi.hoisted(() => {
  return {
    mockGet: vi.fn(),
    mockIsAxiosError: vi.fn(),
  };
});

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: mockGet,
    })),
    isAxiosError: mockIsAxiosError,
  },
}));

import { viaCepService } from '../viaCepService';

describe('ViaCepService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAddressByCep', () => {
    const mockAddress = {
      cep: '01001-000',
      logradouro: 'Praca da Se',
      complemento: 'lado impar',
      bairro: 'Se',
      localidade: 'Sao Paulo',
      uf: 'SP',
      ibge: '3550308',
      gia: '1004',
      ddd: '11',
      siafi: '7107',
    };

    it('should fetch address for a valid CEP', async () => {
      mockGet.mockResolvedValue({ data: mockAddress });

      const result = await viaCepService.getAddressByCep('01001000');

      expect(mockGet).toHaveBeenCalledWith('/01001000/json/');
      expect(result).toEqual(mockAddress);
    });

    it('should strip non-numeric characters from CEP', async () => {
      mockGet.mockResolvedValue({ data: mockAddress });

      await viaCepService.getAddressByCep('01001-000');

      expect(mockGet).toHaveBeenCalledWith('/01001000/json/');
    });

    it('should strip dots and spaces from CEP', async () => {
      mockGet.mockResolvedValue({ data: mockAddress });

      await viaCepService.getAddressByCep('01.001 000');

      expect(mockGet).toHaveBeenCalledWith('/01001000/json/');
    });

    it('should throw for CEP with fewer than 8 digits', async () => {
      await expect(viaCepService.getAddressByCep('1234567')).rejects.toThrow(
        'CEP deve conter 8 dígitos'
      );
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should throw for CEP with more than 8 digits', async () => {
      await expect(viaCepService.getAddressByCep('123456789')).rejects.toThrow(
        'CEP deve conter 8 dígitos'
      );
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should throw for empty CEP', async () => {
      await expect(viaCepService.getAddressByCep('')).rejects.toThrow('CEP deve conter 8 dígitos');
    });

    it('should throw when API returns erro:true', async () => {
      mockGet.mockResolvedValue({ data: { erro: true } });

      // The 'CEP nao encontrado' error thrown inside try is caught by the
      // catch block and re-thrown as the generic 'Erro ao consultar CEP'
      await expect(viaCepService.getAddressByCep('99999999')).rejects.toThrow(
        'Erro ao consultar CEP'
      );
    });

    it('should throw timeout error for ECONNABORTED', async () => {
      const axiosError = {
        code: 'ECONNABORTED',
        response: undefined,
        isAxiosError: true,
      };
      mockGet.mockRejectedValue(axiosError);
      mockIsAxiosError.mockReturnValue(true);

      await expect(viaCepService.getAddressByCep('01001000')).rejects.toThrow(
        'Tempo limite excedido ao consultar CEP'
      );
    });

    it('should throw connection error when no response exists', async () => {
      const axiosError = {
        code: 'ERR_NETWORK',
        response: undefined,
        isAxiosError: true,
      };
      mockGet.mockRejectedValue(axiosError);
      mockIsAxiosError.mockReturnValue(true);

      await expect(viaCepService.getAddressByCep('01001000')).rejects.toThrow(
        'Erro de conexão ao consultar CEP'
      );
    });

    it('should throw generic error for axios errors with response', async () => {
      const axiosError = {
        code: 'ERR_BAD_REQUEST',
        response: { status: 400, data: {} },
        isAxiosError: true,
      };
      mockGet.mockRejectedValue(axiosError);
      mockIsAxiosError.mockReturnValue(true);

      await expect(viaCepService.getAddressByCep('01001000')).rejects.toThrow(
        'Erro ao consultar CEP'
      );
    });

    it('should throw generic error for non-axios errors', async () => {
      mockGet.mockRejectedValue(new Error('Something unexpected'));
      mockIsAxiosError.mockReturnValue(false);

      await expect(viaCepService.getAddressByCep('01001000')).rejects.toThrow(
        'Erro ao consultar CEP'
      );
    });
  });

  describe('formatCep', () => {
    it('should format valid 8-digit CEP with hyphen', () => {
      expect(viaCepService.formatCep('01001000')).toBe('01001-000');
    });

    it('should strip non-numeric characters before formatting', () => {
      expect(viaCepService.formatCep('01001-000')).toBe('01001-000');
    });

    it('should return original value for non-8-digit input', () => {
      expect(viaCepService.formatCep('1234567')).toBe('1234567');
    });

    it('should return original value for longer input', () => {
      expect(viaCepService.formatCep('123456789')).toBe('123456789');
    });

    it('should handle empty string', () => {
      expect(viaCepService.formatCep('')).toBe('');
    });

    it('should format CEP with dots and spaces correctly', () => {
      expect(viaCepService.formatCep('01.001 000')).toBe('01001-000');
    });
  });

  describe('isValidCep', () => {
    it('should return true for valid 8-digit CEP', () => {
      expect(viaCepService.isValidCep('01001000')).toBe(true);
    });

    it('should return true for CEP with hyphen', () => {
      expect(viaCepService.isValidCep('01001-000')).toBe(true);
    });

    it('should return false for CEP shorter than 8 digits', () => {
      expect(viaCepService.isValidCep('1234567')).toBe(false);
    });

    it('should return false for CEP longer than 8 digits', () => {
      expect(viaCepService.isValidCep('123456789')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(viaCepService.isValidCep('')).toBe(false);
    });

    it('should return false for CEP with letters', () => {
      expect(viaCepService.isValidCep('0100A000')).toBe(false);
    });

    it('should return true for CEP with special characters that clean to 8 digits', () => {
      expect(viaCepService.isValidCep('01.001-000')).toBe(true);
    });

    it('should return false for all-letter input', () => {
      expect(viaCepService.isValidCep('abcdefgh')).toBe(false);
    });
  });
});
