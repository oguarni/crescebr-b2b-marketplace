import { Request, Response, NextFunction } from 'express';
import {
  authenticateJWT,
  isApprovedSupplier,
  isResourceOwner,
  canModifyProduct,
  canAccessOrder,
  AuthenticatedRequest,
} from '../auth';
import { requireRole } from '../rbac';
import { verifyToken, extractTokenFromHeader } from '../../utils/jwt';
import { AuthTokenPayload } from '../../types';

// Mock JWT utilities
jest.mock('../../utils/jwt');
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockExtractTokenFromHeader = extractTokenFromHeader as jest.MockedFunction<
  typeof extractTokenFromHeader
>;

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      headers: {},
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('authenticateJWT', () => {
    it('should authenticate user with valid token successfully', () => {
      // Arrange
      const mockToken = 'valid-jwt-token';
      const mockPayload: AuthTokenPayload = {
        id: 1,
        email: 'test@example.com',
        role: 'customer',
        cnpj: '12345678000191',
        companyType: 'buyer',
      };

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockExtractTokenFromHeader.mockReturnValue(mockToken);
      mockVerifyToken.mockReturnValue(mockPayload);

      // Act
      authenticateJWT(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockExtractTokenFromHeader).toHaveBeenCalledWith(`Bearer ${mockToken}`);
      expect(mockVerifyToken).toHaveBeenCalledWith(mockToken);
      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should return 401 when no authorization header is provided', () => {
      // Arrange
      mockRequest.headers = {}; // No authorization header
      mockExtractTokenFromHeader.mockReturnValue(null);

      // Act
      authenticateJWT(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockExtractTokenFromHeader).toHaveBeenCalledWith(undefined);
      expect(mockVerifyToken).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token is required',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
    });

    it('should return 401 when authorization header is malformed', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'InvalidFormat token123',
      };
      mockExtractTokenFromHeader.mockReturnValue(null);

      // Act
      authenticateJWT(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockExtractTokenFromHeader).toHaveBeenCalledWith('InvalidFormat token123');
      expect(mockVerifyToken).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token is required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Bearer header has no token', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer ',
      };
      mockExtractTokenFromHeader.mockReturnValue(null);

      // Act
      authenticateJWT(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockExtractTokenFromHeader).toHaveBeenCalledWith('Bearer ');
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token is required',
      });
    });

    it('should return 403 when token is invalid', () => {
      // Arrange
      const invalidToken = 'invalid-jwt-token';
      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`,
      };

      mockExtractTokenFromHeader.mockReturnValue(invalidToken);
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      authenticateJWT(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockExtractTokenFromHeader).toHaveBeenCalledWith(`Bearer ${invalidToken}`);
      expect(mockVerifyToken).toHaveBeenCalledWith(invalidToken);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
    });

    it('should return 403 when token is expired', () => {
      // Arrange
      const expiredToken = 'expired-jwt-token';
      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      mockExtractTokenFromHeader.mockReturnValue(expiredToken);
      mockVerifyToken.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      // Act
      authenticateJWT(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockVerifyToken).toHaveBeenCalledWith(expiredToken);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should authenticate admin user successfully', () => {
      // Arrange
      const mockToken = 'admin-jwt-token';
      const adminPayload: AuthTokenPayload = {
        id: 2,
        email: 'admin@example.com',
        role: 'admin',
        cnpj: '12345678000192',
        companyType: 'both',
      };

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockExtractTokenFromHeader.mockReturnValue(mockToken);
      mockVerifyToken.mockReturnValue(adminPayload);

      // Act
      authenticateJWT(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.user).toEqual(adminPayload);
      expect(mockRequest.user?.role).toBe('admin');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should authenticate supplier user successfully', () => {
      // Arrange
      const mockToken = 'supplier-jwt-token';
      const supplierPayload: AuthTokenPayload = {
        id: 3,
        email: 'supplier@example.com',
        role: 'supplier',
        cnpj: '12345678000193',
        companyType: 'supplier',
      };

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockExtractTokenFromHeader.mockReturnValue(mockToken);
      mockVerifyToken.mockReturnValue(supplierPayload);

      // Act
      authenticateJWT(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.user).toEqual(supplierPayload);
      expect(mockRequest.user?.role).toBe('supplier');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle token verification throwing non-Error objects', () => {
      // Arrange
      const mockToken = 'problematic-token';
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockExtractTokenFromHeader.mockReturnValue(mockToken);
      mockVerifyToken.mockImplementation(() => {
        throw 'String error'; // Non-Error object
      });

      // Act
      authenticateJWT(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
      });
    });

    it('should handle case-sensitive authorization header', () => {
      // Arrange
      const mockToken = 'case-test-token';

      // Test different case variations
      const testHeaders = [
        { Authorization: `Bearer ${mockToken}` }, // Capital A
        { AUTHORIZATION: `Bearer ${mockToken}` }, // All caps
      ];

      testHeaders.forEach((headers, index) => {
        jest.clearAllMocks();
        mockRequest.headers = headers;
        mockExtractTokenFromHeader.mockReturnValue(null); // Headers are case-sensitive in Express

        authenticateJWT(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
      });
    });
  });

  describe('requireRole admin', () => {
    it('should allow access for admin user', async () => {
      mockRequest.user = {
        id: 1,
        email: 'admin@example.com',
        cnpj: '12345678901234',
        role: 'admin',
        companyType: 'both',
      };

      await requireRole('admin')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await requireRole('admin')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is customer (not admin)', async () => {
      mockRequest.user = {
        id: 2,
        email: 'customer@example.com',
        cnpj: '23456789012345',
        role: 'customer',
        companyType: 'buyer',
      };

      await requireRole('admin')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied. Required role: admin',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is supplier (not admin)', async () => {
      mockRequest.user = {
        id: 3,
        email: 'supplier@example.com',
        cnpj: '34567890123456',
        role: 'supplier',
        companyType: 'supplier',
      };

      await requireRole('admin')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied. Required role: admin',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle null user object', async () => {
      mockRequest.user = null as any;

      await requireRole('admin')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
    });
  });

  describe('requireRole supplier', () => {
    it('should allow access for supplier user', async () => {
      mockRequest.user = {
        id: 1,
        email: 'supplier@example.com',
        cnpj: '12345678901234',
        role: 'supplier',
        companyType: 'supplier',
      };

      await requireRole('supplier')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await requireRole('supplier')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is customer (not supplier)', async () => {
      mockRequest.user = {
        id: 2,
        email: 'customer@example.com',
        cnpj: '23456789012345',
        role: 'customer',
        companyType: 'buyer',
      };

      await requireRole('supplier')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied. Required role: supplier',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is admin (not supplier)', async () => {
      mockRequest.user = {
        id: 3,
        email: 'admin@example.com',
        cnpj: '34567890123456',
        role: 'admin',
        companyType: 'both',
      };

      await requireRole('supplier')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied. Required role: supplier',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle null user object', async () => {
      mockRequest.user = null as any;

      await requireRole('supplier')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle authenticateJWT followed by requireRole admin successfully', async () => {
      const mockToken = 'admin-integration-token';
      const adminPayload: AuthTokenPayload = {
        id: 1,
        email: 'admin@example.com',
        role: 'admin',
        cnpj: '12345678000195',
        companyType: 'both',
      };

      mockRequest.headers = { authorization: `Bearer ${mockToken}` };
      mockExtractTokenFromHeader.mockReturnValue(mockToken);
      mockVerifyToken.mockReturnValue(adminPayload);

      authenticateJWT(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toEqual(adminPayload);

      jest.clearAllMocks();

      await requireRole('admin')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle authenticateJWT followed by requireRole supplier successfully', async () => {
      const mockToken = 'supplier-integration-token';
      const supplierPayload: AuthTokenPayload = {
        id: 2,
        email: 'supplier@example.com',
        role: 'supplier',
        cnpj: '12345678000194',
        companyType: 'supplier',
      };

      mockRequest.headers = { authorization: `Bearer ${mockToken}` };
      mockExtractTokenFromHeader.mockReturnValue(mockToken);
      mockVerifyToken.mockReturnValue(supplierPayload);

      authenticateJWT(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toEqual(supplierPayload);

      jest.clearAllMocks();

      await requireRole('supplier')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject customer user trying to access admin endpoint', async () => {
      const mockToken = 'customer-trying-admin-token';
      const customerPayload: AuthTokenPayload = {
        id: 3,
        email: 'customer@example.com',
        role: 'customer',
        cnpj: '12345678000199',
        companyType: 'buyer',
      };

      mockRequest.headers = { authorization: `Bearer ${mockToken}` };
      mockExtractTokenFromHeader.mockReturnValue(mockToken);
      mockVerifyToken.mockReturnValue(customerPayload);

      authenticateJWT(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toEqual(customerPayload);

      jest.clearAllMocks();

      await requireRole('admin')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied. Required role: admin',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing req object gracefully', () => {
      // Act & Assert
      expect(() => {
        authenticateJWT(null as any, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    it('should handle missing res object gracefully', () => {
      // Act & Assert
      expect(() => {
        authenticateJWT(mockRequest as AuthenticatedRequest, null as any, mockNext);
      }).not.toThrow();
    });

    it('should handle missing next function gracefully', () => {
      // Arrange
      const mockToken = 'test-token';
      const mockPayload: AuthTokenPayload = {
        id: 1,
        email: 'test@example.com',
        role: 'customer',
        cnpj: '12345678000191',
        companyType: 'buyer',
      };

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      mockExtractTokenFromHeader.mockReturnValue(mockToken);
      mockVerifyToken.mockReturnValue(mockPayload);

      // Act & Assert
      expect(() => {
        authenticateJWT(mockRequest as AuthenticatedRequest, mockResponse as Response, null as any);
      }).not.toThrow();
    });
  });

  describe('requireRole customer', () => {
    it('should allow access for customer user', async () => {
      mockRequest.user = {
        id: 1,
        email: 'customer@example.com',
        cnpj: '12345678000191',
        role: 'customer',
        companyType: 'buyer',
      };

      await requireRole('customer')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await requireRole('customer')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is admin (not customer)', async () => {
      mockRequest.user = {
        id: 2,
        email: 'admin@example.com',
        cnpj: '12345678000192',
        role: 'admin',
        companyType: 'both',
      };

      await requireRole('customer')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied. Required role: customer',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is supplier (not customer)', async () => {
      mockRequest.user = {
        id: 3,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };

      await requireRole('customer')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied. Required role: customer',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle null user object', async () => {
      mockRequest.user = null as any;

      await requireRole('customer')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
    });
  });

  describe('isApprovedSupplier', () => {
    const mockFindByPk = jest.fn();

    beforeEach(() => {
      jest.doMock('../../models/User', () => ({
        __esModule: true,
        default: { findByPk: mockFindByPk },
      }));
    });

    afterEach(() => {
      jest.restoreAllMocks();
      jest.resetModules();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await isApprovedSupplier(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not a supplier', async () => {
      mockRequest.user = {
        id: 1,
        email: 'customer@example.com',
        cnpj: '12345678000191',
        role: 'customer',
        companyType: 'buyer',
      };

      await isApprovedSupplier(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Supplier access required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when supplier is not approved', async () => {
      mockRequest.user = {
        id: 10,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };
      mockFindByPk.mockResolvedValue({ id: 10, status: 'pending' });

      await isApprovedSupplier(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Approved supplier status required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not found in DB', async () => {
      mockRequest.user = {
        id: 999,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };
      mockFindByPk.mockResolvedValue(null);

      await isApprovedSupplier(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Approved supplier status required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next when supplier is approved', async () => {
      mockRequest.user = {
        id: 10,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };
      mockFindByPk.mockResolvedValue({ id: 10, status: 'approved' });

      await isApprovedSupplier(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      mockRequest.user = {
        id: 10,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };
      mockFindByPk.mockRejectedValue(new Error('DB connection failed'));

      await isApprovedSupplier(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to verify supplier status',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole multi', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await requireRole('admin', 'supplier')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user role is not in allowed roles', async () => {
      mockRequest.user = {
        id: 1,
        email: 'customer@example.com',
        cnpj: '12345678000191',
        role: 'customer',
        companyType: 'buyer',
      };

      await requireRole('admin', 'supplier')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied. Required role: admin or supplier',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next when user role is in allowed roles', async () => {
      mockRequest.user = {
        id: 1,
        email: 'admin@example.com',
        cnpj: '12345678000192',
        role: 'admin',
        companyType: 'both',
      };

      await requireRole('admin', 'supplier')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should work with a single allowed role', async () => {
      mockRequest.user = {
        id: 2,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };

      await requireRole('supplier')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access when user matches one of multiple allowed roles', async () => {
      mockRequest.user = {
        id: 3,
        email: 'customer@example.com',
        cnpj: '12345678000194',
        role: 'customer',
        companyType: 'buyer',
      };

      await requireRole('admin', 'supplier', 'customer')(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('isResourceOwner', () => {
    it('should return 401 when user is not authenticated', () => {
      mockRequest.user = undefined;
      mockRequest.params = { companyId: '1' };
      const middleware = isResourceOwner();

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when resource ID is not provided', () => {
      mockRequest.user = {
        id: 1,
        email: 'user@example.com',
        cnpj: '12345678000191',
        role: 'customer',
        companyType: 'buyer',
      };
      mockRequest.params = {};
      mockRequest.body = {};
      const middleware = isResourceOwner();

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource user ID not provided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow admin to access any resource', () => {
      mockRequest.user = {
        id: 99,
        email: 'admin@example.com',
        cnpj: '12345678000192',
        role: 'admin',
        companyType: 'both',
      };
      mockRequest.params = { companyId: '1' };
      const middleware = isResourceOwner();

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow owner to access their own resource', () => {
      mockRequest.user = {
        id: 5,
        email: 'user@example.com',
        cnpj: '12345678000191',
        role: 'customer',
        companyType: 'buyer',
      };
      mockRequest.params = { companyId: '5' };
      const middleware = isResourceOwner();

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 403 when non-owner tries to access resource', () => {
      mockRequest.user = {
        id: 5,
        email: 'user@example.com',
        cnpj: '12345678000191',
        role: 'customer',
        companyType: 'buyer',
      };
      mockRequest.params = { companyId: '10' };
      const middleware = isResourceOwner();

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied. You can only access your own resources.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use custom field name for resource ID', () => {
      mockRequest.user = {
        id: 7,
        email: 'user@example.com',
        cnpj: '12345678000191',
        role: 'customer',
        companyType: 'buyer',
      };
      mockRequest.params = { userId: '7' };
      const middleware = isResourceOwner('userId');

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should read resource ID from body when not in params', () => {
      mockRequest.user = {
        id: 3,
        email: 'user@example.com',
        cnpj: '12345678000191',
        role: 'customer',
        companyType: 'buyer',
      };
      mockRequest.params = {};
      mockRequest.body = { companyId: '3' };
      const middleware = isResourceOwner();

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('canModifyProduct', () => {
    const mockProductFindByPk = jest.fn();

    beforeEach(() => {
      jest.doMock('../../models/Product', () => ({
        __esModule: true,
        default: { findByPk: mockProductFindByPk },
      }));
    });

    afterEach(() => {
      jest.restoreAllMocks();
      jest.resetModules();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await canModifyProduct(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow admin to modify any product', async () => {
      mockRequest.user = {
        id: 1,
        email: 'admin@example.com',
        cnpj: '12345678000192',
        role: 'admin',
        companyType: 'both',
      };
      mockRequest.params = { id: '5' };

      await canModifyProduct(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow supplier to modify their own product', async () => {
      mockRequest.user = {
        id: 10,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };
      mockRequest.params = { id: '5' };
      mockProductFindByPk.mockResolvedValue({ id: 5, supplierId: 10 });

      await canModifyProduct(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 403 when supplier tries to modify another suppliers product', async () => {
      mockRequest.user = {
        id: 10,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };
      mockRequest.params = { id: '5' };
      mockProductFindByPk.mockResolvedValue({ id: 5, supplierId: 20 });

      await canModifyProduct(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'You can only modify your own products',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 when product is not found', async () => {
      mockRequest.user = {
        id: 10,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };
      mockRequest.params = { id: '999' };
      mockProductFindByPk.mockResolvedValue(null);

      await canModifyProduct(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Product not found',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when no product ID is provided', async () => {
      mockRequest.user = {
        id: 10,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };
      mockRequest.params = {};

      await canModifyProduct(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Product ID not provided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when customer tries to modify a product', async () => {
      mockRequest.user = {
        id: 1,
        email: 'customer@example.com',
        cnpj: '12345678000191',
        role: 'customer',
        companyType: 'buyer',
      };
      mockRequest.params = { id: '5' };

      await canModifyProduct(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions to modify products',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      mockRequest.user = {
        id: 10,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };
      mockRequest.params = { id: '5' };
      mockProductFindByPk.mockRejectedValue(new Error('DB connection failed'));

      await canModifyProduct(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to verify product ownership',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use productId param when id is not present', async () => {
      mockRequest.user = {
        id: 10,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };
      mockRequest.params = { productId: '7' };
      mockProductFindByPk.mockResolvedValue({ id: 7, supplierId: 10 });

      await canModifyProduct(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockProductFindByPk).toHaveBeenCalledWith('7');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('canAccessOrder', () => {
    const mockOrderFindByPk = jest.fn();

    beforeEach(() => {
      jest.doMock('../../models/Order', () => ({
        __esModule: true,
        default: { findByPk: mockOrderFindByPk },
      }));
      jest.doMock('../../models/Quotation', () => ({
        __esModule: true,
        default: {},
      }));
      jest.doMock('../../models/QuotationItem', () => ({
        __esModule: true,
        default: {},
      }));
      jest.doMock('../../models/Product', () => ({
        __esModule: true,
        default: {},
      }));
    });

    afterEach(() => {
      jest.restoreAllMocks();
      jest.resetModules();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await canAccessOrder(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow admin to access any order', async () => {
      mockRequest.user = {
        id: 1,
        email: 'admin@example.com',
        cnpj: '12345678000192',
        role: 'admin',
        companyType: 'both',
      };

      await canAccessOrder(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 404 when order is not found', async () => {
      mockRequest.user = {
        id: 5,
        email: 'customer@example.com',
        cnpj: '12345678000191',
        role: 'customer',
        companyType: 'buyer',
      };
      mockRequest.params = { id: '999' };
      mockOrderFindByPk.mockResolvedValue(null);

      await canAccessOrder(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Order not found',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when no order ID is provided', async () => {
      mockRequest.user = {
        id: 5,
        email: 'customer@example.com',
        cnpj: '12345678000191',
        role: 'customer',
        companyType: 'buyer',
      };
      mockRequest.params = {};

      await canAccessOrder(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Order ID not provided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow customer to access their own order', async () => {
      mockRequest.user = {
        id: 5,
        email: 'customer@example.com',
        cnpj: '12345678000191',
        role: 'customer',
        companyType: 'buyer',
      };
      mockRequest.params = { id: '100' };
      mockOrderFindByPk.mockResolvedValue({
        id: 100,
        companyId: 5,
        quotation: { items: [] },
      });

      await canAccessOrder(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 403 when customer tries to access another customers order', async () => {
      mockRequest.user = {
        id: 5,
        email: 'customer@example.com',
        cnpj: '12345678000191',
        role: 'customer',
        companyType: 'buyer',
      };
      mockRequest.params = { id: '100' };
      mockOrderFindByPk.mockResolvedValue({
        id: 100,
        companyId: 99,
        quotation: { items: [] },
      });

      await canAccessOrder(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied to this order',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow supplier to access order containing their product', async () => {
      mockRequest.user = {
        id: 10,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };
      mockRequest.params = { id: '100' };
      mockOrderFindByPk.mockResolvedValue({
        id: 100,
        companyId: 5,
        quotation: {
          items: [{ product: { id: 1, supplierId: 10 } }, { product: { id: 2, supplierId: 20 } }],
        },
      });

      await canAccessOrder(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 403 when supplier has no product in order', async () => {
      mockRequest.user = {
        id: 10,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };
      mockRequest.params = { id: '100' };
      mockOrderFindByPk.mockResolvedValue({
        id: 100,
        companyId: 5,
        quotation: {
          items: [{ product: { id: 1, supplierId: 20 } }, { product: { id: 2, supplierId: 30 } }],
        },
      });

      await canAccessOrder(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied to this order',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      mockRequest.user = {
        id: 5,
        email: 'customer@example.com',
        cnpj: '12345678000191',
        role: 'customer',
        companyType: 'buyer',
      };
      mockRequest.params = { id: '100' };
      mockOrderFindByPk.mockRejectedValue(new Error('DB connection failed'));

      await canAccessOrder(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to verify order access',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use orderId param when id is not present', async () => {
      mockRequest.user = {
        id: 5,
        email: 'customer@example.com',
        cnpj: '12345678000191',
        role: 'customer',
        companyType: 'buyer',
      };
      mockRequest.params = { orderId: '200' };
      mockOrderFindByPk.mockResolvedValue({
        id: 200,
        companyId: 5,
        quotation: { items: [] },
      });

      await canAccessOrder(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 for supplier when quotation has no items', async () => {
      mockRequest.user = {
        id: 10,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };
      mockRequest.params = { id: '100' };
      mockOrderFindByPk.mockResolvedValue({
        id: 100,
        companyId: 5,
        quotation: { items: [] },
      });

      await canAccessOrder(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied to this order',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 for supplier when quotation is null', async () => {
      mockRequest.user = {
        id: 10,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };
      mockRequest.params = { id: '100' };
      mockOrderFindByPk.mockResolvedValue({
        id: 100,
        companyId: 5,
        quotation: null,
      });

      await canAccessOrder(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied to this order',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle items with null product gracefully', async () => {
      mockRequest.user = {
        id: 10,
        email: 'supplier@example.com',
        cnpj: '12345678000193',
        role: 'supplier',
        companyType: 'supplier',
      };
      mockRequest.params = { id: '100' };
      mockOrderFindByPk.mockResolvedValue({
        id: 100,
        companyId: 5,
        quotation: {
          items: [{ product: null }, { product: { id: 2, supplierId: 10 } }],
        },
      });

      await canAccessOrder(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
