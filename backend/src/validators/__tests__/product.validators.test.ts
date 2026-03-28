import { validationResult } from 'express-validator';
import { productValidation } from '../product.validators';

// Helper to run validators against a mock request body
async function runValidators(validators: any[], body: any) {
  const req = { body } as any;
  for (const validator of validators) {
    await validator.run(req);
  }
  return validationResult(req);
}

describe('Product Validators', () => {
  describe('productValidation', () => {
    const validBody = {
      name: 'Industrial Widget',
      description: 'A high-quality industrial widget for manufacturing.',
      price: 99.99,
      imageUrl: 'https://example.com/images/widget.jpg',
      category: 'Manufacturing',
    };

    it('should pass with valid product data', async () => {
      const result = await runValidators(productValidation, validBody);
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with all optional fields included', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        specifications: 'Weight: 500g, Material: Steel',
        minimumOrderQuantity: 10,
      });
      expect(result.isEmpty()).toBe(true);
    });

    // name validation
    it('should fail with empty name', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        name: '',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'name')).toBe(true);
    });

    it('should fail with missing name', async () => {
      const { name, ...bodyWithoutName } = validBody;
      const result = await runValidators(productValidation, bodyWithoutName);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      const nameError = errors.find((e: any) => e.path === 'name');
      expect(nameError?.msg).toBe('Product name is required');
    });

    // description validation
    it('should fail with empty description', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        description: '',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'description')).toBe(true);
    });

    it('should fail with missing description', async () => {
      const { description, ...bodyWithoutDesc } = validBody;
      const result = await runValidators(productValidation, bodyWithoutDesc);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      const descError = errors.find((e: any) => e.path === 'description');
      expect(descError?.msg).toBe('Product description is required');
    });

    // price validation
    it('should fail with non-numeric price', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        price: 'not-a-number',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'price')).toBe(true);
    });

    it('should fail with price of 0', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        price: 0,
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      const priceError = errors.find(
        (e: any) => e.path === 'price' && e.msg === 'Price must be greater than 0'
      );
      expect(priceError).toBeDefined();
    });

    it('should fail with negative price', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        price: -10,
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'price')).toBe(true);
    });

    it('should pass with valid integer price', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        price: 100,
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with valid decimal price', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        price: 49.95,
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with price as string number', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        price: '150.50',
      });
      expect(result.isEmpty()).toBe(true);
    });

    // imageUrl validation
    it('should fail with invalid URL for imageUrl', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        imageUrl: 'not-a-url',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'imageUrl')).toBe(true);
    });

    it('should pass with empty imageUrl (optional field)', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        imageUrl: '',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with valid https URL', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        imageUrl: 'https://cdn.example.com/products/photo.png',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with valid http URL', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        imageUrl: 'http://example.com/image.jpg',
      });
      expect(result.isEmpty()).toBe(true);
    });

    // category validation
    it('should fail with empty category', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        category: '',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'category')).toBe(true);
    });

    it('should fail with missing category', async () => {
      const { category, ...bodyWithoutCategory } = validBody;
      const result = await runValidators(productValidation, bodyWithoutCategory);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      const catError = errors.find((e: any) => e.path === 'category');
      expect(catError?.msg).toBe('Category is required');
    });

    // specifications validation (optional)
    it('should pass without specifications field', async () => {
      const result = await runValidators(productValidation, validBody);
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with valid string specifications', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        specifications: 'Size: Large, Color: Blue',
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with non-string specifications', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        specifications: 12345,
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      const specError = errors.find((e: any) => e.path === 'specifications');
      expect(specError?.msg).toBe('Specifications must be a string');
    });

    // minimumOrderQuantity validation (optional)
    it('should pass without minimumOrderQuantity field', async () => {
      const result = await runValidators(productValidation, validBody);
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with minimumOrderQuantity of 1', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        minimumOrderQuantity: 1,
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with large minimumOrderQuantity', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        minimumOrderQuantity: 1000,
      });
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with minimumOrderQuantity of 0', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        minimumOrderQuantity: 0,
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      const moqError = errors.find((e: any) => e.path === 'minimumOrderQuantity');
      expect(moqError?.msg).toBe('Minimum order quantity must be at least 1');
    });

    it('should fail with negative minimumOrderQuantity', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        minimumOrderQuantity: -5,
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'minimumOrderQuantity')).toBe(true);
    });

    it('should fail with non-integer minimumOrderQuantity', async () => {
      const result = await runValidators(productValidation, {
        ...validBody,
        minimumOrderQuantity: 2.5,
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some((e: any) => e.path === 'minimumOrderQuantity')).toBe(true);
    });

    // Multiple validation errors
    it('should report multiple errors for empty body', async () => {
      const result = await runValidators(productValidation, {});
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      // At minimum: name, description, price, category (imageUrl is optional)
      expect(errors.length).toBeGreaterThanOrEqual(4);
    });

    it('should report errors for all invalid required fields', async () => {
      const result = await runValidators(productValidation, {
        name: '',
        description: '',
        price: 'abc',
        imageUrl: 'not-url',
        category: '',
      });
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      const errorPaths = errors.map((e: any) => e.path);
      expect(errorPaths).toContain('name');
      expect(errorPaths).toContain('description');
      expect(errorPaths).toContain('price');
      expect(errorPaths).toContain('imageUrl');
      expect(errorPaths).toContain('category');
    });
  });
});
