import jwt from 'jsonwebtoken';
import { generateToken, verifyToken, extractTokenFromHeader, tokenManager } from '../jwt';
import { AuthTokenPayload } from '../../types';

// Unmock the module we are testing (mocked in setup.ts)
jest.unmock('../jwt');

// Mock jsonwebtoken
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

// Stateful Redis mock for TokenManager integration tests
let mockKVStore: Record<string, string> = {};
let mockSetStore: Record<string, Set<string>> = {};

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    set: jest.fn((key: string, value: string) => {
      mockKVStore[key] = value;
      return Promise.resolve('OK');
    }),
    get: jest.fn((key: string) => Promise.resolve(mockKVStore[key] ?? null)),
    del: jest.fn((...keys: string[]) => {
      keys.forEach(k => {
        delete mockKVStore[k];
        delete mockSetStore[k];
      });
      return Promise.resolve(keys.length);
    }),
    sadd: jest.fn((key: string, ...members: string[]) => {
      if (!mockSetStore[key]) mockSetStore[key] = new Set();
      members.forEach(m => mockSetStore[key].add(m));
      return Promise.resolve(members.length);
    }),
    srem: jest.fn((key: string, ...members: string[]) => {
      if (!mockSetStore[key]) return Promise.resolve(0);
      members.forEach(m => mockSetStore[key].delete(m));
      return Promise.resolve(members.length);
    }),
    smembers: jest.fn((key: string) =>
      Promise.resolve(mockSetStore[key] ? Array.from(mockSetStore[key]) : [])
    ),
    expire: jest.fn(() => Promise.resolve(1)),
    ttl: jest.fn(() => Promise.resolve(3600)),
    keys: jest.fn((pattern: string) => {
      const prefix = pattern.replace('*', '');
      return Promise.resolve(Object.keys(mockKVStore).filter(k => k.startsWith(prefix)));
    }),
    pipeline: jest.fn(() => {
      const keysToDelete: string[] = [];
      const pipelineObj: { del: jest.Mock; exec: jest.Mock } = {
        del: jest.fn((...ks: string[]) => {
          keysToDelete.push(...ks);
          return pipelineObj;
        }),
        exec: jest.fn(() => {
          keysToDelete.forEach(k => {
            delete mockKVStore[k];
            delete mockSetStore[k];
          });
          return Promise.resolve([]);
        }),
      };
      return pipelineObj;
    }),
    quit: jest.fn(() => Promise.resolve('OK')),
  })),
  closeRedisConnection: jest.fn().mockResolvedValue(undefined),
}));

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
      expect(mockJwt.sign).toHaveBeenCalledWith(payload, 'test-secret', {
        expiresIn: '24h',
        algorithm: 'HS256',
      });
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
      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        'dev-only-insecure-secret-do-not-use-in-production',
        {
          expiresIn: '15m',
          algorithm: 'HS256',
        }
      );
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
      expect(mockJwt.sign).toHaveBeenCalledWith(adminPayload, 'admin-secret', {
        expiresIn: '24h',
        algorithm: 'HS256',
      });
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
      expect(mockJwt.sign).toHaveBeenCalledWith(payload, 'test-secret', {
        expiresIn: '1h',
        algorithm: 'HS256',
      });
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
        algorithm: 'HS256',
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
      expect(mockJwt.verify).toHaveBeenCalledWith(token, 'test-secret', { algorithms: ['HS256'] });
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
      expect(mockJwt.verify).toHaveBeenCalledWith(
        token,
        'dev-only-insecure-secret-do-not-use-in-production',
        { algorithms: ['HS256'] }
      );
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
      expect(mockJwt.verify).toHaveBeenCalledWith(invalidToken, 'test-secret', {
        algorithms: ['HS256'],
      });
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
      expect(mockJwt.verify).toHaveBeenCalledWith(expiredToken, 'test-secret', {
        algorithms: ['HS256'],
      });
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
      expect(mockJwt.verify).toHaveBeenCalledWith(maliciousToken, 'test-secret', {
        algorithms: ['HS256'],
      });
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
      expect(mockJwt.sign).toHaveBeenCalledWith(null, 'test-secret', {
        expiresIn: '24h',
        algorithm: 'HS256',
      });
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

// ============================================================================
// TokenManager Tests - uses real jwt module with Redis-backed token store
// ============================================================================
describe('TokenManager', () => {
  // Use the actual jwt module for TokenManager tests since generateTokenPair
  // calls jwt.sign internally. We access TokenManager via the exported wrappers.
  const realJwt = jest.requireActual<typeof import('jsonwebtoken')>('jsonwebtoken');
  const originalEnv = process.env;

  const TEST_SECRET = 'test-secret-key-for-token-manager-testing';

  const testPayload: AuthTokenPayload = {
    id: 1,
    email: 'test@example.com',
    cnpj: '12.345.678/0001-90',
    role: 'customer',
    companyType: 'buyer',
  };

  const secondPayload: AuthTokenPayload = {
    id: 2,
    email: 'other@example.com',
    cnpj: '98.765.432/0001-10',
    role: 'supplier',
    companyType: 'supplier',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Redis mock state
    mockKVStore = {};
    mockSetStore = {};

    process.env = { ...originalEnv };
    process.env.JWT_SECRET = TEST_SECRET;
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';

    // Make jwt.sign and jwt.verify use the real implementation for TokenManager tests
    mockJwt.sign.mockImplementation(realJwt.sign as any);
    mockJwt.verify.mockImplementation(realJwt.verify as any);

    // Expose the error classes on the mock so instanceof checks work inside verifyAccessToken
    (jwt as any).TokenExpiredError = realJwt.TokenExpiredError;
    (jwt as any).JsonWebTokenError = realJwt.JsonWebTokenError;
  });

  afterAll(() => {
    process.env = originalEnv;
    tokenManager.destroy();
  });

  describe('generateTokenPair', () => {
    it('should generate valid access and refresh tokens', async () => {
      const { generateTokenPair } = jest.requireActual<typeof import('../jwt')>('../jwt');
      const result = await generateTokenPair(testPayload);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
      expect(typeof result.expiresIn).toBe('number');
      expect(result.accessToken.length).toBeGreaterThan(0);
      expect(result.refreshToken.length).toBe(80); // 40 bytes = 80 hex chars
    });

    it('should return expiresIn in seconds matching JWT_EXPIRES_IN', async () => {
      const { generateTokenPair } = jest.requireActual<typeof import('../jwt')>('../jwt');
      process.env.JWT_EXPIRES_IN = '15m';

      const result = await generateTokenPair(testPayload);

      // 15 minutes = 900 seconds
      expect(result.expiresIn).toBe(900);
    });

    it('should store refresh token with user info', async () => {
      const { generateTokenPair, verifyRefreshToken } =
        jest.requireActual<typeof import('../jwt')>('../jwt');
      const result = await generateTokenPair(testPayload);

      const verification = await verifyRefreshToken(result.refreshToken);
      expect(verification.valid).toBe(true);
      expect(verification.userId).toBe(testPayload.id);
    });

    it('should include deviceInfo when provided', async () => {
      const { generateTokenPair, getUserActiveTokens } =
        jest.requireActual<typeof import('../jwt')>('../jwt');
      const deviceInfo = 'Chrome/120 on Windows 11';

      await generateTokenPair(testPayload, deviceInfo);

      const tokens = await getUserActiveTokens(testPayload.id);
      expect(tokens.length).toBeGreaterThanOrEqual(1);
      const latestToken = tokens[0];
      expect(latestToken.deviceInfo).toBe(deviceInfo);
    });

    it('should produce a verifiable JWT access token', async () => {
      const { generateTokenPair } = jest.requireActual<typeof import('../jwt')>('../jwt');
      const result = await generateTokenPair(testPayload);

      const decoded = realJwt.verify(result.accessToken, TEST_SECRET) as any;
      expect(decoded.id).toBe(testPayload.id);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });
  });

  describe('verifyAccessToken', () => {
    it('should throw "Access token expired" for expired token', () => {
      // Manually create an expired token — no need to call generateTokenPair
      const expiredToken = realJwt.sign({ ...testPayload } as object, TEST_SECRET, {
        expiresIn: '0s',
      });

      const { tokenManager: tm } = jest.requireActual<typeof import('../jwt')>('../jwt');
      expect(() => tm.verifyAccessToken(expiredToken)).toThrow('Access token expired');
    });

    it('should throw "Invalid access token" for malformed token', () => {
      const { tokenManager: tm } = jest.requireActual<typeof import('../jwt')>('../jwt');

      expect(() => tm.verifyAccessToken('not-a-valid-jwt-token')).toThrow('Invalid access token');
    });

    it('should throw "Invalid access token" for token signed with wrong secret', () => {
      const { tokenManager: tm } = jest.requireActual<typeof import('../jwt')>('../jwt');

      const wrongSecretToken = realJwt.sign({ ...testPayload } as object, 'wrong-secret', {
        expiresIn: '15m',
      });

      expect(() => tm.verifyAccessToken(wrongSecretToken)).toThrow('Invalid access token');
    });

    it('should return payload for valid token', async () => {
      const { generateTokenPair, tokenManager: tm } =
        jest.requireActual<typeof import('../jwt')>('../jwt');
      const result = await generateTokenPair(testPayload);

      const payload = tm.verifyAccessToken(result.accessToken);
      expect(payload.id).toBe(testPayload.id);
      expect(payload.email).toBe(testPayload.email);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return valid:true for valid refresh token', async () => {
      const { generateTokenPair, verifyRefreshToken } =
        jest.requireActual<typeof import('../jwt')>('../jwt');
      const result = await generateTokenPair(testPayload);

      const verification = await verifyRefreshToken(result.refreshToken);
      expect(verification.valid).toBe(true);
      expect(verification.userId).toBe(testPayload.id);
      expect(verification.error).toBeUndefined();
    });

    it('should return valid:false for unknown token', async () => {
      const { verifyRefreshToken } = jest.requireActual<typeof import('../jwt')>('../jwt');

      const verification = await verifyRefreshToken('nonexistent-token-that-was-never-issued');
      expect(verification.valid).toBe(false);
      expect(verification.error).toBe('Refresh token not found');
    });

    it('should return valid:false and clean up expired token', async () => {
      const { verifyRefreshToken } = jest.requireActual<typeof import('../jwt')>('../jwt');

      // Inject an expired token directly into the Redis mock store
      const expiredRefreshToken = 'expired-test-refresh-token-abc123';
      mockKVStore[`refresh:${expiredRefreshToken}`] = JSON.stringify({
        userId: 999,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        deviceInfo: null,
      });

      const verification = await verifyRefreshToken(expiredRefreshToken);
      expect(verification.valid).toBe(false);
      expect(verification.error).toBe('Refresh token expired');

      // Verify token was cleaned up from Redis
      const secondCheck = await verifyRefreshToken(expiredRefreshToken);
      expect(secondCheck.error).toBe('Refresh token not found');
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new token pair from valid refresh token', async () => {
      const { generateTokenPair, refreshAccessToken } =
        jest.requireActual<typeof import('../jwt')>('../jwt');
      const initial = await generateTokenPair(testPayload);

      const refreshed = await refreshAccessToken(initial.refreshToken, testPayload);
      expect(refreshed).not.toBeNull();
      expect(refreshed!.accessToken).toBeDefined();
      expect(refreshed!.refreshToken).toBeDefined();
      // Refresh token is always new (random crypto bytes)
      expect(refreshed!.refreshToken).not.toBe(initial.refreshToken);
      // Access token is a valid JWT
      expect(typeof refreshed!.accessToken).toBe('string');
      expect(refreshed!.expiresIn).toBeGreaterThan(0);
    });

    it('should return null for invalid refresh token', async () => {
      const { refreshAccessToken } = jest.requireActual<typeof import('../jwt')>('../jwt');

      const result = await refreshAccessToken('invalid-token', testPayload);
      expect(result).toBeNull();
    });

    it('should return null when userId does not match', async () => {
      const { generateTokenPair, refreshAccessToken } =
        jest.requireActual<typeof import('../jwt')>('../jwt');
      const initial = await generateTokenPair(testPayload); // userId = 1

      const wrongUserPayload: AuthTokenPayload = {
        ...testPayload,
        id: 999, // Different user
      };

      const result = await refreshAccessToken(initial.refreshToken, wrongUserPayload);
      expect(result).toBeNull();
    });

    it('should revoke old refresh token after rotation', async () => {
      const { generateTokenPair, refreshAccessToken, verifyRefreshToken } =
        jest.requireActual<typeof import('../jwt')>('../jwt');
      const initial = await generateTokenPair(testPayload);
      const oldRefreshToken = initial.refreshToken;

      await refreshAccessToken(oldRefreshToken, testPayload);

      // Old token should no longer be valid
      const verification = await verifyRefreshToken(oldRefreshToken);
      expect(verification.valid).toBe(false);
    });

    it('should pass deviceInfo to new token pair', async () => {
      const { generateTokenPair, refreshAccessToken, getUserActiveTokens } =
        jest.requireActual<typeof import('../jwt')>('../jwt');
      const initial = await generateTokenPair(testPayload);
      const deviceInfo = 'Firefox/121 on macOS';

      await refreshAccessToken(initial.refreshToken, testPayload, deviceInfo);

      const tokens = await getUserActiveTokens(testPayload.id);
      const hasDeviceInfo = tokens.some((t: any) => t.deviceInfo === deviceInfo);
      expect(hasDeviceInfo).toBe(true);
    });
  });

  describe('revokeRefreshToken', () => {
    it('should return true when token exists and is revoked', async () => {
      const { generateTokenPair, revokeRefreshToken } =
        jest.requireActual<typeof import('../jwt')>('../jwt');
      const result = await generateTokenPair(testPayload);

      const revoked = await revokeRefreshToken(result.refreshToken);
      expect(revoked).toBe(true);
    });

    it('should return false when token does not exist', async () => {
      const { revokeRefreshToken } = jest.requireActual<typeof import('../jwt')>('../jwt');

      const revoked = await revokeRefreshToken('nonexistent-token-xyz');
      expect(revoked).toBe(false);
    });

    it('should make token unverifiable after revocation', async () => {
      const { generateTokenPair, revokeRefreshToken, verifyRefreshToken } =
        jest.requireActual<typeof import('../jwt')>('../jwt');
      const result = await generateTokenPair(testPayload);

      await revokeRefreshToken(result.refreshToken);

      const verification = await verifyRefreshToken(result.refreshToken);
      expect(verification.valid).toBe(false);
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for user', async () => {
      const { generateTokenPair, revokeAllUserTokens, verifyRefreshToken } =
        jest.requireActual<typeof import('../jwt')>('../jwt');

      const token1 = await generateTokenPair(testPayload);
      const token2 = await generateTokenPair(testPayload);
      const token3 = await generateTokenPair(testPayload);

      await revokeAllUserTokens(testPayload.id);

      expect((await verifyRefreshToken(token1.refreshToken)).valid).toBe(false);
      expect((await verifyRefreshToken(token2.refreshToken)).valid).toBe(false);
      expect((await verifyRefreshToken(token3.refreshToken)).valid).toBe(false);
    });

    it('should return count of revoked tokens', async () => {
      const { generateTokenPair, revokeAllUserTokens } =
        jest.requireActual<typeof import('../jwt')>('../jwt');

      await generateTokenPair(testPayload);
      await generateTokenPair(testPayload);

      const count = await revokeAllUserTokens(testPayload.id);
      expect(count).toBe(2);
    });

    it('should not affect other users tokens', async () => {
      const { generateTokenPair, revokeAllUserTokens, verifyRefreshToken } =
        jest.requireActual<typeof import('../jwt')>('../jwt');

      await generateTokenPair(testPayload); // user 1
      const otherUserToken = await generateTokenPair(secondPayload); // user 2

      await revokeAllUserTokens(testPayload.id);

      // Other user's token should still be valid
      expect((await verifyRefreshToken(otherUserToken.refreshToken)).valid).toBe(true);
    });

    it('should return 0 when user has no tokens', async () => {
      const { revokeAllUserTokens } = jest.requireActual<typeof import('../jwt')>('../jwt');

      const count = await revokeAllUserTokens(99999);
      expect(count).toBe(0);
    });
  });

  describe('getUserActiveTokens', () => {
    it('should return active tokens for user', async () => {
      const { generateTokenPair, getUserActiveTokens } =
        jest.requireActual<typeof import('../jwt')>('../jwt');

      await generateTokenPair(testPayload, 'Device A');

      const tokens = await getUserActiveTokens(testPayload.id);
      expect(tokens.length).toBeGreaterThanOrEqual(1);
      expect(tokens[0]).toHaveProperty('token');
      expect(tokens[0]).toHaveProperty('createdAt');
      expect(tokens[0]).toHaveProperty('expiresAt');
      expect(tokens[0]).toHaveProperty('deviceInfo');
    });

    it('should not return expired tokens', async () => {
      const { getUserActiveTokens } = jest.requireActual<typeof import('../jwt')>('../jwt');

      // Inject an expired token directly into the Redis mock
      const userId = 8888;
      const tokenKey = 'expired-token-for-active-test';
      mockKVStore[`refresh:${tokenKey}`] = JSON.stringify({
        userId,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        deviceInfo: null,
      });
      mockSetStore[`refresh:user:${userId}`] = new Set([tokenKey]);

      const tokens = await getUserActiveTokens(userId);
      expect(tokens.length).toBe(0);
    });

    it('should sort by createdAt descending', async () => {
      const { getUserActiveTokens } = jest.requireActual<typeof import('../jwt')>('../jwt');

      const userId = 7777;
      const futureExpiry = new Date(Date.now() + 86400000);

      // Inject tokens with known createdAt times directly into Redis mock
      const tokenData = {
        'sort-test-old': new Date('2025-01-01T00:00:00Z'),
        'sort-test-new': new Date('2025-06-01T00:00:00Z'),
        'sort-test-mid': new Date('2025-03-01T00:00:00Z'),
      };
      mockSetStore[`refresh:user:${userId}`] = new Set(Object.keys(tokenData));
      for (const [token, createdAt] of Object.entries(tokenData)) {
        mockKVStore[`refresh:${token}`] = JSON.stringify({
          userId,
          expiresAt: futureExpiry.toISOString(),
          createdAt: (createdAt as Date).toISOString(),
          deviceInfo: null,
        });
      }

      const tokens = await getUserActiveTokens(userId);
      expect(tokens.length).toBe(3);
      // Newest first
      expect(tokens[0].token).toBe('sort-test-new');
      expect(tokens[1].token).toBe('sort-test-mid');
      expect(tokens[2].token).toBe('sort-test-old');
    });

    it('should return empty array for user with no tokens', async () => {
      const { getUserActiveTokens } = jest.requireActual<typeof import('../jwt')>('../jwt');

      const tokens = await getUserActiveTokens(99998);
      expect(tokens).toEqual([]);
    });
  });

  describe('getTokenStats', () => {
    it('should return stats about active tokens', async () => {
      const { generateTokenPair, getTokenStats } =
        jest.requireActual<typeof import('../jwt')>('../jwt');

      await generateTokenPair(testPayload);

      const stats = await getTokenStats();
      expect(stats).toHaveProperty('totalActiveTokens');
      expect(stats).toHaveProperty('activeUserCount');
      expect(stats).toHaveProperty('oldestToken');
      expect(stats.totalActiveTokens).toBeGreaterThanOrEqual(1);
    });

    it('should count unique users', async () => {
      const { generateTokenPair, getTokenStats } =
        jest.requireActual<typeof import('../jwt')>('../jwt');

      await generateTokenPair(testPayload); // user 1
      await generateTokenPair(testPayload); // user 1 again
      await generateTokenPair(secondPayload); // user 2

      const stats = await getTokenStats();
      expect(stats.activeUserCount).toBeGreaterThanOrEqual(2);
    });

    it('should find oldest token', async () => {
      const { getTokenStats } = jest.requireActual<typeof import('../jwt')>('../jwt');

      const futureExpiry = new Date(Date.now() + 86400000);
      const oldDate = new Date('2020-01-01T00:00:00Z');

      // Inject old token directly into Redis mock
      mockKVStore['refresh:oldest-token-test'] = JSON.stringify({
        userId: 6666,
        expiresAt: futureExpiry.toISOString(),
        createdAt: oldDate.toISOString(),
        deviceInfo: null,
      });

      const stats = await getTokenStats();
      expect(stats.oldestToken).not.toBeNull();
      expect(stats.oldestToken!.getTime()).toBeLessThanOrEqual(oldDate.getTime());
    });

    it('should handle empty store gracefully', async () => {
      const { tokenManager: tm } = jest.requireActual<typeof import('../jwt')>('../jwt');

      // mockKVStore is already empty due to beforeEach reset
      const stats = await tm.getTokenStats();
      expect(stats.totalActiveTokens).toBe(0);
      expect(stats.activeUserCount).toBe(0);
      expect(stats.oldestToken).toBeNull();
    });
  });

  describe('parseExpiry (tested indirectly)', () => {
    it('should parse seconds correctly (e.g., "30s")', async () => {
      const { generateTokenPair } = jest.requireActual<typeof import('../jwt')>('../jwt');

      process.env.JWT_EXPIRES_IN = '30s';
      const result = await generateTokenPair(testPayload);

      // 30 seconds
      expect(result.expiresIn).toBe(30);
    });

    it('should parse minutes correctly (e.g., "15m")', async () => {
      const { generateTokenPair } = jest.requireActual<typeof import('../jwt')>('../jwt');

      process.env.JWT_EXPIRES_IN = '15m';
      const result = await generateTokenPair(testPayload);

      // 15 * 60 = 900 seconds
      expect(result.expiresIn).toBe(900);
    });

    it('should parse hours correctly (e.g., "24h")', async () => {
      const { generateTokenPair } = jest.requireActual<typeof import('../jwt')>('../jwt');

      process.env.JWT_EXPIRES_IN = '24h';
      const result = await generateTokenPair(testPayload);

      // 24 * 60 * 60 = 86400 seconds
      expect(result.expiresIn).toBe(86400);
    });

    it('should parse days correctly (e.g., "7d")', async () => {
      const { generateTokenPair } = jest.requireActual<typeof import('../jwt')>('../jwt');

      process.env.JWT_EXPIRES_IN = '7d';
      const result = await generateTokenPair(testPayload);

      // 7 * 24 * 60 * 60 = 604800 seconds
      expect(result.expiresIn).toBe(604800);
    });

    it('should default to 15 minutes for unknown unit', async () => {
      const { tokenManager: tm } = jest.requireActual<typeof import('../jwt')>('../jwt');

      process.env.REFRESH_TOKEN_EXPIRES_IN = '10x'; // Unknown unit 'x'
      process.env.JWT_EXPIRES_IN = '15m';

      const result = await tm.generateTokenPair(testPayload);

      // Verify the refresh token was stored (proving parseExpiry didn't crash)
      const verification = await tm.verifyRefreshToken(result.refreshToken);
      expect(verification.valid).toBe(true);

      // The expiresIn return is calculated from JWT_EXPIRES_IN ('15m') = 900 seconds
      expect(result.expiresIn).toBe(900);
    });
  });

  describe('destroy', () => {
    it('should not throw', () => {
      const { tokenManager: tm } = jest.requireActual<typeof import('../jwt')>('../jwt');

      // destroy() is a no-op in the Redis implementation
      expect(() => tm.destroy()).not.toThrow();
    });

    it('should be callable multiple times without throwing', () => {
      const { tokenManager: tm } = jest.requireActual<typeof import('../jwt')>('../jwt');

      expect(() => {
        tm.destroy();
        tm.destroy();
      }).not.toThrow();
    });
  });

  describe('getRefreshTokenExpiresIn fallback', () => {
    it('should use "7d" fallback when REFRESH_TOKEN_EXPIRES_IN is not set', async () => {
      const { tokenManager: tm } = jest.requireActual<typeof import('../jwt')>('../jwt');

      delete process.env.REFRESH_TOKEN_EXPIRES_IN;

      const result = await tm.generateTokenPair(testPayload);

      // Refresh token should be valid (stored with 7d expiry)
      const verification = await tm.verifyRefreshToken(result.refreshToken);
      expect(verification.valid).toBe(true);

      // Restore
      process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
    });
  });

  describe('getJwtSecret', () => {
    it('should throw in production when JWT_SECRET is not set', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      const { generateTokenPair: gtp } = jest.requireActual<typeof import('../jwt')>('../jwt');

      const prodPayload: AuthTokenPayload = {
        id: 100,
        email: 'prod@example.com',
        cnpj: '00.000.000/0001-00',
        role: 'admin',
        companyType: 'both',
      };

      await expect(gtp(prodPayload)).rejects.toThrow(
        'JWT_SECRET environment variable is required in production'
      );

      process.env.NODE_ENV = 'test';
    });
  });

  describe('Wrapper functions', () => {
    it('generateTokenPair wrapper should delegate to tokenManager', async () => {
      const mod = jest.requireActual<typeof import('../jwt')>('../jwt');

      const result = await mod.generateTokenPair(testPayload, 'Test Device');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
    });

    it('refreshAccessToken wrapper should delegate to tokenManager', async () => {
      const mod = jest.requireActual<typeof import('../jwt')>('../jwt');

      const initial = await mod.generateTokenPair(testPayload);
      const refreshed = await mod.refreshAccessToken(initial.refreshToken, testPayload);
      expect(refreshed).not.toBeNull();
    });

    it('revokeRefreshToken wrapper should delegate to tokenManager', async () => {
      const mod = jest.requireActual<typeof import('../jwt')>('../jwt');

      const initial = await mod.generateTokenPair(testPayload);
      const revoked = await mod.revokeRefreshToken(initial.refreshToken);
      expect(revoked).toBe(true);
    });

    it('revokeAllUserTokens wrapper should delegate to tokenManager', async () => {
      const mod = jest.requireActual<typeof import('../jwt')>('../jwt');

      await mod.generateTokenPair(testPayload);
      const count = await mod.revokeAllUserTokens(testPayload.id);
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('getUserActiveTokens wrapper should delegate to tokenManager', async () => {
      const mod = jest.requireActual<typeof import('../jwt')>('../jwt');

      await mod.generateTokenPair(testPayload, 'Wrapper test');
      const tokens = await mod.getUserActiveTokens(testPayload.id);
      expect(Array.isArray(tokens)).toBe(true);
    });

    it('getTokenStats wrapper should delegate to tokenManager', async () => {
      const mod = jest.requireActual<typeof import('../jwt')>('../jwt');

      const stats = await mod.getTokenStats();
      expect(stats).toHaveProperty('totalActiveTokens');
      expect(stats).toHaveProperty('activeUserCount');
      expect(stats).toHaveProperty('oldestToken');
    });

    it('verifyRefreshToken wrapper should delegate to tokenManager', async () => {
      const mod = jest.requireActual<typeof import('../jwt')>('../jwt');

      const result = await mod.verifyRefreshToken('nonexistent');
      expect(result.valid).toBe(false);
    });
  });
});
