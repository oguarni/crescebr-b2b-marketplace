import { Op } from 'sequelize';
import Order from '../models/Order';
import User from '../models/User';
import Quotation from '../models/Quotation';
import QuotationItem from '../models/QuotationItem';
import Product from '../models/Product';
import { logger } from '../utils/structuredLogger';
import { assertOrderAccess } from './orderAuthorization';

export interface NfeUpdateData {
  nfeAccessKey?: string;
  nfeUrl?: string;
}

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface StatusTransition {
  from: OrderStatus;
  to: OrderStatus;
  requiredFields?: string[];
  businessLogic?: (order: Order, data: OrderStatusUpdate) => Promise<void>;
}

interface OrderStatusUpdate {
  status: OrderStatus;
  trackingNumber?: string;
  estimatedDeliveryDate?: Date;
  notes?: string;
  nfeAccessKey?: string;
  nfeUrl?: string;
}

export class OrderStatusService {
  private static readonly STATUS_TRANSITIONS: StatusTransition[] = [
    { from: 'pending', to: 'processing' },
    { from: 'pending', to: 'cancelled' },
    { from: 'processing', to: 'shipped', requiredFields: ['trackingNumber', 'nfeAccessKey'] },
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

  /**
   * Advance an order along the status machine.
   *
   * @param orderId        Order UUID.
   * @param updateData     Target status plus the fields that transition requires.
   * @param requesterId    `id` of the authenticated principal.
   * @param requesterRole  Role of the authenticated principal ('admin' | 'supplier' | …).
   * @throws Error('Access denied') when the principal is unrelated to the order.
   */
  static async updateOrderStatus(
    orderId: string,
    updateData: OrderStatusUpdate,
    requesterId: number,
    requesterRole: string
  ): Promise<Order> {
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'role', 'companyName'],
        },
        {
          model: Quotation,
          as: 'quotation',
        },
      ],
    });

    if (!order) {
      throw Object.assign(new Error('Order not found'), { statusCode: 404 });
    }

    // The requester used to be ignored entirely (`_companyId`), so the route's
    // `requireRole('admin','supplier')` let ANY supplier drive ANY order's
    // status and write arbitrary tracking / NF-e values onto it.
    await assertOrderAccess(order, requesterId, requesterRole);

    const currentStatus = order.status;
    const newStatus = updateData.status;

    if (!this.isValidTransition(currentStatus, newStatus)) {
      throw Object.assign(
        new Error(
          `Invalid status transition from ${currentStatus} to ${newStatus}. Valid transitions: ${this.getValidNextStatuses(currentStatus).join(', ')}`
        ),
        { statusCode: 400 }
      );
    }

    const requiredTransition = this.STATUS_TRANSITIONS.find(
      t => t.from === currentStatus && t.to === newStatus
    );

    if (requiredTransition?.requiredFields) {
      for (const field of requiredTransition.requiredFields) {
        if (!updateData[field as keyof OrderStatusUpdate]) {
          throw Object.assign(new Error(`${field} is required for this status transition`), {
            statusCode: 400,
          });
        }
      }
    }

    const updateFields: Partial<OrderStatusUpdate> = {
      status: newStatus,
    };

    if (updateData.trackingNumber) {
      updateFields.trackingNumber = updateData.trackingNumber;
    }

    if (updateData.nfeAccessKey) {
      updateFields.nfeAccessKey = updateData.nfeAccessKey;
    }

    if (updateData.nfeUrl) {
      updateFields.nfeUrl = updateData.nfeUrl;
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
          attributes: ['id', 'email', 'role', 'companyName'],
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
          attributes: ['id', 'email', 'role', 'companyName'],
        },
        {
          model: Quotation,
          as: 'quotation',
        },
      ],
    });

    if (!order) {
      throw Object.assign(new Error('Order not found'), { statusCode: 404 });
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
    requesterId: number,
    requesterRole: string
  ): Promise<Order[]> {
    const updatedOrders: Order[] = [];

    for (const orderId of orderIds) {
      try {
        const updatedOrder = await this.updateOrderStatus(
          orderId,
          updateData,
          requesterId,
          requesterRole
        );
        updatedOrders.push(updatedOrder);
      } catch (error) {
        logger.error('Failed to update order status', { error, orderId });
      }
    }

    return updatedOrders;
  }

  static async getOrdersByStatus(
    status: OrderStatus | undefined,
    filters: {
      companyId?: number;
      supplierId?: number;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ orders: Order[]; total: number }> {
    const whereClause: Record<string, unknown> = {};

    if (status) {
      whereClause.status = status;
    }

    if (filters.companyId) {
      whereClause.companyId = filters.companyId;
    }

    // Suppliers do not own orders; they see orders whose quotation contains at
    // least one of their products. Scoped server-side so other suppliers'
    // orders are never leaked to the client.
    if (filters.supplierId) {
      const supplierItems = (await QuotationItem.findAll({
        attributes: ['quotationId'],
        include: [
          {
            model: Product,
            as: 'product',
            attributes: [],
            where: { supplierId: filters.supplierId },
            required: true,
          },
        ],
        raw: true,
      })) as unknown as Array<{ quotationId: number }>;
      const quotationIds = [...new Set(supplierItems.map(item => item.quotationId))];
      whereClause.quotationId = { [Op.in]: quotationIds };
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
          attributes: ['id', 'email', 'role', 'companyName'],
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

    const counts = (statusCounts as unknown as Array<{ status: string; count: string }>).reduce(
      (acc: Record<string, number>, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      },
      {}
    );

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

  /**
   * Corrects the NF-e fields (nfeAccessKey / nfeUrl) on an already-shipped
   * or delivered order.
   *
   * @param orderId   UUID of the target order.
   * @param data      Fields to update — at least one must be present.
   * @param requesterId  `id` of the authenticated user making the request.
   * @param requesterRole  Role of the authenticated user ('admin' | 'supplier' | …).
   */
  static async updateOrderNfe(
    orderId: string,
    data: NfeUpdateData,
    requesterId: number,
    requesterRole: string
  ): Promise<Order> {
    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'role'] },
        { model: Quotation, as: 'quotation' },
      ],
    });

    if (!order) {
      throw Object.assign(new Error('Order not found'), { statusCode: 404 });
    }

    // Only an admin or a supplier that actually supplies this order may correct
    // NF-e data. The previous check compared the supplier's id against
    // `order.companyId`, which is the *buyer* — so it denied every supplier
    // while saying it authorized "the order's own supplier".
    await assertOrderAccess(order, requesterId, requesterRole);

    // NF-e corrections only make sense after the order has been shipped
    const allowedStatuses: string[] = ['shipped', 'delivered'];
    if (!allowedStatuses.includes(order.status)) {
      throw Object.assign(
        new Error(
          `NF-e data can only be updated on orders with status 'shipped' or 'delivered'. Current status: ${order.status}`
        ),
        { statusCode: 400 }
      );
    }

    if (!data.nfeAccessKey && !data.nfeUrl) {
      throw Object.assign(new Error('At least one of nfeAccessKey or nfeUrl must be provided'), {
        statusCode: 400,
      });
    }

    const patch: Partial<NfeUpdateData> = {};
    if (data.nfeAccessKey) patch.nfeAccessKey = data.nfeAccessKey;
    if (data.nfeUrl) patch.nfeUrl = data.nfeUrl;

    await order.update(patch);

    const updatedOrder = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'role'] },
        { model: Quotation, as: 'quotation' },
      ],
    });

    return updatedOrder!;
  }
}
