import request from 'supertest';
import { UniqueConstraintError } from 'sequelize';
import {
  app,
  actor,
  models,
  seedMutationContracts,
  restoreMutationContracts,
} from './mutationContractFixtures';
import { DEFAULT_SYSTEM_SETTINGS } from '../../services/systemSettingsRules';
import { systemSettingsService } from '../../services/systemSettingsService';
import { OrderStatusService } from '../../services/orderStatusService';
import { logger } from '../../utils/structuredLogger';
import type { SystemSettings } from '../../types';

beforeEach(seedMutationContracts);
afterEach(restoreMutationContracts);

const admin = actor(4, 'admin');
const DAY_MS = 24 * 60 * 60 * 1000;
const clone = (): SystemSettings => JSON.parse(JSON.stringify(DEFAULT_SYSTEM_SETTINGS));

const save = (settings: unknown, version: unknown) =>
  request(app).put('/api/v1/admin/settings').set(admin).send({ settings, version });

describe('GET /api/v1/admin/settings', () => {
  it('returns the defaults at version 0 before anyone has saved', async () => {
    const response = await request(app).get('/api/v1/admin/settings').set(admin).expect(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        settings: DEFAULT_SYSTEM_SETTINGS,
        defaults: DEFAULT_SYSTEM_SETTINGS,
        version: 0,
        updatedAt: null,
        updatedBy: null,
      },
    });
  });

  it.each([
    [1, 'customer'],
    [2, 'supplier'],
  ])('refuses user %i with role %s', async (id, role) => {
    const response = await request(app).get('/api/v1/admin/settings').set(actor(id, role));
    expect(response.status).toBe(403);
    expect(await models.SystemSettings.count()).toBe(0);
  });

  it('refuses an anonymous request', async () => {
    await request(app).get('/api/v1/admin/settings').expect(401);
  });

  it('refuses a token claiming admin for an account that is not an admin', async () => {
    // requireRole trusts the token's role; the permission check reads the account.
    const response = await request(app).get('/api/v1/admin/settings').set(actor(2, 'admin'));
    expect(response.status).toBe(403);
    expect(response.body.error).toContain('manage_system_config');
  });
});

describe('PUT /api/v1/admin/settings', () => {
  it('stores a first save at version 1 and names the editor', async () => {
    const settings = { ...clone(), taxRate: 0.12 };

    const response = await save(settings, 0).expect(200);

    expect(response.body.message).toBe('System settings updated');
    expect(response.body.data).toMatchObject({
      settings: { taxRate: 0.12 },
      version: 1,
      updatedBy: { id: 4, email: 'contract-4@example.com', companyName: 'Company 4' },
    });
    expect(new Date(response.body.data.updatedAt).getTime()).not.toBeNaN();
  });

  it('increments the version on every later save and accepts it as a numeric string', async () => {
    await save(clone(), 0).expect(200);

    const response = await save({ ...clone(), quotationValidityDays: 15 }, '1').expect(200);

    expect(response.body.data).toMatchObject({
      version: 2,
      settings: { quotationValidityDays: 15 },
    });
    const read = await request(app).get('/api/v1/admin/settings').set(admin).expect(200);
    expect(read.body.data.version).toBe(2);
  });

  it('rejects a save based on a stale version without writing', async () => {
    await save({ ...clone(), taxRate: 0.1 }, 0).expect(200);

    const response = await save({ ...clone(), taxRate: 0.3 }, 0).expect(409);

    expect(response.body).toEqual({
      success: false,
      error: 'System settings were changed by someone else',
    });
    const stored = await systemSettingsService.getSettings();
    expect(stored.taxRate).toBe(0.1);
  });

  it('rejects a version from the future', async () => {
    await save(clone(), 3).expect(409);
    expect(await models.SystemSettings.count()).toBe(0);
  });

  it('answers an invalid document with one entry per offending field', async () => {
    const settings = clone();
    settings.taxRate = 18;
    settings.pricingTiers[1].minQuantity = 12;

    const response = await save(settings, 0).expect(400);

    expect(response.body).toEqual({
      success: false,
      error: 'Validation failed',
      details: [
        {
          type: 'field',
          location: 'body',
          path: 'settings.taxRate',
          code: 'range',
          params: { min: 0, max: 0.5 },
          msg: 'Must be between 0 and 0.5',
        },
        {
          type: 'field',
          location: 'body',
          path: 'settings.pricingTiers[1].minQuantity',
          code: 'tierGap',
          params: { expected: 11 },
          msg: 'Must be 11, right after the previous tier',
        },
      ],
    });
    expect(await models.SystemSettings.count()).toBe(0);
  });

  it.each([
    [{ version: 0 }, 'settings'],
    [{ settings: DEFAULT_SYSTEM_SETTINGS }, 'version'],
    [{ settings: DEFAULT_SYSTEM_SETTINGS, version: -1 }, 'version'],
    [{ settings: 'all of them', version: 0 }, 'settings'],
  ])('rejects a malformed envelope %j', async (body, field) => {
    const response = await request(app)
      .put('/api/v1/admin/settings')
      .set(admin)
      .send(body)
      .expect(400);
    expect(response.body.details.map((detail: { path: string }) => detail.path)).toContain(field);
  });

  it('refuses a supplier', async () => {
    await request(app)
      .put('/api/v1/admin/settings')
      .set(actor(2, 'supplier'))
      .send({ settings: clone(), version: 0 })
      .expect(403);
    expect(await models.SystemSettings.count()).toBe(0);
  });
});

describe('settings drive pricing, validity and delivery', () => {
  it('prices a quote with the saved tax, freight and default tiers', async () => {
    const settings = clone();
    settings.taxRate = 0.1;
    settings.shippingMethods.standard = { baseRate: 10, perKgRate: 1, deliveryDays: 5 };
    settings.pricingTiers = [{ minQuantity: 1, maxQuantity: null, discount: 0.5 }];
    await save(settings, 0).expect(200);

    const response = await request(app)
      .post('/api/v1/quotations/calculate')
      .set(actor(1, 'customer'))
      .send({ items: [{ productId: 1, quantity: 10 }], shippingMethod: 'standard' })
      .expect(200);

    // The fixture product has no tiers of its own, so the default tier applies:
    // 10 units at R$ 100 with 50% off = 500; tax 10% = 50; freight 10 + 10 * 0.5kg * 1 = 15.
    expect(response.body.data.calculations).toMatchObject({
      totalSubtotal: 500,
      totalTax: 50,
      totalShipping: 15,
      taxRate: 0.1,
      grandTotal: 565,
      items: [expect.objectContaining({ taxRate: 0.1, tierDiscount: 0.5 })],
    });
  });

  it("keeps a product's own tiers over the defaults", async () => {
    await models.Product.update(
      { tierPricing: [{ minQuantity: 1, maxQuantity: null, discount: 0.25 }] },
      { where: { id: 1 } }
    );
    await save(
      { ...clone(), pricingTiers: [{ minQuantity: 1, maxQuantity: null, discount: 0.5 }] },
      0
    ).expect(200);

    const response = await request(app)
      .post('/api/v1/quotations/calculate')
      .set(actor(1, 'customer'))
      .send({ items: [{ productId: 1, quantity: 10 }] })
      .expect(200);

    expect(response.body.data.calculations.items[0].tierDiscount).toBe(0.25);
  });

  it('publishes the pricing policy to anyone, without who edited it', async () => {
    await save({ ...clone(), taxRate: 0.07 }, 0).expect(200);

    const response = await request(app).get('/api/v1/settings/pricing').expect(200);

    expect(response.body).toEqual({
      success: true,
      data: { ...DEFAULT_SYSTEM_SETTINGS, taxRate: 0.07 },
    });
  });

  it('stamps new quotations with the saved validity', async () => {
    await save({ ...clone(), quotationValidityDays: 3 }, 0).expect(200);
    const before = Date.now();

    const response = await request(app)
      .post('/api/v1/quotations')
      .set(actor(1, 'customer'))
      .send({ items: [{ productId: 1, quantity: 5 }] })
      .expect(201);

    const offset = new Date(response.body.data.validUntil).getTime() - before;
    expect(offset).toBeGreaterThanOrEqual(3 * DAY_MS);
    expect(offset).toBeLessThan(3 * DAY_MS + 60 * 1000);
  });

  it('estimates delivery with the saved standard delivery time', async () => {
    const settings = clone();
    settings.shippingMethods.express.deliveryDays = 1;
    settings.shippingMethods.standard.deliveryDays = 1;
    await save(settings, 0).expect(200);
    const spy = jest.spyOn(OrderStatusService, 'calculateEstimatedDelivery');

    await request(app)
      .put('/api/v1/orders/00000000-0000-4000-8000-000000000001/status')
      .set(actor(2, 'supplier'))
      .send({ status: 'processing' })
      .expect(200);
    await request(app)
      .put('/api/v1/orders/00000000-0000-4000-8000-000000000001/status')
      .set(actor(2, 'supplier'))
      .send({
        status: 'shipped',
        trackingNumber: 'BR123',
        nfeAccessKey: '35240312345678000195550010000014761000047680',
      })
      .expect(200);

    expect(spy).toHaveBeenCalledWith(
      'standard',
      expect.any(Date),
      expect.objectContaining({ standard: { baseRate: 50, perKgRate: 2.5, deliveryDays: 1 } })
    );
  });
});

describe('systemSettingsService guards', () => {
  it('refuses to price with a stored row that breaks the rules', async () => {
    const errorLog = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    await models.SystemSettings.create({
      id: 1,
      ...clone(),
      taxRate: 0.9,
      version: 1,
    });

    await expect(systemSettingsService.getSettings()).rejects.toMatchObject({
      message: 'System settings are invalid',
      statusCode: 500,
    });
    expect(errorLog).toHaveBeenCalledWith('Stored system settings are invalid', {
      issues: ['settings.taxRate: Must be between 0 and 0.5'],
    });

    const response = await request(app)
      .post('/api/v1/quotations/calculate')
      .set(actor(1, 'customer'))
      .send({ items: [{ productId: 1, quantity: 10 }] });
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, error: 'Server Error' });
  });

  it('reports a lost race for the first save as a conflict', async () => {
    jest
      .spyOn(models.SystemSettings, 'create')
      .mockRejectedValueOnce(new UniqueConstraintError({ message: 'duplicate key' }));

    await expect(systemSettingsService.update(clone(), 0, 4)).rejects.toMatchObject({
      statusCode: 409,
      code: 'SETTINGS_VERSION_CONFLICT',
    });
  });

  it('rethrows any other failure of the first save', async () => {
    jest.spyOn(models.SystemSettings, 'create').mockRejectedValueOnce(new Error('disk full'));
    await expect(systemSettingsService.update(clone(), 0, 4)).rejects.toThrow('disk full');
  });

  it('reports a row that moved between the read and the conditional write', async () => {
    await systemSettingsService.update(clone(), 0, 4);
    jest.spyOn(models.SystemSettings, 'update').mockResolvedValueOnce([0] as never);

    await expect(systemSettingsService.update(clone(), 1, 4)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('rejects an invalid document even when called without the HTTP boundary', async () => {
    await expect(
      systemSettingsService.update({ ...clone(), taxRate: -1 }, 0, 4)
    ).rejects.toMatchObject({
      statusCode: 400,
      issues: [expect.objectContaining({ path: 'settings.taxRate' })],
    });
  });

  it('logs which settings changed', async () => {
    const infoLog = jest.spyOn(logger, 'info').mockImplementation(() => undefined);
    await systemSettingsService.update(clone(), 0, 4);
    await systemSettingsService.update({ ...clone(), taxRate: 0.2 }, 1, 4);

    expect(infoLog).toHaveBeenCalledWith('System settings updated', {
      adminId: 4,
      version: 1,
      changed: ['taxRate', 'quotationValidityDays', 'shippingMethods', 'pricingTiers'],
    });
    expect(infoLog).toHaveBeenCalledWith('System settings updated', {
      adminId: 4,
      version: 2,
      changed: ['taxRate'],
    });
  });

  it('shows no editor once the editing account is gone', async () => {
    await models.SystemSettings.create({ id: 1, ...clone(), version: 4, updatedBy: null });
    const record = await systemSettingsService.getRecord();
    expect(record).toMatchObject({ version: 4, updatedBy: null });

    await models.SystemSettings.update({ updatedBy: 3 }, { where: { id: 1 } });
    await models.User.destroy({ where: { id: 3 } });
    expect((await systemSettingsService.getRecord()).updatedBy).toBeNull();
  });
});

describe('GET /api/v1/orders/supplier/summary', () => {
  const supplier = actor(2, 'supplier');

  it('aggregates every order of the supplier, excluding cancelled ones from the volume', async () => {
    await models.Quotation.create({ id: 2, companyId: 1, status: 'pending', adminNotes: null });
    await models.QuotationItem.create({ quotationId: 2, productId: 1, quantity: 5 });
    for (let index = 0; index < 25; index += 1) {
      const quotationId = 100 + index;
      await models.Quotation.create({
        id: quotationId,
        companyId: 1,
        status: 'completed',
        adminNotes: null,
      });
      await models.QuotationItem.create({ quotationId, productId: 1, quantity: 5 });
      await models.Order.create({
        id: `00000000-0000-4000-8000-${String(200 + index).padStart(12, '0')}`,
        companyId: 1,
        quotationId,
        totalAmount: 10.5,
        status: index < 3 ? 'cancelled' : index < 8 ? 'processing' : 'delivered',
      });
    }

    const response = await request(app).get('/api/v1/orders/supplier/summary').set(supplier);

    // Fixture order (pending, R$ 100) + 22 non-cancelled at R$ 10.50; quotation 1 is processed.
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      pendingQuotations: 2,
      activeOrders: 6,
      billableOrders: 23,
      orderVolume: 331,
    });
  });

  it('returns zeros for a supplier without products', async () => {
    const response = await request(app)
      .get('/api/v1/orders/supplier/summary')
      .set(actor(3, 'supplier'))
      .expect(200);
    expect(response.body.data).toEqual({
      pendingQuotations: 0,
      activeOrders: 0,
      billableOrders: 0,
      orderVolume: 0,
    });
  });

  it('is only for suppliers', async () => {
    await request(app).get('/api/v1/orders/supplier/summary').set(actor(1, 'customer')).expect(403);
  });
});
