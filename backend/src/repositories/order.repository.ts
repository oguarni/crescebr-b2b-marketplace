import Order from '../models/Order';
import Quotation from '../models/Quotation';
import User from '../models/User';
import OrderStatusHistory from '../models/OrderStatusHistory';

export const orderRepository = {
  findById: (id: string) => Order.findByPk(id),

  findByIdWithRelations: (id: string) =>
    Order.findByPk(id, {
      include: [
        { model: Quotation, as: 'quotation' },
        { model: User, as: 'user', attributes: ['id', 'email', 'companyName'] },
        { model: OrderStatusHistory, as: 'statusHistory' },
      ],
    }),

  findAllForBuyer: (companyId: number) =>
    Order.findAll({
      where: { companyId },
      include: [{ model: Quotation, as: 'quotation' }],
      order: [['createdAt', 'DESC']],
    }),

  findAll: () =>
    Order.findAll({
      include: [
        { model: Quotation, as: 'quotation' },
        { model: User, as: 'user', attributes: ['id', 'email', 'companyName'] },
      ],
      order: [['createdAt', 'DESC']],
    }),
};
