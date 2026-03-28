import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../config/redis';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipIf?: (req: Request) => boolean; // Function to skip rate limiting
  keyGenerator?: (req: Request) => string; // Custom key generator
}

class RateLimiter {
  createLimiter(options: RateLimitOptions) {
    const windowSeconds = Math.ceil(options.windowMs / 1000);

    return (req: Request, res: Response, next: NextFunction): void => {
      if (options.skipIf && options.skipIf(req)) {
        next();
        return;
      }

      const baseKey = options.keyGenerator
        ? options.keyGenerator(req)
        : this.defaultKeyGenerator(req);
      const redisKey = `rate:${baseKey}`;

      (async () => {
        try {
          const redis = getRedisClient();
          const count = await redis.incr(redisKey);
          if (count === 1) {
            await redis.expire(redisKey, windowSeconds);
          }
          const ttl = await redis.ttl(redisKey);
          const resetTime = Math.ceil(Date.now() / 1000) + (ttl > 0 ? ttl : windowSeconds);

          res.set({
            'X-RateLimit-Limit': options.maxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(0, options.maxRequests - count).toString(),
            'X-RateLimit-Reset': resetTime.toString(),
          });

          if (count > options.maxRequests) {
            res.status(429).json({
              success: false,
              error: options.message || 'Too many requests. Please try again later.',
              retryAfter: ttl > 0 ? ttl : windowSeconds,
            });
            return;
          }

          next();
        } catch (err) {
          // Fail open: log and continue on Redis errors (availability > strict limiting)
          console.error('Rate limit Redis error:', (err as Error).message);
          next();
        }
      })();
    };
  }

  private defaultKeyGenerator(req: Request): string {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    return `${ip}:${userId}`;
  }

  // No-op: Redis TTL handles cleanup automatically
  destroy(): void {}
}

// Create global rate limiter instance
const rateLimiter = new RateLimiter();

// General API rate limiter - 1000 requests per hour
export const generalRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 1000,
  message: 'Too many API requests. Please try again in an hour.',
});

// Strict rate limiter for auth endpoints - 5 requests per 15 minutes (relaxed in development)
export const authRateLimit = rateLimiter.createLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: process.env.NODE_ENV === 'development' ? 100 : 5,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `auth:${ip}`;
  },
});

// Medium rate limiter for search and catalog - 200 requests per 15 minutes
export const searchRateLimit = rateLimiter.createLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 200,
  message: 'Too many search requests. Please try again in 15 minutes.',
});

// Strict rate limiter for file uploads - 10 requests per hour
export const uploadRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many file uploads. Please try again in an hour.',
});

// CNPJ validation rate limiter - 20 requests per hour
export const cnpjValidationRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many CNPJ validation requests. Please try again in an hour.',
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    return `cnpj:${ip}:${userId}`;
  },
});

// Quote calculation rate limiter - 100 requests per hour
export const quoteRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 100,
  message: 'Too many quote requests. Please try again in an hour.',
});

// Admin operations rate limiter - 500 requests per hour
export const adminRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 500,
  message: 'Too many admin requests. Please try again in an hour.',
  skipIf: (req: Request) => {
    return process.env.NODE_ENV === 'development';
  },
});

// Email rate limiter - 5 emails per hour per user
export const emailRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many email requests. Please try again in an hour.',
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || 'anonymous';
    return `email:${userId}`;
  },
});

// Export rate limiter for database operations - 10 requests per hour
export const exportRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many export requests. Please try again in an hour.',
});

// Flexible rate limiter creator for custom use cases
export const createCustomRateLimit = (options: RateLimitOptions) => {
  return rateLimiter.createLimiter(options);
};

// Progressive rate limiter that increases restrictions based on user behavior
export const progressiveRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const user = (req as any).user;

  let windowMs = 15 * 60 * 1000;
  let maxRequests = 100;

  if (!user) {
    maxRequests = 50;
  } else if (user.role === 'admin') {
    maxRequests = 1000;
    windowMs = 60 * 60 * 1000;
  } else if (user.role === 'supplier') {
    maxRequests = 200;
  } else {
    maxRequests = 100;
  }

  const dynamicLimiter = rateLimiter.createLimiter({
    windowMs,
    maxRequests,
    message: `Too many requests for your user type. Please try again later.`,
    keyGenerator: (_req: Request) => {
      const userId = user?.id || 'anonymous';
      return `progressive:${ip}:${userId}`;
    },
  });

  dynamicLimiter(req, res, next);
};

// Burst rate limiter for handling traffic spikes
export const burstRateLimit = rateLimiter.createLimiter({
  windowMs: 1 * 60 * 1000,
  maxRequests: 20,
  message: 'Request rate too high. Please slow down.',
});

// Export the rate limiter instance for cleanup
export { rateLimiter };
