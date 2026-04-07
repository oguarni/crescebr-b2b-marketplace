import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { ratingsService } from '../services/ratingsService';

export const createRating = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
  const supplierId = req.params.supplierId as string;
  const { page = 1, limit = 10 } = req.query;

  const data = await ratingsService.getSupplierRatings(supplierId, Number(page), Number(limit));
  res.status(200).json({ success: true, data });
});

export const updateRating = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const ratingId = req.params.ratingId as string;
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
  const ratingId = req.params.ratingId as string;
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
