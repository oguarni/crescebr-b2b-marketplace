/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import { parseApiError, getErrorMessage } from './errorHandler';

describe('errorHandler', () => {
  describe('parseApiError', () => {
    it('extracts error field from AxiosError response data', () => {
      const axiosError = new AxiosError('Request failed');
      axiosError.response = {
        data: { error: 'Unauthorized' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: {} as any,
      };

      const result = parseApiError(axiosError);

      expect(result.message).toBe('Unauthorized');
    });

    it('falls back to message field when error field is absent', () => {
      const axiosError = new AxiosError('Request failed');
      axiosError.response = {
        data: { message: 'Not found' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as any,
      };

      const result = parseApiError(axiosError);

      expect(result.message).toBe('Not found');
    });

    it('falls back to AxiosError.message when response data has neither error nor message', () => {
      const axiosError = new AxiosError('Network Error');
      axiosError.response = {
        data: {},
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as any,
      };

      const result = parseApiError(axiosError);

      expect(result.message).toBe('Network Error');
    });

    it('includes code from AxiosError', () => {
      const axiosError = new AxiosError('Timeout');
      axiosError.code = 'ECONNABORTED';
      axiosError.response = {
        data: { error: 'Timeout' },
        status: 408,
        statusText: 'Timeout',
        headers: {},
        config: {} as any,
      };

      const result = parseApiError(axiosError);

      expect(result.code).toBe('ECONNABORTED');
    });

    it('includes details from response data', () => {
      const axiosError = new AxiosError('Validation failed');
      axiosError.response = {
        data: { error: 'Validation failed', details: [{ field: 'email', msg: 'Invalid' }] },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };

      const result = parseApiError(axiosError);

      expect(result.details).toEqual([{ field: 'email', msg: 'Invalid' }]);
    });

    it('handles AxiosError with no response (network error)', () => {
      const axiosError = new AxiosError('Network Error');
      // no response set

      const result = parseApiError(axiosError);

      expect(result.message).toBe('Network Error');
    });

    it('uses "An error occurred" fallback when all AxiosError message fields are empty', () => {
      const axiosError = new AxiosError('');
      axiosError.response = {
        data: {},
        status: 500,
        statusText: '',
        headers: {},
        config: {} as any,
      };

      const result = parseApiError(axiosError);

      expect(result.message).toBe('An error occurred');
    });

    it('handles plain Error instances', () => {
      const error = new Error('Something went wrong');

      const result = parseApiError(error);

      expect(result.message).toBe('Something went wrong');
      expect(result.code).toBeUndefined();
      expect(result.details).toBeUndefined();
    });

    it('returns fallback message for unknown error types', () => {
      const result = parseApiError('just a string error');

      expect(result.message).toBe('An unexpected error occurred');
    });

    it('returns fallback message for null', () => {
      const result = parseApiError(null);

      expect(result.message).toBe('An unexpected error occurred');
    });

    it('returns fallback message for undefined', () => {
      const result = parseApiError(undefined);

      expect(result.message).toBe('An unexpected error occurred');
    });

    it('returns fallback message for plain objects', () => {
      const result = parseApiError({ code: 500 });

      expect(result.message).toBe('An unexpected error occurred');
    });
  });

  describe('getErrorMessage', () => {
    it('returns message string from AxiosError', () => {
      const axiosError = new AxiosError('Failed');
      axiosError.response = {
        data: { error: 'Server error' },
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as any,
      };

      const message = getErrorMessage(axiosError);

      expect(message).toBe('Server error');
    });

    it('returns message string from Error instance', () => {
      const message = getErrorMessage(new Error('Test error'));

      expect(message).toBe('Test error');
    });

    it('returns fallback message for unknown errors', () => {
      const message = getErrorMessage(42);

      expect(message).toBe('An unexpected error occurred');
    });
  });
});
