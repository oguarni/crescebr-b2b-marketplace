import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export const parseApiError = (error: unknown): ApiError => {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    return {
      message: data?.error || data?.message || error.message || 'An error occurred',
      code: error.code,
      details: data?.details,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'An unexpected error occurred' };
};

export const getErrorMessage = (error: unknown): string => {
  return parseApiError(error).message;
};
