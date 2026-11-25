import { Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { describeSettingsIssue, validateSystemSettings } from '../services/systemSettingsRules';

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

/** PUT /admin/settings: envelope shape. The document itself is checked below. */
export const updateSystemSettingsValidation = [
  body('version')
    .isInt({ min: 0, max: 2147483647 })
    .withMessage('version must be a non-negative integer')
    .toInt(),
  body('settings').isObject().withMessage('settings must be an object'),
];

/**
 * Applies the settings rules at the boundary and answers in the same shape as
 * `handleValidationErrors`, with one entry per offending field. `path` and
 * `code` let the form point at the exact input, in its own language.
 */
export const systemSettingsRulesValidation = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const result = validateSystemSettings(req.body.settings);
  if (!result.valid) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: result.issues.map(issue => ({
        type: 'field',
        location: 'body',
        path: issue.path,
        code: issue.code,
        params: issue.params,
        msg: describeSettingsIssue(issue),
      })),
    });
    return;
  }
  next();
};
