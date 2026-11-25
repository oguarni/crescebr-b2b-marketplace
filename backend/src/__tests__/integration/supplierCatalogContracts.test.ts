import request from 'supertest';
import {
  app,
  actor,
  models,
  seedMutationContracts,
  restoreMutationContracts,
} from './mutationContractFixtures';

beforeEach(seedMutationContracts);
afterEach(restoreMutationContracts);

const product = (id: number, supplierId: number) => ({
  id,
  name: `Product ${id}`,
  description: 'Synthetic product',
  price: 10,
  unitPrice: 10,
  imageUrl: 'https://example.com/product.png',
  category: 'test',
  supplierId,
  tierPricing: [],
  specifications: {},
  minimumOrderQuantity: 1,
  leadTime: 1,
  availability: 'in_stock' as const,
});

describe('GET /api/v1/products/supplier/mine', () => {
  it("returns every one of the supplier's products and nobody else's", async () => {
    // Twelve more for supplier 2, past the public list's default page of ten.
    await models.Product.bulkCreate(
      Array.from({ length: 12 }, (_, index) => product(10 + index, 2))
    );
    await models.Product.create(product(50, 3));

    const response = await request(app)
      .get('/api/v1/products/supplier/mine')
      .set(actor(2, 'supplier'))
      .expect(200);

    const ids = (response.body.data as Array<{ id: number; supplierId: number }>).map(p => p.id);
    expect(ids).toHaveLength(13);
    expect(ids).not.toContain(50);
    expect(response.body.data.every((p: { supplierId: number }) => p.supplierId === 2)).toBe(true);
  });

  it('is empty for a supplier without products and closed to other roles', async () => {
    const empty = await request(app)
      .get('/api/v1/products/supplier/mine')
      .set(actor(3, 'supplier'))
      .expect(200);
    expect(empty.body.data).toEqual([]);

    await request(app).get('/api/v1/products/supplier/mine').set(actor(1, 'customer')).expect(403);
    await request(app).get('/api/v1/products/supplier/mine').expect(401);
  });
});

describe("a supplier's response on a quotation shared with another supplier", () => {
  it('is refused, and an administrator can still process it', async () => {
    await models.Product.create(product(60, 3));
    await models.QuotationItem.create({ quotationId: 1, productId: 60, quantity: 1 });
    await models.Quotation.update({ status: 'pending' }, { where: { id: 1 } });

    const refused = await request(app)
      .put('/api/v1/quotations/supplier/1')
      .set(actor(2, 'supplier'))
      .send({ status: 'processed' })
      .expect(409);
    expect(refused.body.error).toMatch(/other suppliers' products/);
    expect((await models.Quotation.findByPk(1))?.status).toBe('pending');

    await request(app)
      .put('/api/v1/quotations/admin/1')
      .set(actor(4, 'admin'))
      .send({ status: 'processed' })
      .expect(200);
    expect((await models.Quotation.findByPk(1))?.status).toBe('processed');
  });
});
