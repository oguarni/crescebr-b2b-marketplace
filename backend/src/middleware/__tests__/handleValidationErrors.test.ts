import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { handleValidationErrors } from '../handleValidationErrors';

jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const mockValidationResult = validationResult as unknown as jest.Mock;

describe('handleValidationErrors', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = {};
    mockRes = { status: statusMock } as Partial<Response>;
    mockNext = jest.fn();
  });

  it('should call next() when there are no validation errors', () => {
    mockValidationResult.mockReturnValue({
      isEmpty: () => true,
    });

    handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('should return 400 with error details when validation errors exist', () => {
    const mockErrors = [
      { param: 'email', msg: 'Invalid email', location: 'body' },
      { param: 'password', msg: 'Password too short', location: 'body' },
    ];

    mockValidationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => mockErrors,
    });

    handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: 'Validation failed',
      details: mockErrors,
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return correct response shape with single error', () => {
    const singleError = [{ param: 'name', msg: 'Name is required', location: 'body' }];

    mockValidationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => singleError,
    });

    handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Validation failed',
        details: singleError,
      })
    );
  });
});
