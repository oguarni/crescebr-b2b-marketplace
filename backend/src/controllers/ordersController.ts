import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { OrderStatusService } from '../services/orderStatusService';
import { orderService } from '../services/orderService';

export const createOrderFromQuotation = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { quotationId } = req.body;
    const companyId = req.user?.id!;

    try {
      const order = await orderService.createFromQuotation(quotationId, companyId);
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create order';
      const status = message.includes('not found') ? 404 : 400;
      res.status(status).json({ success: false, error: message });
    }
  }
);

export const updateOrderStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { orderId } = req.params;
  const { status, trackingNumber, estimatedDeliveryDate, notes, nfeAccessKey, nfeUrl } = req.body;
  const companyId = req.user?.id!;

  try {
    const updatedOrder = await OrderStatusService.updateOrderStatus(
      orderId,
      {
        status,
        trackingNumber,
        estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : undefined,
        notes,
        nfeAccessKey,
        nfeUrl,
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

  try {
    const result = await OrderStatusService.getOrdersByStatus((status as any) || undefined, {
      companyId,
      limit: parseInt(limit as string),
      offset: (parseInt(page as string) - 1) * parseInt(limit as string),
    });

    res.status(200).json({
      success: true,
      data: {
        orders: result.orders,
        pagination: {
          total: result.total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string)),
        },
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
  const userRole = req.user?.role!;

  try {
    const result = await orderService.getHistory(orderId, companyId, userRole);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get order history';
    const status = message === 'Access denied' ? 403 : 400;
    res.status(status).json({ success: false, error: message });
  }
});

export const getAllOrders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status, startDate, endDate, page = 1, limit = 50 } = req.query;

  try {
    const result = await OrderStatusService.getOrdersByStatus((status as any) || undefined, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: parseInt(limit as string),
      offset: (parseInt(page as string) - 1) * parseInt(limit as string),
    });

    res.status(200).json({
      success: true,
      data: {
        orders: result.orders,
        pagination: {
          total: result.total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string)),
        },
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

export const updateOrderNfe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { orderId } = req.params;
  const { nfeAccessKey, nfeUrl } = req.body;
  const requesterId = req.user?.id!;
  const requesterRole = req.user?.role!;

  try {
    const updatedOrder = await OrderStatusService.updateOrderNfe(
      orderId,
      { nfeAccessKey, nfeUrl },
      requesterId,
      requesterRole
    );

    res.status(200).json({
      success: true,
      message: 'NF-e data updated successfully',
      data: updatedOrder,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update NF-e data';
    const status = message.includes('Access denied')
      ? 403
      : message.includes('not found')
        ? 404
        : 400;
    res.status(status).json({ success: false, error: message });
  }
});
