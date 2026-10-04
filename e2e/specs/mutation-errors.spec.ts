import { test, expect, APIRequestContext } from '@playwright/test';
import { ACCOUNTS, Role } from '../fixtures/accounts';

const apiUrl = `${process.env.E2E_API_URL ?? 'http://127.0.0.1:3001'}${process.env.API_PREFIX ?? '/api/v1'}`;

async function sessionFor(request: APIRequestContext, role: Role) {
  const response = await request.post(`${apiUrl}/auth/login-email`, { data: ACCOUNTS[role] });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { data: { accessToken: string; user: { id: number } } };
  return { id: body.data.user.id, headers: { Authorization: `Bearer ${body.data.accessToken}` } };
}

test('malformed mutation IDs are validated before PostgreSQL queries', async ({ request }) => {
  const admin = await sessionFor(request, 'admin');
  const responses = await Promise.all([
    request.get(`${apiUrl}/orders/not-a-uuid/history`, { headers: admin.headers }),
    request.put(`${apiUrl}/orders/not-a-uuid/status`, {
      headers: admin.headers,
      data: { status: 'processing' },
    }),
    request.patch(`${apiUrl}/orders/not-a-uuid/nfe`, { headers: admin.headers, data: {} }),
    request.put(`${apiUrl}/admin/companies/not-an-id/status`, {
      headers: admin.headers,
      data: { status: 'approved' },
    }),
    request.put(`${apiUrl}/admin/products/2147483648/moderate`, {
      headers: admin.headers,
      data: { action: 'remove' },
    }),
    request.delete(`${apiUrl}/products/not-an-id`, { headers: admin.headers }),
    request.delete(`${apiUrl}/ratings/not-an-id`, { headers: admin.headers }),
    ...(['invalid', 2147483648] as const).map(supplierId =>
      request.post(`${apiUrl}/quotations/compare-suppliers`, {
        headers: admin.headers,
        data: { productId: 1, quantity: 5, supplierIds: [supplierId] },
      })
    ),
  ]);
  expect(responses.map(response => response.status())).toEqual(Array(9).fill(400));
  for (const response of responses) {
    expect(await response.json()).toMatchObject({
      success: false,
      error: 'Validation failed',
      details: expect.any(Array),
    });
  }
});

test('missing mutation resources use 404 and retain the public error envelope', async ({
  request,
}) => {
  const buyer = await sessionFor(request, 'buyer');
  const admin = await sessionFor(request, 'admin');
  const history = await request.get(
    `${apiUrl}/orders/00000000-0000-4000-8000-000000000099/history`,
    { headers: buyer.headers }
  );
  expect(history.status()).toBe(404);
  expect(await history.json()).toEqual({ success: false, error: 'Order not found' });
  const processing = await request.post(`${apiUrl}/quotations/admin/2147483647/process`, {
    headers: admin.headers,
  });
  expect(processing.status()).toBe(404);
  expect(await processing.json()).toEqual({ success: false, error: 'Quotation not found' });
  const calculation = await request.post(`${apiUrl}/quotations/calculate`, {
    headers: buyer.headers,
    data: { items: [{ productId: 2147483647, quantity: 5 }] },
  });
  expect(calculation.status()).toBe(400);
  expect(await calculation.json()).toEqual({ success: false, error: 'Product not found' });
});

test('invalid CNPJ remains a client-visible validation failure at registration', async ({
  request,
}) => {
  const response = await request.post(`${apiUrl}/auth/register-supplier`, {
    data: {
      email: `contract-${Date.now()}@example.com`,
      password: 'test-fixture',
      cpf: '98765432100',
      address: 'Synthetic test address',
      companyName: 'Contract company',
      corporateName: 'Contract company LTDA',
      cnpj: '00000000000000',
      industrySector: 'machinery',
    },
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ success: false, error: 'Invalid CNPJ format' });
});

test('order state rules and rating supplier eligibility work through PostgreSQL', async ({
  request,
}) => {
  const buyer = await sessionFor(request, 'buyer');
  const admin = await sessionFor(request, 'admin');
  const supplier = await sessionFor(request, 'supplier');
  const catalog = await request.get(`${apiUrl}/products?limit=100`);
  expect(catalog.status()).toBe(200);
  const products = ((await catalog.json()) as { data: { products: Array<{ supplierId: number }> } })
    .data.products;
  const delivered = await request.get(`${apiUrl}/orders?status=delivered&limit=100`, {
    headers: buyer.headers,
  });
  expect(delivered.status()).toBe(200);
  const priorOrders = (
    (await delivered.json()) as { data: { orders: Array<{ quotationId: number }> } }
  ).data.orders;
  const priorSuppliers = new Set<number>([supplier.id]);
  for (const order of priorOrders) {
    const quotation = await request.get(`${apiUrl}/quotations/${order.quotationId}`, {
      headers: buyer.headers,
    });
    expect(quotation.status()).toBe(200);
    const items = (
      (await quotation.json()) as { data: { items: Array<{ product: { supplierId: number } }> } }
    ).data.items;
    for (const item of items) priorSuppliers.add(item.product.supplierId);
  }
  const unrelated = products.find(product => !priorSuppliers.has(product.supplierId));
  expect(unrelated).toBeDefined();

  // I create this flow's product, quotation and order so existing fixtures keep their status.
  const createdProduct = await request.post(`${apiUrl}/products`, {
    headers: supplier.headers,
    data: {
      name: `Contract product ${Date.now()}`,
      description: 'Synthetic contract fixture',
      price: 100,
      imageUrl: 'https://example.com/contract-product.png',
      category: 'test',
      minimumOrderQuantity: 5,
    },
  });
  expect(createdProduct.status()).toBe(201);
  const productId = (await createdProduct.json()).data.id as number;
  const createdQuotation = await request.post(`${apiUrl}/quotations`, {
    headers: buyer.headers,
    data: { items: [{ productId, quantity: 5 }] },
  });
  expect(createdQuotation.status()).toBe(201);
  const quotationId = (await createdQuotation.json()).data.id as number;
  const processed = await request.post(`${apiUrl}/quotations/admin/${quotationId}/process`, {
    headers: admin.headers,
  });
  expect(processed.status()).toBe(200);
  const createdOrder = await request.post(`${apiUrl}/orders`, {
    headers: buyer.headers,
    data: { quotationId },
  });
  expect(createdOrder.status()).toBe(201);
  const orderId = (await createdOrder.json()).data.id as string;
  const invalidTransition = await request.put(`${apiUrl}/orders/${orderId}/status`, {
    headers: supplier.headers,
    data: { status: 'delivered' },
  });
  expect(invalidTransition.status()).toBe(400);
  expect((await invalidTransition.json()).error).toBe(
    'Invalid status transition from pending to delivered. Valid transitions: processing, cancelled'
  );
  for (const data of [
    { status: 'processing' },
    {
      status: 'shipped',
      trackingNumber: 'CONTRACT-TRACK',
      nfeAccessKey: '35240312345678000195550010000014761000047680',
    },
    { status: 'delivered' },
  ]) {
    const updated = await request.put(`${apiUrl}/orders/${orderId}/status`, {
      headers: supplier.headers,
      data,
    });
    expect(updated.status()).toBe(200);
  }

  for (const explicitOrder of [true, false]) {
    const rejected = await request.post(`${apiUrl}/ratings`, {
      headers: buyer.headers,
      data: {
        supplierId: unrelated!.supplierId,
        score: 4,
        ...(explicitOrder ? { orderId } : {}),
      },
    });
    expect(rejected.status()).toBe(403);
    expect(await rejected.json()).toEqual({
      success: false,
      error: 'You can only rate suppliers from completed orders',
    });
  }
  const ratings = await Promise.all(
    Array.from({ length: 6 }, () =>
      request.post(`${apiUrl}/ratings`, {
        headers: buyer.headers,
        data: { supplierId: supplier.id, score: 4 },
      })
    )
  );
  expect(ratings.map(response => response.status()).sort()).toEqual([201, 400, 400, 400, 400, 400]);
  for (const response of ratings) {
    const body = await response.json();
    if (response.status() === 201) {
      expect(body.data).toMatchObject({
        supplierId: supplier.id,
        buyerId: buyer.id,
        score: 4,
        orderId,
      });
    } else {
      expect(body).toEqual({ success: false, error: 'You have already rated this order' });
    }
  }
  const explicitRepeat = await request.post(`${apiUrl}/ratings`, {
    headers: buyer.headers,
    data: { supplierId: supplier.id, score: 4, orderId },
  });
  expect(explicitRepeat.status()).toBe(400);
  expect((await explicitRepeat.json()).error).toBe('You have already rated this order');
});
