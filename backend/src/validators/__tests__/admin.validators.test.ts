import { validationResult } from 'express-validator';
import {
  verifyCompanyValidation,
  updateCompanyStatusValidation,
  moderateProductValidation,
} from '../admin.validators';

async function runValidators(validators: any[], body: any, params: any = {}) {
  const req = { body, params } as any;
  for (const validator of validators) {
    await validator.run(req);
  }
  return validationResult(req);
}

describe('Admin Validators', () => {
  describe('verifyCompanyValidation', () => {
    it('should pass with valid data', async () => {
      const result = await runValidators(
        verifyCompanyValidation,
        { status: 'approved' },
        { userId: '1' }
      );
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with status rejected', async () => {
      const result = await runValidators(
        verifyCompanyValidation,
        { status: 'rejected', reason: 'Incomplete docs' },
        { userId: '1' }
      );
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid status', async () => {
      const result = await runValidators(
        verifyCompanyValidation,
        { status: 'pending' },
        { userId: '1' }
      );
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'status')).toBe(true);
    });

    it('should fail with missing userId param', async () => {
      const result = await runValidators(verifyCompanyValidation, { status: 'approved' }, {});
      expect(result.isEmpty()).toBe(false);
    });

    it('should pass with optional reason as string', async () => {
      const result = await runValidators(
        verifyCompanyValidation,
        { status: 'approved', reason: 'Valid documents' },
        { userId: '1' }
      );
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass without reason (optional)', async () => {
      const result = await runValidators(
        verifyCompanyValidation,
        { status: 'approved' },
        { userId: '1' }
      );
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with optional validateCNPJ boolean', async () => {
      const result = await runValidators(
        verifyCompanyValidation,
        { status: 'approved', validateCNPJ: true },
        { userId: '1' }
      );
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('updateCompanyStatusValidation', () => {
    it('should pass with valid data', async () => {
      const result = await runValidators(
        updateCompanyStatusValidation,
        { status: 'approved' },
        { userId: '1' }
      );
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid status', async () => {
      const result = await runValidators(
        updateCompanyStatusValidation,
        { status: 'invalid' },
        { userId: '1' }
      );
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with missing userId param', async () => {
      const result = await runValidators(updateCompanyStatusValidation, { status: 'approved' }, {});
      expect(result.isEmpty()).toBe(false);
    });

    it('should pass with optional reason', async () => {
      const result = await runValidators(
        updateCompanyStatusValidation,
        { status: 'rejected', reason: 'Missing documents' },
        { userId: '1' }
      );
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('moderateProductValidation', () => {
    it('should pass with action "approve"', async () => {
      const result = await runValidators(
        moderateProductValidation,
        { action: 'approve' },
        { productId: '1' }
      );
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with action "reject"', async () => {
      const result = await runValidators(
        moderateProductValidation,
        { action: 'reject' },
        { productId: '1' }
      );
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with action "remove"', async () => {
      const result = await runValidators(
        moderateProductValidation,
        { action: 'remove' },
        { productId: '1' }
      );
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid action', async () => {
      const result = await runValidators(
        moderateProductValidation,
        { action: 'delete' },
        { productId: '1' }
      );
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with missing productId param', async () => {
      const result = await runValidators(moderateProductValidation, { action: 'approve' }, {});
      expect(result.isEmpty()).toBe(false);
    });
  });
});
