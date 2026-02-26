import { Router } from 'express';
import {
  createQuotation,
  getCustomerQuotations,
  getQuotationById,
  getAllQuotations,
  updateQuotation,
  createQuotationValidation,
  updateQuotationValidation,
  calculateQuote,
  calculateQuoteValidation,
  getQuotationCalculations,
  processQuotationWithCalculations,
  getMultipleSupplierQuotes,
  getMultipleSupplierQuotesValidation,
} from '../controllers/quotationsController';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { quoteRateLimit, generalRateLimit } from '../middleware/rateLimiting';

const router = Router();

// All quotation routes require authentication and general rate limiting
router.use(authenticateJWT, generalRateLimit);

// Customer routes - only customers can create and view their quotations
router.post('/', requireRole('customer'), createQuotationValidation, createQuotation);
router.get('/', requireRole('customer'), getCustomerQuotations);

// Shared routes - customers can view their own, admins can view all
router.get('/:id', getQuotationById);
router.get('/:id/calculations', getQuotationCalculations);

// Quote calculation routes - available to all authenticated users
router.post('/calculate', quoteRateLimit, calculateQuoteValidation, calculateQuote);
router.post(
  '/compare-suppliers',
  quoteRateLimit,
  getMultipleSupplierQuotesValidation,
  getMultipleSupplierQuotes
);

// Supplier routes - suppliers can update quotations
router.put('/supplier/:id', requireRole('supplier'), updateQuotationValidation, updateQuotation);

// Admin routes - only admins can access admin endpoints
router.get('/admin/all', requireRole('admin'), getAllQuotations);
router.post('/admin/:id/process', requireRole('admin'), processQuotationWithCalculations);

export default router;
