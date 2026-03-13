import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { ratingsService } from '../services/ratingsService';

export const createRatingValidation = [
  body('supplierId').isInt({ min: 1 }).withMessage('Valid supplier ID is required'),
  body('orderId')
    .optional()
    .isString()
    .isLength({ min: 1 })
    .withMessage('Order ID must be a valid string'),
  body('score').isInt({ min: 1, max: 5 }).withMessage('Score must be between 1 and 5'),
  body('comment')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
];

export const createRating = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  const { supplierId, orderId, score, comment } = req.body;
  const buyerId = req.user?.id!;

  try {
    const rating = await ratingsService.createRating(buyerId, {
      supplierId,
      orderId,
      score,
      comment,
    });
    res.status(201).json({ success: true, message: 'Rating created successfully', data: rating });
  } catch (error: any) {
    const status = error.statusCode || 400;
    res.status(status).json({ success: false, error: error.message || 'Failed to create rating' });
  }
});

export const getSupplierRatings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { supplierId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const data = await ratingsService.getSupplierRatings(supplierId, Number(page), Number(limit));
  res.status(200).json({ success: true, data });
});

export const updateRating = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { ratingId } = req.params;
  const { score, comment } = req.body;
  const buyerId = req.user?.id!;

  try {
    const rating = await ratingsService.updateRating(ratingId, buyerId, { score, comment });
    res.status(200).json({ success: true, message: 'Rating updated successfully', data: rating });
  } catch (error: any) {
    const status = error.statusCode || 400;
    res.status(status).json({ success: false, error: error.message || 'Failed to update rating' });
  }
});

export const deleteRating = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { ratingId } = req.params;
  const buyerId = req.user?.id!;
  const userRole = req.user?.role!;

  try {
    await ratingsService.deleteRating(ratingId, buyerId, userRole);
    res.status(200).json({ success: true, message: 'Rating deleted successfully' });
  } catch (error: any) {
    const status = error.statusCode || 400;
    res.status(status).json({ success: false, error: error.message || 'Failed to delete rating' });
  }
});

export const getTopSuppliers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { limit = 10 } = req.query;
  const suppliers = await ratingsService.getTopSuppliers(Number(limit));
  res.status(200).json({ success: true, data: suppliers });
});

export const getBuyerRatings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const buyerId = req.user?.id!;
  const { page = 1, limit = 10 } = req.query;

  const data = await ratingsService.getBuyerRatings(buyerId, Number(page), Number(limit));
  res.status(200).json({ success: true, data });
});
