import request from 'supertest';
import {
  app,
  actor,
  models,
  internalMessage,
  seedMutationContracts,
  restoreMutationContracts,
} from './mutationContractFixtures';

beforeEach(seedMutationContracts);
afterEach(restoreMutationContracts);

describe('quotation errors through real services and HTTP middleware', () => {
  it('preserves creation validation messages and leaves no rows', async () => {
    const missing = await request(app)
      .post('/api/v1/quotations')
      .set(actor())
      .send({ items: [{ productId: 99, quantity: 5 }] })
      .expect(400);
    expect(missing.body).toEqual({ success: false, error: 'Products not found: 99' });
    const moq = await request(app)
      .post('/api/v1/quotations')
      .set(actor())
      .send({ items: [{ productId: 1, quantity: 1 }] })
      .expect(400);
    expect(moq.body.error).toBe(
      'Quantity for product "Contract product" must be at least 5 units. Current: 1'
    );
    expect(await models.Quotation.count()).toBe(1);
  });

  it('hides item-write failures and preserves quotation rollback', async () => {
    jest.spyOn(models.QuotationItem, 'create').mockRejectedValueOnce(new Error(internalMessage));
    const response = await request(app)
      .post('/api/v1/quotations')
      .set(actor())
      .send({ items: [{ productId: 1, quantity: 5 }] })
      .expect(500);
    expect(response.body).toEqual({ success: false, error: 'Server Error' });
    expect(await models.Quotation.count()).toBe(1);
    expect(await models.QuotationItem.count()).toBe(1);
  });

  it.each(['read', 'update', 'process', 'calculations'])(
    'returns 404 for a missing quotation during %s',
    async action => {
      const route = request(app);
      const response = await (
        action === 'read'
          ? route.get('/api/v1/quotations/99')
          : action === 'update'
            ? route.put('/api/v1/quotations/admin/99').send({ status: 'processed' })
            : action === 'process'
              ? route.post('/api/v1/quotations/admin/99/process')
              : route.get('/api/v1/quotations/99/calculations')
      )
        .set(actor(4, 'admin'))
        .expect(404);
      expect(response.body).toEqual({ success: false, error: 'Quotation not found' });
    }
  );

  it.each(['read', 'update', 'calculations'])(
    'returns 403 for an unrelated supplier during %s',
    async action => {
      const route = request(app);
      const response = await (
        action === 'read'
          ? route.get('/api/v1/quotations/1')
          : action === 'update'
            ? route.put('/api/v1/quotations/supplier/1').send({ status: 'rejected' })
            : route.get('/api/v1/quotations/1/calculations')
      )
        .set(actor(3, 'supplier'))
        .expect(403);
      expect(response.body).toEqual({ success: false, error: 'Access denied' });
      expect((await models.Quotation.findByPk(1))?.status).toBe('processed');
    }
  );

  it('retains invalid calculation-input and MOQ responses at 400', async () => {
    const missing = await request(app)
      .post('/api/v1/quotations/calculate')
      .set(actor())
      .send({ items: [{ productId: 99, quantity: 5 }] })
      .expect(400);
    expect(missing.body.error).toBe('Product not found');
    const moq = await request(app)
      .post('/api/v1/quotations/calculate')
      .set(actor())
      .send({ items: [{ productId: 1, quantity: 1 }] })
      .expect(400);
    expect(moq.body.error).toBe('Minimum order quantity is 5 units');
  });

  it('retains a missing comparison product as invalid request input', async () => {
    const response = await request(app)
      .post('/api/v1/quotations/compare-suppliers')
      .set(actor())
      .send({ productId: 99, quantity: 5 })
      .expect(400);
    expect(response.body).toEqual({ success: false, error: 'Product not found' });
  });

  it('retains per-supplier domain failures within the comparison result', async () => {
    const response = await request(app)
      .post('/api/v1/quotations/compare-suppliers')
      .set(actor())
      .send({ productId: 1, quantity: 1, supplierIds: [2] })
      .expect(200);
    expect(response.body.data.quotes).toEqual([
      {
        supplier: { id: 2, companyName: 'Company 2', corporateName: 'Company 2 LTDA' },
        quote: null,
        error: 'Minimum order quantity is 5 units',
      },
    ]);
  });

  it('routes an unexpected per-supplier calculation failure through the generic boundary', async () => {
    jest.spyOn(models.Product, 'findByPk').mockRejectedValueOnce(new Error(internalMessage));
    const response = await request(app)
      .post('/api/v1/quotations/compare-suppliers')
      .set(actor())
      .send({ productId: 1, quantity: 5, supplierIds: [2] })
      .expect(500);
    expect(response.body).toEqual({ success: false, error: 'Server Error' });
  });

  it('does not embed a status-bearing infrastructure fault in supplier quotes', async () => {
    jest
      .spyOn(models.Product, 'findByPk')
      .mockRejectedValueOnce(Object.assign(new Error(internalMessage), { statusCode: 503 }));
    const response = await request(app)
      .post('/api/v1/quotations/compare-suppliers')
      .set(actor())
      .send({ productId: 1, quantity: 5, supplierIds: [2] })
      .expect(503);
    expect(response.body).toEqual({ success: false, error: 'Server Error' });
  });

  it.each(['read', 'update', 'process', 'calculations'])(
    'hides unexpected quotation lookup failures during %s',
    async action => {
      jest.spyOn(models.Quotation, 'findByPk').mockRejectedValueOnce(new Error(internalMessage));
      const route = request(app);
      const response = await (
        action === 'read'
          ? route.get('/api/v1/quotations/1')
          : action === 'update'
            ? route.put('/api/v1/quotations/admin/1').send({ status: 'processed' })
            : action === 'process'
              ? route.post('/api/v1/quotations/admin/1/process')
              : route.get('/api/v1/quotations/1/calculations')
      )
        .set(actor(4, 'admin'))
        .expect(500);
      expect(response.body).toEqual({ success: false, error: 'Server Error' });
    }
  );

  it('hides processing writes and preserves the current quotation state', async () => {
    await models.Quotation.update({ status: 'pending' }, { where: { id: 1 } });
    jest
      .spyOn(models.Quotation.prototype, 'update')
      .mockRejectedValueOnce(new Error(internalMessage));
    const response = await request(app)
      .post('/api/v1/quotations/admin/1/process')
      .set(actor(4, 'admin'))
      .expect(500);
    expect(response.body).toEqual({ success: false, error: 'Server Error' });
    expect((await models.Quotation.findByPk(1))?.status).toBe('pending');
  });

  it('keeps the successful processing response and calculated values', async () => {
    const response = await request(app)
      .post('/api/v1/quotations/admin/1/process')
      .set(actor(4, 'admin'))
      .expect(200);
    expect(response.body.message).toBe('Quotation processed with calculations');
    expect(response.body.data.quotation.status).toBe('processed');
    expect(response.body.data.summary.total).toBe('R$ 646.25');
  });
});
