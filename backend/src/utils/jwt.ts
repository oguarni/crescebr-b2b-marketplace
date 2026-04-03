import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthTokenPayload } from '../types';
import { getRedisClient } from '../config/redis';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return 'dev-only-insecure-secret-do-not-use-in-production';
  }
  return secret;
};

const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '15m';
const getRefreshTokenExpiresIn = () => process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

class TokenManager {
  private parseExpiry(expiry: string): number {
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
        return 15 * 60 * 1000;
    }
  }

  private parseExpirySeconds(expiry: string): number {
    return Math.floor(this.parseExpiry(expiry) / 1000);
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  private refreshKey(token: string): string {
    return `refresh:${token}`;
  }

  private userKey(userId: number): string {
    return `refresh:user:${userId}`;
  }

  async generateTokenPair(
    payload: AuthTokenPayload,
    deviceInfo?: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const accessToken = jwt.sign(payload as object, getJwtSecret(), {
      expiresIn: getJwtExpiresIn(),
      algorithm: 'HS256',
    } as SignOptions);

    const refreshToken = this.generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.parseExpiry(getRefreshTokenExpiresIn()));
    const tokenData = JSON.stringify({
      userId: payload.id,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      deviceInfo: deviceInfo ?? null,
    });

    const redis = getRedisClient();
    await redis.set(this.refreshKey(refreshToken), tokenData, 'EX', REFRESH_TTL_SECONDS);
    await redis.sadd(this.userKey(payload.id), refreshToken);
    await redis.expire(this.userKey(payload.id), REFRESH_TTL_SECONDS);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpirySeconds(getJwtExpiresIn()),
    };
  }

  verifyAccessToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as AuthTokenPayload;
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

  async verifyRefreshToken(
    refreshToken: string
  ): Promise<{ valid: boolean; userId?: number; error?: string }> {
    const redis = getRedisClient();
    const raw = await redis.get(this.refreshKey(refreshToken));

    if (!raw) {
      return { valid: false, error: 'Refresh token not found' };
    }

    const data = JSON.parse(raw);
    if (new Date(data.expiresAt) <= new Date()) {
      await redis.del(this.refreshKey(refreshToken));
      return { valid: false, error: 'Refresh token expired' };
    }

    return { valid: true, userId: data.userId };
  }

  async refreshAccessToken(
    refreshToken: string,
    newPayload: AuthTokenPayload,
    deviceInfo?: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } | null> {
    const verification = await this.verifyRefreshToken(refreshToken);

    if (!verification.valid || verification.userId !== newPayload.id) {
      return null;
    }

    const redis = getRedisClient();
    await redis.del(this.refreshKey(refreshToken));
    await redis.srem(this.userKey(newPayload.id), refreshToken);

    return this.generateTokenPair(newPayload, deviceInfo);
  }

  async revokeRefreshToken(refreshToken: string): Promise<boolean> {
    const redis = getRedisClient();
    const raw = await redis.get(this.refreshKey(refreshToken));
    if (!raw) return false;

    const data = JSON.parse(raw);
    await redis.del(this.refreshKey(refreshToken));
    await redis.srem(this.userKey(data.userId), refreshToken);
    return true;
  }

  async revokeAllUserTokens(userId: number): Promise<number> {
    const redis = getRedisClient();
    const tokens = await redis.smembers(this.userKey(userId));
    if (tokens.length === 0) return 0;

    const pipeline = redis.pipeline();
    tokens.forEach(token => pipeline.del(this.refreshKey(token)));
    pipeline.del(this.userKey(userId));
    await pipeline.exec();

    return tokens.length;
  }

  async getUserActiveTokens(userId: number): Promise<
    Array<{
      token: string;
      createdAt: Date;
      expiresAt: Date;
      deviceInfo?: string;
    }>
  > {
    const redis = getRedisClient();
    const tokens = await redis.smembers(this.userKey(userId));

    const results = await Promise.all(
      tokens.map(async token => {
        const raw = await redis.get(this.refreshKey(token));
        if (!raw) return null;
        const data = JSON.parse(raw);
        return {
          token,
          createdAt: new Date(data.createdAt),
          expiresAt: new Date(data.expiresAt),
          deviceInfo: data.deviceInfo ?? undefined,
        };
      })
    );

    return results
      .filter((r): r is NonNullable<typeof r> => r !== null && r.expiresAt > new Date())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getTokenStats(): Promise<{
    totalActiveTokens: number;
    activeUserCount: number;
    oldestToken: Date | null;
  }> {
    const redis = getRedisClient();
    const keys = await redis.keys('refresh:*');
    const tokenKeys = keys.filter(k => !k.startsWith('refresh:user:'));

    if (tokenKeys.length === 0) {
      return { totalActiveTokens: 0, activeUserCount: 0, oldestToken: null };
    }

    const values = await Promise.all(tokenKeys.map(k => redis.get(k)));
    const now = new Date();
    const active = values
      .filter((v): v is string => v !== null)
      .map(v => JSON.parse(v))
      .filter(d => new Date(d.expiresAt) > now);

    const uniqueUsers = new Set(active.map((d: any) => d.userId));
    const oldestToken =
      active.length > 0
        ? active.reduce((oldest: any, current: any) =>
            new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest
          ).createdAt
        : null;

    return {
      totalActiveTokens: active.length,
      activeUserCount: uniqueUsers.size,
      oldestToken: oldestToken ? new Date(oldestToken) : null,
    };
  }

  // No-op: Redis handles TTL-based cleanup automatically
  destroy(): void {}
}

// Create global token manager instance
const tokenManager = new TokenManager();

// Legacy function for backward compatibility (sync, no refresh token store)
export const generateToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload as object, getJwtSecret(), {
    expiresIn: getJwtExpiresIn(),
    algorithm: 'HS256',
  } as SignOptions);
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

// Async token pair management
export const generateTokenPair = async (payload: AuthTokenPayload, deviceInfo?: string) => {
  return tokenManager.generateTokenPair(payload, deviceInfo);
};

export const refreshAccessToken = async (
  refreshToken: string,
  newPayload: AuthTokenPayload,
  deviceInfo?: string
) => {
  return tokenManager.refreshAccessToken(refreshToken, newPayload, deviceInfo);
};

export const revokeRefreshToken = async (refreshToken: string): Promise<boolean> => {
  return tokenManager.revokeRefreshToken(refreshToken);
};

export const revokeAllUserTokens = async (userId: number): Promise<number> => {
  return tokenManager.revokeAllUserTokens(userId);
};

export const getUserActiveTokens = async (userId: number) => {
  return tokenManager.getUserActiveTokens(userId);
};

export const getTokenStats = async () => {
  return tokenManager.getTokenStats();
};

export const verifyRefreshToken = async (refreshToken: string) => {
  return tokenManager.verifyRefreshToken(refreshToken);
};

// Export token manager for cleanup
export { tokenManager };
