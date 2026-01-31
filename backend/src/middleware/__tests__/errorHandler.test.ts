import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'sequelize';
import { errorHandler, asyncHandler } from '../errorHandler';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {};

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Spy on console.error to verify logging
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('errorHandler', () => {
    it('should handle generic errors with default status 500', () => {
      // Arrange
      const genericError = new Error('Something went wrong');

      // Act
      errorHandler(genericError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(genericError);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Something went wrong',
      });
    });

    it('should handle errors with custom status code', () => {
      // Arrange
      const customError = new Error('Custom error') as any;
      customError.statusCode = 404;

      // Act
      errorHandler(customError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(customError);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Custom error',
      });
    });

    it('should handle Sequelize ValidationError', () => {
      // Arrange
      const validationError = new ValidationError('Validation failed', [
        {
          message: 'Email is required',
          type: 'notnull violation',
          path: 'email',
          value: null,
          origin: 'CORE',
          instance: null,
          validatorKey: 'is_null',
          validatorName: null,
          validatorArgs: [],
          isValidationErrorItemOrigin: () => true,
          normalizeString: (str: string) => str,
          getValidatorKey: () => 'is_null',
        },
        {
          message: 'Password must be at least 6 characters',
          type: 'validation error',
          path: 'password',
          value: '123',
          origin: 'CORE',
          instance: null,
          validatorKey: 'len',
          validatorName: null,
          validatorArgs: [6, 255],
          isValidationErrorItemOrigin: () => true,
          normalizeString: (str: string) => str,
          getValidatorKey: () => 'len',
        },
      ] as any);

      // Act
      errorHandler(validationError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(validationError);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email is required, Password must be at least 6 characters',
      });
    });

    it('should handle Sequelize ValidationError with single error', () => {
      // Arrange
      const validationError = new ValidationError('Validation failed', [
        {
          message: 'Email is required',
          type: 'notnull violation',
          path: 'email',
          value: null,
          origin: 'CORE',
          instance: null,
          validatorKey: 'is_null',
          validatorName: null,
          validatorArgs: [],
        },
      ] as any);

      // Act
      errorHandler(validationError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email is required',
      });
    });

    it('should handle Sequelize ValidationError with empty errors array', () => {
      // Arrange
      const validationError = new ValidationError('Validation failed', []);

      // Act
      errorHandler(validationError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: '',
      });
    });

    it('should handle SequelizeUniqueConstraintError', () => {
      // Arrange
      const uniqueError = new Error('Unique constraint error') as any;
      uniqueError.name = 'SequelizeUniqueConstraintError';

      // Act
      errorHandler(uniqueError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(uniqueError);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Duplicate field value entered',
      });
    });

    it('should handle JsonWebTokenError', () => {
      // Arrange
      const jwtError = new Error('jwt malformed') as any;
      jwtError.name = 'JsonWebTokenError';

      // Act
      errorHandler(jwtError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(jwtError);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
      });
    });

    it('should handle TokenExpiredError', () => {
      // Arrange
      const expiredError = new Error('jwt expired') as any;
      expiredError.name = 'TokenExpiredError';

      // Act
      errorHandler(expiredError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(expiredError);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token expired',
      });
    });

    it('should handle errors without message', () => {
      // Arrange
      const errorWithoutMessage = new Error() as any;
      errorWithoutMessage.message = '';

      // Act
      errorHandler(errorWithoutMessage, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Server Error',
      });
    });

    it('should handle null/undefined errors', () => {
      // Arrange
      const nullError = null as any;

      // Act
      errorHandler(nullError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Server Error',
      });
    });

    it('should handle errors with isOperational property', () => {
      // Arrange
      const operationalError = new Error('Operational error') as any;
      operationalError.statusCode = 403;
      operationalError.isOperational = true;

      // Act
      errorHandler(operationalError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(operationalError);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Operational error',
      });
    });

    it('should handle error objects with additional properties', () => {
      // Arrange
      const complexError = new Error('Complex error') as any;
      complexError.statusCode = 422;
      complexError.code = 'CUSTOM_ERROR';
      complexError.details = ['Additional info'];

      // Act
      errorHandler(complexError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Complex error',
      });
    });

    it('should handle string errors', () => {
      // Arrange
      const stringError = 'String error message' as any;

      // Act
      errorHandler(stringError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Server Error',
      });
    });

    it('should preserve original error properties when creating error copy', () => {
      // Arrange
      const originalError = new Error('Original message') as any;
      originalError.statusCode = 400;
      originalError.customProperty = 'custom value';

      // Act
      errorHandler(originalError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Original message',
      });
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async function execution', async () => {
      // Arrange
      const successfulAsyncFunction = jest.fn().mockResolvedValue('success');
      const wrappedFunction = asyncHandler(successfulAsyncFunction);

      // Act
      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(successfulAsyncFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle async function that throws an error', async () => {
      // Arrange
      const error = new Error('Async function error');
      const failingAsyncFunction = jest.fn().mockRejectedValue(error);
      const wrappedFunction = asyncHandler(failingAsyncFunction);

      // Act
      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(failingAsyncFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous function that throws an error', async () => {
      // Arrange
      const error = new Error('Sync function error');
      const failingSyncFunction = jest.fn().mockImplementation(() => {
        throw error;
      });
      const wrappedFunction = asyncHandler(failingSyncFunction);

      // Act
      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(failingSyncFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle function that returns undefined', async () => {
      // Arrange
      const undefinedFunction = jest.fn().mockReturnValue(undefined);
      const wrappedFunction = asyncHandler(undefinedFunction);

      // Act
      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(undefinedFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle function that returns a promise', async () => {
      // Arrange
      const promiseFunction = jest.fn().mockReturnValue(Promise.resolve('result'));
      const wrappedFunction = asyncHandler(promiseFunction);

      // Act
      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(promiseFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle function that returns a rejected promise', async () => {
      // Arrange
      const error = new Error('Promise rejection');
      const rejectedPromiseFunction = jest.fn().mockReturnValue(Promise.reject(error));
      const wrappedFunction = asyncHandler(rejectedPromiseFunction);

      // Act
      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(rejectedPromiseFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should preserve function context and arguments', async () => {
      // Arrange
      const mockFunction = jest.fn().mockResolvedValue('success');
      const wrappedFunction = asyncHandler(mockFunction);
      const customReq = { ...mockRequest, customProp: 'test' } as any;

      // Act
      await wrappedFunction(customReq, mockResponse as Response, mockNext);

      // Assert
      expect(mockFunction).toHaveBeenCalledWith(customReq, mockResponse, mockNext);
      expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    it('should handle functions with multiple parameters', async () => {
      // Arrange
      const multiParamFunction = jest.fn().mockResolvedValue('success');
      const wrappedFunction = asyncHandler(multiParamFunction);

      // Act
      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(multiParamFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
    });

    it('should handle async functions that call next() directly', async () => {
      // Arrange
      const asyncFunctionWithNext = jest.fn().mockImplementation(async (req, res, next) => {
        next();
        return 'success';
      });
      const wrappedFunction = asyncHandler(asyncFunctionWithNext);

      // Act
      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(asyncFunctionWithNext).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should work together in error handling flow', async () => {
      // Arrange
      const error = new ValidationError('Test validation', [
        {
          message: 'Test error message',
          type: 'validation error',
          path: 'testField',
          value: 'invalid',
          origin: 'CORE',
          instance: null,
          validatorKey: 'test',
          validatorName: null,
          validatorArgs: [],
          isValidationErrorItemOrigin: () => true,
          normalizeString: (str: string) => str,
          getValidatorKey: () => 'test',
        },
      ] as any);

      const failingAsyncFunction = jest.fn().mockRejectedValue(error);
      const wrappedFunction = asyncHandler(failingAsyncFunction);

      // Act
      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate error handler being called
      expect(mockNext).toHaveBeenCalledWith(error);

      // Now test the error handler
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error message',
      });
    });

    it('should handle complex error scenarios', async () => {
      // Arrange
      const complexError = new Error('Complex scenario') as any;
      complexError.statusCode = 418; // I'm a teapot
      complexError.name = 'CustomError';

      const complexAsyncFunction = jest.fn().mockRejectedValue(complexError);
      const wrappedFunction = asyncHandler(complexAsyncFunction);

      // Act
      await wrappedFunction(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(complexError);

      errorHandler(complexError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(418);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Complex scenario',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle circular reference errors', () => {
      // Arrange
      const circularError = new Error('Circular reference') as any;
      circularError.circular = circularError; // Create circular reference

      // Act
      errorHandler(circularError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Circular reference',
      });
    });

    it('should handle errors with numeric statusCode as string', () => {
      // Arrange
      const stringStatusError = new Error('String status') as any;
      stringStatusError.statusCode = '400';

      // Act
      errorHandler(stringStatusError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith('400');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'String status',
      });
    });

    it('should handle very long error messages', () => {
      // Arrange
      const longMessage = 'A'.repeat(10000);
      const longError = new Error(longMessage);

      // Act
      errorHandler(longError, mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: longMessage,
      });
    });
  });
});
