import jwt from 'jsonwebtoken';
import { generateToken, verifyToken, extractTokenFromHeader, tokenManager } from '../jwt';
import { AuthTokenPayload } from '../../types';

// Unmock the module we are testing (mocked in setup.ts)
jest.unmock('../jwt');

// Mock jsonwebtoken
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('JWT Utilities', () => {
  // Store original environment variables
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.JWT_EXPIRES_IN = '24h';
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
    // Clean up TokenManager interval to prevent Jest from hanging
    tokenManager.destroy();
  });

  describe('generateToken', () => {
    it('should generate a token with provided payload', () => {
      // Arrange
      const payload: AuthTokenPayload = {
        id: 1,
        email: 'test@example.com',
        cnpj: '12.345.678/0001-90',
        role: 'customer',
        companyType: 'buyer',
      };
      const expectedToken = 'mock-jwt-token';

      process.env.JWT_SECRET = 'test-secret';
      process.env.JWT_EXPIRES_IN = '24h';

      mockJwt.sign.mockReturnValue(expectedToken as any);

      // Act
      const result = generateToken(payload);

      // Assert
      expect(result).toBe(expectedToken);
      expect(mockJwt.sign).toHaveBeenCalledWith(payload, 'test-secret', { expiresIn: '24h' });
    });

    it('should use fallback values when environment variables are not set', () => {
      // Arrange
      const payload: AuthTokenPayload = {
        id: 2,
        email: 'user@example.com',
        cnpj: '98.765.432/0001-10',
        role: 'supplier',
        companyType: 'supplier',
      };
      const expectedToken = 'fallback-jwt-token';

      // Unset environment variables
      delete process.env.JWT_SECRET;
      delete process.env.JWT_EXPIRES_IN;

      mockJwt.sign.mockReturnValue(expectedToken as any);

      // Act
      const result = generateToken(payload);

      // Assert
      expect(result).toBe(expectedToken);
      expect(mockJwt.sign).toHaveBeenCalledWith(payload, 'fallback-secret-key', {
        expiresIn: '15m',
      });
    });

    it('should handle different user roles', () => {
      // Arrange
      const adminPayload: AuthTokenPayload = {
        id: 3,
        email: 'admin@example.com',
        cnpj: '11.222.333/0001-44',
        role: 'admin',
        companyType: 'both',
      };
      const expectedToken = 'admin-jwt-token';

      process.env.JWT_SECRET = 'admin-secret';
      mockJwt.sign.mockReturnValue(expectedToken as any);

      // Act
      const result = generateToken(adminPayload);

      // Assert
      expect(result).toBe(expectedToken);
      expect(mockJwt.sign).toHaveBeenCalledWith(adminPayload, 'admin-secret', { expiresIn: '24h' });
    });

    it('should use custom JWT expiration time', () => {
      // Arrange
      const payload: AuthTokenPayload = {
        id: 4,
        email: 'shortlived@example.com',
        cnpj: '55.666.777/0001-88',
        role: 'customer',
        companyType: 'buyer',
      };
      const expectedToken = 'short-lived-token';

      process.env.JWT_SECRET = 'test-secret';
      process.env.JWT_EXPIRES_IN = '1h';

      mockJwt.sign.mockReturnValue(expectedToken as any);

      // Act
      const result = generateToken(payload);

      // Assert
      expect(result).toBe(expectedToken);
      expect(mockJwt.sign).toHaveBeenCalledWith(payload, 'test-secret', { expiresIn: '1h' });
    });

    it('should handle payload with additional properties', () => {
      // Arrange
      const extendedPayload = {
        id: 5,
        email: 'extended@example.com',
        cnpj: '99.888.777/0001-66',
        role: 'supplier' as const,
        companyType: 'supplier' as const,
        companyName: 'Test Company',
        status: 'approved',
      };
      const expectedToken = 'extended-payload-token';

      process.env.JWT_SECRET = 'test-secret';
      mockJwt.sign.mockReturnValue(expectedToken as any);

      // Act
      const result = generateToken(extendedPayload);

      // Assert
      expect(result).toBe(expectedToken);
      expect(mockJwt.sign).toHaveBeenCalledWith(extendedPayload, 'test-secret', {
        expiresIn: '24h',
      });
    });
  });

  describe('verifyToken', () => {
    it('should verify and return valid token payload', () => {
      // Arrange
      const token = 'valid-jwt-token';
      const expectedPayload: AuthTokenPayload = {
        id: 1,
        email: 'test@example.com',
        cnpj: '12.345.678/0001-90',
        role: 'customer',
        companyType: 'buyer',
      };

      process.env.JWT_SECRET = 'test-secret';
      mockJwt.verify.mockReturnValue(expectedPayload as any);

      // Act
      const result = verifyToken(token);

      // Assert
      expect(result).toEqual(expectedPayload);
      expect(mockJwt.verify).toHaveBeenCalledWith(token, 'test-secret');
    });

    it('should use fallback secret when JWT_SECRET is not set', () => {
      // Arrange
      const token = 'fallback-secret-token';
      const expectedPayload: AuthTokenPayload = {
        id: 2,
        email: 'fallback@example.com',
        cnpj: '88.777.666/0001-55',
        role: 'admin',
        companyType: 'both',
      };

      delete process.env.JWT_SECRET;
      mockJwt.verify.mockReturnValue(expectedPayload as any);

      // Act
      const result = verifyToken(token);

      // Assert
      expect(result).toEqual(expectedPayload);
      expect(mockJwt.verify).toHaveBeenCalledWith(token, 'fallback-secret-key');
    });

    it('should throw error when token is invalid', () => {
      // Arrange
      const invalidToken = 'invalid-jwt-token';

      process.env.JWT_SECRET = 'test-secret';
      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      // Act & Assert
      expect(() => verifyToken(invalidToken)).toThrow('Token verification failed');
      expect(mockJwt.verify).toHaveBeenCalledWith(invalidToken, 'test-secret');
    });

    it('should throw error when token is expired', () => {
      // Arrange
      const expiredToken = 'expired-jwt-token';

      process.env.JWT_SECRET = 'test-secret';
      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      // Act & Assert
      expect(() => verifyToken(expiredToken)).toThrow('Token verification failed');
      expect(mockJwt.verify).toHaveBeenCalledWith(expiredToken, 'test-secret');
    });

    it('should throw error when token signature is invalid', () => {
      // Arrange
      const maliciousToken = 'tampered-jwt-token';

      process.env.JWT_SECRET = 'test-secret';
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      // Act & Assert
      expect(() => verifyToken(maliciousToken)).toThrow('Token verification failed');
      expect(mockJwt.verify).toHaveBeenCalledWith(maliciousToken, 'test-secret');
    });

    it('should handle JsonWebTokenError properly', () => {
      // Arrange
      const invalidToken = 'completely-invalid-token';

      process.env.JWT_SECRET = 'test-secret';
      mockJwt.verify.mockImplementation(() => {
        const error = new Error('JsonWebTokenError');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      // Act & Assert
      expect(() => verifyToken(invalidToken)).toThrow('Token verification failed');
    });

    it('should handle TokenExpiredError properly', () => {
      // Arrange
      const expiredToken = 'expired-token';

      process.env.JWT_SECRET = 'test-secret';
      mockJwt.verify.mockImplementation(() => {
        const error = new Error('TokenExpiredError');
        error.name = 'TokenExpiredError';
        throw error;
      });

      // Act & Assert
      expect(() => verifyToken(expiredToken)).toThrow('Token verification failed');
    });

    it('should return payload with all user roles', () => {
      // Arrange
      const testCases = [
        { role: 'customer' as const, id: 1 },
        { role: 'supplier' as const, id: 2 },
        { role: 'admin' as const, id: 3 },
      ];

      process.env.JWT_SECRET = 'test-secret';

      testCases.forEach((testCase, index) => {
        const token = `token-${index}`;
        const payload: AuthTokenPayload = {
          id: testCase.id,
          email: `${testCase.role}@example.com`,
          role: testCase.role,
          cnpj: `1234567800019${testCase.id}`,
          companyType:
            testCase.role === 'admin'
              ? 'both'
              : testCase.role === 'supplier'
                ? 'supplier'
                : 'buyer',
        };

        mockJwt.verify.mockReturnValue(payload as any);

        // Act
        const result = verifyToken(token);

        // Assert
        expect(result.role).toBe(testCase.role);
        expect(result.id).toBe(testCase.id);
      });
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      // Arrange
      const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const expectedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

      // Act
      const result = extractTokenFromHeader(authHeader);

      // Assert
      expect(result).toBe(expectedToken);
    });

    it('should return null when header is undefined', () => {
      // Act
      const result = extractTokenFromHeader(undefined);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when header is empty string', () => {
      // Act
      const result = extractTokenFromHeader('');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when header does not start with Bearer', () => {
      // Arrange
      const invalidHeaders = [
        'Basic eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        'Token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // lowercase
        'BEARER eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // uppercase
      ];

      // Act & Assert
      invalidHeaders.forEach(header => {
        const result = extractTokenFromHeader(header);
        expect(result).toBeNull();
      });
    });

    it('should return null when Bearer header has no token', () => {
      // Arrange
      const invalidHeaders = ['Bearer', 'Bearer ', 'Bearer  '];

      // Act & Assert
      invalidHeaders.forEach(header => {
        const result = extractTokenFromHeader(header);
        expect(result).toBeNull();
      });
    });

    it('should extract token when header has extra spaces', () => {
      // Arrange
      const authHeader = 'Bearer   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9   ';
      const expectedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9   '; // substring(7) extracts everything after "Bearer "

      // Act
      const result = extractTokenFromHeader(authHeader);

      // Assert
      expect(result).toBe(expectedToken);
    });

    it('should handle very long tokens', () => {
      // Arrange
      const longToken = 'a'.repeat(1000);
      const authHeader = `Bearer ${longToken}`;

      // Act
      const result = extractTokenFromHeader(authHeader);

      // Assert
      expect(result).toBe(longToken);
    });

    it('should handle tokens with special characters', () => {
      // Arrange
      const specialToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const authHeader = `Bearer ${specialToken}`;

      // Act
      const result = extractTokenFromHeader(authHeader);

      // Assert
      expect(result).toBe(specialToken);
    });

    it('should be case sensitive for Bearer keyword', () => {
      // Arrange
      const testCases = [
        'bearer token123',
        'BEARER token123',
        'Bearer token123', // Only this one should work
        'bEaReR token123',
      ];

      // Act & Assert
      testCases.forEach((header, index) => {
        const result = extractTokenFromHeader(header);
        if (index === 2) {
          expect(result).toBe('token123');
        } else {
          expect(result).toBeNull();
        }
      });
    });
  });

  describe('Integration Tests', () => {
    it('should generate and verify token successfully', () => {
      // Arrange
      const payload: AuthTokenPayload = {
        id: 1,
        email: 'integration@example.com',
        role: 'customer',
        cnpj: '12345678000196',
        companyType: 'buyer',
      };
      const mockToken = 'mock-integration-token';

      process.env.JWT_SECRET = 'integration-secret';
      mockJwt.sign.mockReturnValue(mockToken as any);
      mockJwt.verify.mockReturnValue(payload as any);

      // Act
      const generatedToken = generateToken(payload);
      const verifiedPayload = verifyToken(generatedToken);

      // Assert
      expect(generatedToken).toBe(mockToken);
      expect(verifiedPayload).toEqual(payload);
    });

    it('should extract and verify token from header', () => {
      // Arrange
      const payload: AuthTokenPayload = {
        id: 2,
        email: 'headertest@example.com',
        role: 'admin',
        cnpj: '12.345.678/0001-92',
        companyType: 'both',
      };
      const mockToken = 'header-test-token';
      const authHeader = `Bearer ${mockToken}`;

      process.env.JWT_SECRET = 'header-test-secret';
      mockJwt.verify.mockReturnValue(payload as any);

      // Act
      const extractedToken = extractTokenFromHeader(authHeader);
      const verifiedPayload = verifyToken(extractedToken!);

      // Assert
      expect(extractedToken).toBe(mockToken);
      expect(verifiedPayload).toEqual(payload);
    });

    it('should handle end-to-end authentication flow', () => {
      // Arrange
      const user: AuthTokenPayload = {
        id: 42,
        email: 'e2e@example.com',
        role: 'supplier',
        cnpj: '42.000.000/0001-42',
        companyType: 'supplier',
      };
      const mockToken = 'e2e-flow-token';

      process.env.JWT_SECRET = 'e2e-secret';
      mockJwt.sign.mockReturnValue(mockToken as any);
      mockJwt.verify.mockReturnValue(user as any);

      // Act - Simulate complete auth flow
      const token = generateToken(user); // Login generates token
      const headerWithToken = `Bearer ${token}`; // Client sends header
      const extractedToken = extractTokenFromHeader(headerWithToken); // Server extracts token
      const authenticatedUser = verifyToken(extractedToken!); // Server verifies token

      // Assert
      expect(token).toBe(mockToken);
      expect(extractedToken).toBe(mockToken);
      expect(authenticatedUser).toEqual(user);
      expect(authenticatedUser.id).toBe(42);
      expect(authenticatedUser.email).toBe('e2e@example.com');
      expect(authenticatedUser.role).toBe('supplier');
    });
  });

  describe('Error Boundary Tests', () => {
    it('should handle null payload in generateToken', () => {
      // Arrange
      process.env.JWT_SECRET = 'test-secret';
      process.env.JWT_EXPIRES_IN = '24h';
      mockJwt.sign.mockReturnValue('null-payload-token' as any);

      // Act
      const result = generateToken(null as any);

      // Assert
      expect(mockJwt.sign).toHaveBeenCalledWith(null, 'test-secret', { expiresIn: '24h' });
      expect(result).toBe('null-payload-token');
    });

    it('should handle empty string token in verifyToken', () => {
      // Arrange
      process.env.JWT_SECRET = 'test-secret';
      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt must be provided');
      });

      // Act & Assert
      expect(() => verifyToken('')).toThrow('Token verification failed');
    });

    it('should handle whitespace-only token in verifyToken', () => {
      // Arrange
      process.env.JWT_SECRET = 'test-secret';
      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      // Act & Assert
      expect(() => verifyToken('   ')).toThrow('Token verification failed');
    });
  });
});
