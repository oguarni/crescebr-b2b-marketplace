import { Router } from 'express';
import {
  createQuotation,
  getCustomerQuotations,
  getSupplierQuotations,
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

// Buyer routes - any authenticated company can act as a buyer (request and
// view its own quotations). Results are scoped to the caller's company id in
// the service layer, so suppliers only ever see the quotations they requested.
router.post('/', createQuotationValidation, handleValidationErrors, createQuotation);
router.get('/', getCustomerQuotations);

// Supplier routes - suppliers can view quotations that include their products.
// Declared before '/:id' so the literal path is not captured as an id param.
router.get('/supplier', requireRole('supplier', 'admin'), getSupplierQuotations);

// Shared routes - customers can view their own, suppliers their related ones,
// admins can view all (ownership scoping enforced in the service layer)
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
