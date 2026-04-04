import { validationResult } from 'express-validator';
import {
  createQuotationValidation,
  updateQuotationValidation,
  calculateQuoteValidation,
  compareSupplierQuotesValidation,
} from '../quotation.validators';

async function runValidators(validators: any[], body: any) {
  const req = { body } as any;
  for (const validator of validators) {
    await validator.run(req);
  }
  return validationResult(req);
}

describe('Quotation Validators', () => {
  describe('createQuotationValidation', () => {
    it('should pass with valid items', async () => {
      const result = await runValidators(createQuotationValidation, {
        items: [{ productId: 1, quantity: 5 }],
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with empty items array', async () => {
      const result = await runValidators(createQuotationValidation, { items: [] });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail when items is not an array', async () => {
      const result = await runValidators(createQuotationValidation, { items: 'not-array' });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with missing productId', async () => {
      const result = await runValidators(createQuotationValidation, {
        items: [{ quantity: 5 }],
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with productId of 0', async () => {
      const result = await runValidators(createQuotationValidation, {
        items: [{ productId: 0, quantity: 5 }],
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with missing quantity', async () => {
      const result = await runValidators(createQuotationValidation, {
        items: [{ productId: 1 }],
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with quantity of 0', async () => {
      const result = await runValidators(createQuotationValidation, {
        items: [{ productId: 1, quantity: 0 }],
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should pass with multiple valid items', async () => {
      const result = await runValidators(createQuotationValidation, {
        items: [
          { productId: 1, quantity: 5 },
          { productId: 2, quantity: 10 },
        ],
      });
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('updateQuotationValidation', () => {
    it('should pass with valid status', async () => {
      const result = await runValidators(updateQuotationValidation, { status: 'processed' });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with all valid statuses', async () => {
      for (const status of ['pending', 'processed', 'completed', 'rejected']) {
        const result = await runValidators(updateQuotationValidation, { status });
        expect(result.isEmpty()).toBe(true);
      }
    });

    it('should fail with invalid status', async () => {
      const result = await runValidators(updateQuotationValidation, { status: 'invalid' });
      expect(result.isEmpty()).toBe(false);
    });

    it('should pass with optional adminNotes', async () => {
      const result = await runValidators(updateQuotationValidation, {
        status: 'processed',
        adminNotes: 'Some notes',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass without adminNotes', async () => {
      const result = await runValidators(updateQuotationValidation, { status: 'pending' });
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('calculateQuoteValidation', () => {
    it('should pass with valid items only', async () => {
      const result = await runValidators(calculateQuoteValidation, {
        items: [{ productId: 1, quantity: 5 }],
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with all optional fields', async () => {
      const result = await runValidators(calculateQuoteValidation, {
        items: [{ productId: 1, quantity: 5 }],
        buyerLocation: 'São Paulo',
        supplierLocation: 'Curitiba',
        shippingMethod: 'express',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid shipping method', async () => {
      const result = await runValidators(calculateQuoteValidation, {
        items: [{ productId: 1, quantity: 5 }],
        shippingMethod: 'overnight',
      });
      expect(result.isEmpty()).toBe(false);
    });

    it('should pass with valid shipping methods', async () => {
      for (const method of ['standard', 'express', 'economy']) {
        const result = await runValidators(calculateQuoteValidation, {
          items: [{ productId: 1, quantity: 5 }],
          shippingMethod: method,
        });
        expect(result.isEmpty()).toBe(true);
      }
    });

    it('should fail with empty items', async () => {
      const result = await runValidators(calculateQuoteValidation, { items: [] });
      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('compareSupplierQuotesValidation', () => {
    it('should pass with valid required fields', async () => {
      const result = await runValidators(compareSupplierQuotesValidation, {
        productId: 1,
        quantity: 10,
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with all optional fields', async () => {
      const result = await runValidators(compareSupplierQuotesValidation, {
        productId: 1,
        quantity: 10,
        buyerLocation: 'São Paulo',
        supplierIds: [1, 2, 3],
        shippingMethod: 'standard',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with missing productId', async () => {
      const result = await runValidators(compareSupplierQuotesValidation, { quantity: 10 });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with missing quantity', async () => {
      const result = await runValidators(compareSupplierQuotesValidation, { productId: 1 });
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with invalid shipping method', async () => {
      const result = await runValidators(compareSupplierQuotesValidation, {
        productId: 1,
        quantity: 10,
        shippingMethod: 'invalid',
      });
      expect(result.isEmpty()).toBe(false);
    });
  });
});
