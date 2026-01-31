import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthTokenPayload } from '../types';

const getJwtSecret = () => process.env.JWT_SECRET || 'fallback-secret-key';

const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '15m';
const getRefreshTokenExpiresIn = () => process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// Store for refresh tokens (in production, use Redis or database)
interface RefreshTokenStore {
  [key: string]: {
    userId: number;
    expiresAt: Date;
    createdAt: Date;
    deviceInfo?: string;
  };
}

class TokenManager {
  private refreshTokenStore: RefreshTokenStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired refresh tokens every hour
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpiredTokens();
      },
      60 * 60 * 1000
    );
  }

  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of Object.entries(this.refreshTokenStore)) {
      if (data.expiresAt <= now) {
        delete this.refreshTokenStore[token];
      }
    }
  }

  generateTokenPair(
    payload: AuthTokenPayload,
    deviceInfo?: string
  ): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } {
    // Generate access token with shorter expiry
    const accessToken = jwt.sign(payload as object, getJwtSecret(), {
      expiresIn: getJwtExpiresIn(),
    } as SignOptions);

    // Generate refresh token
    const refreshToken = this.generateRefreshToken();

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + this.parseExpiry(getRefreshTokenExpiresIn()));

    this.refreshTokenStore[refreshToken] = {
      userId: payload.id,
      expiresAt,
      createdAt: new Date(),
      deviceInfo,
    };

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiry(getJwtExpiresIn()) / 1000, // Convert to seconds
    };
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  private parseExpiry(expiry: string): number {
    // Parse expiry string like '15m', '7d', '24h' to milliseconds
    const timeValue = parseInt(expiry.slice(0, -1));
    const timeUnit = expiry.slice(-1);

    switch (timeUnit) {
      case 's':
        return timeValue * 1000;
      case 'm':
        return timeValue * 60 * 1000;
      case 'h':
        return timeValue * 60 * 60 * 1000;
      case 'd':
        return timeValue * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000; // Default 15 minutes
    }
  }

  verifyAccessToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  verifyRefreshToken(refreshToken: string): { valid: boolean; userId?: number; error?: string } {
    const tokenData = this.refreshTokenStore[refreshToken];

    if (!tokenData) {
      return { valid: false, error: 'Refresh token not found' };
    }

    if (tokenData.expiresAt <= new Date()) {
      // Clean up expired token
      delete this.refreshTokenStore[refreshToken];
      return { valid: false, error: 'Refresh token expired' };
    }

    return { valid: true, userId: tokenData.userId };
  }

  refreshAccessToken(
    refreshToken: string,
    newPayload: AuthTokenPayload,
    deviceInfo?: string
  ): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } | null {
    const verification = this.verifyRefreshToken(refreshToken);

    if (!verification.valid || verification.userId !== newPayload.id) {
      return null;
    }

    // Revoke old refresh token
    delete this.refreshTokenStore[refreshToken];

    // Generate new token pair
    return this.generateTokenPair(newPayload, deviceInfo);
  }

  revokeRefreshToken(refreshToken: string): boolean {
    if (this.refreshTokenStore[refreshToken]) {
      delete this.refreshTokenStore[refreshToken];
      return true;
    }
    return false;
  }

  revokeAllUserTokens(userId: number): number {
    let revokedCount = 0;

    for (const [token, data] of Object.entries(this.refreshTokenStore)) {
      if (data.userId === userId) {
        delete this.refreshTokenStore[token];
        revokedCount++;
      }
    }

    return revokedCount;
  }

  getUserActiveTokens(userId: number): Array<{
    token: string;
    createdAt: Date;
    expiresAt: Date;
    deviceInfo?: string;
  }> {
    const userTokens = [];

    for (const [token, data] of Object.entries(this.refreshTokenStore)) {
      if (data.userId === userId && data.expiresAt > new Date()) {
        userTokens.push({
          token,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          deviceInfo: data.deviceInfo,
        });
      }
    }

    return userTokens.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getTokenStats(): {
    totalActiveTokens: number;
    activeUserCount: number;
    oldestToken: Date | null;
  } {
    const now = new Date();
    const activeTokens = Object.values(this.refreshTokenStore).filter(data => data.expiresAt > now);

    const uniqueUsers = new Set(activeTokens.map(data => data.userId));
    const oldestToken =
      activeTokens.length > 0
        ? activeTokens.reduce((oldest, current) =>
          current.createdAt < oldest.createdAt ? current : oldest
        ).createdAt
        : null;

    return {
      totalActiveTokens: activeTokens.length,
      activeUserCount: uniqueUsers.size,
      oldestToken,
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Create global token manager instance
const tokenManager = new TokenManager();

// Legacy functions for backward compatibility
export const generateToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload as object, getJwtSecret(), { expiresIn: getJwtExpiresIn() } as SignOptions);
};

export const verifyToken = (token: string): AuthTokenPayload => {
  return tokenManager.verifyAccessToken(token);
};

export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  if (!token.trim()) {
    return null;
  }
  return token.trimStart();
};

// New enhanced functions
export const generateTokenPair = (payload: AuthTokenPayload, deviceInfo?: string) => {
  return tokenManager.generateTokenPair(payload, deviceInfo);
};

export const refreshAccessToken = (
  refreshToken: string,
  newPayload: AuthTokenPayload,
  deviceInfo?: string
) => {
  return tokenManager.refreshAccessToken(refreshToken, newPayload, deviceInfo);
};

export const revokeRefreshToken = (refreshToken: string): boolean => {
  return tokenManager.revokeRefreshToken(refreshToken);
};

export const revokeAllUserTokens = (userId: number): number => {
  return tokenManager.revokeAllUserTokens(userId);
};

export const getUserActiveTokens = (userId: number) => {
  return tokenManager.getUserActiveTokens(userId);
};

export const getTokenStats = () => {
  return tokenManager.getTokenStats();
};

export const verifyRefreshToken = (refreshToken: string) => {
  return tokenManager.verifyRefreshToken(refreshToken);
};

// Export token manager for cleanup
export { tokenManager };
