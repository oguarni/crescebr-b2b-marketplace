import { Router } from 'express';
import {
  createOrderFromQuotation,
  getUserOrders,
  updateOrderStatus,
  updateOrderNfe,
  getOrderHistory,
  getAllOrders,
  getOrderStats,
} from '../controllers/ordersController';
import {
  createOrderValidation,
  updateOrderStatusValidation,
  updateOrderNfeValidation,
} from '../validators/order.validators';
import { handleValidationErrors } from '../middleware/handleValidationErrors';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { generalRateLimit } from '../middleware/rateLimiting';

const router = Router();

router.use(authenticateJWT, generalRateLimit);

// Customer/General routes
router.post('/', createOrderValidation, handleValidationErrors, createOrderFromQuotation);
router.get('/', getUserOrders);
router.get('/:orderId/history', getOrderHistory);

// Admin/Supplier routes
router.put(
  '/:orderId/status',
  requireRole('admin', 'supplier'),
  updateOrderStatusValidation,
  handleValidationErrors,
  updateOrderStatus
);
router.patch(
  '/:orderId/nfe',
  requireRole('admin', 'supplier'),
  updateOrderNfeValidation,
  handleValidationErrors,
  updateOrderNfe
);

// Admin only routes
router.get('/admin/all', requireRole('admin'), getAllOrders);
router.get('/admin/stats', requireRole('admin'), getOrderStats);

export default router;
