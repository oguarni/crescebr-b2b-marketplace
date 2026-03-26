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
import { productsService } from '../productsService';

const mockApi = vi.mocked(apiService);

const mockProduct = {
  id: 1,
  name: 'Industrial Pump',
  description: 'Heavy-duty pump for industrial use',
  price: 2500.0,
  unitPrice: 2500.0,
  imageUrl: 'https://example.com/pump.jpg',
  category: 'Machinery',
  supplierId: 10,
  minimumOrderQuantity: 5,
  leadTime: 14,
  availability: 'in_stock' as const,
  specifications: { voltage: '220V', flow_rate: '100L/min' },
  tierPricing: [
    { minQuantity: 10, maxQuantity: 50, discount: 5 },
    { minQuantity: 51, maxQuantity: null, discount: 10 },
  ],
};

describe('ProductsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllProducts', () => {
    const mockPaginatedResponse = {
      products: [mockProduct],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };

    it('should fetch products without params', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        data: mockPaginatedResponse,
      });

      const result = await productsService.getAllProducts();

      expect(mockApi.get).toHaveBeenCalledWith('/products');
      expect(result.products).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should build query params for category and search', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        data: { products: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
      });

      await productsService.getAllProducts({
        category: 'Electronics',
        search: 'pump',
      });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('category=Electronics'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('search=pump'));
    });

    it('should build query params for page and limit', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        data: { products: [], pagination: { total: 0, page: 2, limit: 5, totalPages: 0 } },
      });

      await productsService.getAllProducts({ page: 2, limit: 5 });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('page=2'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('limit=5'));
    });

    it('should build query params for price range filters', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        data: { products: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
      });

      await productsService.getAllProducts({ minPrice: 100, maxPrice: 5000 });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('minPrice=100'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('maxPrice=5000'));
    });

    it('should build query params for MOQ range filters', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        data: { products: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
      });

      await productsService.getAllProducts({ minMoq: 10, maxMoq: 100 });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('minMoq=10'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('maxMoq=100'));
    });

    it('should build query param for maxLeadTime', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        data: { products: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
      });

      await productsService.getAllProducts({ maxLeadTime: 7 });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('maxLeadTime=7'));
    });

    it('should append each availability status separately', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        data: { products: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
      });

      await productsService.getAllProducts({
        availability: ['in_stock', 'limited'],
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('availability=in_stock');
      expect(calledUrl).toContain('availability=limited');
    });

    it('should not append availability when array is empty', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        data: { products: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
      });

      await productsService.getAllProducts({ availability: [] });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('availability');
    });

    it('should JSON-stringify specifications', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        data: { products: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
      });

      await productsService.getAllProducts({
        specifications: { voltage: '220V', color: 'red' },
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('specifications=');
    });

    it('should not append specifications when object is empty', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        data: { products: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
      });

      await productsService.getAllProducts({ specifications: {} });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('specifications');
    });

    it('should build all params together', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        data: { products: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } },
      });

      await productsService.getAllProducts({
        category: 'Tools',
        search: 'drill',
        page: 3,
        limit: 20,
        minPrice: 50,
        maxPrice: 500,
        minMoq: 1,
        maxMoq: 50,
        maxLeadTime: 30,
        availability: ['in_stock'],
        specifications: { material: 'steel' },
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('category=Tools');
      expect(calledUrl).toContain('search=drill');
      expect(calledUrl).toContain('page=3');
      expect(calledUrl).toContain('limit=20');
      expect(calledUrl).toContain('minPrice=50');
      expect(calledUrl).toContain('maxPrice=500');
      expect(calledUrl).toContain('minMoq=1');
      expect(calledUrl).toContain('maxMoq=50');
      expect(calledUrl).toContain('maxLeadTime=30');
      expect(calledUrl).toContain('availability=in_stock');
      expect(calledUrl).toContain('specifications=');
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'Server error' });

      await expect(productsService.getAllProducts()).rejects.toThrow('Server error');
    });

    it('should throw default message when no error field', async () => {
      mockApi.get.mockResolvedValue({ success: false });

      await expect(productsService.getAllProducts()).rejects.toThrow('Failed to fetch products');
    });
  });

  describe('getProductById', () => {
    it('should fetch a single product by ID', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: mockProduct });

      const result = await productsService.getProductById(1);

      expect(mockApi.get).toHaveBeenCalledWith('/products/1');
      expect(result).toEqual(mockProduct);
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'Product not found' });

      await expect(productsService.getProductById(999)).rejects.toThrow('Product not found');
    });

    it('should throw default message when no error field', async () => {
      mockApi.get.mockResolvedValue({ success: false });

      await expect(productsService.getProductById(999)).rejects.toThrow('Failed to fetch product');
    });
  });

  describe('getCategories', () => {
    it('should fetch categories list', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        data: ['Electronics', 'Machinery', 'Tools'],
      });

      const result = await productsService.getCategories();

      expect(mockApi.get).toHaveBeenCalledWith('/products/categories');
      expect(result).toEqual(['Electronics', 'Machinery', 'Tools']);
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'Failed to load categories' });

      await expect(productsService.getCategories()).rejects.toThrow('Failed to load categories');
    });

    it('should throw default message when no error field', async () => {
      mockApi.get.mockResolvedValue({ success: false });

      await expect(productsService.getCategories()).rejects.toThrow('Failed to fetch categories');
    });
  });

  describe('getAvailableSpecifications', () => {
    it('should fetch available specifications', async () => {
      const specs = { voltage: ['110V', '220V'], material: ['steel', 'aluminum'] };
      mockApi.get.mockResolvedValue({ success: true, data: specs });

      const result = await productsService.getAvailableSpecifications();

      expect(mockApi.get).toHaveBeenCalledWith('/products/specifications');
      expect(result).toEqual(specs);
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'Specs unavailable' });

      await expect(productsService.getAvailableSpecifications()).rejects.toThrow(
        'Specs unavailable'
      );
    });

    it('should throw default message when no error field', async () => {
      mockApi.get.mockResolvedValue({ success: false });

      await expect(productsService.getAvailableSpecifications()).rejects.toThrow(
        'Failed to fetch specifications'
      );
    });
  });

  describe('createProduct', () => {
    const productData = {
      name: 'New Product',
      description: 'A description',
      price: 99.99,
      unitPrice: 99.99,
      imageUrl: 'https://example.com/image.jpg',
      category: 'Tools',
      supplierId: 1,
      minimumOrderQuantity: 10,
      leadTime: 7,
      availability: 'in_stock' as const,
      specifications: {},
      tierPricing: [],
    };

    it('should create product and return the created product', async () => {
      const createdProduct = { id: 42, ...productData };
      mockApi.post.mockResolvedValue({ success: true, data: createdProduct });

      const result = await productsService.createProduct(productData);

      expect(mockApi.post).toHaveBeenCalledWith('/products', productData);
      expect(result).toEqual(createdProduct);
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.post.mockResolvedValue({ success: false, error: 'Validation failed' });

      await expect(productsService.createProduct(productData)).rejects.toThrow('Validation failed');
    });

    it('should throw default message when no error field', async () => {
      mockApi.post.mockResolvedValue({ success: false });

      await expect(productsService.createProduct(productData)).rejects.toThrow(
        'Failed to create product'
      );
    });
  });

  describe('updateProduct', () => {
    it('should update product and return the updated product', async () => {
      const updateData = { name: 'Updated Pump', price: 3000 };
      const updatedProduct = { ...mockProduct, ...updateData };
      mockApi.put.mockResolvedValue({ success: true, data: updatedProduct });

      const result = await productsService.updateProduct(1, updateData);

      expect(mockApi.put).toHaveBeenCalledWith('/products/1', updateData);
      expect(result.name).toBe('Updated Pump');
      expect(result.price).toBe(3000);
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.put.mockResolvedValue({ success: false, error: 'Product not found' });

      await expect(productsService.updateProduct(999, { name: 'X' })).rejects.toThrow(
        'Product not found'
      );
    });

    it('should throw default message when no error field', async () => {
      mockApi.put.mockResolvedValue({ success: false });

      await expect(productsService.updateProduct(999, { name: 'X' })).rejects.toThrow(
        'Failed to update product'
      );
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      mockApi.delete.mockResolvedValue({ success: true });

      await productsService.deleteProduct(42);

      expect(mockApi.delete).toHaveBeenCalledWith('/products/42');
    });

    it('should throw when response is unsuccessful', async () => {
      mockApi.delete.mockResolvedValue({ success: false, error: 'Not found' });

      await expect(productsService.deleteProduct(99)).rejects.toThrow('Not found');
    });

    it('should throw default message when no error field', async () => {
      mockApi.delete.mockResolvedValue({ success: false });

      await expect(productsService.deleteProduct(99)).rejects.toThrow('Failed to delete product');
    });
  });
});
