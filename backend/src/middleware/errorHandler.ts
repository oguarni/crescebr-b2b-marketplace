import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'sequelize';
import { logger } from '../utils/structuredLogger';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (!err) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
    return;
  }

  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Unhandled request error', { error: err, path: req.path, method: req.method });

  // Sequelize validation error
  if (err instanceof ValidationError) {
    const message = err.errors.map(val => val.message).join(', ');
    error = {
      name: 'ValidationError',
      message,
      statusCode: 400,
    } as AppError;
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = 'Duplicate field value entered';
    error = {
      name: 'ValidationError',
      message,
      statusCode: 400,
    } as AppError;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      name: 'JsonWebTokenError',
      message,
      statusCode: 401,
    } as AppError;
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      name: 'TokenExpiredError',
      message,
      statusCode: 401,
    } as AppError;
  }

  const statusCode = error.statusCode || 500;

  // 5xx bodies are generic outside development: an unmapped error carries the
  // raw internal message (SQL text, driver output, absolute paths), and echoing
  // it back hands an attacker a free schema/infrastructure oracle. The full
  // error is still logged above.
  const isServerFault = statusCode >= 500;
  const exposeInternals = process.env.NODE_ENV === 'development';
  const body =
    isServerFault && !exposeInternals
      ? 'Server Error'
      : error.message || (isServerFault ? 'Server Error' : '');

  res.status(statusCode).json({
    success: false,
    error: body,
  });
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve()
    .then(() => fn(req, res, next))
    // Express treats falsy values and 'route'/'router' as control flow, so every
    // rejection must become an Error before it reaches the error middleware.
    .catch((error: unknown) =>
      next(error instanceof Error ? error : new Error('Unhandled request failure'))
    );
