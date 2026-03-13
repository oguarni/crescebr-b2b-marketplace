import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getAvailableSpecifications,
  importProductsFromCSV,
  generateSampleCSV,
  getImportStats,
  productValidation,
} from '../controllers/productsController';
import { authenticateJWT, canModifyProduct } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { searchRateLimit, generalRateLimit, uploadRateLimit } from '../middleware/rateLimiting';

const router = Router();

// Public routes
router.get('/', searchRateLimit, getAllProducts);
router.get('/categories', searchRateLimit, getCategories);
router.get('/specifications', searchRateLimit, getAvailableSpecifications);
router.get('/import/stats', getImportStats);
router.get('/import/sample', generateSampleCSV);
router.get('/:id', searchRateLimit, getProductById);

// Supplier-only routes (protected)
router.post(
  '/',
  authenticateJWT,
  requireRole('supplier'),
  generalRateLimit,
  productValidation,
  createProduct
);
router.put(
  '/:id',
  authenticateJWT,
  requireRole('supplier'),
  canModifyProduct,
  generalRateLimit,
  productValidation,
  updateProduct
);
router.post(
  '/import/csv',
  authenticateJWT,
  requireRole('supplier'),
  uploadRateLimit,
  importProductsFromCSV
);

// Admin-only routes (protected)
router.delete('/:id', authenticateJWT, requireRole('admin'), generalRateLimit, deleteProduct);

export default router;
