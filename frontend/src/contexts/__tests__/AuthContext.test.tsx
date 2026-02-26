import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock authService
vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    loginWithEmail: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

// Mock apiService - use vi.fn() inline (no external vars in factory)
vi.mock('../../services/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    getRawApi: vi.fn(() => ({ defaults: { headers: { common: {} } } })),
  },
}));

import { authService } from '../../services/authService';
import { apiService } from '../../services/api';

// Mock localStorage
const mockLocalStorageStore: Record<string, string | undefined> = {};
const localStorageMock = {
  getItem: vi.fn((key: string): string | null => mockLocalStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorageStore[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockLocalStorageStore).forEach(k => delete mockLocalStorageStore[k]);
  }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const mockUser = {
  id: 1,
  email: 'test@example.com',
  role: 'customer' as const,
  status: 'approved' as const,
  companyName: 'Test Company',
  corporateName: 'Test Company LLC',
  cnpj: '12.345.678/0001-00',
  cnpjValidated: true,
  cpf: '123.456.789-00',
  address: '123 Test St',
  industrySector: 'Technology',
  companyType: 'buyer' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAuthResponse = {
  user: mockUser,
  token: 'mock-jwt-token',
  accessToken: 'mock-jwt-token',
  refreshToken: 'mock-refresh-token',
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Reset localStorage mock to return null by default
    localStorageMock.getItem.mockReturnValue(null);
    // Reset getRawApi mock
    vi.mocked(apiService.getRawApi).mockReturnValue({
      defaults: { headers: { common: {} } },
    } as any);
  });

  describe('useAuth hook', () => {
    it('should throw when used outside AuthProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth must be used within an AuthProvider'
      );
      consoleError.mockRestore();
    });

    it('should provide initial unauthenticated state when no token', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('login', () => {
    it('should login successfully with CNPJ', async () => {
      vi.mocked(authService.login).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('12.345.678/0001-00', 'password123');
      });

      expect(authService.login).toHaveBeenCalledWith('12.345.678/0001-00', 'password123');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('crescebr_token', 'mock-jwt-token');
    });

    it('should dispatch AUTH_FAILURE and rethrow on login error', async () => {
      const error = new Error('Invalid credentials');
      vi.mocked(authService.login).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login('bad-cnpj', 'bad-password');
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('loginWithEmail', () => {
    it('should login successfully with email', async () => {
      vi.mocked(authService.loginWithEmail).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.loginWithEmail('test@example.com', 'password123');
      });

      expect(authService.loginWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should dispatch AUTH_FAILURE and rethrow on email login error', async () => {
      vi.mocked(authService.loginWithEmail).mockRejectedValue(new Error('Email login failed'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.loginWithEmail('bad@email.com', 'bad-password');
        })
      ).rejects.toThrow('Email login failed');

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      vi.mocked(authService.register).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      const registerData = {
        email: 'new@example.com',
        password: 'password123',
        cnpj: '12.345.678/0001-00',
        companyName: 'New Company',
        corporateName: 'New Company LLC',
        cpf: '123.456.789-00',
        address: '123 Test St',
        industrySector: 'Technology',
        companyType: 'buyer' as const,
        role: 'customer' as const,
      };

      await act(async () => {
        await result.current.register(registerData);
      });

      expect(authService.register).toHaveBeenCalledWith(registerData);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should dispatch AUTH_FAILURE and rethrow on registration error', async () => {
      vi.mocked(authService.register).mockRejectedValue(new Error('Registration failed'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.register({
            email: 'bad@email.com',
            password: '123',
            cnpj: '00.000.000/0000-00',
            companyName: 'Bad Company',
            corporateName: 'Bad Company LLC',
            cpf: '000.000.000-00',
            address: '0 Bad St',
            industrySector: 'Other',
            companyType: 'buyer' as const,
            role: 'customer' as const,
          });
        })
      ).rejects.toThrow('Registration failed');

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear auth state on logout', async () => {
      vi.mocked(authService.login).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Login first
      await act(async () => {
        await result.current.login('12.345.678/0001-00', 'password123');
      });
      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('crescebr_token');
    });
  });

  describe('fetchUser', () => {
    it('should load user when fetchUser is called with valid token', async () => {
      localStorageMock.getItem.mockReturnValue('existing-token');
      vi.mocked(apiService.get).mockResolvedValue({
        success: true,
        data: { user: mockUser },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.fetchUser();
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(apiService.get).toHaveBeenCalledWith('/auth/me');
    });

    it('should set AUTH_FAILURE when fetchUser returns error response', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token');
      vi.mocked(apiService.get).mockResolvedValue({
        success: false,
        error: 'Unauthorized',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.fetchUser();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('crescebr_token');
    });

    it('should set AUTH_FAILURE when fetchUser throws a network error', async () => {
      localStorageMock.getItem.mockReturnValue('expired-token');
      vi.mocked(apiService.get).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.fetchUser();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('crescebr_token');
    });

    it('should set AUTH_FAILURE when no token in localStorage', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.fetchUser();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(apiService.get).not.toHaveBeenCalled();
    });
  });
});
