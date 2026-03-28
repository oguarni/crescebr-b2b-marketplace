import { body } from 'express-validator';

export const registerValidation = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('cpf')
    .isLength({ min: 11, max: 14 })
    .withMessage('CPF must be between 11 and 14 characters'),
  body('address').trim().escape().notEmpty().withMessage('Address is required'),
  body('companyName').trim().escape().notEmpty().withMessage('Company name is required'),
  body('corporateName').trim().escape().notEmpty().withMessage('Corporate name is required'),
  body('cnpj')
    .isLength({ min: 14, max: 18 })
    .withMessage('CNPJ must be between 14 and 18 characters'),
  body('industrySector').trim().escape().notEmpty().withMessage('Industry sector is required'),
  body('companyType')
    .isIn(['buyer', 'supplier', 'both'])
    .withMessage('Company type must be buyer, supplier, or both'),
];

export const loginValidation = [
  body('cnpj').isLength({ min: 14, max: 18 }).withMessage('Please provide a valid CNPJ'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const loginEmailValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const supplierRegisterValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('cpf')
    .isLength({ min: 11, max: 14 })
    .withMessage('CPF must be between 11 and 14 characters'),
  body('address').trim().escape().notEmpty().withMessage('Address is required'),
  body('companyName').trim().escape().notEmpty().withMessage('Company name is required'),
  body('cnpj')
    .isLength({ min: 14, max: 18 })
    .withMessage('CNPJ must be between 14 and 18 characters'),
];

export const refreshTokenValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];
