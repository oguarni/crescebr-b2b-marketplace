import { quotationRepository } from '../quotation.repository';
import Quotation from '../../models/Quotation';
import QuotationItem from '../../models/QuotationItem';
import Product from '../../models/Product';
import User from '../../models/User';

jest.mock('../../models/Quotation');
jest.mock('../../models/QuotationItem');
jest.mock('../../models/Product');
jest.mock('../../models/User');

describe('QuotationRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find quotation by id', async () => {
      const mockQuotation = { id: 1, status: 'pending', companyId: 1 };
      (Quotation.findByPk as jest.Mock).mockResolvedValue(mockQuotation);

      const result = await quotationRepository.findById(1);

      expect(result).toEqual(mockQuotation);
      expect(Quotation.findByPk).toHaveBeenCalledWith(1);
    });

    it('should return null when quotation not found', async () => {
      (Quotation.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await quotationRepository.findById(999);

      expect(result).toBeNull();
      expect(Quotation.findByPk).toHaveBeenCalledWith(999);
    });
  });

  describe('findByIdWithItems', () => {
    it('should find quotation with items', async () => {
      const mockQuotation = {
        id: 1,
        status: 'pending',
        items: [
          { id: 1, productId: 1, quantity: 10 }
        ]
      };
      (Quotation.findByPk as jest.Mock).mockResolvedValue(mockQuotation);

      const result = await quotationRepository.findByIdWithItems(1);

      expect(result).toEqual(mockQuotation);
      expect(Quotation.findByPk).toHaveBeenCalledWith(1, {
        include: [
          {
            model: QuotationItem,
            as: 'items',
            include: [{ model: Product, as: 'product' }],
          },
        ],
      });
    });
  });

  describe('findByIdWithItemsAndUser', () => {
    it('should find quotation with items and user', async () => {
      const mockQuotation = {
        id: 1,
        status: 'pending',
        items: [{ id: 1, productId: 1, quantity: 10 }],
        user: { id: 1, email: 'test@example.com', role: 'customer' }
      };
      (Quotation.findByPk as jest.Mock).mockResolvedValue(mockQuotation);

      const result = await quotationRepository.findByIdWithItemsAndUser(1);

      expect(result).toEqual(mockQuotation);
      expect(Quotation.findByPk).toHaveBeenCalledWith(1, {
        include: [
          {
            model: QuotationItem,
            as: 'items',
            include: [{ model: Product, as: 'product' }],
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'cpf', 'address', 'role'],
          },
        ],
      });
    });
  });

  describe('findAllForCompany', () => {
    it('should find all quotations for a company', async () => {
      const mockQuotations = [
        { id: 1, companyId: 1, status: 'pending' },
        { id: 2, companyId: 1, status: 'processed' },
      ];
      (Quotation.findAll as jest.Mock).mockResolvedValue(mockQuotations);

      const result = await quotationRepository.findAllForCompany(1);

      expect(result).toEqual(mockQuotations);
      expect(Quotation.findAll).toHaveBeenCalledWith({
        where: { companyId: 1 },
        include: [
          {
            model: QuotationItem,
            as: 'items',
            include: [{ model: Product, as: 'product' }],
          },
        ],
        order: [['createdAt', 'DESC']],
      });
    });

    it('should return empty array when no quotations found', async () => {
      (Quotation.findAll as jest.Mock).mockResolvedValue([]);

      const result = await quotationRepository.findAllForCompany(999);

      expect(result).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should find all quotations with items and users', async () => {
      const mockQuotations = [
        {
          id: 1,
          companyId: 1,
          status: 'pending',
          items: [],
          user: { id: 1, email: 'test@example.com' }
        },
        {
          id: 2,
          companyId: 2,
          status: 'processed',
          items: [],
          user: { id: 2, email: 'test2@example.com' }
        },
      ];
      (Quotation.findAll as jest.Mock).mockResolvedValue(mockQuotations);

      const result = await quotationRepository.findAll();

      expect(result).toEqual(mockQuotations);
      expect(Quotation.findAll).toHaveBeenCalledWith({
        include: [
          {
            model: QuotationItem,
            as: 'items',
            include: [{ model: Product, as: 'product' }],
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'cpf', 'address', 'role'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });
    });
  });

  describe('create', () => {
    it('should create a new quotation', async () => {
      const quotationData = {
        companyId: 1,
        status: 'pending' as const,
        adminNotes: null,
      };
      const mockCreatedQuotation = { id: 1, ...quotationData };
      (Quotation.create as jest.Mock).mockResolvedValue(mockCreatedQuotation);

      const result = await quotationRepository.create(quotationData);

      expect(result).toEqual(mockCreatedQuotation);
      expect(Quotation.create).toHaveBeenCalledWith(quotationData);
    });

    it('should create quotation with admin notes', async () => {
      const quotationData = {
        companyId: 1,
        status: 'processed' as const,
        adminNotes: 'Approved for processing',
      };
      const mockCreatedQuotation = { id: 1, ...quotationData };
      (Quotation.create as jest.Mock).mockResolvedValue(mockCreatedQuotation);

      const result = await quotationRepository.create(quotationData);

      expect(result).toEqual(mockCreatedQuotation);
      expect(Quotation.create).toHaveBeenCalledWith(quotationData);
    });
  });

  describe('update', () => {
    it('should update quotation status', async () => {
      const mockQuotation = {
        id: 1,
        status: 'pending',
        adminNotes: null,
        update: jest.fn().mockResolvedValue({ id: 1, status: 'processed', adminNotes: null }),
      };

      const updateData = { status: 'processed' as const };
      await quotationRepository.update(mockQuotation as any, updateData);

      expect(mockQuotation.update).toHaveBeenCalledWith(updateData);
    });

    it('should update quotation admin notes', async () => {
      const mockQuotation = {
        id: 1,
        status: 'pending',
        adminNotes: null,
        update: jest.fn().mockResolvedValue({ id: 1, status: 'pending', adminNotes: 'Needs review' }),
      };

      const updateData = { adminNotes: 'Needs review' };
      await quotationRepository.update(mockQuotation as any, updateData);

      expect(mockQuotation.update).toHaveBeenCalledWith(updateData);
    });

    it('should update both status and admin notes', async () => {
      const mockQuotation = {
        id: 1,
        status: 'pending',
        adminNotes: null,
        update: jest.fn().mockResolvedValue({
          id: 1,
          status: 'rejected',
          adminNotes: 'Insufficient information'
        }),
      };

      const updateData = {
        status: 'rejected' as const,
        adminNotes: 'Insufficient information'
      };
      await quotationRepository.update(mockQuotation as any, updateData);

      expect(mockQuotation.update).toHaveBeenCalledWith(updateData);
    });
  });
});
