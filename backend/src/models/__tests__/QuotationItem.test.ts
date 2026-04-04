describe('QuotationItem Model', () => {
  it('should be importable', () => {
    const QuotationItem = require('../../models/QuotationItem').default;
    expect(QuotationItem).toBeDefined();
  });

  it('should have correct table name', () => {
    const QuotationItem = require('../../models/QuotationItem').default;
    expect(QuotationItem.getTableName()).toBe('quotation_items');
  });

  it('should have required attributes defined', () => {
    const QuotationItem = require('../../models/QuotationItem').default;
    const attrs = QuotationItem.getAttributes();

    expect(attrs).toHaveProperty('id');
    expect(attrs).toHaveProperty('quotationId');
    expect(attrs).toHaveProperty('productId');
    expect(attrs).toHaveProperty('quantity');
  });

  it('should have auto-increment id as primary key', () => {
    const QuotationItem = require('../../models/QuotationItem').default;
    const attrs = QuotationItem.getAttributes();
    expect(attrs.id.primaryKey).toBe(true);
    expect(attrs.id.autoIncrement).toBe(true);
  });

  it('should not allow null for required fields', () => {
    const QuotationItem = require('../../models/QuotationItem').default;
    const attrs = QuotationItem.getAttributes();
    expect(attrs.quotationId.allowNull).toBe(false);
    expect(attrs.productId.allowNull).toBe(false);
    expect(attrs.quantity.allowNull).toBe(false);
  });

  it('should have quantity min validation of 1', () => {
    const QuotationItem = require('../../models/QuotationItem').default;
    const attrs = QuotationItem.getAttributes();
    expect(attrs.quantity.validate).toBeDefined();
    expect(attrs.quantity.validate!.min).toBe(1);
  });
});
