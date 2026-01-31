import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'sequelize';

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
  console.error(err);

  // Sequelize validation error
  if (err instanceof ValidationError) {
    const message = err.errors.map((val) => val.message).join(', ');
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
  res.status(statusCode).json({
    success: false,
    error: error.message || (statusCode === 500 ? 'Server Error' : ''),
  });
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve().then(() => fn(req, res, next)).catch(next);