import { validateNfeModulo11 } from '../order.validators';

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
