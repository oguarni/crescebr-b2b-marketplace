import express, { Request, Response } from 'express';
import request from 'supertest';
import { isPublicRegistrationEnabled, requirePublicRegistration } from '../registrationGate';

describe('isPublicRegistrationEnabled', () => {
  it.each(['development', 'test', undefined])('keeps sign-up open when NODE_ENV is %s', env => {
    expect(isPublicRegistrationEnabled({ NODE_ENV: env })).toBe(true);
  });

  it('closes sign-up in production by default', () => {
    expect(isPublicRegistrationEnabled({ NODE_ENV: 'production' })).toBe(false);
  });

  it('opens production sign-up only for the exact opt-in value', () => {
    expect(
      isPublicRegistrationEnabled({ NODE_ENV: 'production', PUBLIC_REGISTRATION: 'true' })
    ).toBe(true);
    for (const value of ['false', '1', 'TRUE', '']) {
      expect(
        isPublicRegistrationEnabled({ NODE_ENV: 'production', PUBLIC_REGISTRATION: value })
      ).toBe(false);
    }
  });
});

describe('requirePublicRegistration', () => {
  const originalEnv = { ...process.env };
  const handler = jest.fn((_req: Request, res: Response) => res.sendStatus(201));
  const app = express();
  app.post('/register', requirePublicRegistration, handler);

  afterEach(() => {
    process.env = { ...originalEnv };
    handler.mockClear();
  });

  it('refuses a production sign-up before the handler runs', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.PUBLIC_REGISTRATION;

    const response = await request(app).post('/register').send({}).expect(403);

    expect(response.body).toEqual({ success: false, error: 'Public registration is disabled' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('passes a sign-up through outside production', async () => {
    process.env.NODE_ENV = 'test';

    await request(app).post('/register').send({}).expect(201);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
