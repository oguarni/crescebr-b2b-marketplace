import { body } from 'express-validator';

export const productValidation = [
  body('name').trim().escape().notEmpty().withMessage('Product name is required'),
  body('description').trim().escape().notEmpty().withMessage('Product description is required'),
  body('price')
    .isNumeric()
    .withMessage('Price must be a number')
    .custom(value => {
      if (value <= 0) {
        throw new Error('Price must be greater than 0');
      }
      return true;
    }),
  body('imageUrl')
    .optional({ values: 'falsy' })
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  body('category').trim().escape().notEmpty().withMessage('Category is required'),
  body('specifications')
    .optional()
    .isString()
    .withMessage('Specifications must be a string')
    .trim()
    .escape(),
  body('minimumOrderQuantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum order quantity must be at least 1'),
];
