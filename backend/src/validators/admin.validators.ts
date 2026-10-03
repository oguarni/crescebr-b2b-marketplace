import { body, param } from 'express-validator';

export const companyIdValidation = [
  param('userId').isInt({ min: 1, max: 2147483647 }).withMessage('Valid user ID is required'),
];

/** PUT /admin/companies/:userId/verify */
export const verifyCompanyValidation = [
  ...companyIdValidation,
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
  ...companyIdValidation,
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
  param('productId').isInt({ min: 1, max: 2147483647 }).withMessage('Valid product ID is required'),
  body('action')
    .isIn(['approve', 'reject', 'remove'])
    .withMessage('Action must be "approve", "reject", or "remove"'),
];
