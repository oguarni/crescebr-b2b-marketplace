import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockAxiosInstance, mockToastError } = vi.hoisted(() => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  const mockToastError = vi.fn();
  return { mockAxiosInstance, mockToastError };
});

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { error: mockToastError },
}));

import axios from 'axios';
import { apiService } from '../api';

// Capture interceptor callbacks immediately after module loads,
// before any beforeEach clears mock call history
const requestInterceptorFn = mockAxiosInstance.interceptors.request.use.mock.calls[0]?.[0];
const responseSuccessFn = mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[0];
const responseErrorFn = mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];

describe('api module', () => {
  beforeEach(() => {
    // Only clear the HTTP method mocks and toast, not interceptor setup
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.put.mockReset();
    mockAxiosInstance.delete.mockReset();
    mockToastError.mockClear();
    localStorage.clear();
  });

  describe('axios instance creation', () => {
    it('should create axios instance with baseURL /api', () => {
      expect(axios.create).toHaveBeenCalledWith({ baseURL: '/api' });
    });

    it('should register request interceptor', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
    });

    it('should register response interceptor', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
    });
  });

  describe('request interceptor', () => {
    it('should add Bearer token from localStorage when token exists', () => {
      localStorage.setItem('crescebr_token', 'test-jwt-token');
      const config = { headers: {} as Record<string, string> };

      const result = requestInterceptorFn(config);

      expect(result.headers.Authorization).toBe('Bearer test-jwt-token');
    });

    it('should not add Authorization header when no token exists', () => {
      const config = { headers: {} as Record<string, string> };

      const result = requestInterceptorFn(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should return the config object', () => {
      const config = { headers: {} as Record<string, string> };

      const result = requestInterceptorFn(config);

      expect(result).toBe(config);
    });
  });

  describe('response interceptor', () => {
    it('should pass through successful responses unchanged', () => {
      const response = { data: { success: true } };

      const result = responseSuccessFn(response);

      expect(result).toBe(response);
    });

    it('should remove token and redirect on 401 error', async () => {
      localStorage.setItem('crescebr_token', 'expired-token');

      const error = {
        response: { status: 401, data: { error: 'Unauthorized' } },
        message: 'Unauthorized',
      };

      await expect(responseErrorFn(error)).rejects.toBe(error);
      expect(localStorage.getItem('crescebr_token')).toBeNull();
    });

    it('should show toast error for non-404 errors', async () => {
      const error = {
        response: { status: 500, data: { error: 'Internal server error' } },
        message: 'Request failed',
      };

      await expect(responseErrorFn(error)).rejects.toBe(error);
      expect(mockToastError).toHaveBeenCalledWith('Internal server error');
    });

    it('should use response.data.message when error field is absent', async () => {
      const error = {
        response: { status: 500, data: { message: 'Something went wrong' } },
        message: 'Request failed',
      };

      await expect(responseErrorFn(error)).rejects.toBe(error);
      expect(mockToastError).toHaveBeenCalledWith('Something went wrong');
    });

    it('should use error.message when response.data has no error or message fields', async () => {
      const error = {
        response: { status: 500, data: {} },
        message: 'Network Error',
      };

      await expect(responseErrorFn(error)).rejects.toBe(error);
      expect(mockToastError).toHaveBeenCalledWith('Network Error');
    });

    it('should use fallback message when no error info is available', async () => {
      const error = {
        response: { status: 500, data: {} },
      };

      await expect(responseErrorFn(error)).rejects.toBe(error);
      expect(mockToastError).toHaveBeenCalledWith('An unexpected error occurred');
    });

    it('should NOT show toast for 404 errors', async () => {
      const error = {
        response: { status: 404, data: { error: 'Not found' } },
        message: 'Not found',
      };

      await expect(responseErrorFn(error)).rejects.toBe(error);
      expect(mockToastError).not.toHaveBeenCalled();
    });

    it('should handle error without response object', async () => {
      const error = {
        message: 'Network Error',
      };

      await expect(responseErrorFn(error)).rejects.toBe(error);
      expect(mockToastError).toHaveBeenCalledWith('Network Error');
    });
  });

  describe('ApiService', () => {
    describe('get', () => {
      it('should call axiosInstance.get and return response.data', async () => {
        const mockData = { success: true, data: [1, 2, 3] };
        mockAxiosInstance.get.mockResolvedValue({ data: mockData });

        const result = await apiService.get('/test');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
        expect(result).toEqual(mockData);
      });

      it('should pass options to axiosInstance.get', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: {} });

        await apiService.get('/test', { params: { foo: 'bar' } });

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', { params: { foo: 'bar' } });
      });
    });

    describe('post', () => {
      it('should call axiosInstance.post and return response.data', async () => {
        const mockData = { success: true, data: { id: 1 } };
        mockAxiosInstance.post.mockResolvedValue({ data: mockData });

        const result = await apiService.post('/test', { name: 'test' });

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', { name: 'test' });
        expect(result).toEqual(mockData);
      });

      it('should handle post without data argument', async () => {
        mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

        const result = await apiService.post('/test');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', undefined);
        expect(result).toEqual({ success: true });
      });
    });

    describe('put', () => {
      it('should call axiosInstance.put and return response.data', async () => {
        const mockData = { success: true, data: { id: 1, updated: true } };
        mockAxiosInstance.put.mockResolvedValue({ data: mockData });

        const result = await apiService.put('/test/1', { name: 'updated' });

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test/1', { name: 'updated' });
        expect(result).toEqual(mockData);
      });

      it('should handle put without data argument', async () => {
        mockAxiosInstance.put.mockResolvedValue({ data: { success: true } });

        const result = await apiService.put('/test/1');

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test/1', undefined);
        expect(result).toEqual({ success: true });
      });
    });

    describe('delete', () => {
      it('should call axiosInstance.delete and return response.data', async () => {
        const mockData = { success: true };
        mockAxiosInstance.delete.mockResolvedValue({ data: mockData });

        const result = await apiService.delete('/test/1');

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test/1');
        expect(result).toEqual(mockData);
      });
    });

    describe('getRawApi', () => {
      it('should return the underlying axios instance', () => {
        const rawApi = apiService.getRawApi();

        expect(rawApi).toBe(mockAxiosInstance);
      });
    });
  });
});
