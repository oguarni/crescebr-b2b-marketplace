describe('Order Model', () => {
  // Model definition tests — no DB calls needed, just verify schema
  it('should be importable', () => {
    const Order = require('../../models/Order').default;
    expect(Order).toBeDefined();
  });

  it('should have correct table name', () => {
    const Order = require('../../models/Order').default;
    expect(Order.getTableName()).toBe('orders');
  });

  it('should have required attributes defined', () => {
    const Order = require('../../models/Order').default;
    const attrs = Order.getAttributes();

    expect(attrs).toHaveProperty('id');
    expect(attrs).toHaveProperty('status');
    expect(attrs).toHaveProperty('companyId');
    expect(attrs).toHaveProperty('quotationId');
    expect(attrs).toHaveProperty('totalAmount');
    expect(attrs).toHaveProperty('estimatedDeliveryDate');
    expect(attrs).toHaveProperty('trackingNumber');
    expect(attrs).toHaveProperty('nfeAccessKey');
    expect(attrs).toHaveProperty('nfeUrl');
  });

  it('should have UUID primary key', () => {
    const Order = require('../../models/Order').default;
    const attrs = Order.getAttributes();
    expect(attrs.id.primaryKey).toBe(true);
  });

  it('should have pending as default status', () => {
    const Order = require('../../models/Order').default;
    const attrs = Order.getAttributes();
    expect(attrs.status.defaultValue).toBe('pending');
  });

  it('should have status field with default pending value', () => {
    const Order = require('../../models/Order').default;
    const attrs = Order.getAttributes();
    expect(attrs.status).toBeDefined();
    expect(attrs.status.defaultValue).toBe('pending');
  });
});
