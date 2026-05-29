import { body } from 'express-validator';

// Maximum field lengths mirror frontend/src/utils/inputLimits.ts. They bound
// payload size to mitigate abusive/oversized input, while `.escape()` on
// free-text fields neutralizes HTML/script content as a stored-XSS defense.
// These server-side checks are the authoritative cap regardless of the client.
const MAX = {
  email: 254,
  password: 128,
  companyName: 120,
  corporateName: 120,
  contactPerson: 120,
  contactTitle: 80,
  address: 200,
  street: 120,
  number: 10,
  complement: 80,
  neighborhood: 80,
  city: 80,
  state: 40,
  zipCode: 12,
  phone: 20,
  website: 200,
  industrySector: 80,
} as const;

export const registerValidation = [
  body('email')
    .trim()
    .isLength({ max: MAX.email })
    .withMessage('Email is too long')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6, max: MAX.password })
    .withMessage('Password must be between 6 and 128 characters long'),
  body('cpf')
    .isLength({ min: 11, max: 14 })
    .withMessage('CPF must be between 11 and 14 characters'),
  body('cnpj')
    .isLength({ min: 14, max: 18 })
    .withMessage('CNPJ must be between 14 and 18 characters'),
  body('address')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ max: MAX.address })
    .withMessage('Address is too long'),
  body('companyName')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ max: MAX.companyName })
    .withMessage('Company name is too long'),
  body('corporateName')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Corporate name is required')
    .isLength({ max: MAX.corporateName })
    .withMessage('Corporate name is too long'),
  body('industrySector')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Industry sector is required')
    .isLength({ max: MAX.industrySector })
    .withMessage('Industry sector is too long'),
  body('companyType')
    .isIn(['buyer', 'supplier', 'both'])
    .withMessage('Company type must be buyer, supplier, or both'),
  // Optional free-text fields: trimmed, length-capped, and (where they may be
  // rendered back) HTML-escaped. `checkFalsy` skips empty/undefined values.
  body('contactPerson')
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .isLength({ max: MAX.contactPerson })
    .withMessage('Contact person is too long'),
  body('contactTitle')
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .isLength({ max: MAX.contactTitle })
    .withMessage('Contact title is too long'),
  body('street')
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .isLength({ max: MAX.street })
    .withMessage('Street is too long'),
  body('number')
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .isLength({ max: MAX.number })
    .withMessage('Number is too long'),
  body('complement')
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .isLength({ max: MAX.complement })
    .withMessage('Complement is too long'),
  body('neighborhood')
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .isLength({ max: MAX.neighborhood })
    .withMessage('Neighborhood is too long'),
  body('city')
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .isLength({ max: MAX.city })
    .withMessage('City is too long'),
  body('state')
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .isLength({ max: MAX.state })
    .withMessage('State is too long'),
  body('zipCode')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: MAX.zipCode })
    .withMessage('Postal code is too long'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: MAX.phone })
    .withMessage('Phone is too long'),
  body('website')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: MAX.website })
    .withMessage('Website is too long'),
];

export const loginValidation = [
  body('cnpj').isLength({ min: 14, max: 18 }).withMessage('Please provide a valid CNPJ'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: MAX.password })
    .withMessage('Password is too long'),
];

export const loginEmailValidation = [
  body('email')
    .trim()
    .isLength({ max: MAX.email })
    .withMessage('Email is too long')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: MAX.password })
    .withMessage('Password is too long'),
];

export const supplierRegisterValidation = [
  body('email')
    .trim()
    .isLength({ max: MAX.email })
    .withMessage('Email is too long')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6, max: MAX.password })
    .withMessage('Password must be between 6 and 128 characters long'),
  body('cpf')
    .isLength({ min: 11, max: 14 })
    .withMessage('CPF must be between 11 and 14 characters'),
  body('address')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ max: MAX.address })
    .withMessage('Address is too long'),
  body('companyName')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ max: MAX.companyName })
    .withMessage('Company name is too long'),
  body('cnpj')
    .isLength({ min: 14, max: 18 })
    .withMessage('CNPJ must be between 14 and 18 characters'),
];

export const refreshTokenValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];
