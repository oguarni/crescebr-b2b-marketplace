import { generalRateLimit, authRateLimit } from '../rateLimiting';
import { Request, Response, NextFunction } from 'express';

const mockRequest = (ip = '127.0.0.1', path = '/test'): Partial<Request> => ({
  ip,
  path,
  headers: {},
  socket: { remoteAddress: ip } as any,
});

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('Rate Limiting Middleware', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = jest.fn();
  });

  describe('generalRateLimit', () => {
    it('should call next for requests within limit', () => {
      const req = mockRequest() as Request;
      const res = mockResponse();

      generalRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should be a function (middleware)', () => {
      expect(typeof generalRateLimit).toBe('function');
    });
  });

  describe('authRateLimit', () => {
    it('should call next for requests within limit', () => {
      const req = mockRequest('192.168.1.1') as Request;
      const res = mockResponse();

      authRateLimit(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should be a function (middleware)', () => {
      expect(typeof authRateLimit).toBe('function');
    });
  });

  describe('Rate limit enforcement', () => {
    it('should track requests per IP independently', () => {
      const req1 = mockRequest('10.0.0.1') as Request;
      const req2 = mockRequest('10.0.0.2') as Request;
      const res = mockResponse();
      const next = jest.fn();

      generalRateLimit(req1, res, next);
      generalRateLimit(req2, res, next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });
});
