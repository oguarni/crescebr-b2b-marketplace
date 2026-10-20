import { Product, ApiResponse } from '@shared/types';
import { apiService } from './api';

interface ProductsResponse {
  products: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ProductsQueryParams {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  minMoq?: number;
  maxMoq?: number;
  maxLeadTime?: number;
  availability?: string[];
  specifications?: Record<string, string>;
}

class ProductsService {
  async getAllProducts(params?: ProductsQueryParams): Promise<ProductsResponse> {
    const queryParams = new URLSearchParams();

    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    // Advanced filters
    if (params?.minPrice !== undefined) queryParams.append('minPrice', params.minPrice.toString());
    if (params?.maxPrice !== undefined) queryParams.append('maxPrice', params.maxPrice.toString());
    if (params?.minMoq !== undefined) queryParams.append('minMoq', params.minMoq.toString());
    if (params?.maxMoq !== undefined) queryParams.append('maxMoq', params.maxMoq.toString());
    if (params?.maxLeadTime !== undefined)
      queryParams.append('maxLeadTime', params.maxLeadTime.toString());

    if (params?.availability && params.availability.length > 0) {
      params.availability.forEach(status => {
        queryParams.append('availability', status);
      });
    }

    if (params?.specifications && Object.keys(params.specifications).length > 0) {
      queryParams.append('specifications', JSON.stringify(params.specifications));
    }

    const query = queryParams.toString();
    const url = query ? `/products?${query}` : '/products';

    const response = await apiService.get<ApiResponse<ProductsResponse>>(url);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch products');
    }

    return response.data;
  }

  async getProductById(id: number): Promise<Product> {
    const response = await apiService.get<ApiResponse<Product>>(`/products/${id}`);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch product');
    }

    return response.data;
  }

  async getCategories(): Promise<string[]> {
    const response = await apiService.get<ApiResponse<string[]>>('/products/categories');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch categories');
    }

    return response.data;
  }

  async getAvailableSpecifications(): Promise<Record<string, string[]>> {
    const response = await apiService.get<ApiResponse<Record<string, string[]>>>(
      '/products/specifications'
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch specifications');
    }

    return response.data;
  }

  // Admin methods
  async createProduct(
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Product> {
    const response = await apiService.post<ApiResponse<Product>>('/products', productData);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create product');
    }

    return response.data;
  }

  async updateProduct(
    id: number,
    productData: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Product> {
    const response = await apiService.put<ApiResponse<Product>>(`/products/${id}`, productData);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update product');
    }

    return response.data;
  }

  async deleteProduct(id: number): Promise<void> {
    const response = await apiService.delete<ApiResponse<void>>(`/products/${id}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete product');
    }
  }
}

export const productsService = new ProductsService();
