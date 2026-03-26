import { quotationService } from '../quotation.service';

// Mock repositories
jest.mock('../../repositories', () => ({
  quotationRepository: {
    findByIds: jest.fn(),
    findById: jest.fn(),
    findByIdWithItems: jest.fn(),
    findByIdWithItemsAndUser: jest.fn(),
    findAllForCompany: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  productRepository: {
    findByIds: jest.fn(),
  },
}));

jest.mock('../../models/QuotationItem', () => ({
  create: jest.fn(),
}));

import { quotationRepository, productRepository } from '../../repositories';
import QuotationItem from '../../models/QuotationItem';

const mockQuotationRepo = quotationRepository as jest.Mocked<typeof quotationRepository>;
const mockProductRepo = productRepository as jest.Mocked<typeof productRepository>;
const mockQuotationItem = QuotationItem as jest.Mocked<typeof QuotationItem>;

describe('QuotationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAndCreate', () => {
    it('should create quotation successfully', async () => {
      const input = {
        items: [
          { productId: 1, quantity: 5 },
          { productId: 2, quantity: 3 },
        ],
        companyId: 1,
      };

      const mockProducts = [
        { id: 1, name: 'Product 1', minimumOrderQuantity: 1 },
        { id: 2, name: 'Product 2', minimumOrderQuantity: 1 },
      ];

      mockProductRepo.findByIds.mockResolvedValue(mockProducts as any);
      mockQuotationRepo.create.mockResolvedValue({ id: 1, companyId: 1 } as any);
      mockQuotationItem.create.mockResolvedValue({} as any);
      mockQuotationRepo.findByIdWithItems.mockResolvedValue({
        id: 1,
        companyId: 1,
        items: [],
      } as any);

      const result = await quotationService.validateAndCreate(input);

      expect(mockProductRepo.findByIds).toHaveBeenCalledWith([1, 2]);
      expect(mockQuotationRepo.create).toHaveBeenCalledWith({
        companyId: 1,
        status: 'pending',
        adminNotes: null,
      });
      expect(mockQuotationItem.create).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });

    it('should throw when products are not found', async () => {
      mockProductRepo.findByIds.mockResolvedValue([{ id: 1 }] as any);

      await expect(
        quotationService.validateAndCreate({
          items: [
            { productId: 1, quantity: 5 },
            { productId: 2, quantity: 3 },
          ],
          companyId: 1,
        })
      ).rejects.toThrow('Products not found: 2');
    });

    it('should throw when quantity is below minimum order quantity', async () => {
      const mockProducts = [{ id: 1, name: 'Bulk Product', minimumOrderQuantity: 10 }];
      mockProductRepo.findByIds.mockResolvedValue(mockProducts as any);

      await expect(
        quotationService.validateAndCreate({
          items: [{ productId: 1, quantity: 3 }],
          companyId: 1,
        })
      ).rejects.toThrow(
        'Quantity for product "Bulk Product" must be at least 10 units. Current: 3'
      );
    });
  });

  describe('getForCustomer', () => {
    it('should return quotations for company', async () => {
      const mockQuotations = [{ id: 1 }, { id: 2 }];
      mockQuotationRepo.findAllForCompany.mockResolvedValue(mockQuotations as any);

      const result = await quotationService.getForCustomer(1);

      expect(mockQuotationRepo.findAllForCompany).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockQuotations);
    });
  });

  describe('getById', () => {
    it('should return quotation for owner customer', async () => {
      const mockQuotation = { id: 1, companyId: 1 };
      mockQuotationRepo.findByIdWithItemsAndUser.mockResolvedValue(mockQuotation as any);

      const result = await quotationService.getById(1, 1, 'customer');

      expect(result).toEqual(mockQuotation);
    });

    it('should return quotation for admin regardless of ownership', async () => {
      const mockQuotation = { id: 1, companyId: 1 };
      mockQuotationRepo.findByIdWithItemsAndUser.mockResolvedValue(mockQuotation as any);

      const result = await quotationService.getById(1, 99, 'admin');

      expect(result).toEqual(mockQuotation);
    });

    it('should throw when quotation not found', async () => {
      mockQuotationRepo.findByIdWithItemsAndUser.mockResolvedValue(null);

      await expect(quotationService.getById(999, 1, 'customer')).rejects.toThrow(
        'Quotation not found'
      );
    });

    it('should throw access denied for non-owner customer', async () => {
      const mockQuotation = { id: 1, companyId: 2 };
      mockQuotationRepo.findByIdWithItemsAndUser.mockResolvedValue(mockQuotation as any);

      await expect(quotationService.getById(1, 1, 'customer')).rejects.toThrow('Access denied');
    });
  });

  describe('getAllForAdmin', () => {
    it('should return all quotations', async () => {
      const mockQuotations = [{ id: 1 }, { id: 2 }];
      mockQuotationRepo.findAll.mockResolvedValue(mockQuotations as any);

      const result = await quotationService.getAllForAdmin();

      expect(mockQuotationRepo.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockQuotations);
    });
  });

  describe('updateByAdmin', () => {
    it('should update quotation status and notes', async () => {
      const mockQuotation = { id: 1, status: 'pending', adminNotes: null, update: jest.fn() };
      mockQuotationRepo.findById.mockResolvedValue(mockQuotation as any);
      mockQuotationRepo.update.mockResolvedValue(undefined as any);
      mockQuotationRepo.findByIdWithItemsAndUser.mockResolvedValue({
        id: 1,
        status: 'processed',
        adminNotes: 'Done',
      } as any);

      const result = await quotationService.updateByAdmin(1, {
        status: 'processed',
        adminNotes: 'Done',
      });

      expect(mockQuotationRepo.update).toHaveBeenCalledWith(mockQuotation, {
        status: 'processed',
        adminNotes: 'Done',
      });
      expect(result).toBeDefined();
    });

    it('should throw when quotation not found', async () => {
      mockQuotationRepo.findById.mockResolvedValue(null);

      await expect(quotationService.updateByAdmin(999, { status: 'processed' })).rejects.toThrow(
        'Quotation not found'
      );
    });

    it('should keep existing values when not provided', async () => {
      const mockQuotation = { id: 1, status: 'pending', adminNotes: 'Old notes' };
      mockQuotationRepo.findById.mockResolvedValue(mockQuotation as any);
      mockQuotationRepo.update.mockResolvedValue(undefined as any);
      mockQuotationRepo.findByIdWithItemsAndUser.mockResolvedValue({} as any);

      await quotationService.updateByAdmin(1, { status: 'rejected' });

      expect(mockQuotationRepo.update).toHaveBeenCalledWith(mockQuotation, {
        status: 'rejected',
        adminNotes: 'Old notes',
      });
    });
  });

  describe('processWithCalculations', () => {
    it('should process quotation successfully', async () => {
      const mockQuotation = { id: 1, status: 'pending' };
      mockQuotationRepo.findById.mockResolvedValue(mockQuotation as any);
      mockQuotationRepo.update.mockResolvedValue(undefined as any);
      mockQuotationRepo.findByIdWithItemsAndUser.mockResolvedValue({
        id: 1,
        status: 'processed',
      } as any);

      const result = await quotationService.processWithCalculations(1, { some: 'data' });

      expect(mockQuotationRepo.update).toHaveBeenCalledWith(mockQuotation, {
        status: 'processed',
      });
      expect(result).toBeDefined();
    });

    it('should throw when quotation not found', async () => {
      mockQuotationRepo.findById.mockResolvedValue(null);

      await expect(quotationService.processWithCalculations(999, {})).rejects.toThrow(
        'Quotation not found'
      );
    });
  });
});
