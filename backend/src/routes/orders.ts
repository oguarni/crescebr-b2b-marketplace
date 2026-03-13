import { Router } from 'express';
import {
  createOrderFromQuotation,
  getUserOrders,
  updateOrderStatus,
  updateOrderNfe,
  getOrderHistory,
  getAllOrders,
  getOrderStats,
  createOrderValidation,
  updateOrderStatusValidation,
  updateOrderNfeValidation,
} from '../controllers/ordersController';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { generalRateLimit } from '../middleware/rateLimiting';

const router = Router();

router.use(authenticateJWT, generalRateLimit);

// Customer/General routes
router.post('/', createOrderValidation, createOrderFromQuotation);
router.get('/', getUserOrders);
router.get('/:orderId/history', getOrderHistory);

// Admin/Supplier routes
router.put(
  '/:orderId/status',
  requireRole('admin', 'supplier'),
  updateOrderStatusValidation,
  updateOrderStatus
);
router.patch(
  '/:orderId/nfe',
  requireRole('admin', 'supplier'),
  updateOrderNfeValidation,
  updateOrderNfe
);

// Admin only routes
router.get('/admin/all', requireRole('admin'), getAllOrders);
router.get('/admin/stats', requireRole('admin'), getOrderStats);

export default router;
