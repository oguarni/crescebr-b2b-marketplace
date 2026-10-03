import request from 'supertest';
import {
  app,
  actor,
  models,
  orderId,
  missingOrderId,
  internalMessage,
  seedMutationContracts,
  restoreMutationContracts,
} from './mutationContractFixtures';

beforeEach(seedMutationContracts);
afterEach(restoreMutationContracts);

describe('order errors through real services and HTTP middleware', () => {
  it('returns 404 for a missing order history', async () => {
    const response = await request(app)
      .get(`/api/v1/orders/${missingOrderId}/history`)
      .set(actor())
      .expect(404);
    expect(response.body).toEqual({ success: false, error: 'Order not found' });
  });

  it.each(['status', 'nfe'])('returns 404 for a missing order %s mutation', async action => {
    const route = request(app);
    const response = await (
      action === 'status'
        ? route.put(`/api/v1/orders/${missingOrderId}/status`).send({ status: 'processing' })
        : route
            .patch(`/api/v1/orders/${missingOrderId}/nfe`)
            .send({ nfeUrl: 'https://example.com' })
    )
      .set(actor(4, 'admin'))
      .expect(404);
    expect(response.body).toEqual({ success: false, error: 'Order not found' });
  });

  it.each(['history', 'status', 'nfe'])(
    'keeps unrelated suppliers out of order %s',
    async action => {
      const route = request(app);
      const response = await (
        action === 'history'
          ? route.get(`/api/v1/orders/${orderId}/history`)
          : action === 'status'
            ? route.put(`/api/v1/orders/${orderId}/status`).send({ status: 'processing' })
            : route.patch(`/api/v1/orders/${orderId}/nfe`).send({ nfeUrl: 'https://example.com' })
      )
        .set(actor(3, 'supplier'))
        .expect(403);
      expect(response.body).toEqual({ success: false, error: 'Access denied' });
      expect((await models.Order.findByPk(orderId))?.status).toBe('pending');
    }
  );

  it('preserves the invalid transition message and 400 without writing', async () => {
    const response = await request(app)
      .put(`/api/v1/orders/${orderId}/status`)
      .set(actor(2, 'supplier'))
      .send({ status: 'delivered' })
      .expect(400);
    expect(response.body).toEqual({
      success: false,
      error:
        'Invalid status transition from pending to delivered. Valid transitions: processing, cancelled',
    });
    expect((await models.Order.findByPk(orderId))?.status).toBe('pending');
  });

  it('preserves transition requirements and successful status/NF-e flows', async () => {
    await request(app)
      .put(`/api/v1/orders/${orderId}/status`)
      .set(actor(2, 'supplier'))
      .send({ status: 'processing' })
      .expect(200);
    const missingFields = await request(app)
      .put(`/api/v1/orders/${orderId}/status`)
      .set(actor(2, 'supplier'))
      .send({ status: 'shipped' })
      .expect(400);
    expect(missingFields.body.error).toBe('trackingNumber is required for this status transition');
    const missingNfe = await request(app)
      .put(`/api/v1/orders/${orderId}/status`)
      .set(actor(2, 'supplier'))
      .send({ status: 'shipped', trackingNumber: 'TRACK' })
      .expect(400);
    expect(missingNfe.body.error).toBe('nfeAccessKey is required for this status transition');
    await request(app)
      .put(`/api/v1/orders/${orderId}/status`)
      .set(actor(2, 'supplier'))
      .send({
        status: 'shipped',
        trackingNumber: 'TRACK',
        nfeAccessKey: '35240312345678000195550010000014761000047680',
      })
      .expect(200);
    const emptyPatch = await request(app)
      .patch(`/api/v1/orders/${orderId}/nfe`)
      .set(actor(2, 'supplier'))
      .send({})
      .expect(400);
    expect(emptyPatch.body.error).toBe('At least one of nfeAccessKey or nfeUrl must be provided');
    const corrected = await request(app)
      .patch(`/api/v1/orders/${orderId}/nfe`)
      .set(actor(2, 'supplier'))
      .send({ nfeUrl: 'https://example.com/corrected' })
      .expect(200);
    expect(corrected.body.message).toBe('NF-e data updated successfully');
    expect(corrected.body.data.nfeUrl).toBe('https://example.com/corrected');
  });

  it('preserves the 400 for premature NF-e correction', async () => {
    const response = await request(app)
      .patch(`/api/v1/orders/${orderId}/nfe`)
      .set(actor(2, 'supplier'))
      .send({ nfeUrl: 'https://example.com' })
      .expect(400);
    expect(response.body.error).toBe(
      "NF-e data can only be updated on orders with status 'shipped' or 'delivered'. Current status: pending"
    );
  });

  it('preserves hidden ownership, unprocessed and expired quotation failures', async () => {
    const hidden = await request(app)
      .post('/api/v1/orders')
      .set(actor(3, 'supplier'))
      .send({ quotationId: 1 })
      .expect(404);
    expect(hidden.body.error).toBe('Quotation not found or does not belong to the user');
    await models.Quotation.update({ status: 'pending' }, { where: { id: 1 } });
    const pending = await request(app)
      .post('/api/v1/orders')
      .set(actor())
      .send({ quotationId: 1 })
      .expect(400);
    expect(pending.body.error).toBe('Only processed quotations can be converted to orders');
    await models.Quotation.update(
      { status: 'processed', validUntil: new Date('2020-01-01') },
      { where: { id: 1 } }
    );
    const expired = await request(app)
      .post('/api/v1/orders')
      .set(actor())
      .send({ quotationId: 1 })
      .expect(400);
    expect(expired.body.error).toMatch(
      /^This quotation expired on .*Please request a new quotation\.$/
    );
    expect(await models.Order.count()).toBe(1);
  });

  it.each(['history', 'status', 'nfe'])(
    'hides unexpected order %s lookup failures',
    async action => {
      jest.spyOn(models.Order, 'findByPk').mockRejectedValueOnce(new Error(internalMessage));
      const route = request(app);
      const response = await (
        action === 'history'
          ? route.get(`/api/v1/orders/${orderId}/history`)
          : action === 'status'
            ? route.put(`/api/v1/orders/${orderId}/status`).send({ status: 'processing' })
            : route.patch(`/api/v1/orders/${orderId}/nfe`).send({ nfeUrl: 'https://example.com' })
      )
        .set(actor(2, 'supplier'))
        .expect(500);
      expect(response.body).toEqual({ success: false, error: 'Server Error' });
    }
  );

  it('hides conversion write failures and preserves rollback', async () => {
    jest.spyOn(models.Order, 'create').mockRejectedValueOnce(new Error(internalMessage));
    const response = await request(app)
      .post('/api/v1/orders')
      .set(actor())
      .send({ quotationId: 1 })
      .expect(500);
    expect(response.body).toEqual({ success: false, error: 'Server Error' });
    expect(await models.Order.count()).toBe(1);
    expect((await models.Quotation.findByPk(1))?.status).toBe('processed');
  });

  it('hides a supplier ownership-query failure instead of treating it as denial', async () => {
    jest
      .spyOn(models.QuotationItem, 'findOne')
      .mockRejectedValueOnce(new Error('Access denied by internal database role'));
    const response = await request(app)
      .put(`/api/v1/orders/${orderId}/status`)
      .set(actor(2, 'supplier'))
      .send({ status: 'processing' })
      .expect(500);
    expect(response.body).toEqual({ success: false, error: 'Server Error' });
  });
});
