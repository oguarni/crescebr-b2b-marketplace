import { validationResult } from 'express-validator';
import {
  registerValidation,
  loginValidation,
  loginEmailValidation,
  supplierRegisterValidation,
  refreshTokenValidation,
} from '../auth.validators';

// Helper to run validators against a mock request body
async function runValidators(validators: any[], body: any) {
  const req = { body } as any;
  for (const validator of validators) {
    await validator.run(req);
  }
  return validationResult(req);
}

describe('Auth Validators', () => {
  describe('registerValidation', () => {
    const validBody = {
      email: 'user@example.com',
      password: 'securepass123',
      cpf: '12345678901',
      address: '123 Main Street',
      companyName: 'Test Company',
      corporateName: 'Test Company LTDA',
      cnpj: '12345678000190',
      industrySector: 'Technology',
      companyType: 'buyer',
    };

    it('should pass with valid registration data', async () => {
      const result = await runValidators(registerValidation, validBody);
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid email', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        email: 'not-an-email',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'email')).toBe(true);
    });

    it('should fail with empty email', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        email: '',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with short password (less than 6 chars)', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        password: '12345',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'password')).toBe(true);
    });

    it('should pass with password of exactly 6 chars', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        password: '123456',
      });
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'password')).toBe(false);
    });

    it('should fail with cpf shorter than 11 chars', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        cpf: '1234567890',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'cpf')).toBe(true);
    });

    it('should fail with cpf longer than 14 chars', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        cpf: '123456789012345',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'cpf')).toBe(true);
    });

    it('should pass with cpf of 11 chars', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        cpf: '12345678901',
      });
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'cpf')).toBe(false);
    });

    it('should pass with formatted cpf of 14 chars', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        cpf: '123.456.789-01',
      });
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'cpf')).toBe(false);
    });

    it('should fail with empty address', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        address: '',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'address')).toBe(true);
    });

    it('should fail with empty companyName', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        companyName: '',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'companyName')).toBe(true);
    });

    it('should fail with empty corporateName', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        corporateName: '',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'corporateName')).toBe(true);
    });

    it('should fail with cnpj shorter than 14 chars', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        cnpj: '1234567890123',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'cnpj')).toBe(true);
    });

    it('should fail with cnpj longer than 18 chars', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        cnpj: '1234567890123456789',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'cnpj')).toBe(true);
    });

    it('should pass with cnpj of 14 chars', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        cnpj: '12345678000190',
      });
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'cnpj')).toBe(false);
    });

    it('should pass with formatted cnpj of 18 chars', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        cnpj: '12.345.678/0001-90',
      });
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'cnpj')).toBe(false);
    });

    it('should fail with empty industrySector', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        industrySector: '',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'industrySector')).toBe(true);
    });

    it('should fail with invalid companyType', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        companyType: 'invalid',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'companyType')).toBe(true);
    });

    it('should pass with companyType "buyer"', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        companyType: 'buyer',
      });
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'companyType')).toBe(false);
    });

    it('should pass with companyType "supplier"', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        companyType: 'supplier',
      });
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'companyType')).toBe(false);
    });

    it('should pass with companyType "both"', async () => {
      const result = await runValidators(registerValidation, {
        ...validBody,
        companyType: 'both',
      });
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'companyType')).toBe(false);
    });

    it('should report multiple errors for completely invalid body', async () => {
      const result = await runValidators(registerValidation, {});
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('loginValidation', () => {
    const validBody = {
      cnpj: '12345678000190',
      password: 'password123',
    };

    it('should pass with valid login data', async () => {
      const result = await runValidators(loginValidation, validBody);
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with cnpj shorter than 14 chars', async () => {
      const result = await runValidators(loginValidation, {
        ...validBody,
        cnpj: '12345',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'cnpj')).toBe(true);
    });

    it('should fail with cnpj longer than 18 chars', async () => {
      const result = await runValidators(loginValidation, {
        ...validBody,
        cnpj: '1234567890123456789',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should pass with formatted cnpj', async () => {
      const result = await runValidators(loginValidation, {
        ...validBody,
        cnpj: '12.345.678/0001-90',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with empty password', async () => {
      const result = await runValidators(loginValidation, {
        ...validBody,
        password: '',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'password')).toBe(true);
    });

    it('should fail with missing password', async () => {
      const result = await runValidators(loginValidation, {
        cnpj: '12345678000190',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with missing cnpj', async () => {
      const result = await runValidators(loginValidation, {
        password: 'password123',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with empty body', async () => {
      const result = await runValidators(loginValidation, {});
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('loginEmailValidation', () => {
    const validBody = {
      email: 'user@example.com',
      password: 'password123',
    };

    it('should pass with valid email login data', async () => {
      const result = await runValidators(loginEmailValidation, validBody);
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid email', async () => {
      const result = await runValidators(loginEmailValidation, {
        ...validBody,
        email: 'invalid-email',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'email')).toBe(true);
    });

    it('should fail with empty email', async () => {
      const result = await runValidators(loginEmailValidation, {
        ...validBody,
        email: '',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with empty password', async () => {
      const result = await runValidators(loginEmailValidation, {
        ...validBody,
        password: '',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'password')).toBe(true);
    });

    it('should fail with missing fields', async () => {
      const result = await runValidators(loginEmailValidation, {});
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should normalize email', async () => {
      const req = { body: { email: 'User@Example.COM', password: 'password123' } } as any;
      for (const validator of loginEmailValidation) {
        await validator.run(req);
      }
      // normalizeEmail lowercases and normalizes
      expect(req.body.email).toBe('user@example.com');
    });
  });

  describe('supplierRegisterValidation', () => {
    const validBody = {
      email: 'supplier@example.com',
      password: 'securepass123',
      cpf: '12345678901',
      address: '456 Business Avenue',
      companyName: 'Supplier Corp',
      cnpj: '12345678000190',
    };

    it('should pass with valid supplier registration data', async () => {
      const result = await runValidators(supplierRegisterValidation, validBody);
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid email', async () => {
      const result = await runValidators(supplierRegisterValidation, {
        ...validBody,
        email: 'bad-email',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'email')).toBe(true);
    });

    it('should fail with short password', async () => {
      const result = await runValidators(supplierRegisterValidation, {
        ...validBody,
        password: '12345',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'password')).toBe(true);
    });

    it('should fail with cpf shorter than 11 chars', async () => {
      const result = await runValidators(supplierRegisterValidation, {
        ...validBody,
        cpf: '1234567890',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'cpf')).toBe(true);
    });

    it('should fail with empty address', async () => {
      const result = await runValidators(supplierRegisterValidation, {
        ...validBody,
        address: '',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'address')).toBe(true);
    });

    it('should fail with empty companyName', async () => {
      const result = await runValidators(supplierRegisterValidation, {
        ...validBody,
        companyName: '',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'companyName')).toBe(true);
    });

    it('should fail with cnpj shorter than 14 chars', async () => {
      const result = await runValidators(supplierRegisterValidation, {
        ...validBody,
        cnpj: '1234567890',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'cnpj')).toBe(true);
    });

    it('should not require corporateName (unlike registerValidation)', async () => {
      const result = await runValidators(supplierRegisterValidation, validBody);
      expect(result.isEmpty()).toBe(true);
    });

    it('should not require industrySector (unlike registerValidation)', async () => {
      const result = await runValidators(supplierRegisterValidation, validBody);
      expect(result.isEmpty()).toBe(true);
    });

    it('should not require companyType (unlike registerValidation)', async () => {
      const result = await runValidators(supplierRegisterValidation, validBody);
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with empty body', async () => {
      const result = await runValidators(supplierRegisterValidation, {});
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('refreshTokenValidation', () => {
    it('should pass with valid refresh token', async () => {
      const result = await runValidators(refreshTokenValidation, {
        refreshToken: 'some-valid-refresh-token-string',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with empty refreshToken', async () => {
      const result = await runValidators(refreshTokenValidation, {
        refreshToken: '',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'refreshToken')).toBe(true);
    });

    it('should fail with missing refreshToken', async () => {
      const result = await runValidators(refreshTokenValidation, {});
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'refreshToken')).toBe(true);
    });

    it('should contain the correct error message', async () => {
      const result = await runValidators(refreshTokenValidation, {
        refreshToken: '',
      });
      const errors = result.array();
      const refreshError = errors.find((e: any) => e.path === 'refreshToken');
      expect(refreshError?.msg).toBe('Refresh token is required');
    });
  });
});
