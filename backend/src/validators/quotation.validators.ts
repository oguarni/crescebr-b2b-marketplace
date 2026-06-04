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
    .isString()
    .withMessage('Admin notes must be a string')
    .trim()
    .escape()
    .isLength({ max: 2000 })
    .withMessage('Admin notes must be at most 2000 characters'),
];

export const calculateQuoteValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isInt({ min: 1 }).withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('buyerLocation')
    .optional()
    .isString()
    .withMessage('Buyer location must be a string')
    .trim()
    .escape()
    .isLength({ max: 120 })
    .withMessage('Buyer location is too long'),
  body('supplierLocation')
    .optional()
    .isString()
    .withMessage('Supplier location must be a string')
    .trim()
    .escape()
    .isLength({ max: 120 })
    .withMessage('Supplier location is too long'),
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
    .isString()
    .withMessage('Buyer location must be a string')
    .trim()
    .escape()
    .isLength({ max: 120 })
    .withMessage('Buyer location is too long'),
  body('supplierIds').optional().isArray().withMessage('Supplier IDs must be an array'),
  body('shippingMethod')
    .optional()
    .isIn(['standard', 'express', 'economy'])
    .withMessage('Invalid shipping method'),
];
