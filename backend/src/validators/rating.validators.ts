import { body, param } from 'express-validator';

export const ratingIdValidation = [
  param('ratingId').isInt({ min: 1, max: 2147483647 }).withMessage('Valid rating ID is required'),
];

export const createRatingValidation = [
  body('supplierId')
    .isInt({ min: 1, max: 2147483647 })
    .withMessage('Valid supplier ID is required'),
  body('orderId').optional().isUUID().withMessage('Valid order ID is required'),
  body('score').isInt({ min: 1, max: 5 }).withMessage('Score must be between 1 and 5'),
  body('comment')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
];

export const updateRatingValidation = [
  body('score').optional().isInt({ min: 1, max: 5 }).withMessage('Score must be between 1 and 5'),
  body('comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comment must be at most 500 characters'),
];
