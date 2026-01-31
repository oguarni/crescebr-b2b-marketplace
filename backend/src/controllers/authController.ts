import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import {
  generateToken,
  generateTokenPair,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from '../utils/jwt';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { RegisterRequest, LoginRequest, AuthResponse as _AuthResponse } from '../types';
import { CNPJService } from '../services/cnpjService';

export const registerValidation = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('cpf')
    .isLength({ min: 11, max: 14 })
    .withMessage('CPF must be between 11 and 14 characters'),
  body('address').notEmpty().withMessage('Address is required'),
  body('companyName').notEmpty().withMessage('Company name is required'),
  body('corporateName').notEmpty().withMessage('Corporate name is required'),
  body('cnpj')
    .isLength({ min: 14, max: 18 })
    .withMessage('CNPJ must be between 14 and 18 characters'),
  body('industrySector').notEmpty().withMessage('Industry sector is required'),
  body('companyType')
    .isIn(['buyer', 'supplier', 'both'])
    .withMessage('Company type must be buyer, supplier, or both'),
];

export const loginValidation = [
  body('cnpj').isLength({ min: 14, max: 18 }).withMessage('Please provide a valid CNPJ'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const loginEmailValidation = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const supplierRegisterValidation = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('cpf')
    .isLength({ min: 11, max: 14 })
    .withMessage('CPF must be between 11 and 14 characters'),
  body('address').notEmpty().withMessage('Address is required'),
  body('companyName').notEmpty().withMessage('Company name is required'),
  body('cnpj')
    .isLength({ min: 14, max: 18 })
    .withMessage('CNPJ must be between 14 and 18 characters'),
];

export const register = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  const {
    email,
    password,
    cpf,
    address,
    companyName,
    corporateName,
    cnpj,
    industrySector,
    companyType,
  }: RegisterRequest = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    where: {
      email,
    },
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: 'User with this email already exists',
    });
  }

  // Check if CPF already exists
  const existingCpf = await User.findOne({
    where: {
      cpf,
    },
  });

  if (existingCpf) {
    return res.status(400).json({
      success: false,
      error: 'User with this CPF already exists',
    });
  }

  // Check if CNPJ already exists
  const existingCnpj = await User.findOne({
    where: {
      cnpj,
    },
  });

  if (existingCnpj) {
    return res.status(400).json({
      success: false,
      error: 'Company with this CNPJ already exists',
    });
  }

  // Validate CNPJ
  const cnpjValidation = await CNPJService.validateCNPJWithAPI(cnpj);
  if (!cnpjValidation.valid) {
    return res.status(400).json({
      success: false,
      error: cnpjValidation.error || 'Invalid CNPJ provided',
    });
  }

  // Create new user
  const user = await User.create({
    email,
    password,
    cpf,
    address: cnpjValidation.address || address,
    companyName: cnpjValidation.companyName || companyName,
    corporateName: cnpjValidation.companyName || corporateName,
    cnpj: CNPJService.formatCNPJ(cnpj),
    industrySector,
    companyType,
    role: companyType === 'supplier' ? 'supplier' : 'customer',
    status: companyType === 'supplier' ? 'pending' : 'approved',
  });

  // Generate token pair
  const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
  const tokens = generateTokenPair(
    {
      id: user.id,
      email: user.email,
      cnpj: user.cnpj,
      role: user.role,
      companyType: user.companyType,
    },
    deviceInfo
  );

  const response = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    tokenType: 'Bearer',
    user: {
      id: user.id,
      email: user.email,
      cpf: user.cpf,
      address: user.address,
      street: user.street,
      number: user.number,
      complement: user.complement,
      neighborhood: user.neighborhood,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      country: user.country,
      phone: user.phone,
      contactPerson: user.contactPerson,
      contactTitle: user.contactTitle,
      companySize: user.companySize,
      annualRevenue: user.annualRevenue,
      certifications: user.certifications,
      website: user.website,
      role: user.role,
      status: user.status,
      companyName: user.companyName,
      corporateName: user.corporateName,
      cnpj: user.cnpj,
      cnpjValidated: user.cnpjValidated,
      industrySector: user.industrySector,
      companyType: user.companyType,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };

  res.status(201).json({
    success: true,
    message: 'Company registered successfully',
    data: response,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  const { cnpj, password }: LoginRequest = req.body;

  // Find user by CNPJ
  const user = await User.findOne({
    where: {
      cnpj,
    },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid CNPJ or password',
    });
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid CNPJ or password',
    });
  }

  // Generate token pair
  const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
  const tokens = generateTokenPair(
    {
      id: user.id,
      email: user.email,
      cnpj: user.cnpj,
      role: user.role,
      companyType: user.companyType,
    },
    deviceInfo
  );

  const response = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    tokenType: 'Bearer',
    user: {
      id: user.id,
      email: user.email,
      cpf: user.cpf,
      address: user.address,
      street: user.street,
      number: user.number,
      complement: user.complement,
      neighborhood: user.neighborhood,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      country: user.country,
      phone: user.phone,
      contactPerson: user.contactPerson,
      contactTitle: user.contactTitle,
      companySize: user.companySize,
      annualRevenue: user.annualRevenue,
      certifications: user.certifications,
      website: user.website,
      role: user.role,
      status: user.status,
      companyName: user.companyName,
      corporateName: user.corporateName,
      cnpj: user.cnpj,
      cnpjValidated: user.cnpjValidated,
      industrySector: user.industrySector,
      companyType: user.companyType,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: response,
  });
});

export const loginWithEmail = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({
    where: {
      email,
    },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password',
    });
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password',
    });
  }

  // Generate token pair
  const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
  const tokens = generateTokenPair(
    {
      id: user.id,
      email: user.email,
      cnpj: user.cnpj,
      role: user.role,
      companyType: user.companyType,
    },
    deviceInfo
  );

  const response = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    tokenType: 'Bearer',
    user: {
      id: user.id,
      email: user.email,
      cpf: user.cpf,
      address: user.address,
      street: user.street,
      number: user.number,
      complement: user.complement,
      neighborhood: user.neighborhood,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      country: user.country,
      phone: user.phone,
      contactPerson: user.contactPerson,
      contactTitle: user.contactTitle,
      companySize: user.companySize,
      annualRevenue: user.annualRevenue,
      certifications: user.certifications,
      website: user.website,
      role: user.role,
      status: user.status,
      companyName: user.companyName,
      corporateName: user.corporateName,
      cnpj: user.cnpj,
      cnpjValidated: user.cnpjValidated,
      industrySector: user.industrySector,
      companyType: user.companyType,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };

  res.status(200).json({
    success: true,
    message: 'Email login successful',
    data: response,
  });
});

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  // Find user by ID from token
  const user = await User.findByPk(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Profile retrieved successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        cpf: user.cpf,
        address: user.address,
        role: user.role,
        status: user.status,
        companyName: user.companyName,
        corporateName: user.corporateName,
        cnpj: user.cnpj,
        cnpjValidated: user.cnpjValidated,
        industrySector: user.industrySector,
        companyType: user.companyType,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    },
  });
});

export const registerSupplier = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  const { email, password, cpf, address, companyName, corporateName, cnpj, industrySector } =
    req.body;

  const existingUser = await User.findOne({
    where: {
      email,
    },
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: 'User with this email already exists',
    });
  }

  const existingCpf = await User.findOne({
    where: {
      cpf,
    },
  });

  if (existingCpf) {
    return res.status(400).json({
      success: false,
      error: 'User with this CPF already exists',
    });
  }

  const existingCnpj = await User.findOne({
    where: {
      cnpj,
    },
  });

  if (existingCnpj) {
    return res.status(400).json({
      success: false,
      error: 'Company with this CNPJ already exists',
    });
  }

  const cnpjValidation = await CNPJService.validateCNPJWithAPI(cnpj);
  if (!cnpjValidation.valid) {
    return res.status(400).json({
      success: false,
      error: cnpjValidation.error || 'Invalid CNPJ provided',
    });
  }

  const user = await User.create({
    email,
    password,
    cpf,
    address: cnpjValidation.address || address,
    companyName: cnpjValidation.companyName || companyName,
    corporateName: cnpjValidation.companyName || corporateName,
    cnpj: CNPJService.formatCNPJ(cnpj),
    industrySector: industrySector || 'other',
    companyType: 'supplier',
    role: 'supplier',
    status: 'pending',
  });

  const token = generateToken({
    id: user.id,
    email: user.email,
    cnpj: user.cnpj,
    role: user.role,
    companyType: user.companyType,
  });

  const response = {
    accessToken: token,
    refreshToken: token,
    expiresIn: '24h',
    tokenType: 'Bearer',
    user: {
      id: user.id,
      email: user.email,
      cpf: user.cpf,
      address: user.address,
      street: user.street,
      number: user.number,
      complement: user.complement,
      neighborhood: user.neighborhood,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      country: user.country,
      phone: user.phone,
      contactPerson: user.contactPerson,
      contactTitle: user.contactTitle,
      companySize: user.companySize,
      annualRevenue: user.annualRevenue,
      certifications: user.certifications,
      website: user.website,
      role: user.role,
      status: user.status,
      companyName: user.companyName,
      corporateName: user.corporateName,
      cnpj: user.cnpj,
      cnpjValidated: user.cnpjValidated,
      industrySector: user.industrySector,
      companyType: user.companyType,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };

  res.status(201).json({
    success: true,
    message: 'Supplier registered successfully. Account pending approval.',
    data: response,
    cnpjValidation: {
      companyName: cnpjValidation.companyName,
      fantasyName: cnpjValidation.fantasyName,
      city: cnpjValidation.city,
      state: cnpjValidation.state,
    },
  });
});

// Refresh token validation
export const refreshTokenValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

// Refresh access token
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  const { refreshToken: token } = req.body;
  const deviceInfo = req.headers['user-agent'] || 'Unknown Device';

  try {
    // Find user associated with this refresh token
    const { verifyRefreshToken } = await import('../utils/jwt');
    const verification = verifyRefreshToken(token);

    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        error: verification.error || 'Invalid refresh token',
      });
    }

    // Get updated user data
    const user = await User.findByPk(verification.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Generate new token pair
    const newTokens = refreshAccessToken(
      token,
      {
        id: user.id,
        email: user.email,
        cnpj: user.cnpj,
        role: user.role,
        companyType: user.companyType,
      },
      deviceInfo
    );

    if (!newTokens) {
      return res.status(401).json({
        success: false,
        error: 'Unable to refresh token',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresIn: newTokens.expiresIn,
        tokenType: 'Bearer',
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
    });
  }
});

// Logout (revoke refresh token)
export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { refreshToken: token } = req.body;

  try {
    if (token) {
      revokeRefreshToken(token);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error during logout',
    });
  }
});

// Logout from all devices (revoke all user tokens)
export const logoutAllDevices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const revokedCount = revokeAllUserTokens(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Logged out from all devices successfully',
      data: {
        revokedTokens: revokedCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error during logout',
    });
  }
});

// Get active sessions (for security management)
export const getActiveSessions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const { getUserActiveTokens } = await import('../utils/jwt');
    const activeSessions = getUserActiveTokens(req.user.id);

    // Remove sensitive token data for security
    const safeSessions = activeSessions.map(session => ({
      deviceInfo: session.deviceInfo,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: false, // Could implement logic to detect current session
    }));

    res.status(200).json({
      success: true,
      data: {
        sessions: safeSessions,
        totalSessions: safeSessions.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error retrieving active sessions',
    });
  }
});
