import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipIf?: (req: Request) => boolean; // Function to skip rate limiting
  keyGenerator?: (req: Request) => string; // Custom key generator
}

class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 15 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      15 * 60 * 1000
    );
  }

  private cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    }
  }

  createLimiter(options: RateLimitOptions) {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Skip if condition is met
      if (options.skipIf && options.skipIf(req)) {
        next();
        return;
      }

      // Generate key for this request
      const key = options.keyGenerator ? options.keyGenerator(req) : this.defaultKeyGenerator(req);

      const now = Date.now();
      const resetTime = now + options.windowMs;

      // Initialize or get existing entry
      if (!this.store[key] || this.store[key].resetTime <= now) {
        this.store[key] = {
          count: 1,
          resetTime,
        };
      } else {
        this.store[key].count++;
      }

      const current = this.store[key];

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': options.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, options.maxRequests - current.count).toString(),
        'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString(),
      });

      // Check if limit exceeded
      if (current.count > options.maxRequests) {
        res.status(429).json({
          success: false,
          error: options.message || 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((current.resetTime - now) / 1000),
        });
        return;
      }

      next();
    };
  }

  private defaultKeyGenerator(req: Request): string {
    // Use IP address and user ID (if available) as key
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    return `${ip}:${userId}`;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Create global rate limiter instance
const rateLimiter = new RateLimiter();

// Predefined rate limiters for different use cases

// General API rate limiter - 1000 requests per hour
export const generalRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 1000,
  message: 'Too many API requests. Please try again in an hour.',
});

// Strict rate limiter for auth endpoints - 5 requests per 15 minutes
export const authRateLimit = rateLimiter.createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `auth:${ip}`;
  },
});

// Medium rate limiter for search and catalog - 200 requests per 15 minutes
export const searchRateLimit = rateLimiter.createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 200,
  message: 'Too many search requests. Please try again in 15 minutes.',
});

// Strict rate limiter for file uploads - 10 requests per hour
export const uploadRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  message: 'Too many file uploads. Please try again in an hour.',
});

// CNPJ validation rate limiter - 20 requests per hour
export const cnpjValidationRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
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
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 100,
  message: 'Too many quote requests. Please try again in an hour.',
});

// Admin operations rate limiter - 500 requests per hour
export const adminRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 500,
  message: 'Too many admin requests. Please try again in an hour.',
  skipIf: (req: Request) => {
    // Skip rate limiting for super admins or in development
    const user = (req as any).user;
    return process.env.NODE_ENV === 'development' || user?.email === 'admin@crescebr.com';
  },
});

// Email rate limiter - 5 emails per hour per user
export const emailRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  message: 'Too many email requests. Please try again in an hour.',
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || 'anonymous';
    return `email:${userId}`;
  },
});

// Export rate limiter for database operations - 10 requests per hour
export const exportRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
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

  // Determine rate limit based on user status
  let windowMs = 15 * 60 * 1000; // 15 minutes default
  let maxRequests = 100; // Default requests

  if (!user) {
    // Anonymous users get stricter limits
    maxRequests = 50;
  } else if (user.role === 'admin') {
    // Admins get higher limits
    maxRequests = 1000;
    windowMs = 60 * 60 * 1000; // 1 hour
  } else if (user.role === 'supplier') {
    // Suppliers get moderate limits
    maxRequests = 200;
  } else {
    // Customers get standard limits
    maxRequests = 100;
  }

  // Create dynamic rate limiter
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
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute
  message: 'Request rate too high. Please slow down.',
});

// Export the rate limiter instance for cleanup
export { rateLimiter };
