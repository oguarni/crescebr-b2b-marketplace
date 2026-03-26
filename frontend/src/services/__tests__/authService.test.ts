import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiService } from '../api';
import { authService } from '../authService';

const mockApi = vi.mocked(apiService);

const mockUser = {
  id: 1,
  email: 'test@example.com',
  companyName: 'Test Corp',
  corporateName: 'Test Corporation Ltd',
  cnpj: '12345678000100',
  cnpjValidated: true,
  cpf: '12345678900',
  address: '123 Test St',
  industrySector: 'Technology',
  companyType: 'buyer' as const,
  role: 'customer' as const,
  status: 'approved' as const,
};

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    it('should login successfully with CNPJ and password', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        data: { token: 'jwt-token', user: mockUser },
      });

      const result = await authService.login('12345678000100', 'password123');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        cnpj: '12345678000100',
        password: 'password123',
      });
      expect(result.token).toBe('jwt-token');
      expect(result.user).toEqual(mockUser);
    });

    it('should normalize response with accessToken field', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        data: { accessToken: 'access-token', user: mockUser },
      });

      const result = await authService.login('12345678000100', 'password123');

      expect(result.token).toBe('access-token');
    });

    it('should throw when response.success is false', async () => {
      mockApi.post.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      await expect(authService.login('12345678000100', 'wrong')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should throw default message when response.success is false and no error', async () => {
      mockApi.post.mockResolvedValue({
        success: false,
      });

      await expect(authService.login('12345678000100', 'wrong')).rejects.toThrow('Login failed');
    });

    it('should throw when response data is null', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        data: null,
      });

      await expect(authService.login('12345678000100', 'pass')).rejects.toThrow('Login failed');
    });
  });

  describe('loginWithEmail', () => {
    it('should login successfully with email and password', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        data: { token: 'jwt-token', user: mockUser },
      });

      const result = await authService.loginWithEmail('test@example.com', 'password123');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login-email', {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.token).toBe('jwt-token');
      expect(result.user).toEqual(mockUser);
    });

    it('should normalize response with accessToken field', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        data: { accessToken: 'email-access-token', user: mockUser },
      });

      const result = await authService.loginWithEmail('test@example.com', 'password123');

      expect(result.token).toBe('email-access-token');
    });

    it('should throw when response.success is false', async () => {
      mockApi.post.mockResolvedValue({
        success: false,
        error: 'Account not found',
      });

      await expect(authService.loginWithEmail('bad@email.com', 'pass')).rejects.toThrow(
        'Account not found'
      );
    });

    it('should throw default message when response has no error field', async () => {
      mockApi.post.mockResolvedValue({
        success: false,
      });

      await expect(authService.loginWithEmail('bad@email.com', 'pass')).rejects.toThrow(
        'Login with email failed'
      );
    });

    it('should throw when response data is null', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        data: null,
      });

      await expect(authService.loginWithEmail('test@example.com', 'pass')).rejects.toThrow(
        'Login with email failed'
      );
    });
  });

  describe('register', () => {
    const registerData = {
      email: 'new@example.com',
      password: 'password123',
      cpf: '12345678900',
      address: '123 Test St',
      companyName: 'New Corp',
      corporateName: 'New Corporation Ltd',
      cnpj: '98765432000100',
      industrySector: 'Technology',
      companyType: 'buyer' as const,
    };

    it('should register successfully', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        data: { token: 'new-token', user: { ...mockUser, email: 'new@example.com' } },
      });

      const result = await authService.register(registerData);

      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', registerData);
      expect(result.token).toBe('new-token');
      expect(result.user.email).toBe('new@example.com');
    });

    it('should normalize response with accessToken field', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        data: { accessToken: 'reg-access-token', user: mockUser },
      });

      const result = await authService.register(registerData);

      expect(result.token).toBe('reg-access-token');
    });

    it('should throw when response.success is false', async () => {
      mockApi.post.mockResolvedValue({
        success: false,
        error: 'CNPJ already registered',
      });

      await expect(authService.register(registerData)).rejects.toThrow('CNPJ already registered');
    });

    it('should throw default message when no error field', async () => {
      mockApi.post.mockResolvedValue({
        success: false,
      });

      await expect(authService.register(registerData)).rejects.toThrow('Registration failed');
    });

    it('should throw when response data is null', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        data: null,
      });

      await expect(authService.register(registerData)).rejects.toThrow('Registration failed');
    });
  });

  describe('logout', () => {
    it('should remove token from localStorage', async () => {
      localStorage.setItem('crescebr_token', 'some-token');

      await authService.logout();

      expect(localStorage.getItem('crescebr_token')).toBeNull();
    });

    it('should not throw when no token exists', async () => {
      await expect(authService.logout()).resolves.toBeUndefined();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists in localStorage', () => {
      localStorage.setItem('crescebr_token', 'valid-token');

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when no token in localStorage', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return false when token was removed', () => {
      localStorage.setItem('crescebr_token', 'token');
      localStorage.removeItem('crescebr_token');

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return token from localStorage when it exists', () => {
      localStorage.setItem('crescebr_token', 'my-jwt-token');

      expect(authService.getToken()).toBe('my-jwt-token');
    });

    it('should return null when no token exists', () => {
      expect(authService.getToken()).toBeNull();
    });
  });

  describe('adminRequest', () => {
    it('should make GET request by default', async () => {
      const mockResponse = { success: true, data: [] };
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await authService.adminRequest('/admin/endpoint');

      expect(mockApi.get).toHaveBeenCalledWith('/admin/endpoint', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('should make GET request with params', async () => {
      const mockResponse = { success: true, data: [] };
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await authService.adminRequest('/admin/endpoint', {
        method: 'GET',
        params: { status: 'active' },
      });

      expect(mockApi.get).toHaveBeenCalledWith('/admin/endpoint', {
        params: { status: 'active' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should make POST request with data', async () => {
      const mockResponse = { success: true, data: { id: 1 } };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await authService.adminRequest('/admin/endpoint', {
        method: 'POST',
        data: { name: 'test' },
      });

      expect(mockApi.post).toHaveBeenCalledWith('/admin/endpoint', { name: 'test' });
      expect(result).toEqual(mockResponse);
    });

    it('should make PUT request with data', async () => {
      const mockResponse = { success: true, data: { id: 1, updated: true } };
      mockApi.put.mockResolvedValue(mockResponse);

      const result = await authService.adminRequest('/admin/endpoint', {
        method: 'PUT',
        data: { name: 'updated' },
      });

      expect(mockApi.put).toHaveBeenCalledWith('/admin/endpoint', { name: 'updated' });
      expect(result).toEqual(mockResponse);
    });

    it('should make DELETE request', async () => {
      const mockResponse = { success: true };
      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await authService.adminRequest('/admin/endpoint', {
        method: 'DELETE',
      });

      expect(mockApi.delete).toHaveBeenCalledWith('/admin/endpoint');
      expect(result).toEqual(mockResponse);
    });

    it('should throw for unsupported HTTP method', async () => {
      await expect(
        authService.adminRequest('/admin/endpoint', { method: 'PATCH' })
      ).rejects.toThrow('Unsupported HTTP method: PATCH');
    });
  });
});
