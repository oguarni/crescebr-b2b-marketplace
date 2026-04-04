describe('Rating Model', () => {
  it('should be importable', () => {
    const Rating = require('../../models/Rating').default;
    expect(Rating).toBeDefined();
  });

  it('should have correct table name', () => {
    const Rating = require('../../models/Rating').default;
    expect(Rating.getTableName()).toBe('ratings');
  });

  it('should have required attributes defined', () => {
    const Rating = require('../../models/Rating').default;
    const attrs = Rating.getAttributes();

    expect(attrs).toHaveProperty('id');
    expect(attrs).toHaveProperty('supplierId');
    expect(attrs).toHaveProperty('buyerId');
    expect(attrs).toHaveProperty('orderId');
    expect(attrs).toHaveProperty('score');
    expect(attrs).toHaveProperty('comment');
  });

  it('should have auto-increment id as primary key', () => {
    const Rating = require('../../models/Rating').default;
    const attrs = Rating.getAttributes();
    expect(attrs.id.primaryKey).toBe(true);
    expect(attrs.id.autoIncrement).toBe(true);
  });

  it('should have score validation with min 1 and max 5', () => {
    const Rating = require('../../models/Rating').default;
    const attrs = Rating.getAttributes();
    expect(attrs.score.validate).toBeDefined();
    expect(attrs.score.validate!.min).toBe(1);
    expect(attrs.score.validate!.max).toBe(5);
  });

  it('should allow null for optional fields', () => {
    const Rating = require('../../models/Rating').default;
    const attrs = Rating.getAttributes();
    expect(attrs.orderId.allowNull).toBe(true);
    expect(attrs.comment.allowNull).toBe(true);
  });

  it('should not allow null for required fields', () => {
    const Rating = require('../../models/Rating').default;
    const attrs = Rating.getAttributes();
    expect(attrs.supplierId.allowNull).toBe(false);
    expect(attrs.buyerId.allowNull).toBe(false);
    expect(attrs.score.allowNull).toBe(false);
  });
});
