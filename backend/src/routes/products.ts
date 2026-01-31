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

const router = Router();

// Public routes
router.get('/', getAllProducts);
router.get('/categories', getCategories);
router.get('/specifications', getAvailableSpecifications);
router.get('/import/stats', getImportStats);
router.get('/import/sample', generateSampleCSV);
router.get('/:id', getProductById);

// Supplier-only routes (protected)
router.post('/', authenticateJWT, isSupplier, productValidation, createProduct);
router.put('/:id', authenticateJWT, isSupplier, canModifyProduct, productValidation, updateProduct);
router.post('/import/csv', authenticateJWT, isSupplier, importProductsFromCSV);

// Admin-only routes (protected)
router.delete('/:id', authenticateJWT, isAdmin, deleteProduct);

export default router;
