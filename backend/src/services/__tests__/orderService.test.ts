import { orderService } from '../orderService';
import Order from '../../models/Order';
import Quotation from '../../models/Quotation';
import { QuoteService } from '../quoteService';
import { OrderStatusService } from '../orderStatusService';

jest.mock('../../models/Order');
jest.mock('../../models/Quotation');
jest.mock('../../models/User');
jest.mock('../quoteService');
jest.mock('../orderStatusService');

const MockOrder = Order as jest.Mocked<typeof Order>;
const MockQuotation = Quotation as jest.Mocked<typeof Quotation>;
const MockQuoteService = QuoteService as jest.Mocked<typeof QuoteService>;
const MockOrderStatusService = OrderStatusService as jest.Mocked<typeof OrderStatusService>;

describe('orderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createFromQuotation', () => {
    const companyId = 1;
    const quotationId = 10;

    it('should create an order from a processed quotation successfully', async () => {
      const mockQuotation = {
        id: quotationId,
        companyId,
        status: 'processed',
        validUntil: null,
        update: jest.fn(),
      };
      (MockQuotation.findOne as jest.Mock).mockResolvedValue(mockQuotation);
      (MockQuoteService.getQuotationWithCalculations as jest.Mock).mockResolvedValue({
        calculations: { grandTotal: 500.0 },
      });
      (MockOrder.create as jest.Mock).mockResolvedValue({ id: 'order-uuid' });
      (MockOrder.findByPk as jest.Mock).mockResolvedValue({
        id: 'order-uuid',
        companyId,
        quotationId,
        totalAmount: 500.0,
        status: 'pending',
      });

      const result = await orderService.createFromQuotation(quotationId, companyId);

      expect(MockQuotation.findOne).toHaveBeenCalledWith({
        where: { id: quotationId, companyId },
      });
      expect(MockOrder.create).toHaveBeenCalledWith({
        companyId,
        quotationId,
        totalAmount: 500.0,
        status: 'pending',
      });
      expect(mockQuotation.update).toHaveBeenCalledWith({ status: 'completed' });
      expect(result).toBeDefined();
    });

    it('should throw when quotation is not found', async () => {
      (MockQuotation.findOne as jest.Mock).mockResolvedValue(null);

      await expect(orderService.createFromQuotation(999, companyId)).rejects.toThrow(
        'Quotation not found or does not belong to the user'
      );
    });

    it('should throw when quotation status is not processed', async () => {
      (MockQuotation.findOne as jest.Mock).mockResolvedValue({
        id: quotationId,
        companyId,
        status: 'pending',
      });

      await expect(orderService.createFromQuotation(quotationId, companyId)).rejects.toThrow(
        'Only processed quotations can be converted to orders'
      );
    });

    it('should throw when quotation is expired', async () => {
      const pastDate = new Date('2020-01-01');
      (MockQuotation.findOne as jest.Mock).mockResolvedValue({
        id: quotationId,
        companyId,
        status: 'processed',
        validUntil: pastDate,
      });

      await expect(orderService.createFromQuotation(quotationId, companyId)).rejects.toThrow(
        /This quotation expired on/
      );
    });

    it('should allow creation when quotation is not expired', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const mockQuotation = {
        id: quotationId,
        companyId,
        status: 'processed',
        validUntil: futureDate,
        update: jest.fn(),
      };
      (MockQuotation.findOne as jest.Mock).mockResolvedValue(mockQuotation);
      (MockQuoteService.getQuotationWithCalculations as jest.Mock).mockResolvedValue({
        calculations: { grandTotal: 100.0 },
      });
      (MockOrder.create as jest.Mock).mockResolvedValue({ id: 'order-uuid' });
      (MockOrder.findByPk as jest.Mock).mockResolvedValue({ id: 'order-uuid' });

      const result = await orderService.createFromQuotation(quotationId, companyId);
      expect(result).toBeDefined();
    });

    it('should allow creation when validUntil is null', async () => {
      const mockQuotation = {
        id: quotationId,
        companyId,
        status: 'processed',
        validUntil: null,
        update: jest.fn(),
      };
      (MockQuotation.findOne as jest.Mock).mockResolvedValue(mockQuotation);
      (MockQuoteService.getQuotationWithCalculations as jest.Mock).mockResolvedValue({
        calculations: { grandTotal: 200.0 },
      });
      (MockOrder.create as jest.Mock).mockResolvedValue({ id: 'order-uuid' });
      (MockOrder.findByPk as jest.Mock).mockResolvedValue({ id: 'order-uuid' });

      const result = await orderService.createFromQuotation(quotationId, companyId);
      expect(result).toBeDefined();
      expect(mockQuotation.update).toHaveBeenCalledWith({ status: 'completed' });
    });
  });

  describe('getHistory', () => {
    it('should return order history for the order owner', async () => {
      const mockHistory = {
        order: { id: 'order-1', companyId: 1 },
        history: [{ status: 'pending' }],
      };
      (MockOrderStatusService.getOrderHistory as jest.Mock).mockResolvedValue(mockHistory);

      const result = await orderService.getHistory('order-1', 1, 'customer');
      expect(result).toEqual(mockHistory);
    });

    it('should allow admin to view any order history', async () => {
      const mockHistory = {
        order: { id: 'order-1', companyId: 99 },
        history: [],
      };
      (MockOrderStatusService.getOrderHistory as jest.Mock).mockResolvedValue(mockHistory);

      const result = await orderService.getHistory('order-1', 1, 'admin');
      expect(result).toEqual(mockHistory);
    });

    it('should throw access denied for wrong customer', async () => {
      const mockHistory = {
        order: { id: 'order-1', companyId: 99 },
        history: [],
      };
      (MockOrderStatusService.getOrderHistory as jest.Mock).mockResolvedValue(mockHistory);

      await expect(orderService.getHistory('order-1', 1, 'customer')).rejects.toThrow(
        'Access denied'
      );
    });

    it('should allow supplier to view order history', async () => {
      const mockHistory = {
        order: { id: 'order-1', companyId: 5 },
        history: [],
      };
      (MockOrderStatusService.getOrderHistory as jest.Mock).mockResolvedValue(mockHistory);

      const result = await orderService.getHistory('order-1', 5, 'supplier');
      expect(result).toEqual(mockHistory);
    });
  });
});
