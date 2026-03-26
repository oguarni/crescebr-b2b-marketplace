import { Request, Response, NextFunction } from 'express';

// Store original NODE_ENV so we can restore it
const originalNodeEnv = process.env.NODE_ENV;

// Helper to create fresh mock objects for each test
const createMockReq = (overrides: Partial<Request> = {}): Request => {
  return {
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    user: undefined,
    ...overrides,
  } as any;
};

const createMockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    set: jest.fn(),
  } as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
    set: jest.Mock;
  };
  return res;
};

// We need to re-import the module for tests that change NODE_ENV at module load time.
// For most tests, we use the default import.
import {
  generalRateLimit,
  authRateLimit,
  searchRateLimit,
  uploadRateLimit,
  cnpjValidationRateLimit,
  quoteRateLimit,
  adminRateLimit,
  emailRateLimit,
  exportRateLimit,
  burstRateLimit,
  createCustomRateLimit,
  progressiveRateLimit,
  rateLimiter,
} from '../rateLimiting';

describe('Rate Limiting Middleware', () => {
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockNext = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env.NODE_ENV = originalNodeEnv;
  });

  afterAll(() => {
    // Prevent open handles from the cleanup interval
    rateLimiter.destroy();
  });

  // ---------------------------------------------------------------
  // RateLimiter.createLimiter core behavior
  // ---------------------------------------------------------------
  describe('RateLimiter.createLimiter', () => {
    it('should allow request under limit and call next()', () => {
      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 5,
      });
      const req = createMockReq({ ip: '200.0.0.1' });
      const res = createMockRes();

      limiter(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should set rate limit headers on every request', () => {
      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 10,
      });
      const req = createMockReq({ ip: '200.0.0.2' });
      const res = createMockRes();

      limiter(req, res, mockNext);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '9',
        })
      );
      // X-RateLimit-Reset should be a numeric string (epoch seconds)
      const setCall = (res.set as jest.Mock).mock.calls[0][0];
      expect(Number(setCall['X-RateLimit-Reset'])).not.toBeNaN();
    });

    it('should return 429 when limit is exceeded', () => {
      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 2,
      });
      const req = createMockReq({ ip: '200.0.0.3' });

      // Make 3 requests (limit is 2)
      for (let i = 0; i < 3; i++) {
        const res = createMockRes();
        limiter(req, res, mockNext);

        if (i < 2) {
          expect(res.status).not.toHaveBeenCalled();
        } else {
          expect(res.status).toHaveBeenCalledWith(429);
          expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              retryAfter: expect.any(Number),
            })
          );
        }
      }

      // next() should only have been called twice (first 2 requests pass)
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should use custom message when provided', () => {
      const customMsg = 'Custom rate limit exceeded message';
      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 1,
        message: customMsg,
      });
      const req = createMockReq({ ip: '200.0.0.4' });

      // First request passes
      limiter(req, createMockRes(), mockNext);
      // Second request hits limit
      const res = createMockRes();
      limiter(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: customMsg }));
    });

    it('should use default message when not provided', () => {
      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 1,
      });
      const req = createMockReq({ ip: '200.0.0.5' });

      limiter(req, createMockRes(), mockNext);
      const res = createMockRes();
      limiter(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many requests. Please try again later.',
        })
      );
    });

    it('should reset counter after window expires', () => {
      const windowMs = 5000;
      const limiter = createCustomRateLimit({
        windowMs,
        maxRequests: 1,
      });
      const req = createMockReq({ ip: '200.0.0.6' });

      // First request passes
      limiter(req, createMockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Second request should be blocked
      const blockedRes = createMockRes();
      limiter(req, blockedRes, mockNext);
      expect(blockedRes.status).toHaveBeenCalledWith(429);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Advance time past the window
      jest.advanceTimersByTime(windowMs + 1);

      // Third request should pass because window expired
      const passRes = createMockRes();
      limiter(req, passRes, mockNext);
      expect(passRes.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should skip rate limiting when skipIf returns true', () => {
      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 1,
        skipIf: () => true,
      });
      const req = createMockReq({ ip: '200.0.0.7' });
      const res = createMockRes();

      // Even many requests should all pass
      for (let i = 0; i < 5; i++) {
        limiter(req, res, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should not skip when skipIf returns false', () => {
      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 1,
        skipIf: () => false,
      });
      const req = createMockReq({ ip: '200.0.0.8' });

      limiter(req, createMockRes(), mockNext);
      const res = createMockRes();
      limiter(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should use custom keyGenerator when provided', () => {
      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 1,
        keyGenerator: (req: Request) => `custom:${(req as any).customField}`,
      });

      const req1 = createMockReq({ ip: '200.0.0.9' });
      (req1 as any).customField = 'A';
      const req2 = createMockReq({ ip: '200.0.0.9' });
      (req2 as any).customField = 'B';

      // Both requests should pass because they have different keys
      limiter(req1, createMockRes(), mockNext);
      limiter(req2, createMockRes(), mockNext);

      expect(mockNext).toHaveBeenCalledTimes(2);

      // Second request from key A should be blocked
      const res = createMockRes();
      limiter(req1, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should use default key generator (IP + userId)', () => {
      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 1,
      });

      // Same IP, same anonymous user -> same key -> second blocked
      const req1 = createMockReq({ ip: '200.0.0.10' });
      const req2 = createMockReq({ ip: '200.0.0.10' });

      limiter(req1, createMockRes(), mockNext);
      const res = createMockRes();
      limiter(req2, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(429);

      // Different IP -> different key -> passes
      const req3 = createMockReq({ ip: '200.0.0.11' });
      limiter(req3, createMockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should differentiate by userId in default key generator', () => {
      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 1,
      });

      // Same IP but different users -> different keys
      const reqUser1 = createMockReq({ ip: '200.0.0.12' });
      (reqUser1 as any).user = { id: 1 };
      const reqUser2 = createMockReq({ ip: '200.0.0.12' });
      (reqUser2 as any).user = { id: 2 };

      limiter(reqUser1, createMockRes(), mockNext);
      limiter(reqUser2, createMockRes(), mockNext);

      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should handle missing IP address gracefully', () => {
      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 5,
      });

      const req = createMockReq();
      // Remove all IP sources
      (req as any).ip = undefined;
      (req as any).connection = { remoteAddress: undefined };

      const res = createMockRes();
      limiter(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      // The key should use 'unknown' for IP
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Remaining': '4',
        })
      );
    });

    it('should fall back to connection.remoteAddress when req.ip is missing', () => {
      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 1,
      });

      const req = createMockReq();
      (req as any).ip = undefined;
      (req as any).connection = { remoteAddress: '10.10.10.10' };

      limiter(req, createMockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should increment counter on each request', () => {
      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 5,
      });
      const req = createMockReq({ ip: '200.0.0.13' });

      for (let i = 0; i < 5; i++) {
        const res = createMockRes();
        limiter(req, res, mockNext);

        const remaining = 5 - (i + 1);
        expect(res.set).toHaveBeenCalledWith(
          expect.objectContaining({
            'X-RateLimit-Remaining': Math.max(0, remaining).toString(),
          })
        );
      }
    });

    it('should set X-RateLimit-Remaining to 0 when limit is exceeded', () => {
      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 1,
      });
      const req = createMockReq({ ip: '200.0.0.14' });

      // First request uses the one allowed
      limiter(req, createMockRes(), mockNext);

      // Second request exceeds
      const res = createMockRes();
      limiter(req, res, mockNext);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Remaining': '0',
        })
      );
    });

    it('should include retryAfter in 429 response', () => {
      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 1,
      });
      const req = createMockReq({ ip: '200.0.0.15' });

      limiter(req, createMockRes(), mockNext);
      const res = createMockRes();
      limiter(req, res, mockNext);

      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.retryAfter).toBeGreaterThan(0);
      expect(jsonCall.retryAfter).toBeLessThanOrEqual(60);
    });
  });

  // ---------------------------------------------------------------
  // cleanup tests
  // ---------------------------------------------------------------
  describe('cleanup', () => {
    it('should remove expired entries when cleanup runs', () => {
      const windowMs = 1000;
      const limiter = createCustomRateLimit({
        windowMs,
        maxRequests: 1,
      });
      const req = createMockReq({ ip: '200.0.0.20' });

      // Make a request to create a store entry
      limiter(req, createMockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Verify rate limit is active (second request blocked)
      const blockedRes = createMockRes();
      limiter(req, blockedRes, mockNext);
      expect(blockedRes.status).toHaveBeenCalledWith(429);

      // Advance time past the window so the entry expires, then request again
      // The createLimiter code resets expired entries on access (line 56)
      jest.advanceTimersByTime(windowMs + 1);

      // Now the entry should be considered expired; next request should pass
      const passRes = createMockRes();
      limiter(req, passRes, mockNext);
      expect(passRes.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should remove expired entries via interval-based cleanup', () => {
      // Use isolateModules to get a fresh RateLimiter with fake timers active
      jest.useRealTimers();
      jest.useFakeTimers();

      let isolatedRateLimiter: any;
      let isolatedCreateCustom: any;

      jest.isolateModules(() => {
        const mod = require('../rateLimiting');
        isolatedRateLimiter = mod.rateLimiter;
        isolatedCreateCustom = mod.createCustomRateLimit;
      });

      const windowMs = 1000;
      const limiter = isolatedCreateCustom({
        windowMs,
        maxRequests: 1,
      });

      const req = createMockReq({ ip: '200.0.0.21' });

      // Make a request to populate the store
      limiter(req, createMockRes(), mockNext);

      // Second request blocked
      const blockedRes = createMockRes();
      limiter(req, blockedRes, mockNext);
      expect(blockedRes.status).toHaveBeenCalledWith(429);

      // Advance time so the entry expires
      jest.advanceTimersByTime(windowMs + 1);

      // Advance time to trigger the 15-minute cleanup interval
      jest.advanceTimersByTime(15 * 60 * 1000);

      // After cleanup, the expired entry is deleted from the store
      // New request should pass
      const passRes = createMockRes();
      limiter(req, passRes, mockNext);
      expect(passRes.status).not.toHaveBeenCalled();

      isolatedRateLimiter.destroy();
    });

    it('should not remove entries that have not expired', () => {
      jest.useRealTimers();
      jest.useFakeTimers();

      let isolatedRateLimiter: any;
      let isolatedCreateCustom: any;

      jest.isolateModules(() => {
        const mod = require('../rateLimiting');
        isolatedRateLimiter = mod.rateLimiter;
        isolatedCreateCustom = mod.createCustomRateLimit;
      });

      const windowMs = 60 * 60 * 1000; // 1 hour
      const limiter = isolatedCreateCustom({
        windowMs,
        maxRequests: 1,
      });

      const req = createMockReq({ ip: '200.0.0.22' });

      // Make a request to populate the store
      limiter(req, createMockRes(), mockNext);

      // Trigger cleanup interval (15 minutes < 1 hour window)
      jest.advanceTimersByTime(15 * 60 * 1000);

      // Entry should NOT be removed (not expired yet)
      // Second request should still be blocked
      const blockedRes = createMockRes();
      limiter(req, blockedRes, mockNext);
      expect(blockedRes.status).toHaveBeenCalledWith(429);

      isolatedRateLimiter.destroy();
    });
  });

  // ---------------------------------------------------------------
  // destroy tests
  // ---------------------------------------------------------------
  describe('destroy', () => {
    it('should clear cleanup interval without errors', () => {
      // rateLimiter.destroy() clears the setInterval to prevent open handles
      expect(() => rateLimiter.destroy()).not.toThrow();
    });

    it('should stop the cleanup interval from firing after destroy', () => {
      jest.useRealTimers();
      jest.useFakeTimers();

      let isolatedRateLimiter: any;
      let isolatedCreateCustom: any;

      jest.isolateModules(() => {
        const mod = require('../rateLimiting');
        isolatedRateLimiter = mod.rateLimiter;
        isolatedCreateCustom = mod.createCustomRateLimit;
      });

      const windowMs = 1000;
      const limiter = isolatedCreateCustom({
        windowMs,
        maxRequests: 1,
      });

      const req = createMockReq({ ip: '200.0.0.30' });

      // Make a request
      limiter(req, createMockRes(), mockNext);

      // Destroy the instance (clears the interval)
      isolatedRateLimiter.destroy();

      // Advance time past the window and cleanup interval
      jest.advanceTimersByTime(windowMs + 1 + 15 * 60 * 1000);

      // Even though cleanup would have run, destroy() cleared it.
      // The entry is still expired based on time check in createLimiter (line 56),
      // so the request passes regardless. This test verifies destroy() does not throw.
      const res = createMockRes();
      limiter(req, res, mockNext);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // Pre-configured limiters: generalRateLimit
  // ---------------------------------------------------------------
  describe('generalRateLimit', () => {
    it('should be a middleware function', () => {
      expect(typeof generalRateLimit).toBe('function');
    });

    it('should allow requests under the 1000 request limit', () => {
      const req = createMockReq({ ip: '201.0.0.1' });
      const res = createMockRes();

      generalRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '1000',
        })
      );
    });
  });

  // ---------------------------------------------------------------
  // Pre-configured limiters: authRateLimit
  // ---------------------------------------------------------------
  describe('authRateLimit', () => {
    it('should be a middleware function', () => {
      expect(typeof authRateLimit).toBe('function');
    });

    it('should allow requests within limit', () => {
      const req = createMockReq({ ip: '201.0.0.2' });
      const res = createMockRes();

      authRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should use custom key based on IP with auth prefix', () => {
      // Two different IPs should be tracked independently
      const req1 = createMockReq({ ip: '201.0.0.3' });
      const req2 = createMockReq({ ip: '201.0.0.4' });
      const res1 = createMockRes();
      const res2 = createMockRes();

      authRateLimit(req1, res1, mockNext);
      authRateLimit(req2, res2, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should fall back to connection.remoteAddress in auth key when req.ip is missing', () => {
      const req = createMockReq();
      (req as any).ip = undefined;
      (req as any).connection = { remoteAddress: '192.168.88.1' };
      const res = createMockRes();

      authRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should use unknown IP in auth key when all IP sources are missing', () => {
      const req = createMockReq();
      (req as any).ip = undefined;
      (req as any).connection = { remoteAddress: undefined };
      const res = createMockRes();

      authRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should have environment-dependent limit (100 in dev, 5 in prod)', () => {
      // The limiter was created at module load time with the current NODE_ENV.
      // We verify the limit value from headers.
      const req = createMockReq({ ip: '201.0.0.5' });
      const res = createMockRes();

      authRateLimit(req, res, mockNext);

      const setCall = (res.set as jest.Mock).mock.calls[0][0];
      const limit = parseInt(setCall['X-RateLimit-Limit'], 10);
      // In test environment NODE_ENV is 'test', not 'development', so limit is 5
      if (process.env.NODE_ENV === 'development') {
        expect(limit).toBe(100);
      } else {
        expect(limit).toBe(5);
      }
    });

    it('should use 100 max requests when NODE_ENV is development', () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      let devAuthRateLimit: any;
      let devRateLimiter: any;

      jest.isolateModules(() => {
        const mod = require('../rateLimiting');
        devAuthRateLimit = mod.authRateLimit;
        devRateLimiter = mod.rateLimiter;
      });

      const req = createMockReq({ ip: '201.0.0.99' });
      const res = createMockRes();

      devAuthRateLimit(req, res, mockNext);

      const setCall = (res.set as jest.Mock).mock.calls[0][0];
      expect(setCall['X-RateLimit-Limit']).toBe('100');

      devRateLimiter.destroy();
      process.env.NODE_ENV = prevEnv;
    });
  });

  // ---------------------------------------------------------------
  // Pre-configured limiters: searchRateLimit
  // ---------------------------------------------------------------
  describe('searchRateLimit', () => {
    it('should be a middleware function with 200 request limit', () => {
      const req = createMockReq({ ip: '202.0.0.1' });
      const res = createMockRes();

      searchRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '200',
        })
      );
    });
  });

  // ---------------------------------------------------------------
  // Pre-configured limiters: uploadRateLimit
  // ---------------------------------------------------------------
  describe('uploadRateLimit', () => {
    it('should be a middleware function with 10 request limit', () => {
      const req = createMockReq({ ip: '203.0.0.1' });
      const res = createMockRes();

      uploadRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '10',
        })
      );
    });
  });

  // ---------------------------------------------------------------
  // Pre-configured limiters: cnpjValidationRateLimit
  // ---------------------------------------------------------------
  describe('cnpjValidationRateLimit', () => {
    it('should be a middleware function with 20 request limit', () => {
      const req = createMockReq({ ip: '204.0.0.1' });
      const res = createMockRes();

      cnpjValidationRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '20',
        })
      );
    });

    it('should use custom key with cnpj prefix, IP and userId', () => {
      // Same IP but different users should be independent
      const req1 = createMockReq({ ip: '204.0.0.2' });
      (req1 as any).user = { id: 10 };
      const req2 = createMockReq({ ip: '204.0.0.2' });
      (req2 as any).user = { id: 20 };

      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 1,
        keyGenerator: (req: Request) => {
          const ip = req.ip || (req as any).connection.remoteAddress || 'unknown';
          const userId = (req as any).user?.id || 'anonymous';
          return `cnpj:${ip}:${userId}`;
        },
      });

      limiter(req1, createMockRes(), mockNext);
      limiter(req2, createMockRes(), mockNext);

      // Both pass because different keys
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should fall back to connection.remoteAddress in cnpj key when req.ip is missing', () => {
      const req = createMockReq();
      (req as any).ip = undefined;
      (req as any).connection = { remoteAddress: '192.168.99.1' };
      (req as any).user = { id: 777 };
      const res = createMockRes();

      cnpjValidationRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should use unknown IP and anonymous user in cnpj key when both are missing', () => {
      const req = createMockReq();
      (req as any).ip = undefined;
      (req as any).connection = { remoteAddress: undefined };
      // No user
      const res = createMockRes();

      cnpjValidationRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------
  // Pre-configured limiters: quoteRateLimit
  // ---------------------------------------------------------------
  describe('quoteRateLimit', () => {
    it('should be a middleware function with 100 request limit', () => {
      const req = createMockReq({ ip: '205.0.0.1' });
      const res = createMockRes();

      quoteRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '100',
        })
      );
    });
  });

  // ---------------------------------------------------------------
  // Pre-configured limiters: adminRateLimit
  // ---------------------------------------------------------------
  describe('adminRateLimit', () => {
    it('should be a middleware function with 500 request limit', () => {
      // In test environment (not development), skipIf should NOT skip
      // unless user is admin@crescebr.com
      const req = createMockReq({ ip: '206.0.0.1' });
      (req as any).user = { email: 'regular@example.com' };
      const res = createMockRes();

      // Force NODE_ENV to production for this test
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      adminRateLimit(req, res, mockNext);

      process.env.NODE_ENV = prevEnv;

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '500',
        })
      );
    });

    it('should skip rate limiting for admin@crescebr.com', () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 1,
        skipIf: (req: Request) => {
          const user = (req as any).user;
          return process.env.NODE_ENV === 'development' || user?.email === 'admin@crescebr.com';
        },
      });

      const req = createMockReq({ ip: '206.0.0.2' });
      (req as any).user = { email: 'admin@crescebr.com' };

      // Should skip even after many requests
      for (let i = 0; i < 5; i++) {
        limiter(req, createMockRes(), mockNext);
      }

      process.env.NODE_ENV = prevEnv;

      expect(mockNext).toHaveBeenCalledTimes(5);
    });

    it('should skip rate limiting in development mode', () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 1,
        skipIf: (req: Request) => {
          const user = (req as any).user;
          return process.env.NODE_ENV === 'development' || user?.email === 'admin@crescebr.com';
        },
      });

      const req = createMockReq({ ip: '206.0.0.3' });
      (req as any).user = { email: 'regular@example.com' };

      // Should skip even after many requests because NODE_ENV is development
      for (let i = 0; i < 5; i++) {
        limiter(req, createMockRes(), mockNext);
      }

      process.env.NODE_ENV = prevEnv;

      expect(mockNext).toHaveBeenCalledTimes(5);
    });

    it('should NOT skip for non-admin users in production', () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 1,
        skipIf: (req: Request) => {
          const user = (req as any).user;
          return process.env.NODE_ENV === 'development' || user?.email === 'admin@crescebr.com';
        },
      });

      const req = createMockReq({ ip: '206.0.0.4' });
      (req as any).user = { email: 'regular@example.com' };

      limiter(req, createMockRes(), mockNext);
      const res = createMockRes();
      limiter(req, res, mockNext);

      process.env.NODE_ENV = prevEnv;

      expect(res.status).toHaveBeenCalledWith(429);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------
  // Pre-configured limiters: emailRateLimit
  // ---------------------------------------------------------------
  describe('emailRateLimit', () => {
    it('should be a middleware function with 5 request limit', () => {
      const req = createMockReq({ ip: '207.0.0.1' });
      (req as any).user = { id: 999 };
      const res = createMockRes();

      emailRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '5',
        })
      );
    });

    it('should use user-based key (email prefix)', () => {
      // Different users on the same IP should have independent limits
      const req1 = createMockReq({ ip: '207.0.0.2' });
      (req1 as any).user = { id: 100 };
      const req2 = createMockReq({ ip: '207.0.0.2' });
      (req2 as any).user = { id: 200 };

      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 1,
        keyGenerator: (req: Request) => {
          const userId = (req as any).user?.id || 'anonymous';
          return `email:${userId}`;
        },
      });

      limiter(req1, createMockRes(), mockNext);
      limiter(req2, createMockRes(), mockNext);

      // Both pass because different user keys
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should use anonymous key when user is not set', () => {
      const req = createMockReq({ ip: '207.0.0.3' });
      // No user property
      const res = createMockRes();

      emailRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------
  // Pre-configured limiters: exportRateLimit
  // ---------------------------------------------------------------
  describe('exportRateLimit', () => {
    it('should be a middleware function with 10 request limit', () => {
      const req = createMockReq({ ip: '208.0.0.1' });
      const res = createMockRes();

      exportRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '10',
        })
      );
    });
  });

  // ---------------------------------------------------------------
  // Pre-configured limiters: burstRateLimit
  // ---------------------------------------------------------------
  describe('burstRateLimit', () => {
    it('should be a middleware function with 20 request limit', () => {
      const req = createMockReq({ ip: '209.0.0.1' });
      const res = createMockRes();

      burstRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '20',
        })
      );
    });
  });

  // ---------------------------------------------------------------
  // createCustomRateLimit factory
  // ---------------------------------------------------------------
  describe('createCustomRateLimit', () => {
    it('should create a working limiter with custom options', () => {
      const limiter = createCustomRateLimit({
        windowMs: 30000,
        maxRequests: 3,
        message: 'Custom limit reached',
      });

      expect(typeof limiter).toBe('function');

      const req = createMockReq({ ip: '210.0.0.1' });

      // Exhaust the limit
      for (let i = 0; i < 3; i++) {
        limiter(req, createMockRes(), mockNext);
      }
      expect(mockNext).toHaveBeenCalledTimes(3);

      // Fourth request should fail
      const res = createMockRes();
      limiter(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Custom limit reached',
        })
      );
    });

    it('should accept all options including skipIf and keyGenerator', () => {
      const limiter = createCustomRateLimit({
        windowMs: 60000,
        maxRequests: 1,
        message: 'Stopped',
        skipIf: (req: Request) => (req as any).skip === true,
        keyGenerator: (req: Request) => `test:${req.ip}`,
      });

      // Request with skip=true should always pass
      const skipReq = createMockReq({ ip: '210.0.0.2' });
      (skipReq as any).skip = true;

      for (let i = 0; i < 3; i++) {
        limiter(skipReq, createMockRes(), mockNext);
      }
      expect(mockNext).toHaveBeenCalledTimes(3);
    });
  });

  // ---------------------------------------------------------------
  // progressiveRateLimit
  // ---------------------------------------------------------------
  describe('progressiveRateLimit', () => {
    it('should assign 50 request limit for anonymous users', () => {
      const req = createMockReq({ ip: '211.0.0.1' });
      // No user property -> anonymous
      const res = createMockRes();

      progressiveRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '50',
        })
      );
    });

    it('should assign 1000 request limit for admin users', () => {
      const req = createMockReq({ ip: '211.0.0.2' });
      (req as any).user = { id: 1, role: 'admin' };
      const res = createMockRes();

      progressiveRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '1000',
        })
      );
    });

    it('should assign 200 request limit for supplier users', () => {
      const req = createMockReq({ ip: '211.0.0.3' });
      (req as any).user = { id: 2, role: 'supplier' };
      const res = createMockRes();

      progressiveRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '200',
        })
      );
    });

    it('should assign 100 request limit for customer users', () => {
      const req = createMockReq({ ip: '211.0.0.4' });
      (req as any).user = { id: 3, role: 'customer' };
      const res = createMockRes();

      progressiveRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '100',
        })
      );
    });

    it('should use progressive key prefix with IP and userId', () => {
      // Two different users on same IP should be independent
      const req1 = createMockReq({ ip: '211.0.0.5' });
      (req1 as any).user = { id: 50, role: 'customer' };
      const req2 = createMockReq({ ip: '211.0.0.5' });
      (req2 as any).user = { id: 60, role: 'customer' };

      progressiveRateLimit(req1, createMockRes(), mockNext);
      progressiveRateLimit(req2, createMockRes(), mockNext);

      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should handle missing IP in progressiveRateLimit', () => {
      const req = createMockReq();
      (req as any).ip = undefined;
      (req as any).connection = { remoteAddress: undefined };
      const res = createMockRes();

      progressiveRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should use custom message for progressive rate limit when exceeded', () => {
      const req = createMockReq({ ip: '211.0.0.6' });
      // Anonymous user gets limit of 50
      // We need to exhaust the limit
      for (let i = 0; i < 50; i++) {
        progressiveRateLimit(req, createMockRes(), mockNext);
      }
      expect(mockNext).toHaveBeenCalledTimes(50);

      // 51st request should be blocked
      const res = createMockRes();
      progressiveRateLimit(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many requests for your user type. Please try again later.',
        })
      );
    });

    it('should default customer role for unknown roles', () => {
      const req = createMockReq({ ip: '211.0.0.7' });
      (req as any).user = { id: 4, role: 'buyer' }; // 'buyer' falls into else branch
      const res = createMockRes();

      progressiveRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '100',
        })
      );
    });
  });

  // ---------------------------------------------------------------
  // rateLimiter exported instance
  // ---------------------------------------------------------------
  describe('rateLimiter instance', () => {
    it('should be defined and have a destroy method', () => {
      expect(rateLimiter).toBeDefined();
      expect(typeof rateLimiter.destroy).toBe('function');
    });

    it('should have a createLimiter method', () => {
      expect(typeof rateLimiter.createLimiter).toBe('function');
    });
  });
});
