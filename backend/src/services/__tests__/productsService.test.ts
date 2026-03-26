import { productsService } from '../productsService';
import Product from '../../models/Product';

// Mock models using the same pattern as other service tests
jest.mock('../../models/Product');

const MockProduct = Product as jest.Mocked<typeof Product>;

// Product.sequelize is accessed in the source for fn/col calls
(MockProduct as any).sequelize = { fn: jest.fn(), col: jest.fn() };

describe('productsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    function setupGetAllMock(rows: any[] = [], count: number = 0) {
      MockProduct.findAndCountAll.mockResolvedValue({
        count,
        rows,
      } as any);
    }

    it('should return products with pagination', async () => {
      const mockProducts = [
        { id: 1, name: 'Product A', price: 100 },
        { id: 2, name: 'Product B', price: 200 },
      ];
      setupGetAllMock(mockProducts, 2);

      const result = await productsService.getAll({});

      expect(result.products).toEqual(mockProducts);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should apply category filter', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ category: 'Electronics' });

      const callArgs = MockProduct.findAndCountAll.mock.calls[0][0] as any;
      expect(callArgs.where.category).toBeDefined();
    });

    it('should apply search filter (single word)', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ search: 'laptop' });

      const callArgs = MockProduct.findAndCountAll.mock.calls[0][0] as any;
      expect(callArgs.where).toBeDefined();
    });

    it('should apply search filter with multi-word query', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ search: 'red laptop bag' });

      const callArgs = MockProduct.findAndCountAll.mock.calls[0][0] as any;
      expect(callArgs.where).toBeDefined();
    });

    it('should apply minPrice filter', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ minPrice: '50' });

      const callArgs = MockProduct.findAndCountAll.mock.calls[0][0] as any;
      expect(callArgs.where.price).toBeDefined();
    });

    it('should apply maxPrice filter', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ maxPrice: '500' });

      const callArgs = MockProduct.findAndCountAll.mock.calls[0][0] as any;
      expect(callArgs.where.price).toBeDefined();
    });

    it('should apply both minPrice and maxPrice filters', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ minPrice: '10', maxPrice: '100' });

      const callArgs = MockProduct.findAndCountAll.mock.calls[0][0] as any;
      expect(callArgs.where.price).toBeDefined();
    });

    it('should apply minMoq filter', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ minMoq: '5' });

      const callArgs = MockProduct.findAndCountAll.mock.calls[0][0] as any;
      expect(callArgs.where.minimumOrderQuantity).toBeDefined();
    });

    it('should apply maxMoq filter', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ maxMoq: '100' });

      const callArgs = MockProduct.findAndCountAll.mock.calls[0][0] as any;
      expect(callArgs.where.minimumOrderQuantity).toBeDefined();
    });

    it('should apply both minMoq and maxMoq filters', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ minMoq: '5', maxMoq: '100' });

      const callArgs = MockProduct.findAndCountAll.mock.calls[0][0] as any;
      expect(callArgs.where.minimumOrderQuantity).toBeDefined();
    });

    it('should apply maxLeadTime filter', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ maxLeadTime: '7' });

      const callArgs = MockProduct.findAndCountAll.mock.calls[0][0] as any;
      expect(callArgs.where.leadTime).toBeDefined();
    });

    it('should apply availability filter as string', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ availability: 'in_stock' });

      const callArgs = MockProduct.findAndCountAll.mock.calls[0][0] as any;
      expect(callArgs.where.availability).toBeDefined();
    });

    it('should apply availability filter as array', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ availability: ['in_stock', 'limited'] });

      const callArgs = MockProduct.findAndCountAll.mock.calls[0][0] as any;
      expect(callArgs.where.availability).toBeDefined();
    });

    it('should apply specifications filter with simple values', async () => {
      setupGetAllMock([], 0);

      const specs = JSON.stringify({ color: 'red' });
      await productsService.getAll({ specifications: specs });

      expect(MockProduct.findAndCountAll).toHaveBeenCalled();
    });

    it('should apply specifications filter with array values', async () => {
      setupGetAllMock([], 0);

      const specs = JSON.stringify({ color: ['red', 'blue'] });
      await productsService.getAll({ specifications: specs });

      expect(MockProduct.findAndCountAll).toHaveBeenCalled();
    });

    it('should apply specifications filter with range values (min and max)', async () => {
      setupGetAllMock([], 0);

      const specs = JSON.stringify({ weight: { min: 10, max: 50 } });
      await productsService.getAll({ specifications: specs });

      expect(MockProduct.findAndCountAll).toHaveBeenCalled();
    });

    it('should apply specifications filter with range having only min', async () => {
      setupGetAllMock([], 0);

      const specs = JSON.stringify({ weight: { min: 10 } });
      await productsService.getAll({ specifications: specs });

      expect(MockProduct.findAndCountAll).toHaveBeenCalled();
    });

    it('should apply specifications filter with range having only max', async () => {
      setupGetAllMock([], 0);

      const specs = JSON.stringify({ weight: { max: 50 } });
      await productsService.getAll({ specifications: specs });

      expect(MockProduct.findAndCountAll).toHaveBeenCalled();
    });

    it('should handle invalid specifications JSON gracefully', async () => {
      setupGetAllMock([], 0);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await productsService.getAll({ specifications: 'not-valid-json' });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error parsing specifications filter:',
        expect.any(Error)
      );
      expect(MockProduct.findAndCountAll).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should validate sort fields and fallback to createdAt', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ sortBy: 'invalidField' });

      expect(MockProduct.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['createdAt', 'DESC']],
        })
      );
    });

    it('should accept valid sort fields', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ sortBy: 'price' });

      expect(MockProduct.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['price', 'DESC']],
        })
      );
    });

    it('should validate sort order and fallback to DESC', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ sortOrder: 'INVALID' });

      expect(MockProduct.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['createdAt', 'DESC']],
        })
      );
    });

    it('should accept valid sort order ASC', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ sortOrder: 'ASC' });

      expect(MockProduct.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['createdAt', 'ASC']],
        })
      );
    });

    it('should include facets when facets=true', async () => {
      setupGetAllMock([], 0);

      const categoryFacets = [
        { category: 'Electronics', getDataValue: jest.fn().mockReturnValue('5') },
      ];
      const availabilityFacets = [
        { availability: 'in_stock', getDataValue: jest.fn().mockReturnValue('3') },
      ];
      const priceRanges = [{ dataValues: { minPrice: '10', maxPrice: '500', avgPrice: '255' } }];

      MockProduct.findAll
        .mockResolvedValueOnce(categoryFacets as any)
        .mockResolvedValueOnce(availabilityFacets as any)
        .mockResolvedValueOnce(priceRanges as any);

      const result = await productsService.getAll({ facets: 'true' });

      expect(result.facets).toBeDefined();
      expect(result.facets!.categories).toEqual([{ value: 'Electronics', count: 5 }]);
      expect(result.facets!.availability).toEqual([{ value: 'in_stock', count: 3 }]);
      expect((result.facets!.priceRange as any).min).toBe(10);
      expect((result.facets!.priceRange as any).max).toBe(500);
      expect((result.facets!.priceRange as any).avg).toBe(255);
    });

    it('should not include facets when facets=false', async () => {
      setupGetAllMock([], 0);

      const result = await productsService.getAll({ facets: 'false' });

      expect(result.facets).toBeUndefined();
      expect(MockProduct.findAll).not.toHaveBeenCalled();
    });

    it('should not include facets by default', async () => {
      setupGetAllMock([], 0);

      const result = await productsService.getAll({});

      expect(result.facets).toBeUndefined();
    });

    it('should handle facets with empty priceRanges', async () => {
      setupGetAllMock([], 0);

      MockProduct.findAll
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any);

      const result = await productsService.getAll({ facets: 'true' });

      expect(result.facets).toBeDefined();
      expect(result.facets!.categories).toEqual([]);
      expect(result.facets!.priceRange).toBeNull();
    });

    it('should calculate correct pagination', async () => {
      setupGetAllMock([], 25);

      const result = await productsService.getAll({ page: 2, limit: 10 });

      expect(result.pagination.total).toBe(25);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should pass correct offset for pagination', async () => {
      setupGetAllMock([], 0);

      await productsService.getAll({ page: 3, limit: 5 });

      expect(MockProduct.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 10,
          limit: 5,
        })
      );
    });

    it('should return searchMeta with applied filters', async () => {
      setupGetAllMock([], 0);

      const result = await productsService.getAll({
        category: 'Tech',
        search: 'laptop',
        minPrice: '100',
        maxPrice: '999',
        minMoq: '1',
        maxMoq: '50',
        maxLeadTime: '7',
        availability: 'in_stock',
        specifications: '{"color":"red"}',
      });

      expect(result.searchMeta.filters.category).toBe('Tech');
      expect(result.searchMeta.filters.search).toBe('laptop');
      expect(result.searchMeta.filters.hasSpecifications).toBe(true);
    });

    it('should return null filters when none applied', async () => {
      setupGetAllMock([], 0);

      const result = await productsService.getAll({});

      expect(result.searchMeta.filters.category).toBeNull();
      expect(result.searchMeta.filters.search).toBeNull();
      expect(result.searchMeta.filters.hasSpecifications).toBe(false);
    });

    it('should handle specifications filter with null value in object', async () => {
      setupGetAllMock([], 0);

      const specs = JSON.stringify({ color: null });
      await productsService.getAll({ specifications: specs });

      expect(MockProduct.findAndCountAll).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return product by ID', async () => {
      const mockProduct = { id: 1, name: 'Test Product', price: 100 };
      MockProduct.findByPk.mockResolvedValue(mockProduct as any);

      const result = await productsService.getById(1);

      expect(result).toEqual(mockProduct);
      expect(MockProduct.findByPk).toHaveBeenCalledWith(1);
    });

    it('should return null when product not found', async () => {
      MockProduct.findByPk.mockResolvedValue(null);

      const result = await productsService.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create product with all fields', async () => {
      const input = {
        name: 'New Product',
        description: 'A great product',
        price: '49.99',
        imageUrl: 'https://example.com/img.jpg',
        category: 'Electronics',
        supplierId: 1,
        specifications: '{"color":"blue","weight":"500g"}',
        minimumOrderQuantity: 10,
      };

      const createdProduct = { id: 1, ...input, price: 49.99 };
      MockProduct.create.mockResolvedValue(createdProduct as any);

      const result = await productsService.create(input);

      expect(MockProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Product',
          description: 'A great product',
          price: 49.99,
          imageUrl: 'https://example.com/img.jpg',
          category: 'Electronics',
          supplierId: 1,
          specifications: { color: 'blue', weight: '500g' },
          unitPrice: 49.99,
          minimumOrderQuantity: 10,
        })
      );
      expect(result).toEqual(createdProduct);
    });

    it('should parse price to float', async () => {
      MockProduct.create.mockResolvedValue({ id: 1 } as any);

      await productsService.create({
        name: 'Test',
        description: 'Test',
        price: '199.99',
        imageUrl: '',
        category: 'Test',
        supplierId: 1,
      });

      expect(MockProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 199.99,
          unitPrice: 199.99,
        })
      );
    });

    it('should handle numeric price', async () => {
      MockProduct.create.mockResolvedValue({ id: 1 } as any);

      await productsService.create({
        name: 'Test',
        description: 'Test',
        price: 75,
        imageUrl: '',
        category: 'Test',
        supplierId: 1,
      });

      expect(MockProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 75,
        })
      );
    });

    it('should handle optional specifications as undefined', async () => {
      MockProduct.create.mockResolvedValue({ id: 1 } as any);

      await productsService.create({
        name: 'Test',
        description: 'Test',
        price: '50',
        imageUrl: '',
        category: 'Test',
        supplierId: 1,
      });

      expect(MockProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          specifications: {},
        })
      );
    });

    it('should handle string specifications (JSON parse)', async () => {
      MockProduct.create.mockResolvedValue({ id: 1 } as any);

      await productsService.create({
        name: 'Test',
        description: 'Test',
        price: '50',
        imageUrl: '',
        category: 'Test',
        supplierId: 1,
        specifications: '{"material":"steel"}',
      });

      expect(MockProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          specifications: { material: 'steel' },
        })
      );
    });

    it('should default minimumOrderQuantity to 1 when not provided', async () => {
      MockProduct.create.mockResolvedValue({ id: 1 } as any);

      await productsService.create({
        name: 'Test',
        description: 'Test',
        price: '50',
        imageUrl: '',
        category: 'Test',
        supplierId: 1,
      });

      expect(MockProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          minimumOrderQuantity: 1,
        })
      );
    });

    it('should set imageUrl to null when empty string', async () => {
      MockProduct.create.mockResolvedValue({ id: 1 } as any);

      await productsService.create({
        name: 'Test',
        description: 'Test',
        price: '50',
        imageUrl: '',
        category: 'Test',
        supplierId: 1,
      });

      expect(MockProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: null,
        })
      );
    });
  });

  describe('update', () => {
    it('should update product fields', async () => {
      const mockProduct = {
        id: 1,
        name: 'Old Name',
        specifications: { color: 'red' },
        minimumOrderQuantity: 5,
        update: jest.fn().mockResolvedValue(true),
      };

      const updateData = {
        name: 'New Name',
        description: 'Updated description',
        price: '149.99',
        imageUrl: 'https://example.com/new.jpg',
        category: 'Updated Category',
        specifications: '{"color":"blue"}',
        minimumOrderQuantity: 20,
      };

      await productsService.update(mockProduct as any, updateData);

      expect(mockProduct.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Name',
          description: 'Updated description',
          price: 149.99,
          imageUrl: 'https://example.com/new.jpg',
          category: 'Updated Category',
          specifications: '{"color":"blue"}',
          unitPrice: 149.99,
          minimumOrderQuantity: 20,
        })
      );
    });

    it('should keep existing specifications if not provided', async () => {
      const existingSpecs = { color: 'red', size: 'large' };
      const mockProduct = {
        id: 1,
        name: 'Product',
        specifications: existingSpecs,
        minimumOrderQuantity: 5,
        update: jest.fn().mockResolvedValue(true),
      };

      await productsService.update(mockProduct as any, {
        name: 'Updated Name',
        description: 'Updated desc',
        price: '99.99',
        imageUrl: '',
        category: 'Cat',
      });

      expect(mockProduct.update).toHaveBeenCalledWith(
        expect.objectContaining({
          specifications: existingSpecs,
        })
      );
    });

    it('should keep existing minimumOrderQuantity if not provided', async () => {
      const mockProduct = {
        id: 1,
        name: 'Product',
        specifications: {},
        minimumOrderQuantity: 25,
        update: jest.fn().mockResolvedValue(true),
      };

      await productsService.update(mockProduct as any, {
        name: 'Updated',
        description: 'Desc',
        price: '50',
        imageUrl: '',
        category: 'Cat',
      });

      expect(mockProduct.update).toHaveBeenCalledWith(
        expect.objectContaining({
          minimumOrderQuantity: 25,
        })
      );
    });

    it('should return the updated product', async () => {
      const mockProduct = {
        id: 1,
        name: 'Product',
        specifications: {},
        minimumOrderQuantity: 1,
        update: jest.fn().mockResolvedValue(true),
      };

      const result = await productsService.update(mockProduct as any, {
        name: 'Updated',
        description: 'Desc',
        price: '50',
        imageUrl: '',
        category: 'Cat',
      });

      expect(result).toBe(mockProduct);
    });
  });

  describe('delete', () => {
    it('should call destroy on product', async () => {
      const mockProduct = {
        id: 1,
        destroy: jest.fn().mockResolvedValue(true),
      };

      await productsService.delete(mockProduct as any);

      expect(mockProduct.destroy).toHaveBeenCalled();
    });
  });

  describe('getCategories', () => {
    it('should return unique categories', async () => {
      MockProduct.findAll.mockResolvedValue([
        { category: 'Electronics' },
        { category: 'Clothing' },
        { category: 'Food' },
      ] as any);

      const result = await productsService.getCategories();

      expect(result).toEqual(['Electronics', 'Clothing', 'Food']);
      expect(MockProduct.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: ['category'],
          group: ['category'],
          order: [['category', 'ASC']],
        })
      );
    });

    it('should return empty array when no categories', async () => {
      MockProduct.findAll.mockResolvedValue([] as any);

      const result = await productsService.getCategories();

      expect(result).toEqual([]);
    });
  });

  describe('getAvailableSpecifications', () => {
    it('should aggregate specifications from all products', async () => {
      MockProduct.findAll.mockResolvedValue([
        { specifications: { color: 'red', size: 'large' } },
        { specifications: { color: 'blue', material: 'cotton' } },
        { specifications: { size: 'small', material: 'polyester' } },
      ] as any);

      const result = await productsService.getAvailableSpecifications();

      expect(result.color).toEqual(['blue', 'red']);
      expect(result.size).toEqual(['large', 'small']);
      expect(result.material).toEqual(['cotton', 'polyester']);
    });

    it('should handle products without specifications', async () => {
      MockProduct.findAll.mockResolvedValue([
        { specifications: null },
        { specifications: undefined },
        { specifications: { color: 'red' } },
      ] as any);

      const result = await productsService.getAvailableSpecifications();

      expect(result.color).toEqual(['red']);
    });

    it('should handle empty or null spec values', async () => {
      MockProduct.findAll.mockResolvedValue([
        { specifications: { color: '', size: null, weight: undefined, material: 'steel' } },
      ] as any);

      const result = await productsService.getAvailableSpecifications();

      expect(result.color).toBeUndefined();
      expect(result.size).toBeUndefined();
      expect(result.weight).toBeUndefined();
      expect(result.material).toEqual(['steel']);
    });

    it('should sort values alphabetically', async () => {
      MockProduct.findAll.mockResolvedValue([
        { specifications: { color: 'yellow' } },
        { specifications: { color: 'blue' } },
        { specifications: { color: 'red' } },
      ] as any);

      const result = await productsService.getAvailableSpecifications();

      expect(result.color).toEqual(['blue', 'red', 'yellow']);
    });

    it('should deduplicate spec values', async () => {
      MockProduct.findAll.mockResolvedValue([
        { specifications: { color: 'red' } },
        { specifications: { color: 'red' } },
        { specifications: { color: 'blue' } },
      ] as any);

      const result = await productsService.getAvailableSpecifications();

      expect(result.color).toEqual(['blue', 'red']);
    });

    it('should handle no products', async () => {
      MockProduct.findAll.mockResolvedValue([] as any);

      const result = await productsService.getAvailableSpecifications();

      expect(result).toEqual({});
    });

    it('should handle non-object specifications', async () => {
      MockProduct.findAll.mockResolvedValue([
        { specifications: 'not-an-object' },
        { specifications: 42 },
      ] as any);

      const result = await productsService.getAvailableSpecifications();

      // Strings have typeof 'string', not 'object'; numbers have typeof 'number'
      // The condition checks typeof === 'object', so these should be skipped
      expect(result).toEqual({});
    });

    it('should convert numeric spec values to string', async () => {
      MockProduct.findAll.mockResolvedValue([
        { specifications: { weight: 500, voltage: 220 } },
      ] as any);

      const result = await productsService.getAvailableSpecifications();

      expect(result.weight).toEqual(['500']);
      expect(result.voltage).toEqual(['220']);
    });
  });
});
