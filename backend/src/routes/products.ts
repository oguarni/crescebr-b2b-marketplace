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
} from '../controllers/productsController';
import { productValidation, productIdValidation } from '../validators/product.validators';
import { handleValidationErrors } from '../middleware/handleValidationErrors';
import { authenticateJWT, canModifyProduct, isApprovedSupplier } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { searchRateLimit, generalRateLimit, uploadRateLimit } from '../middleware/rateLimiting';

const router = Router();

// Public routes
router.get('/', searchRateLimit, getAllProducts);
router.get('/categories', searchRateLimit, getCategories);
router.get('/specifications', searchRateLimit, getAvailableSpecifications);
router.get(
  '/import/stats',
  authenticateJWT,
  requireRole('supplier', 'admin'),
  generalRateLimit,
  getImportStats
);
router.get(
  '/import/sample',
  authenticateJWT,
  requireRole('supplier', 'admin'),
  generalRateLimit,
  generateSampleCSV
);
router.get('/:id', searchRateLimit, getProductById);

// Supplier-only routes (protected).
// `isApprovedSupplier` is required in addition to the role: the RBAC model
// grants MANAGE_OWN_PRODUCTS only to suppliers with `status: 'approved'`, and
// `requireRole` never reads status — so a pending or rejected supplier could
// publish and bulk-import catalogue entries while awaiting verification.
router.post(
  '/',
  authenticateJWT,
  requireRole('supplier'),
  isApprovedSupplier,
  generalRateLimit,
  productValidation,
  handleValidationErrors,
  createProduct
);
router.put(
  '/:id',
  authenticateJWT,
  requireRole('supplier'),
  isApprovedSupplier,
  productIdValidation,
  handleValidationErrors,
  canModifyProduct,
  generalRateLimit,
  productValidation,
  handleValidationErrors,
  updateProduct
);
router.post(
  '/import/csv',
  authenticateJWT,
  requireRole('supplier'),
  isApprovedSupplier,
  uploadRateLimit,
  importProductsFromCSV
);

// Admin-only routes (protected)
router.delete(
  '/:id',
  authenticateJWT,
  requireRole('admin'),
  generalRateLimit,
  productIdValidation,
  handleValidationErrors,
  deleteProduct
);

export default router;
