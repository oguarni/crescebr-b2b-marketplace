import { authService } from '../authService';
import User from '../../models/User';
import { CNPJService } from '../cnpjService';

jest.mock('../../models/User');
jest.mock('../cnpjService');

const MockUser = User as jest.Mocked<typeof User>;
const MockCNPJService = CNPJService as jest.Mocked<typeof CNPJService>;

// Setup mock implementations
MockCNPJService.formatCNPJ = jest.fn((cnpj: string) => cnpj) as any;
MockCNPJService.validateCNPJWithAPI = jest.fn() as any;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockCNPJService.formatCNPJ = jest.fn((cnpj: string) => cnpj) as any;
  });

  describe('register', () => {
    const validInput = {
      email: 'new@example.com',
      password: 'password123',
      cpf: '12345678901',
      address: '123 Main St',
      companyName: 'New Co',
      corporateName: 'New Co LTDA',
      cnpj: '12345678000190',
      industrySector: 'tech',
      companyType: 'buyer' as const,
    };

    it('should register a new buyer user successfully', async () => {
      (MockUser.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (MockCNPJService.validateCNPJWithAPI as jest.Mock).mockResolvedValue({
        valid: true,
        companyName: 'API Company',
        address: 'API Address',
      });
      (MockUser.create as jest.Mock).mockResolvedValue({ id: 1, email: validInput.email });

      const result = await authService.register(validInput);

      expect(MockUser.findOne).toHaveBeenCalledTimes(3);
      expect(MockUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validInput.email,
          role: 'customer',
          status: 'approved',
        })
      );
      expect(result).toBeDefined();
    });

    it('should register a supplier with pending status', async () => {
      (MockUser.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (MockCNPJService.validateCNPJWithAPI as jest.Mock).mockResolvedValue({ valid: true });
      (MockUser.create as jest.Mock).mockResolvedValue({ id: 1, role: 'supplier' });

      await authService.register({ ...validInput, companyType: 'supplier' });

      expect(MockUser.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'supplier', status: 'pending' })
      );
    });

    it('should throw when email already exists', async () => {
      (MockUser.findOne as jest.Mock).mockResolvedValueOnce({ id: 99 });

      await expect(authService.register(validInput)).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should throw when CPF already exists', async () => {
      (MockUser.findOne as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 99 });

      await expect(authService.register(validInput)).rejects.toThrow(
        'User with this CPF already exists'
      );
    });

    it('should throw when CNPJ already exists', async () => {
      (MockUser.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 99 });

      await expect(authService.register(validInput)).rejects.toThrow(
        'Company with this CNPJ already exists'
      );
    });

    it('should throw when CNPJ validation fails', async () => {
      (MockUser.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (MockCNPJService.validateCNPJWithAPI as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'CNPJ not found in Receita Federal',
      });

      await expect(authService.register(validInput)).rejects.toThrow(
        'CNPJ not found in Receita Federal'
      );
    });

    it('should throw generic error when CNPJ validation fails without message', async () => {
      (MockUser.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (MockCNPJService.validateCNPJWithAPI as jest.Mock).mockResolvedValue({ valid: false });

      await expect(authService.register(validInput)).rejects.toThrow('Invalid CNPJ provided');
    });

    it('should use CNPJ API data for address and companyName when available', async () => {
      (MockUser.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (MockCNPJService.validateCNPJWithAPI as jest.Mock).mockResolvedValue({
        valid: true,
        companyName: 'API Corp',
        address: 'API Address 123',
      });
      (MockUser.create as jest.Mock).mockResolvedValue({ id: 1 });

      await authService.register(validInput);

      expect(MockUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          address: 'API Address 123',
          companyName: 'API Corp',
          corporateName: 'API Corp',
        })
      );
    });

    it('should fall back to input values when CNPJ API data is empty', async () => {
      (MockUser.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (MockCNPJService.validateCNPJWithAPI as jest.Mock).mockResolvedValue({ valid: true });
      (MockUser.create as jest.Mock).mockResolvedValue({ id: 1 });

      await authService.register(validInput);

      expect(MockUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          address: validInput.address,
          companyName: validInput.companyName,
          corporateName: validInput.corporateName,
        })
      );
    });
  });

  describe('registerSupplier', () => {
    const validInput = {
      email: 'supplier@example.com',
      password: 'password123',
      cpf: '12345678901',
      address: '456 Business Ave',
      companyName: 'Supplier Corp',
      cnpj: '98765432000190',
    };

    it('should register supplier successfully', async () => {
      (MockUser.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const cnpjValidation = { valid: true, companyName: 'API Supplier' };
      (MockCNPJService.validateCNPJWithAPI as jest.Mock).mockResolvedValue(cnpjValidation);
      (MockUser.create as jest.Mock).mockResolvedValue({ id: 1 });

      const result = await authService.registerSupplier(validInput);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('cnpjValidation');
      expect(MockUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'supplier',
          companyType: 'supplier',
          status: 'pending',
        })
      );
    });

    it('should use default industrySector "other" when not provided', async () => {
      (MockUser.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (MockCNPJService.validateCNPJWithAPI as jest.Mock).mockResolvedValue({ valid: true });
      (MockUser.create as jest.Mock).mockResolvedValue({ id: 1 });

      await authService.registerSupplier(validInput);

      expect(MockUser.create).toHaveBeenCalledWith(
        expect.objectContaining({ industrySector: 'other' })
      );
    });

    it('should throw when email already exists', async () => {
      (MockUser.findOne as jest.Mock).mockResolvedValueOnce({ id: 99 });
      await expect(authService.registerSupplier(validInput)).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should throw when CPF already exists', async () => {
      (MockUser.findOne as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 99 });
      await expect(authService.registerSupplier(validInput)).rejects.toThrow(
        'User with this CPF already exists'
      );
    });

    it('should throw when CNPJ already exists', async () => {
      (MockUser.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 99 });
      await expect(authService.registerSupplier(validInput)).rejects.toThrow(
        'Company with this CNPJ already exists'
      );
    });
  });

  describe('loginByCnpj', () => {
    it('should return user when credentials are valid', async () => {
      const mockUser = { id: 1, comparePassword: jest.fn().mockResolvedValue(true) };
      (MockUser.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.loginByCnpj('12345678000190', 'password');

      expect(result).toEqual(mockUser);
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password');
    });

    it('should return null when user not found', async () => {
      (MockUser.findOne as jest.Mock).mockResolvedValue(null);

      const result = await authService.loginByCnpj('00000000000000', 'password');
      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      const mockUser = { id: 1, comparePassword: jest.fn().mockResolvedValue(false) };
      (MockUser.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.loginByCnpj('12345678000190', 'wrong');
      expect(result).toBeNull();
    });
  });

  describe('loginByEmail', () => {
    it('should return user when credentials are valid', async () => {
      const mockUser = { id: 1, comparePassword: jest.fn().mockResolvedValue(true) };
      (MockUser.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.loginByEmail('test@example.com', 'password');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      (MockUser.findOne as jest.Mock).mockResolvedValue(null);

      const result = await authService.loginByEmail('noone@example.com', 'password');
      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      const mockUser = { id: 1, comparePassword: jest.fn().mockResolvedValue(false) };
      (MockUser.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.loginByEmail('test@example.com', 'wrong');
      expect(result).toBeNull();
    });
  });

  describe('getProfile', () => {
    it('should return user by id', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      (MockUser.findByPk as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.getProfile(1);

      expect(MockUser.findByPk).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      (MockUser.findByPk as jest.Mock).mockResolvedValue(null);
      const result = await authService.getProfile(999);
      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const mockUser = { id: 1 };
      (MockUser.findByPk as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.getUserById(1);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      (MockUser.findByPk as jest.Mock).mockResolvedValue(null);
      const result = await authService.getUserById(999);
      expect(result).toBeNull();
    });
  });
});
