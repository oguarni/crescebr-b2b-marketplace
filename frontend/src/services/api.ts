import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * The caller reports this request's failures itself, in the interface
     * language, so the generic toast of the raw API message is skipped.
     */
    handlesErrors?: boolean;
  }
}
import toast from 'react-hot-toast';
import { authService } from './authService';
import { installDemoApi } from '../demo';

const api = axios.create({
  baseURL: '/api/v1', // Use relative path for proxy; matches backend API_PREFIX
});

// No-op unless VITE_DEMO_MODE is on, which is the hosted static build only.
installDemoApi(api);

api.interceptors.request.use(config => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    // A rejected anonymous login is a form error, not an expired session.
    if (error.response?.status === 401 && authService.getToken()) {
      authService.logout();
      window.location.href = '/login';
    } else if (error.response?.status !== 404 && !error.config?.handlesErrors) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

class ApiService {
  private axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  async get<T>(url: string, options?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.get(url, options);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, options?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.post(url, data, options);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, options?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.put(url, data, options);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.delete(url);
    return response.data;
  }

  getRawApi(): AxiosInstance {
    return this.axiosInstance;
  }
}

export const apiService = new ApiService(api);
export default api;
