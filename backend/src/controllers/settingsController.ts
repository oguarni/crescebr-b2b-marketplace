import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { systemSettingsService } from '../services/systemSettingsService';

/**
 * The commercial terms buyers are quoted with: tax rate, freight table,
 * quotation validity and the default volume discounts. Public, because every
 * one of these values already reaches a buyer inside a quote.
 */
export const getPricingPolicy = asyncHandler(async (_req: Request, res: Response) => {
  const data = await systemSettingsService.getSettings();
  res.status(200).json({ success: true, data });
});
