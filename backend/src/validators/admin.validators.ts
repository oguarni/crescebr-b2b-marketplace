import { body, param } from 'express-validator';

/** PUT /admin/companies/:userId/verify */
export const verifyCompanyValidation = [
  param('userId').notEmpty().withMessage('User ID is required'),
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be "approved" or "rejected"'),
  body('reason')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Reason must be a string')
    .trim()
    .escape()
    .isLength({ max: 1000 })
    .withMessage('Reason must be at most 1000 characters'),
  body('validateCNPJ').optional().isBoolean().withMessage('validateCNPJ must be a boolean'),
];

/** PUT /admin/companies/:userId/status */
export const updateCompanyStatusValidation = [
  param('userId').notEmpty().withMessage('User ID is required'),
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be "approved" or "rejected"'),
  body('reason')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Reason must be a string')
    .trim()
    .escape()
    .isLength({ max: 1000 })
    .withMessage('Reason must be at most 1000 characters'),
];

/** PUT /admin/products/:productId/moderate */
export const moderateProductValidation = [
  param('productId').notEmpty().withMessage('Product ID is required'),
  body('action')
    .isIn(['approve', 'reject', 'remove'])
    .withMessage('Action must be "approve", "reject", or "remove"'),
];
