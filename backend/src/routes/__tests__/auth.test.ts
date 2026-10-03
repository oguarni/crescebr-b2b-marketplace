import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';

jest.mock('../../middleware/auth', () => ({
  authenticateJWT: (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization !== 'Bearer fixture') return res.sendStatus(401);
    next();
  },
}));

jest.mock('../../middleware/rateLimiting', () => ({
  authRateLimit: (_req: Request, _res: Response, next: NextFunction) => next(),
  generalRateLimit: jest.fn(),
}));

jest.mock('../../controllers/authController', () => {
  const handler = () => jest.fn((_req: Request, res: Response) => res.sendStatus(204));
  return {
    register: handler(),
    registerSupplier: handler(),
    login: handler(),
    loginWithEmail: handler(),
    getProfile: handler(),
    refreshToken: handler(),
    logout: handler(),
    logoutAllDevices: handler(),
    getActiveSessions: handler(),
  };
});

import { getProfile, getActiveSessions } from '../../controllers/authController';
import { generalRateLimit } from '../../middleware/rateLimiting';
import authRouter from '../auth';

const routes = [
  { path: '/me', controller: getProfile },
  { path: '/sessions', controller: getActiveSessions },
];

describe('authenticated auth read routes', () => {
  const app = express();
  app.use('/auth', authRouter);

  beforeEach(() => {
    jest.clearAllMocks();
    (generalRateLimit as jest.Mock).mockImplementation(
      (_req: Request, _res: Response, next: NextFunction) => next()
    );
  });

  it.each(routes)('should rate limit an authenticated request to $path', async route => {
    await request(app).get(`/auth${route.path}`).set('Authorization', 'Bearer fixture').expect(204);

    expect(generalRateLimit).toHaveBeenCalledTimes(1);
    expect(route.controller).toHaveBeenCalledTimes(1);
  });

  it.each(routes)(
    'should stop an exhausted request to $path before the controller',
    async route => {
      (generalRateLimit as jest.Mock).mockImplementationOnce((_req: Request, res: Response) =>
        res.sendStatus(429)
      );

      await request(app)
        .get(`/auth${route.path}`)
        .set('Authorization', 'Bearer fixture')
        .expect(429);

      expect(route.controller).not.toHaveBeenCalled();
    }
  );

  it.each(routes)(
    'should reject an anonymous request to $path before rate limiting',
    async route => {
      await request(app).get(`/auth${route.path}`).expect(401);

      expect(generalRateLimit).not.toHaveBeenCalled();
      expect(route.controller).not.toHaveBeenCalled();
    }
  );
});
