import request from 'supertest';
import {
  app,
  actor,
  models,
  orderId,
  internalMessage,
  seedMutationContracts,
  restoreMutationContracts,
} from './mutationContractFixtures';

beforeEach(async () => {
  await seedMutationContracts();
  await models.Order.update({ status: 'delivered' }, { where: { id: orderId } });
});
afterEach(restoreMutationContracts);

describe('rating eligibility and error contracts through real services', () => {
  it.each([true, false])(
    'allows rating a supplier from a completed order (explicit order: %s)',
    async explicit => {
      const response = await request(app)
        .post('/api/v1/ratings')
        .set(actor())
        .send({ supplierId: 2, score: 4, ...(explicit ? { orderId } : {}) })
        .expect(201);
      expect(response.body.message).toBe('Rating created successfully');
      expect(response.body.data).toMatchObject({ supplierId: 2, buyerId: 1, score: 4 });
      expect(await models.Rating.count()).toBe(1);
    }
  );

  it.each([true, false])(
    'rejects a supplier unrelated to completed orders (explicit order: %s)',
    async explicit => {
      const response = await request(app)
        .post('/api/v1/ratings')
        .set(actor())
        .send({ supplierId: 3, score: 4, ...(explicit ? { orderId } : {}) })
        .expect(403);
      expect(response.body).toEqual({
        success: false,
        error: 'You can only rate suppliers from completed orders',
      });
      expect(await models.Rating.count()).toBe(0);
    }
  );

  it('already retains the missing supplier and duplicate-rating domain responses', async () => {
    const missing = await request(app)
      .post('/api/v1/ratings')
      .set(actor())
      .send({ supplierId: 99, score: 4, orderId })
      .expect(404);
    expect(missing.body.error).toBe('Supplier not found');
    await request(app)
      .post('/api/v1/ratings')
      .set(actor())
      .send({ supplierId: 2, score: 4, orderId })
      .expect(201);
    const duplicate = await request(app)
      .post('/api/v1/ratings')
      .set(actor())
      .send({ supplierId: 2, score: 4, orderId })
      .expect(400);
    expect(duplicate.body.error).toBe('You have already rated this order');
  });

  it('already hides unexpected rating writes', async () => {
    jest.spyOn(models.Rating, 'create').mockRejectedValueOnce(new Error(internalMessage));
    const response = await request(app)
      .post('/api/v1/ratings')
      .set(actor())
      .send({ supplierId: 2, score: 4, orderId })
      .expect(500);
    expect(response.body).toEqual({ success: false, error: 'Server Error' });
    expect(await models.Rating.count()).toBe(0);
  });
});
