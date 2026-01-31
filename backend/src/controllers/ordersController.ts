import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/auth';
import Order from '../models/Order';
import Quotation from '../models/Quotation';
import User from '../models/User';
import { asyncHandler } from '../middleware/errorHandler';
import { OrderStatusService } from '../services/orderStatusService';
import { QuoteService } from '../services/quoteService';

export const createOrderValidation = [
  body('quotationId').isInt({ min: 1 }).withMessage('Valid quotation ID is required'),
];

export const createOrderFromQuotation = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { quotationId } = req.body;
    const companyId = req.user?.id!;

    const quotation = await Quotation.findOne({ where: { id: quotationId, companyId } });

    if (!quotation) {
      return res
        .status(404)
        .json({ success: false, error: 'Quotation not found or does not belong to the user' });
    }

    if (quotation.status !== 'processed') {
      return res
        .status(400)
        .json({ success: false, error: 'Only processed quotations can be converted to orders' });
    }

    // Check if quotation has expired
    if (quotation.validUntil) {
      const expirationDate = new Date(quotation.validUntil);
      const now = new Date();
      if (now > expirationDate) {
        return res.status(400).json({
          success: false,
          error: `This quotation expired on ${expirationDate.toLocaleDateString()}. Please request a new quotation.`,
        });
      }
    }

    try {
      const { calculations } = await QuoteService.getQuotationWithCalculations(quotationId);

      const order = await Order.create({
        companyId,
        quotationId,
        totalAmount: calculations.grandTotal,
        status: 'pending',
      });

      // Update quotation status to completed
      await quotation.update({ status: 'completed' });

      const fullOrder = await Order.findByPk(order.id, {
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

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: fullOrder,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      });
    }
  }
);

export const updateOrderStatusValidation = [
  body('status')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
  body('trackingNumber').optional().isString().withMessage('Tracking number must be a string'),
  body('estimatedDeliveryDate').optional().isISO8601().withMessage('Invalid date format'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
];

export const updateOrderStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  const { orderId } = req.params;
  const { status, trackingNumber, estimatedDeliveryDate, notes } = req.body;
  const companyId = req.user?.id!;
  const userRole = req.user?.role;

  if (userRole !== 'admin' && userRole !== 'supplier') {
    return res.status(403).json({
      success: false,
      error: 'Only admins and suppliers can update order status',
    });
  }

  try {
    const updatedOrder = await OrderStatusService.updateOrderStatus(
      orderId,
      {
        status,
        trackingNumber,
        estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : undefined,
        notes,
      },
      companyId
    );

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update order status',
    });
  }
});

export const getUserOrders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.user?.id!;
  const { status, page = 1, limit = 20 } = req.query;

  const filters: any = { companyId };
  if (status) {
    filters.status = status;
  }

  try {
    const result = await OrderStatusService.getOrdersByStatus((status as any) || undefined, {
      companyId,
      limit: parseInt(limit as string),
      offset: (parseInt(page as string) - 1) * parseInt(limit as string),
    });

    res.status(200).json({
      success: true,
      data: result.orders,
      pagination: {
        total: result.total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(result.total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get orders',
    });
  }
});

export const getOrderHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { orderId } = req.params;
  const companyId = req.user?.id!;
  const userRole = req.user?.role;

  try {
    const result = await OrderStatusService.getOrderHistory(orderId);

    if (userRole === 'customer' && result.order.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get order history',
    });
  }
});

export const getAllOrders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userRole = req.user?.role;

  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }

  const { status, startDate, endDate, page = 1, limit = 50 } = req.query;

  try {
    const result = await OrderStatusService.getOrdersByStatus(status as any, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: parseInt(limit as string),
      offset: (parseInt(page as string) - 1) * parseInt(limit as string),
    });

    res.status(200).json({
      success: true,
      data: result.orders,
      pagination: {
        total: result.total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(result.total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get orders',
    });
  }
});

export const getOrderStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userRole = req.user?.role;

  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }

  try {
    const stats = await OrderStatusService.getOrderStatusStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get order stats',
    });
  }
});
