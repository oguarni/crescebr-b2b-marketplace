import { body } from 'express-validator';

const AVAILABILITY_VALUES = ['in_stock', 'out_of_stock', 'limited', 'custom_order'];

export const productValidation = [
  // Names/descriptions are stored as plain text and escaped by React on render,
  // so we trim but do NOT HTML-escape on input (escaping here corrupts values
  // like "M&M" and double-escapes on edit).
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Product description is required'),
  body('price')
    .isNumeric()
    .withMessage('Price must be a number')
    .custom(value => {
      if (Number(value) <= 0) {
        throw new Error('Price must be greater than 0');
      }
      return true;
    }),
  body('unitPrice')
    .optional()
    .isNumeric()
    .withMessage('Unit price must be a number')
    .custom(value => {
      if (Number(value) < 0) {
        throw new Error('Unit price cannot be negative');
      }
      return true;
    }),
  body('imageUrl')
    .optional({ values: 'falsy' })
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  // Specifications are stored as a JSON object (key/value pairs), not a string.
  body('specifications').optional().isObject().withMessage('Specifications must be an object'),
  // Tier pricing is an optional array of quantity-based discount tiers.
  body('tierPricing').optional().isArray().withMessage('Tier pricing must be an array'),
  body('minimumOrderQuantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum order quantity must be at least 1'),
  body('leadTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Lead time must be a non-negative integer'),
  body('availability')
    .optional()
    .isIn(AVAILABILITY_VALUES)
    .withMessage('Invalid availability value'),
];
