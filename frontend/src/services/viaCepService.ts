import axios from 'axios';

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

/**
 * Stable, language-independent reasons a CEP lookup can fail.
 *
 * The service throws a code rather than a display string so the message stays
 * English in code (per the English-only rule) while the UI still renders it in
 * the user's language through a translated message chosen by the caller.
 */
export type ViaCepErrorCode = 'INVALID_LENGTH' | 'NOT_FOUND' | 'TIMEOUT' | 'NETWORK' | 'UNKNOWN';

/** Error carrying a translatable {@link ViaCepErrorCode}. */
export class ViaCepError extends Error {
  constructor(public readonly code: ViaCepErrorCode) {
    super(`ViaCEP lookup failed: ${code}`);
    this.name = 'ViaCepError';
  }
}

class ViaCepService {
  private api = axios.create({
    baseURL: 'https://viacep.com.br/ws',
    timeout: 5000,
  });

  async getAddressByCep(cep: string): Promise<ViaCepResponse> {
    // Remove non-numeric characters from CEP
    const cleanCep = cep.replace(/\D/g, '');

    // Validate CEP format
    if (cleanCep.length !== 8) {
      throw new ViaCepError('INVALID_LENGTH');
    }

    try {
      const response = await this.api.get<ViaCepResponse>(`/${cleanCep}/json/`);

      if (response.data.erro) {
        throw new ViaCepError('NOT_FOUND');
      }

      return response.data;
    } catch (error) {
      if (error instanceof ViaCepError) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new ViaCepError('TIMEOUT');
        } else if (!error.response) {
          throw new ViaCepError('NETWORK');
        }
      }
      throw new ViaCepError('UNKNOWN');
    }
  }

  formatCep(cep: string): string {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      return cleanCep.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    return cep;
  }

  isValidCep(cep: string): boolean {
    const cleanCep = cep.replace(/\D/g, '');
    return cleanCep.length === 8 && /^\d{8}$/.test(cleanCep);
  }
}

export const viaCepService = new ViaCepService();
