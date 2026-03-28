import { Router } from 'express';
import {
  createQuotation,
  getCustomerQuotations,
  getQuotationById,
  getAllQuotations,
  updateQuotation,
  calculateQuote,
  getQuotationCalculations,
  processQuotationWithCalculations,
  getMultipleSupplierQuotes,
} from '../controllers/quotationsController';
import {
  createQuotationValidation,
  updateQuotationValidation,
  calculateQuoteValidation,
  compareSupplierQuotesValidation,
} from '../validators/quotation.validators';
import { handleValidationErrors } from '../middleware/handleValidationErrors';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { quoteRateLimit, generalRateLimit } from '../middleware/rateLimiting';

const router = Router();

// All quotation routes require authentication and general rate limiting
router.use(authenticateJWT, generalRateLimit);

// Customer routes - only customers can create and view their quotations
router.post(
  '/',
  requireRole('customer'),
  createQuotationValidation,
  handleValidationErrors,
  createQuotation
);
router.get('/', requireRole('customer'), getCustomerQuotations);

// Shared routes - customers can view their own, admins can view all
router.get('/:id', getQuotationById);
router.get('/:id/calculations', getQuotationCalculations);

// Quote calculation routes - available to all authenticated users
router.post(
  '/calculate',
  quoteRateLimit,
  calculateQuoteValidation,
  handleValidationErrors,
  calculateQuote
);
router.post(
  '/compare-suppliers',
  quoteRateLimit,
  compareSupplierQuotesValidation,
  handleValidationErrors,
  getMultipleSupplierQuotes
);

// Supplier routes - suppliers can update quotations
router.put(
  '/supplier/:id',
  requireRole('supplier'),
  updateQuotationValidation,
  handleValidationErrors,
  updateQuotation
);

// Admin routes - only admins can access admin endpoints
router.get('/admin/all', requireRole('admin'), getAllQuotations);
router.post('/admin/:id/process', requireRole('admin'), processQuotationWithCalculations);

export default router;
