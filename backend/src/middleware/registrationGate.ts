import { Request, Response, NextFunction } from 'express';

/**
 * Whether anyone may create an account through the public sign-up routes.
 *
 * The portfolio demo is explored through three seeded accounts and offers no
 * sign-up form, so a production deployment refuses self-registration unless
 * `PUBLIC_REGISTRATION=true` opts back in. Development and test keep it open:
 * local work, the jest suites and the Playwright run all create companies.
 */
export const isPublicRegistrationEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.NODE_ENV !== 'production' || env.PUBLIC_REGISTRATION === 'true';

/** Refuses a sign-up request after rate limiting, before validation or any database work. */
export const requirePublicRegistration = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isPublicRegistrationEnabled()) {
    res.status(403).json({ success: false, error: 'Public registration is disabled' });
    return;
  }
  next();
};
