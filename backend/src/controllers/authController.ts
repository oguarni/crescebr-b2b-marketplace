import { Request, Response } from 'express';
import User from '../models/User';
import {
  generateTokenPair,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from '../utils/jwt';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { RegisterRequest, LoginRequest, AuthResponse as _AuthResponse } from '../types';
import { authService } from '../services/authService';

const buildTokenPayload = (user: {
  id: number;
  email: string;
  cnpj: string;
  role: 'customer' | 'admin' | 'supplier';
  companyType: 'supplier' | 'buyer' | 'both';
}) => ({
  id: user.id,
  email: user.email,
  cnpj: user.cnpj,
  role: user.role,
  companyType: user.companyType,
});

const serializeUserResponse = (
  user: User,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number }
) => ({
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
});

export const register = asyncHandler(async (req: Request, res: Response) => {
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

  const user = await authService.register({
    email,
    password,
    cpf,
    address,
    companyName,
    corporateName,
    cnpj,
    industrySector,
    companyType,
  });

  const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
  const tokens = await generateTokenPair(buildTokenPayload(user), deviceInfo);

  res.status(201).json({
    success: true,
    message: 'Company registered successfully',
    data: serializeUserResponse(user, tokens),
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { cnpj, password }: LoginRequest = req.body;

  const user = await authService.loginByCnpj(cnpj, password);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid CNPJ or password',
    });
  }

  const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
  const tokens = await generateTokenPair(buildTokenPayload(user), deviceInfo);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: serializeUserResponse(user, tokens),
  });
});

export const loginWithEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await authService.loginByEmail(email, password);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password',
    });
  }

  const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
  const tokens = await generateTokenPair(buildTokenPayload(user), deviceInfo);

  res.status(200).json({
    success: true,
    message: 'Email login successful',
    data: serializeUserResponse(user, tokens),
  });
});

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const user = await authService.getProfile(req.user.id);

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
  const { email, password, cpf, address, companyName, corporateName, cnpj, industrySector } =
    req.body;

  const { user, cnpjValidation } = await authService.registerSupplier({
    email,
    password,
    cpf,
    address,
    companyName,
    corporateName,
    cnpj,
    industrySector,
  });

  const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
  const tokens = await generateTokenPair(buildTokenPayload(user), deviceInfo);

  res.status(201).json({
    success: true,
    message: 'Supplier registered successfully. Account pending approval.',
    data: serializeUserResponse(user, tokens),
    cnpjValidation: {
      companyName: cnpjValidation.companyName,
      fantasyName: cnpjValidation.fantasyName,
      city: cnpjValidation.city,
      state: cnpjValidation.state,
    },
  });
});

// Refresh access token
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;
  const deviceInfo = req.headers['user-agent'] || 'Unknown Device';

  try {
    // Find user associated with this refresh token
    const { verifyRefreshToken } = await import('../utils/jwt');
    const verification = await verifyRefreshToken(token);

    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        error: verification.error || 'Invalid refresh token',
      });
    }

    // Get updated user data
    const user = await authService.getUserById(verification.userId!);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Generate new token pair
    const newTokens = await refreshAccessToken(token, buildTokenPayload(user), deviceInfo);

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
      await revokeRefreshToken(token);
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
    const revokedCount = await revokeAllUserTokens(req.user.id);

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
    const activeSessions = await getUserActiveTokens(req.user.id);

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
