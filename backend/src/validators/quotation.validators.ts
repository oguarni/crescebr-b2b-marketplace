import { body } from 'express-validator';

export const createQuotationValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isInt({ min: 1 }).withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

export const updateQuotationValidation = [
  body('status')
    .isIn(['pending', 'processed', 'completed', 'rejected'])
    .withMessage('Invalid status'),
  body('adminNotes')
    .optional()
    .trim()
    .escape()
    .isString()
    .withMessage('Admin notes must be a string'),
];

export const calculateQuoteValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isInt({ min: 1 }).withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('buyerLocation')
    .optional()
    .trim()
    .escape()
    .isString()
    .withMessage('Buyer location must be a string'),
  body('supplierLocation')
    .optional()
    .trim()
    .escape()
    .isString()
    .withMessage('Supplier location must be a string'),
  body('shippingMethod')
    .optional()
    .isIn(['standard', 'express', 'economy'])
    .withMessage('Invalid shipping method'),
];

export const compareSupplierQuotesValidation = [
  body('productId').isInt({ min: 1 }).withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('buyerLocation')
    .optional()
    .trim()
    .escape()
    .isString()
    .withMessage('Buyer location must be a string'),
  body('supplierIds').optional().isArray().withMessage('Supplier IDs must be an array'),
  body('shippingMethod')
    .optional()
    .isIn(['standard', 'express', 'economy'])
    .withMessage('Invalid shipping method'),
];
