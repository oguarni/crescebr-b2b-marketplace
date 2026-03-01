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
import { authenticateJWT, isAdmin } from '../middleware/auth';
import { generalRateLimit } from '../middleware/rateLimiting';

const router = Router();

router.use(authenticateJWT, generalRateLimit);

// Customer/General routes
router.post('/', createOrderValidation, createOrderFromQuotation);
router.get('/', getUserOrders);
router.get('/:orderId/history', getOrderHistory);

// Admin/Supplier routes
router.put('/:orderId/status', updateOrderStatusValidation, updateOrderStatus);
router.patch('/:orderId/nfe', updateOrderNfeValidation, updateOrderNfe);

// Admin only routes
router.get('/admin/all', isAdmin, getAllOrders);
router.get('/admin/stats', isAdmin, getOrderStats);

export default router;
