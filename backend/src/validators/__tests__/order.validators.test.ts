import express from 'express';
import request from 'supertest';
import { validationResult } from 'express-validator';
import {
  validateNfeModulo11,
  updateOrderStatusValidation,
  updateOrderNfeValidation,
} from '../order.validators';

/**
 * The Modulo 11 algorithm used by SEFAZ for Brazilian NF-e keys:
 *
 *   weights cycle:  2, 3, 4, 5, 6, 7, 8, 9 (right-to-left for the first 43 digits)
 *   remainder = sum % 11
 *   check digit = remainder < 2 ? 0 : 11 - remainder
 *
 * The helper calculateCheckDigit below lets us build fixture keys programmatically
 * so the tests are self-documenting and not just "magic numbers".
 */
function buildKey(first43: string): string {
  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let sum = 0;
  for (let i = 0; i < 43; i++) {
    sum += parseInt(first43[i], 10) * weights[(42 - i) % 8];
  }
  const rem = sum % 11;
  const check = rem < 2 ? 0 : 11 - rem;
  return first43 + String(check);
}

describe('validateNfeModulo11', () => {
  describe('format validation', () => {
    it('should return false for a string shorter than 44 digits', () => {
      expect(validateNfeModulo11('12345')).toBe(false);
    });

    it('should return false for a string longer than 44 digits', () => {
      expect(validateNfeModulo11('1'.repeat(45))).toBe(false);
    });

    it('should return false when the string contains non-digit characters', () => {
      const key = 'A' + '1'.repeat(43);
      expect(validateNfeModulo11(key)).toBe(false);
    });

    it('should return false for an empty string', () => {
      expect(validateNfeModulo11('')).toBe(false);
    });
  });

  describe('check digit validation', () => {
    it('should return true for a key with a valid check digit', () => {
      // Use a known-good key from a public SEFAZ example
      const key = buildKey('4321011234567800019455001000001476100004768');
      expect(validateNfeModulo11(key)).toBe(true);
    });

    it('should return false when the check digit is wrong', () => {
      const validKey = buildKey('4321011234567800019455001000001476100004768');
      // Corrupt the last digit
      const wrongCheckDigit = (parseInt(validKey[43], 10) + 1) % 10;
      const corruptKey = validKey.slice(0, 43) + String(wrongCheckDigit);
      expect(validateNfeModulo11(corruptKey)).toBe(false);
    });

    it('should return true for a key whose check digit resolves to 0 (remainder < 2)', () => {
      // Find a prefix where remainder yields check = 0
      // We know remainder = 0 → check = 0; remainder = 1 → check = 0
      // Brute-force a valid key deterministically
      const prefix = '0'.repeat(43);
      const key = buildKey(prefix);
      expect(validateNfeModulo11(key)).toBe(true);
    });

    it('should return true for the fixture key used across all tests', () => {
      // Shared constant across the test suite
      const key = '35240312345678000195550010000014761000047680';
      // Verify it is valid before relying on it elsewhere
      expect(validateNfeModulo11(key)).toBe(true);
    });
  });
});

describe('nfeAccessKeyChain integration', () => {
  const app = express();
  app.use(express.json());
  app.post('/test', updateOrderStatusValidation, (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    res.status(200).json({ success: true });
  });

  it('should pass with a valid 44-digit NFe key', async () => {
    // Build a valid key using the same helper
    const first43 = '4321011234567800019455001000001476100004768';
    const weights = [2, 3, 4, 5, 6, 7, 8, 9];
    let sum = 0;
    for (let i = 0; i < 43; i++) {
      sum += parseInt(first43[i], 10) * weights[(42 - i) % 8];
    }
    const rem = sum % 11;
    const check = rem < 2 ? 0 : 11 - rem;
    const validKey = first43 + String(check);

    const response = await request(app)
      .post('/test')
      .send({ status: 'shipped', nfeAccessKey: validKey })
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should fail with invalid check digit', async () => {
    const first43 = '4321011234567800019455001000001476100004768';
    const weights = [2, 3, 4, 5, 6, 7, 8, 9];
    let sum = 0;
    for (let i = 0; i < 43; i++) {
      sum += parseInt(first43[i], 10) * weights[(42 - i) % 8];
    }
    const rem = sum % 11;
    const check = rem < 2 ? 0 : 11 - rem;
    const wrongCheck = (check + 1) % 10;
    const invalidKey = first43 + String(wrongCheck);

    const response = await request(app)
      .post('/test')
      .send({ status: 'shipped', nfeAccessKey: invalidKey })
      .expect(400);

    const errors = response.body.errors.map((e: any) => e.msg);
    expect(errors).toContain('NF-e access key has an invalid Modulo 11 check digit');
  });

  it('should fail with non-44-digit key', async () => {
    const response = await request(app)
      .post('/test')
      .send({ status: 'shipped', nfeAccessKey: '12345' })
      .expect(400);

    const errors = response.body.errors.map((e: any) => e.msg);
    expect(errors).toContain('NF-e access key must be exactly 44 numeric digits');
  });

  it('should pass when nfeAccessKey is empty (optional field)', async () => {
    const response = await request(app)
      .post('/test')
      .send({ status: 'shipped', nfeAccessKey: '' })
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should pass when nfeAccessKey is not provided', async () => {
    const response = await request(app).post('/test').send({ status: 'shipped' }).expect(200);

    expect(response.body.success).toBe(true);
  });
});

describe('updateOrderNfeValidation (default fieldName parameter)', () => {
  const nfeApp = express();
  nfeApp.use(express.json());
  nfeApp.post('/nfe-test', updateOrderNfeValidation, (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    res.status(200).json({ success: true });
  });

  it('should pass when nfeAccessKey uses default field name and is valid', async () => {
    const first43 = '4321011234567800019455001000001476100004768';
    const weights = [2, 3, 4, 5, 6, 7, 8, 9];
    let sum = 0;
    for (let i = 0; i < 43; i++) {
      sum += parseInt(first43[i], 10) * weights[(42 - i) % 8];
    }
    const rem = sum % 11;
    const check = rem < 2 ? 0 : 11 - rem;
    const validKey = first43 + String(check);

    const response = await request(nfeApp)
      .post('/nfe-test')
      .send({ nfeAccessKey: validKey })
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should pass when no nfe fields provided (all optional)', async () => {
    const response = await request(nfeApp).post('/nfe-test').send({}).expect(200);
    expect(response.body.success).toBe(true);
  });

  it('should reject invalid nfeAccessKey using default field name', async () => {
    const response = await request(nfeApp)
      .post('/nfe-test')
      .send({ nfeAccessKey: '12345' })
      .expect(400);

    expect(response.body.errors.map((e: any) => e.msg)).toContain(
      'NF-e access key must be exactly 44 numeric digits'
    );
  });
});
