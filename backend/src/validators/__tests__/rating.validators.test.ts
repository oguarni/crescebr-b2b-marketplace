import { validationResult } from 'express-validator';
import { createRatingValidation, updateRatingValidation } from '../rating.validators';

async function runValidators(validators: any[], body: any) {
  const req = { body } as any;
  for (const validator of validators) {
    await validator.run(req);
  }
  return validationResult(req);
}

describe('Rating Validators', () => {
  describe('createRatingValidation', () => {
    it('should pass with valid required fields', async () => {
      const result = await runValidators(createRatingValidation, {
        supplierId: 1,
        score: 5,
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with all fields including optional ones', async () => {
      const result = await runValidators(createRatingValidation, {
        supplierId: 1,
        orderId: 'order-uuid-123',
        score: 4,
        comment: 'Great service',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with missing supplierId', async () => {
      const result = await runValidators(createRatingValidation, { score: 5 });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'supplierId')).toBe(true);
    });

    it('should fail with supplierId of 0', async () => {
      const result = await runValidators(createRatingValidation, { supplierId: 0, score: 5 });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with missing score', async () => {
      const result = await runValidators(createRatingValidation, { supplierId: 1 });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'score')).toBe(true);
    });

    it('should fail with score below 1', async () => {
      const result = await runValidators(createRatingValidation, { supplierId: 1, score: 0 });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with score above 5', async () => {
      const result = await runValidators(createRatingValidation, { supplierId: 1, score: 6 });
      expect(result.isEmpty()).toBe(false);
    });

    it('should pass with score of 1 (minimum)', async () => {
      const result = await runValidators(createRatingValidation, { supplierId: 1, score: 1 });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with score of 5 (maximum)', async () => {
      const result = await runValidators(createRatingValidation, { supplierId: 1, score: 5 });
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with comment exceeding 1000 characters', async () => {
      const result = await runValidators(createRatingValidation, {
        supplierId: 1,
        score: 5,
        comment: 'a'.repeat(1001),
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'comment')).toBe(true);
    });

    it('should pass with comment at exactly 1000 characters', async () => {
      const result = await runValidators(createRatingValidation, {
        supplierId: 1,
        score: 5,
        comment: 'a'.repeat(1000),
      });
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('updateRatingValidation', () => {
    it('should pass with valid score', async () => {
      const result = await runValidators(updateRatingValidation, { score: 3 });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with valid comment', async () => {
      const result = await runValidators(updateRatingValidation, { comment: 'Updated' });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with both score and comment', async () => {
      const result = await runValidators(updateRatingValidation, {
        score: 4,
        comment: 'Updated comment',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with empty body (all fields optional)', async () => {
      const result = await runValidators(updateRatingValidation, {});
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with score below 1', async () => {
      const result = await runValidators(updateRatingValidation, { score: 0 });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with score above 5', async () => {
      const result = await runValidators(updateRatingValidation, { score: 6 });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with comment exceeding 500 characters', async () => {
      const result = await runValidators(updateRatingValidation, {
        comment: 'a'.repeat(501),
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should pass with comment at exactly 500 characters', async () => {
      const result = await runValidators(updateRatingValidation, {
        comment: 'a'.repeat(500),
      });
      expect(result.isEmpty()).toBe(true);
    });
  });
});
