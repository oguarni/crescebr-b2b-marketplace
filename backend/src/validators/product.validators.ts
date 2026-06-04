import { body } from 'express-validator';

const AVAILABILITY_VALUES = ['in_stock', 'out_of_stock', 'limited', 'custom_order'];

// Maximum field lengths bound payload size to mitigate abusive/oversized input.
// These server-side caps are authoritative regardless of the client. Free-text
// fields are not HTML-escaped here (see comment below); React escapes on render.
const MAX = {
  name: 200,
  description: 5000,
  category: 80,
  imageUrl: 2048,
  specKeys: 50, // max number of specification key/value pairs
  specValue: 500, // max length of a single specification value
  tiers: 50, // max number of pricing tiers
} as const;

export const productValidation = [
  // Names/descriptions are stored as plain text and escaped by React on render,
  // so we trim but do NOT HTML-escape on input (escaping here corrupts values
  // like "M&M" and double-escapes on edit).
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: MAX.name })
    .withMessage(`Product name must be at most ${MAX.name} characters`),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Product description is required')
    .isLength({ max: MAX.description })
    .withMessage(`Product description must be at most ${MAX.description} characters`),
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
    .isLength({ max: MAX.imageUrl })
    .withMessage('Image URL is too long')
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ max: MAX.category })
    .withMessage(`Category must be at most ${MAX.category} characters`),
  // Specifications are stored as a JSON object (key/value pairs), not a string.
  // Bound the number of keys and the length of each value so a single product
  // cannot store an unbounded blob (the JSON body limit alone is too coarse).
  body('specifications')
    .optional()
    .isObject()
    .withMessage('Specifications must be an object')
    .custom((value: Record<string, unknown>) => {
      const keys = Object.keys(value);
      if (keys.length > MAX.specKeys) {
        throw new Error(`Specifications cannot have more than ${MAX.specKeys} entries`);
      }
      for (const key of keys) {
        if (String(value[key]).length > MAX.specValue) {
          throw new Error(`Specification "${key}" value is too long`);
        }
      }
      return true;
    }),
  // Tier pricing is an optional array of quantity-based discount tiers.
  body('tierPricing')
    .optional()
    .isArray({ max: MAX.tiers })
    .withMessage(`Tier pricing must be an array of at most ${MAX.tiers} tiers`),
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
