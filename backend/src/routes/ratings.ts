import { Router } from 'express';
import {
  createRating,
  getSupplierRatings,
  updateRating,
  deleteRating,
  getTopSuppliers,
  getBuyerRatings,
} from '../controllers/ratingsController';
import { createRatingValidation, updateRatingValidation } from '../validators/rating.validators';
import { handleValidationErrors } from '../middleware/handleValidationErrors';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { generalRateLimit } from '../middleware/rateLimiting';

const router = Router();

// Public routes
router.get('/top-suppliers', generalRateLimit, getTopSuppliers);
router.get('/supplier/:supplierId', generalRateLimit, getSupplierRatings);

// Protected routes (authenticated users only)
router.post(
  '/',
  authenticateJWT,
  generalRateLimit,
  createRatingValidation,
  handleValidationErrors,
  createRating
);
router.get('/buyer', authenticateJWT, generalRateLimit, getBuyerRatings);
router.put(
  '/:ratingId',
  authenticateJWT,
  requireRole('customer'),
  generalRateLimit,
  updateRatingValidation,
  handleValidationErrors,
  updateRating
);
router.delete(
  '/:ratingId',
  authenticateJWT,
  requireRole('customer', 'admin'),
  generalRateLimit,
  deleteRating
);

export default router;
