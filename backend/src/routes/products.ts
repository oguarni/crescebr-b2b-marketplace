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
import { authenticateJWT, isSupplier, isAdmin, canModifyProduct } from '../middleware/auth';
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
router.post('/', authenticateJWT, isSupplier, generalRateLimit, productValidation, createProduct);
router.put(
  '/:id',
  authenticateJWT,
  isSupplier,
  canModifyProduct,
  generalRateLimit,
  productValidation,
  updateProduct
);
router.post('/import/csv', authenticateJWT, isSupplier, uploadRateLimit, importProductsFromCSV);

// Admin-only routes (protected)
router.delete('/:id', authenticateJWT, isAdmin, generalRateLimit, deleteProduct);

export default router;
