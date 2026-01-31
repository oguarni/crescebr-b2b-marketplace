import { orderRepository } from '../order.repository';
import Order from '../../models/Order';
import Quotation from '../../models/Quotation';
import User from '../../models/User';
import OrderStatusHistory from '../../models/OrderStatusHistory';

jest.mock('../../models/Order');
jest.mock('../../models/Quotation');
jest.mock('../../models/User');
jest.mock('../../models/OrderStatusHistory');

describe('OrderRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find order by id', async () => {
      const mockOrder = { id: 'order-uuid-1', status: 'pending', companyId: 1 };
      (Order.findByPk as jest.Mock).mockResolvedValue(mockOrder);

      const result = await orderRepository.findById('order-uuid-1');

      expect(result).toEqual(mockOrder);
      expect(Order.findByPk).toHaveBeenCalledWith('order-uuid-1');
    });

    it('should return null when order not found', async () => {
      (Order.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await orderRepository.findById('non-existent-id');

      expect(result).toBeNull();
      expect(Order.findByPk).toHaveBeenCalledWith('non-existent-id');
    });
  });

  describe('findByIdWithRelations', () => {
    it('should find order with all relations', async () => {
      const mockOrder = {
        id: 'order-uuid-1',
        status: 'pending',
        companyId: 1,
        quotation: { id: 1, status: 'processed' },
        buyer: { id: 1, email: 'buyer@test.com', companyName: 'Test Company' },
        statusHistory: [
          { id: 1, status: 'pending', createdAt: new Date() }
        ]
      };
      (Order.findByPk as jest.Mock).mockResolvedValue(mockOrder);

      const result = await orderRepository.findByIdWithRelations('order-uuid-1');

      expect(result).toEqual(mockOrder);
      expect(Order.findByPk).toHaveBeenCalledWith('order-uuid-1', {
        include: [
          { model: Quotation, as: 'quotation' },
          { model: User, as: 'buyer', attributes: ['id', 'email', 'companyName'] },
          { model: OrderStatusHistory, as: 'statusHistory' },
        ],
      });
    });

    it('should return null when order not found with relations', async () => {
      (Order.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await orderRepository.findByIdWithRelations('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findAllForBuyer', () => {
    it('should find all orders for a buyer', async () => {
      const mockOrders = [
        {
          id: 'order-uuid-1',
          companyId: 1,
          status: 'pending',
          quotation: { id: 1 }
        },
        {
          id: 'order-uuid-2',
          companyId: 1,
          status: 'shipped',
          quotation: { id: 2 }
        },
      ];
      (Order.findAll as jest.Mock).mockResolvedValue(mockOrders);

      const result = await orderRepository.findAllForBuyer(1);

      expect(result).toEqual(mockOrders);
      expect(Order.findAll).toHaveBeenCalledWith({
        where: { companyId: 1 },
        include: [{ model: Quotation, as: 'quotation' }],
        order: [['createdAt', 'DESC']],
      });
    });

    it('should return empty array when buyer has no orders', async () => {
      (Order.findAll as jest.Mock).mockResolvedValue([]);

      const result = await orderRepository.findAllForBuyer(999);

      expect(result).toEqual([]);
    });

    it('should order results by createdAt descending', async () => {
      const mockOrders = [
        { id: 'order-uuid-2', createdAt: new Date('2024-01-02') },
        { id: 'order-uuid-1', createdAt: new Date('2024-01-01') },
      ];
      (Order.findAll as jest.Mock).mockResolvedValue(mockOrders);

      await orderRepository.findAllForBuyer(1);

      expect(Order.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['createdAt', 'DESC']],
        })
      );
    });
  });

  describe('findAll', () => {
    it('should find all orders with quotation and buyer', async () => {
      const mockOrders = [
        {
          id: 'order-uuid-1',
          companyId: 1,
          status: 'pending',
          quotation: { id: 1 },
          buyer: { id: 1, email: 'buyer1@test.com', companyName: 'Company 1' }
        },
        {
          id: 'order-uuid-2',
          companyId: 2,
          status: 'shipped',
          quotation: { id: 2 },
          buyer: { id: 2, email: 'buyer2@test.com', companyName: 'Company 2' }
        },
      ];
      (Order.findAll as jest.Mock).mockResolvedValue(mockOrders);

      const result = await orderRepository.findAll();

      expect(result).toEqual(mockOrders);
      expect(Order.findAll).toHaveBeenCalledWith({
        include: [
          { model: Quotation, as: 'quotation' },
          { model: User, as: 'buyer', attributes: ['id', 'email', 'companyName'] },
        ],
        order: [['createdAt', 'DESC']],
      });
    });

    it('should return empty array when no orders exist', async () => {
      (Order.findAll as jest.Mock).mockResolvedValue([]);

      const result = await orderRepository.findAll();

      expect(result).toEqual([]);
    });
  });
});
