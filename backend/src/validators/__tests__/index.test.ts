import * as validators from '../index';

describe('Validators Index', () => {
  it('should re-export quotation validators', () => {
    expect(validators.createQuotationValidation).toBeDefined();
    expect(Array.isArray(validators.createQuotationValidation)).toBe(true);
    expect(validators.updateQuotationValidation).toBeDefined();
    expect(Array.isArray(validators.updateQuotationValidation)).toBe(true);
    expect(validators.calculateQuoteValidation).toBeDefined();
    expect(validators.compareSupplierQuotesValidation).toBeDefined();
  });

  it('should re-export product validators', () => {
    expect(validators.productValidation).toBeDefined();
    expect(Array.isArray(validators.productValidation)).toBe(true);
  });

  it('should re-export order validators', () => {
    expect(validators.createOrderValidation).toBeDefined();
    expect(Array.isArray(validators.createOrderValidation)).toBe(true);
    expect(validators.validateNfeModulo11).toBeDefined();
    expect(typeof validators.validateNfeModulo11).toBe('function');
    expect(validators.updateOrderStatusValidation).toBeDefined();
    expect(validators.updateOrderNfeValidation).toBeDefined();
  });

  it('should re-export auth validators', () => {
    expect(validators.registerValidation).toBeDefined();
    expect(Array.isArray(validators.registerValidation)).toBe(true);
    expect(validators.loginValidation).toBeDefined();
    expect(Array.isArray(validators.loginValidation)).toBe(true);
    expect(validators.loginEmailValidation).toBeDefined();
    expect(validators.supplierRegisterValidation).toBeDefined();
    expect(validators.refreshTokenValidation).toBeDefined();
  });
});
