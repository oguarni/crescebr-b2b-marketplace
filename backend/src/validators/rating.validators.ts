import { body } from 'express-validator';

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
