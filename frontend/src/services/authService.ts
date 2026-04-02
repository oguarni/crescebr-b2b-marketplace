import {
  AuthResponse,
  Company,
  LoginRequest,
  LoginEmailRequest,
  RegisterRequest,
  ApiResponse,
} from '@shared/types';
import { apiService } from './api';

class AuthService {
  private normalizeAuthResponse(data: Record<string, unknown>): AuthResponse {
    return {
      token: (data.token || data.accessToken) as string,
      user: data.user as Omit<Company, 'password'>,
    };
  }

  async login(cnpj: string, password: string): Promise<AuthResponse> {
    const loginData: LoginRequest = { cnpj, password };
    const response = await apiService.post<ApiResponse<Record<string, unknown>>>(
      '/auth/login',
      loginData
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Login failed');
    }

    return this.normalizeAuthResponse(response.data);
  }

  async loginWithEmail(email: string, password: string): Promise<AuthResponse> {
    const loginData: LoginEmailRequest = { email, password };
    const response = await apiService.post<ApiResponse<Record<string, unknown>>>(
      '/auth/login-email',
      loginData
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Login with email failed');
    }

    return this.normalizeAuthResponse(response.data);
  }

  async register(registerData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiService.post<ApiResponse<Record<string, unknown>>>(
      '/auth/register',
      registerData
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Registration failed');
    }

    return this.normalizeAuthResponse(response.data);
  }

  async logout(): Promise<void> {
    // In a real app, you might want to invalidate the token on the server
    localStorage.removeItem('crescebr_token');
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('crescebr_token');
    return !!token;
  }

  getToken(): string | null {
    return localStorage.getItem('crescebr_token');
  }

  async adminRequest(
    endpoint: string,
    options: {
      method?: string;
      params?: Record<string, string>;
      data?: unknown;
    } = {}
  ): Promise<unknown> {
    const { method = 'GET', params, data } = options;

    if (method === 'GET') {
      return await apiService.get(endpoint, { params });
    } else if (method === 'POST') {
      return await apiService.post(endpoint, data);
    } else if (method === 'PUT') {
      return await apiService.put(endpoint, data);
    } else if (method === 'DELETE') {
      return await apiService.delete(endpoint);
    }

    throw new Error(`Unsupported HTTP method: ${method}`);
  }
}

export const authService = new AuthService();
