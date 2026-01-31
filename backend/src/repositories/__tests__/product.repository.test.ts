import { productRepository } from '../product.repository';
import Product from '../../models/Product';
import User from '../../models/User';

jest.mock('../../models/Product');
jest.mock('../../models/User');

describe('ProductRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find product by id', async () => {
      const mockProduct = { id: 1, name: 'Test Product', price: 100 };
      (Product.findByPk as jest.Mock).mockResolvedValue(mockProduct);

      const result = await productRepository.findById(1);

      expect(result).toEqual(mockProduct);
      expect(Product.findByPk).toHaveBeenCalledWith(1);
    });

    it('should return null when product not found', async () => {
      (Product.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await productRepository.findById(999);

      expect(result).toBeNull();
      expect(Product.findByPk).toHaveBeenCalledWith(999);
    });
  });

  describe('findByIdWithSupplier', () => {
    it('should find product with supplier information', async () => {
      const mockProduct = {
        id: 1,
        name: 'Test Product',
        price: 100,
        supplier: {
          id: 1,
          companyName: 'Test Supplier',
          email: 'supplier@test.com'
        }
      };
      (Product.findByPk as jest.Mock).mockResolvedValue(mockProduct);

      const result = await productRepository.findByIdWithSupplier(1);

      expect(result).toEqual(mockProduct);
      expect(Product.findByPk).toHaveBeenCalledWith(1, {
        include: [{ model: User, as: 'supplier', attributes: ['id', 'companyName', 'email'] }],
      });
    });

    it('should return null when product not found with supplier', async () => {
      (Product.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await productRepository.findByIdWithSupplier(999);

      expect(result).toBeNull();
    });
  });

  describe('findAllActive', () => {
    it('should find all active products', async () => {
      const mockProducts = [
        { id: 1, name: 'Product 1', availability: 'in_stock', supplier: { id: 1, companyName: 'Supplier 1' } },
        { id: 2, name: 'Product 2', availability: 'limited', supplier: { id: 2, companyName: 'Supplier 2' } },
      ];
      (Product.findAll as jest.Mock).mockResolvedValue(mockProducts);

      const result = await productRepository.findAllActive();

      expect(result).toEqual(mockProducts);
      expect(Product.findAll).toHaveBeenCalledWith({
        where: { availability: ['in_stock', 'limited'] },
        include: [{ model: User, as: 'supplier', attributes: ['id', 'companyName'] }],
      });
    });

    it('should return empty array when no active products found', async () => {
      (Product.findAll as jest.Mock).mockResolvedValue([]);

      const result = await productRepository.findAllActive();

      expect(result).toEqual([]);
    });
  });

  describe('findBySupplier', () => {
    it('should find all products for a supplier', async () => {
      const mockProducts = [
        { id: 1, name: 'Product 1', supplierId: 1 },
        { id: 2, name: 'Product 2', supplierId: 1 },
      ];
      (Product.findAll as jest.Mock).mockResolvedValue(mockProducts);

      const result = await productRepository.findBySupplier(1);

      expect(result).toEqual(mockProducts);
      expect(Product.findAll).toHaveBeenCalledWith({ where: { supplierId: 1 } });
    });

    it('should return empty array when supplier has no products', async () => {
      (Product.findAll as jest.Mock).mockResolvedValue([]);

      const result = await productRepository.findBySupplier(999);

      expect(result).toEqual([]);
    });
  });

  describe('findByIds', () => {
    it('should find products by array of ids', async () => {
      const mockProducts = [
        { id: 1, name: 'Product 1' },
        { id: 2, name: 'Product 2' },
        { id: 3, name: 'Product 3' },
      ];
      (Product.findAll as jest.Mock).mockResolvedValue(mockProducts);

      const result = await productRepository.findByIds([1, 2, 3]);

      expect(result).toEqual(mockProducts);
      expect(Product.findAll).toHaveBeenCalledWith({ where: { id: [1, 2, 3] } });
    });

    it('should return empty array when no products match ids', async () => {
      (Product.findAll as jest.Mock).mockResolvedValue([]);

      const result = await productRepository.findByIds([999, 998]);

      expect(result).toEqual([]);
    });

    it('should handle empty id array', async () => {
      (Product.findAll as jest.Mock).mockResolvedValue([]);

      const result = await productRepository.findByIds([]);

      expect(result).toEqual([]);
      expect(Product.findAll).toHaveBeenCalledWith({ where: { id: [] } });
    });

    it('should find partial matches when some ids exist', async () => {
      const mockProducts = [
        { id: 1, name: 'Product 1' },
      ];
      (Product.findAll as jest.Mock).mockResolvedValue(mockProducts);

      const result = await productRepository.findByIds([1, 999]);

      expect(result).toEqual(mockProducts);
    });
  });
});
