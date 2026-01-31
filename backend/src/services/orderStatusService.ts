import Order from '../models/Order';
import User from '../models/User';
import Quotation from '../models/Quotation';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface StatusTransition {
  from: OrderStatus;
  to: OrderStatus;
  requiredFields?: string[];
  businessLogic?: (order: Order, data: any) => Promise<void>;
}

interface OrderStatusUpdate {
  status: OrderStatus;
  trackingNumber?: string;
  estimatedDeliveryDate?: Date;
  notes?: string;
}

export class OrderStatusService {
  private static readonly STATUS_TRANSITIONS: StatusTransition[] = [
    { from: 'pending', to: 'processing' },
    { from: 'pending', to: 'cancelled' },
    { from: 'processing', to: 'shipped', requiredFields: ['trackingNumber'] },
    { from: 'processing', to: 'cancelled' },
    { from: 'shipped', to: 'delivered' },
    { from: 'shipped', to: 'cancelled' },
  ];

  private static readonly STATUS_FLOW: { [key in OrderStatus]: OrderStatus[] } = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  };

  static isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
    return this.STATUS_FLOW[from].includes(to);
  }

  static getValidNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
    return this.STATUS_FLOW[currentStatus];
  }

  static getStatusDescription(status: OrderStatus): string {
    const descriptions: { [key in OrderStatus]: string } = {
      pending: 'Order placed, awaiting processing',
      processing: 'Order is being prepared',
      shipped: 'Order has been shipped',
      delivered: 'Order has been delivered',
      cancelled: 'Order has been cancelled',
    };
    return descriptions[status];
  }

  static calculateEstimatedDelivery(
    shippingMethod: 'standard' | 'express' | 'economy' = 'standard',
    shippedDate: Date = new Date()
  ): Date {
    const deliveryDays = {
      standard: 5,
      express: 2,
      economy: 10,
    };

    const estimatedDate = new Date(shippedDate);
    estimatedDate.setDate(estimatedDate.getDate() + deliveryDays[shippingMethod]);

    if (estimatedDate.getDay() === 0) {
      estimatedDate.setDate(estimatedDate.getDate() + 1);
    }
    if (estimatedDate.getDay() === 6) {
      estimatedDate.setDate(estimatedDate.getDate() + 2);
    }

    return estimatedDate;
  }

  static async updateOrderStatus(
    orderId: string,
    updateData: OrderStatusUpdate,
    _companyId: number
  ): Promise<Order> {
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'role'],
        },
        {
          model: Quotation,
          as: 'quotation',
        },
      ],
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const currentStatus = order.status;
    const newStatus = updateData.status;

    if (!this.isValidTransition(currentStatus, newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Valid transitions: ${this.getValidNextStatuses(currentStatus).join(', ')}`
      );
    }

    const requiredTransition = this.STATUS_TRANSITIONS.find(
      t => t.from === currentStatus && t.to === newStatus
    );

    if (requiredTransition?.requiredFields) {
      for (const field of requiredTransition.requiredFields) {
        if (!updateData[field as keyof OrderStatusUpdate]) {
          throw new Error(`${field} is required for this status transition`);
        }
      }
    }

    const updateFields: Partial<OrderStatusUpdate> = {
      status: newStatus,
    };

    if (updateData.trackingNumber) {
      updateFields.trackingNumber = updateData.trackingNumber;
    }

    if (updateData.estimatedDeliveryDate) {
      updateFields.estimatedDeliveryDate = updateData.estimatedDeliveryDate;
    } else if (newStatus === 'shipped') {
      updateFields.estimatedDeliveryDate = this.calculateEstimatedDelivery();
    }

    await order.update(updateFields);

    if (requiredTransition?.businessLogic) {
      await requiredTransition.businessLogic(order, updateData);
    }

    const updatedOrder = await Order.findByPk(orderId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'role'],
        },
        {
          model: Quotation,
          as: 'quotation',
        },
      ],
    });

    return updatedOrder!;
  }

  static async getOrderHistory(orderId: string): Promise<{
    order: Order;
    timeline: Array<{
      status: OrderStatus;
      description: string;
      date: Date;
      canTransitionTo: OrderStatus[];
    }>;
  }> {
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'role'],
        },
        {
          model: Quotation,
          as: 'quotation',
        },
      ],
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const timeline = [
      {
        status: 'pending' as OrderStatus,
        description: this.getStatusDescription('pending'),
        date: order.createdAt,
        canTransitionTo: this.getValidNextStatuses('pending'),
      },
    ];

    if (order.status !== 'pending') {
      timeline.push({
        status: order.status,
        description: this.getStatusDescription(order.status),
        date: order.updatedAt,
        canTransitionTo: this.getValidNextStatuses(order.status),
      });
    }

    return {
      order,
      timeline,
    };
  }

  static async bulkUpdateOrderStatus(
    orderIds: string[],
    updateData: OrderStatusUpdate,
    companyId: number
  ): Promise<Order[]> {
    const updatedOrders: Order[] = [];

    for (const orderId of orderIds) {
      try {
        const updatedOrder = await this.updateOrderStatus(orderId, updateData, companyId);
        updatedOrders.push(updatedOrder);
      } catch (error) {
        console.error(`Failed to update order ${orderId}:`, error);
      }
    }

    return updatedOrders;
  }

  static async getOrdersByStatus(
    status: OrderStatus,
    filters: {
      companyId?: number;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ orders: Order[]; total: number }> {
    const whereClause: any = { status };

    if (filters.companyId) {
      whereClause.companyId = filters.companyId;
    }

    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = {
        [require('sequelize').Op.between]: [filters.startDate, filters.endDate],
      };
    }

    const { count, rows } = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'role'],
        },
        {
          model: Quotation,
          as: 'quotation',
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });

    return {
      orders: rows,
      total: count,
    };
  }

  static async getOrderStatusStats(): Promise<{
    statusCounts: { [key in OrderStatus]: number };
    totalOrders: number;
    averageProcessingTime: number;
  }> {
    const statusCounts = await Order.findAll({
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('status')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    const counts = statusCounts.reduce((acc: any, item: any) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {});

    const totalOrders = (Object.values(counts) as number[]).reduce(
      (sum: number, count: number) => sum + count,
      0
    );

    const completedOrders = await Order.findAll({
      where: { status: 'delivered' },
      attributes: ['createdAt', 'updatedAt'],
      raw: true,
    });

    const averageProcessingTime =
      completedOrders.length > 0
        ? completedOrders.reduce((sum, order) => {
          const processingTime =
            new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime();
          return sum + processingTime;
        }, 0) /
        completedOrders.length /
        (1000 * 60 * 60 * 24)
        : 0;

    return {
      statusCounts: {
        pending: counts.pending || 0,
        processing: counts.processing || 0,
        shipped: counts.shipped || 0,
        delivered: counts.delivered || 0,
        cancelled: counts.cancelled || 0,
      },
      totalOrders,
      averageProcessingTime,
    };
  }
}
