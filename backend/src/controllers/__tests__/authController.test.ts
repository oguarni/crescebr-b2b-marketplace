import request from 'supertest';
import express from 'express';
import {
  register,
  login,
  getProfile,
  registerSupplier,
  registerValidation,
  loginValidation,
  supplierRegisterValidation,
} from '../authController';
import { authenticateJWT } from '../../middleware/auth';
import { errorHandler } from '../../middleware/errorHandler';
import User from '../../models/User';
import { generateToken, generateTokenPair } from '../../utils/jwt';
import { CNPJService } from '../../services/cnpjService';

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../utils/jwt', () => ({
  generateToken: jest.fn(),
  generateTokenPair: jest.fn(),
}));
jest.mock('../../services/cnpjService');
jest.mock('../../middleware/auth', () => ({
  authenticateJWT: jest.fn(),
}));

const MockUser = User as jest.Mocked<typeof User>;
const mockGenerateToken = generateToken as jest.MockedFunction<typeof generateToken>;
const mockGenerateTokenPair = generateTokenPair as jest.MockedFunction<typeof generateTokenPair>;
const mockCNPJService = CNPJService as jest.Mocked<typeof CNPJService>;
const mockAuthenticateJWT = authenticateJWT as jest.MockedFunction<typeof authenticateJWT>;

// Create Express app for testing
const app = express();
app.use(express.json());

// Setup routes
app.post('/api/auth/register', registerValidation, register);
app.post('/api/auth/login', loginValidation, login);
app.get('/api/auth/profile', authenticateJWT, getProfile);
app.post('/api/auth/register-supplier', supplierRegisterValidation, registerSupplier);

app.use(errorHandler);

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockUser.findOne.mockReset();
    MockUser.create.mockReset();
    MockUser.findByPk.mockReset();
    mockGenerateTokenPair.mockReturnValue({
      accessToken: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 900
    });
    mockCNPJService.validateCNPJWithAPI.mockResolvedValue({
      valid: true,
      address: 'Test Address',
      companyName: 'Test Company',
    });
    mockCNPJService.formatCNPJ.mockReturnValue('12.345.678/0001-90');
  });

  describe('POST /api/auth/register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'password123',
      cpf: '12345678901',
      address: 'Test Address, 123',
      companyName: 'Test Company',
      corporateName: 'Test Corp',
      cnpj: '12.345.678/0001-90',
      industrySector: 'other',
      companyType: 'buyer',
    };

    it('should register a new customer successfully', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        cpf: '12345678901',
        address: 'Test Address, 123',
        role: 'customer',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      MockUser.findOne.mockResolvedValue(null); // No existing users
      MockUser.create.mockResolvedValue(mockUser as any);
      mockGenerateToken.mockReturnValue('mock-jwt-token');

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegisterData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Company registered successfully');
      expect(response.body.data.accessToken).toBe('mock-jwt-token');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.role).toBe('customer');
      expect(MockUser.findOne).toHaveBeenCalledTimes(3); // Check email, CPF, and CNPJ
      expect(MockUser.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        cpf: '12345678901',
        address: 'Test Address',
        companyName: 'Test Company',
        corporateName: 'Test Company',
        cnpj: '12.345.678/0001-90',
        industrySector: 'other',
        companyType: 'buyer',
        role: 'customer',
        status: 'approved',
      });
    });

    it('should return 400 for invalid email format', async () => {
      // Arrange
      const invalidData = {
        ...validRegisterData,
        email: 'invalid-email',
      };

      // Act
      const response = await request(app).post('/api/auth/register').send(invalidData).expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should return 400 for password too short', async () => {
      // Arrange
      const invalidData = {
        ...validRegisterData,
        password: '123',
      };

      // Act
      const response = await request(app).post('/api/auth/register').send(invalidData).expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      // Arrange
      const invalidData = {
        email: 'test@example.com',
        // Missing password, cpf, and address
      };

      // Act
      const response = await request(app).post('/api/auth/register').send(invalidData).expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 when email already exists', async () => {
      // Arrange
      const existingUser = { id: 1, email: 'test@example.com' };
      MockUser.findOne.mockResolvedValueOnce(existingUser as any);

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegisterData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User with this email already exists');
    });

    it('should return 400 when CPF already exists', async () => {
      // Arrange
      const existingUser = { id: 1, cpf: '12345678901' };
      MockUser.findOne
        .mockResolvedValueOnce(null) // No user with email
        .mockResolvedValueOnce(existingUser as any); // User with CPF exists

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegisterData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User with this CPF already exists');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      MockUser.findOne.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegisterData)
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      cnpj: '12.345.678/0001-90',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        cpf: '12345678901',
        address: 'Test Address, 123',
        role: 'customer',
        createdAt: new Date(),
        updatedAt: new Date(),
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      MockUser.findOne.mockResolvedValue(mockUser as any);
      mockGenerateToken.mockReturnValue('mock-jwt-token');

      // Act
      const response = await request(app).post('/api/auth/login').send(validLoginData).expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.accessToken).toBe('mock-jwt-token');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
    });

    it('should return 400 for invalid CNPJ format', async () => {
      // Arrange
      const invalidData = {
        cnpj: '123', // Invalid CNPJ length (<14)
        password: 'password123',
      };

      // Act
      const response = await request(app).post('/api/auth/login').send(invalidData).expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for missing password', async () => {
      // Arrange
      const invalidData = {
        cnpj: '12.345.678/0001-90',
        // Missing password
      };

      // Act
      const response = await request(app).post('/api/auth/login').send(invalidData).expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 401 when user not found', async () => {
      // Arrange
      MockUser.findOne.mockResolvedValue(null);

      // Act
      const response = await request(app).post('/api/auth/login').send(validLoginData).expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid CNPJ or password');
    });

    it('should return 401 when password is incorrect', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      MockUser.findOne.mockResolvedValue(mockUser as any);

      // Act
      const response = await request(app).post('/api/auth/login').send(validLoginData).expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid CNPJ or password');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      MockUser.findOne.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app).post('/api/auth/login').send(validLoginData).expect(500);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile successfully', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        cpf: '12345678901',
        address: 'Test Address, 123',
        role: 'customer',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'test@example.com', role: 'customer' };
        next();
      });

      MockUser.findByPk.mockResolvedValue(mockUser as any);

      // Act
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile retrieved successfully');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(MockUser.findByPk).toHaveBeenCalledWith(1);
    });

    it('should return 401 when user not authenticated', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = null;
        next();
      });

      // Act
      const response = await request(app).get('/api/auth/profile').expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 404 when user not found in database', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 999, email: 'nonexistent@example.com', role: 'customer' };
        next();
      });

      MockUser.findByPk.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer mock-token')
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockAuthenticateJWT.mockImplementation((req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'test@example.com', role: 'customer' };
        next();
      });

      MockUser.findByPk.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer mock-token')
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/register-supplier', () => {
    const validSupplierData = {
      email: 'supplier@example.com',
      password: 'password123',
      cpf: '12345678901',
      address: 'Test Address, 123',
      companyName: 'Test Company',
      cnpj: '12345678000190',
    };

    it('should register a new supplier successfully', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'supplier@example.com',
        cpf: '12345678901',
        address: 'Updated Address from CNPJ',
        companyName: 'Updated Company Name',
        cnpj: '12.345.678/0001-90',
        role: 'supplier',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCNPJValidation = {
        valid: true,
        companyName: 'Updated Company Name',
        fantasyName: 'Updated Fantasy Name',
        address: 'Updated Address from CNPJ',
        city: 'São Paulo',
        state: 'SP',
      };

      MockUser.findOne.mockResolvedValue(null); // No existing users
      MockUser.create.mockResolvedValue(mockUser as any);
      mockGenerateToken.mockReturnValue('mock-jwt-token');
      mockCNPJService.validateCNPJWithAPI.mockResolvedValue(mockCNPJValidation);
      mockCNPJService.formatCNPJ.mockReturnValue('12.345.678/0001-90');

      // Act
      const response = await request(app)
        .post('/api/auth/register-supplier')
        .send(validSupplierData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Supplier registered successfully. Account pending approval.'
      );
      expect(response.body.data.accessToken).toBe('mock-jwt-token');
      expect(response.body.data.user.email).toBe('supplier@example.com');
      expect(response.body.data.user.role).toBe('supplier');
      expect(response.body.cnpjValidation).toEqual({
        companyName: 'Updated Company Name',
        fantasyName: 'Updated Fantasy Name',
        city: 'São Paulo',
        state: 'SP',
      });
      expect(mockCNPJService.validateCNPJWithAPI).toHaveBeenCalledWith('12345678000190');
      expect(MockUser.create).toHaveBeenCalledWith({
        email: 'supplier@example.com',
        password: 'password123',
        cpf: '12345678901',
        address: 'Updated Address from CNPJ',
        companyName: 'Updated Company Name',
        corporateName: 'Updated Company Name',
        cnpj: '12.345.678/0001-90',
        industrySector: 'other',
        companyType: 'supplier',
        role: 'supplier',
        status: 'pending',
      });
    });

    it('should return 400 for invalid CNPJ format', async () => {
      // Arrange
      const invalidData = {
        ...validSupplierData,
        cnpj: '123',
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register-supplier')
        .send(invalidData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for missing company name', async () => {
      // Arrange
      const invalidData = {
        ...validSupplierData,
        companyName: '',
      };

      // Act
      const response = await request(app)
        .post('/api/auth/register-supplier')
        .send(invalidData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 when email already exists', async () => {
      // Arrange
      const existingUser = { id: 1, email: 'supplier@example.com' };
      MockUser.findOne.mockResolvedValueOnce(existingUser as any);

      // Act
      const response = await request(app)
        .post('/api/auth/register-supplier')
        .send(validSupplierData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User with this email already exists');
    });

    it('should return 400 when CPF already exists', async () => {
      // Arrange
      const existingUser = { id: 1, cpf: '12345678901' };
      MockUser.findOne
        .mockResolvedValueOnce(null) // No user with email
        .mockResolvedValueOnce(existingUser as any); // User with CPF exists

      // Act
      const response = await request(app)
        .post('/api/auth/register-supplier')
        .send(validSupplierData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User with this CPF already exists');
    });

    it('should return 400 when CNPJ already exists', async () => {
      // Arrange
      const existingUser = { id: 1, cnpj: '12345678000190' };
      MockUser.findOne
        .mockResolvedValueOnce(null) // No user with email
        .mockResolvedValueOnce(null) // No user with CPF
        .mockResolvedValueOnce(existingUser as any); // User with CNPJ exists

      // Act
      const response = await request(app)
        .post('/api/auth/register-supplier')
        .send(validSupplierData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Company with this CNPJ already exists');
    });

    it('should return 400 when CNPJ validation fails', async () => {
      // Arrange
      const mockCNPJValidation = {
        valid: false,
        error: 'Invalid CNPJ format',
      };

      MockUser.findOne.mockResolvedValue(null);
      mockCNPJService.validateCNPJWithAPI.mockResolvedValue(mockCNPJValidation);

      // Act
      const response = await request(app)
        .post('/api/auth/register-supplier')
        .send(validSupplierData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid CNPJ format');
    });

    it('should use fallback values when CNPJ validation returns minimal data', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'supplier@example.com',
        cpf: '12345678901',
        address: 'Test Address, 123',
        companyName: 'Test Company',
        cnpj: '12.345.678/0001-90',
        role: 'supplier',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCNPJValidation = {
        valid: true,
        // No companyName or address provided
      };

      MockUser.findOne.mockResolvedValue(null);
      MockUser.create.mockResolvedValue(mockUser as any);
      mockGenerateToken.mockReturnValue('mock-jwt-token');
      mockCNPJService.validateCNPJWithAPI.mockResolvedValue(mockCNPJValidation);
      mockCNPJService.formatCNPJ.mockReturnValue('12.345.678/0001-90');

      // Act
      const response = await request(app)
        .post('/api/auth/register-supplier')
        .send(validSupplierData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(MockUser.create).toHaveBeenCalledWith({
        email: 'supplier@example.com',
        password: 'password123',
        cpf: '12345678901',
        address: 'Test Address, 123', // Fallback to original
        companyName: 'Test Company', // Fallback to original
        cnpj: '12.345.678/0001-90',
        role: 'supplier',
        status: 'pending',
        companyType: 'supplier',
        industrySector: 'other',
        corporateName: undefined,
      });
    });

    it('should handle CNPJ service errors gracefully', async () => {
      // Arrange
      MockUser.findOne.mockResolvedValue(null);
      mockCNPJService.validateCNPJWithAPI.mockRejectedValue(new Error('CNPJ service unavailable'));

      // Act
      const response = await request(app)
        .post('/api/auth/register-supplier')
        .send(validSupplierData)
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      MockUser.findOne.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app)
        .post('/api/auth/register-supplier')
        .send(validSupplierData)
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should sanitize email during registration', async () => {
      // Arrange
      const dataWithSpaces = {
        email: '  test@example.com  ',
        password: 'password123',
        cpf: '12345678901',
        address: 'Test Address, 123',
        companyName: 'Test Company',
        corporateName: 'Test Corp',
        cnpj: '12.345.678/0001-90',
        industrySector: 'other',
        companyType: 'buyer',
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com', // Should be normalized
        cpf: '12345678901',
        address: 'Test Address, 123',
        role: 'customer',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      MockUser.findOne.mockResolvedValue(null);
      MockUser.create.mockResolvedValue(mockUser as any);
      mockGenerateToken.mockReturnValue('mock-jwt-token');
      mockCNPJService.validateCNPJWithAPI.mockResolvedValue({
        valid: true,
        address: 'Test Address, 123',
        companyName: 'Test Company',
      });
      mockCNPJService.formatCNPJ.mockReturnValue('12.345.678/0001-90');

      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(dataWithSpaces)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should handle very long input strings', async () => {
      // Arrange
      const longString = 'a'.repeat(1000);
      const invalidData = {
        email: longString + '@example.com',
        password: 'password123',
        cpf: '12345678901',
        address: 'Test Address, 123',
      };

      // Act
      const response = await request(app).post('/api/auth/register').send(invalidData).expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle malformed JSON gracefully', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send('invalid json')
        .expect(400);

      // Assert
      expect(response.body).toBeDefined();
    });
  });
});
