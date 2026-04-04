describe('Quotation Model', () => {
  it('should be importable', () => {
    const Quotation = require('../../models/Quotation').default;
    expect(Quotation).toBeDefined();
  });

  it('should have correct table name', () => {
    const Quotation = require('../../models/Quotation').default;
    expect(Quotation.getTableName()).toBe('quotations');
  });

  it('should have required attributes defined', () => {
    const Quotation = require('../../models/Quotation').default;
    const attrs = Quotation.getAttributes();

    expect(attrs).toHaveProperty('id');
    expect(attrs).toHaveProperty('companyId');
    expect(attrs).toHaveProperty('status');
    expect(attrs).toHaveProperty('adminNotes');
    expect(attrs).toHaveProperty('totalAmount');
    expect(attrs).toHaveProperty('validUntil');
    expect(attrs).toHaveProperty('requestedDeliveryDate');
  });

  it('should have pending as default status', () => {
    const Quotation = require('../../models/Quotation').default;
    const attrs = Quotation.getAttributes();
    expect(attrs.status.defaultValue).toBe('pending');
  });

  it('should have auto-increment id as primary key', () => {
    const Quotation = require('../../models/Quotation').default;
    const attrs = Quotation.getAttributes();
    expect(attrs.id.primaryKey).toBe(true);
    expect(attrs.id.autoIncrement).toBe(true);
  });

  it('should allow null for optional fields', () => {
    const Quotation = require('../../models/Quotation').default;
    const attrs = Quotation.getAttributes();
    expect(attrs.adminNotes.allowNull).toBe(true);
    expect(attrs.totalAmount.allowNull).toBe(true);
    expect(attrs.validUntil.allowNull).toBe(true);
    expect(attrs.requestedDeliveryDate.allowNull).toBe(true);
  });
});
