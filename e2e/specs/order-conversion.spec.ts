import { test, expect, APIRequestContext } from '@playwright/test';
import { ACCOUNTS } from '../fixtures/accounts';

const apiUrl = `${process.env.E2E_API_URL ?? 'http://127.0.0.1:3001'}${process.env.API_PREFIX ?? '/api/v1'}`;

async function headersFor(request: APIRequestContext, role: 'buyer' | 'admin') {
  const response = await request.post(`${apiUrl}/auth/login-email`, { data: ACCOUNTS[role] });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { data: { accessToken: string } };
  expect(typeof body.data.accessToken).toBe('string');
  return { Authorization: `Bearer ${body.data.accessToken}` };
}

test('concurrent conversions persist one order and reject repeated conversion', async ({
  request,
}) => {
  const buyerHeaders = await headersFor(request, 'buyer');
  const adminHeaders = await headersFor(request, 'admin');
  const catalog = await request.get(`${apiUrl}/products?limit=2`);
  expect(catalog.status()).toBe(200);
  const products = (
    (await catalog.json()) as {
      data: { products: Array<{ id: number; minimumOrderQuantity: number }> };
    }
  ).data.products;
  expect(products).toHaveLength(2);

  // I create separate quotations so retries never mutate shared order fixtures.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const created = await request.post(`${apiUrl}/quotations`, {
      headers: buyerHeaders,
      data: {
        items: products.map(product => ({
          productId: product.id,
          quantity: product.minimumOrderQuantity,
        })),
      },
    });
    expect(created.status()).toBe(201);
    const quotation = (
      (await created.json()) as {
        data: { id: number; items: Array<{ productId: number }> };
      }
    ).data;
    expect(quotation.items.map(item => item.productId).sort((a, b) => a - b)).toEqual(
      products.map(product => product.id).sort((a, b) => a - b)
    );
    const processed = await request.put(`${apiUrl}/quotations/admin/${quotation.id}`, {
      headers: adminHeaders,
      data: { status: 'processed' },
    });
    expect(processed.status()).toBe(200);

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        request.post(`${apiUrl}/orders`, {
          headers: buyerHeaders,
          data: { quotationId: quotation.id },
        })
      )
    );
    expect(responses.map(response => response.status()).sort()).toEqual([
      201, 400, 400, 400, 400, 400,
    ]);
    const successful = responses.find(response => response.status() === 201)!;
    expect(typeof (await successful.json()).data.id).toBe('string');
    const rejected = responses.find(response => response.status() === 400)!;
    expect((await rejected.json()).error).toBe(
      'Only processed quotations can be converted to orders'
    );

    const orders = await request.get(`${apiUrl}/orders?limit=100`, { headers: buyerHeaders });
    expect(orders.status()).toBe(200);
    const persisted = (
      (await orders.json()) as { data: { orders: Array<{ quotationId: number }> } }
    ).data.orders;
    expect(persisted.filter(order => order.quotationId === quotation.id)).toHaveLength(1);
    const completed = await request.get(`${apiUrl}/quotations/${quotation.id}`, {
      headers: buyerHeaders,
    });
    expect(completed.status()).toBe(200);
    expect((await completed.json()).data.status).toBe('completed');

    const repeated = await request.post(`${apiUrl}/orders`, {
      headers: buyerHeaders,
      data: { quotationId: quotation.id },
    });
    expect(repeated.status()).toBe(400);
  }
});
