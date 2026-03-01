import { body } from 'express-validator';

export const createOrderValidation = [
  body('quotationId').isInt({ min: 1 }).withMessage('Valid quotation ID is required'),
];

/**
 * Validates a Brazilian NF-e Access Key using the Modulo 11 algorithm.
 *
 * The 44th digit is a check digit calculated from the previous 43 digits.
 * Algorithm:
 *   1. Multiply each digit (left-to-right) by a repeating sequence of weights
 *      [2, 3, 4, 5, 6, 7, 8, 9], cycling back to 2 after 9.
 *   2. Sum all products.
 *   3. remainder = sum % 11
 *   4. check digit = remainder < 2 ? 0 : 11 - remainder
 */
export function validateNfeModulo11(key: string): boolean {
  if (!/^\d{44}$/.test(key)) return false;

  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let sum = 0;

  // Use the first 43 digits to compute expected check digit
  for (let i = 0; i < 43; i++) {
    sum += parseInt(key[i], 10) * weights[(42 - i) % 8];
  }

  const remainder = sum % 11;
  const expectedCheckDigit = remainder < 2 ? 0 : 11 - remainder;
  const actualCheckDigit = parseInt(key[43], 10);

  return actualCheckDigit === expectedCheckDigit;
}

/** Reusable chain for nfeAccessKey that includes Modulo 11 validation. */
const nfeAccessKeyChain = (fieldName = 'nfeAccessKey') =>
  body(fieldName)
    .optional({ checkFalsy: true })
    .isString()
    .matches(/^\d{44}$/)
    .withMessage('NF-e access key must be exactly 44 numeric digits')
    .custom((value: string) => {
      if (!validateNfeModulo11(value)) {
        throw new Error('NF-e access key has an invalid Modulo 11 check digit');
      }
      return true;
    });

export const updateOrderStatusValidation = [
  body('status')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
  body('trackingNumber')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Tracking number must be a string'),
  body('estimatedDeliveryDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Invalid date format'),
  body('notes').optional({ checkFalsy: true }).isString().withMessage('Notes must be a string'),
  nfeAccessKeyChain('nfeAccessKey'),
  body('nfeUrl').optional({ checkFalsy: true }).isURL().withMessage('nfeUrl must be a valid URL'),
];

/**
 * Validation for the dedicated PATCH /api/orders/:orderId/nfe endpoint.
 * Both fields are optional (callers may fix only one), but if provided they
 * must pass all format validations including Modulo 11.
 */
export const updateOrderNfeValidation = [
  nfeAccessKeyChain('nfeAccessKey'),
  body('nfeUrl').optional({ checkFalsy: true }).isURL().withMessage('nfeUrl must be a valid URL'),
];
