import { beforeEach, describe, expect, it } from 'vitest';
import { handleDemoRequest } from '../handlers';
import { getState, resetState } from '../store';

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const call = <T = unknown>(
  method: string,
  url: string,
  body: Record<string, unknown> = {},
  token: string | null = null
): { status: number; body: Envelope<T> } => {
  const response = handleDemoRequest(method, url, body, token);
  return { status: response.status, body: response.body as Envelope<T> };
};

const signIn = (email: string, password: string): string => {
  const { body } = call<{ token: string }>('POST', '/auth/login-email', { email, password });
  if (!body.data) throw new Error(`Sign-in failed for ${email}: ${body.error}`);
  return body.data.token;
};

const asBuyer = (): string => signIn('buyer@example.com', 'buyer123');
const asSupplier = (): string => signIn('supplier@example.com', 'supplier123');
const asAdmin = (): string => signIn('admin@crescebr.com', 'admin123');

beforeEach(() => {
  window.localStorage.clear();
  resetState();
});

describe('demo API — auth', () => {
  it('signs in with a formatted or bare CNPJ', () => {
    for (const cnpj of ['33.333.333/0001-33', '33333333000133']) {
      const { status, body } = call<{ token: string; user: { email: string } }>(
        'POST',
        '/auth/login',
        { cnpj, password: 'buyer123' }
      );

      expect(status).toBe(200);
      expect(body.data?.user.email).toBe('buyer@example.com');
    }
  });

  it('signs in by email and never returns a password field', () => {
    const { body } = call<{ user: Record<string, unknown> }>('POST', '/auth/login-email', {
      email: 'ADMIN@crescebr.com',
      password: 'admin123',
    });

    expect(body.data?.user).not.toHaveProperty('password');
  });

  it('rejects a wrong password and an unknown account with 401', () => {
    expect(
      call('POST', '/auth/login-email', { email: 'buyer@example.com', password: 'nope' }).status
    ).toBe(401);
    expect(
      call('POST', '/auth/login-email', { email: 'ghost@example.com', password: 'buyer123' }).status
    ).toBe(401);
  });

  it('resolves the signed-in company from its token', () => {
    const { body } = call<{ user: { email: string; role: string } }>(
      'GET',
      '/auth/me',
      {},
      asSupplier()
    );

    expect(body.data?.user.role).toBe('supplier');
  });

  it('rejects a missing or malformed token with 401', () => {
    expect(call('GET', '/auth/me').status).toBe(401);
    expect(call('GET', '/auth/me', {}, 'not-a-demo-token').status).toBe(401);
    expect(call('GET', '/auth/me', {}, 'demo.@@@').status).toBe(401);
  });

  it('registers a company, signs it in, and can sign in again with it', () => {
    const { status, body } = call<{ token: string; user: { id: number } }>(
      'POST',
      '/auth/register',
      {
        email: 'new@fabrica.com.br',
        password: 'fabrica123',
        companyName: 'Fábrica Nova',
        corporateName: 'Fábrica Nova LTDA',
        cnpj: '12.345.678/0001-90',
        cpf: '111.111.111-11',
        address: 'Rua Nova, 1',
        industrySector: 'machinery',
        companyType: 'buyer',
      }
    );

    expect(status).toBe(201);
    expect(call('GET', '/auth/me', {}, body.data?.token ?? null).status).toBe(200);
    expect(signIn('new@fabrica.com.br', 'fabrica123')).toBeTruthy();
  });

  it('derives a pending supplier account from companyType', () => {
    const { body } = call<{ user: { role: string; status: string } }>('POST', '/auth/register', {
      email: 'supplier@fabrica.com.br',
      password: 'fabrica123',
      companyName: 'Fábrica Fornecedora',
      corporateName: 'Fábrica Fornecedora LTDA',
      cnpj: '12.345.678/0002-70',
      cpf: '222.222.222-22',
      address: 'Rua Nova, 2',
      industrySector: 'machinery',
      companyType: 'supplier',
    });

    expect(body.data?.user).toMatchObject({ role: 'supplier', status: 'pending' });
  });

  it('refuses to register an email that already exists', () => {
    const { status } = call('POST', '/auth/register', {
      email: 'buyer@example.com',
      password: 'x',
    });

    expect(status).toBe(409);
  });

  it('refuses duplicate CPF and CNPJ values even when formatting differs', () => {
    expect(
      call('POST', '/auth/register', {
        email: 'unique-cpf@example.com',
        cpf: '55566677788',
        cnpj: '12.345.678/0001-90',
      }).status
    ).toBe(409);
    expect(
      call('POST', '/auth/register', {
        email: 'unique-cnpj@example.com',
        cpf: '222.222.222-22',
        cnpj: '33333333000133',
      }).status
    ).toBe(409);
  });
});

describe('demo API — products', () => {
  it('lists the seeded catalog with pagination', () => {
    const { body } = call<{ products: unknown[]; pagination: { total: number } }>(
      'GET',
      '/products?page=1&limit=5'
    );

    expect(body.data?.products).toHaveLength(5);
    expect(body.data?.pagination.total).toBe(20);
  });

  it.each([
    { filter: 'category=Machinery', ids: [2, 6, 7, 8] },
    { filter: 'search=hydraulic', ids: [2] },
    { filter: 'minPrice=1000&maxPrice=5000', ids: [3, 4, 7, 9, 11, 14] },
    { filter: 'minMoq=10&maxMoq=25', ids: [1, 5, 12, 16, 19] },
    { filter: 'maxLeadTime=5', ids: [1, 5, 12, 13, 17, 19] },
    { filter: 'availability=limited', ids: [7, 16] },
  ])('returns the seeded matches for $filter', ({ filter, ids }) => {
    const { status, body } = call<{
      products: Array<{ id: number }>;
      pagination: { total: number };
    }>('GET', `/products?${filter}&limit=50`);

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.products.map(product => product.id)).toEqual(ids);
    expect(body.data?.pagination.total).toBe(ids.length);
  });

  it('returns an empty page when a search has no matches', () => {
    const { status, body } = call<{
      products: unknown[];
      pagination: { total: number };
    }>('GET', '/products?search=catalogue-no-match-fixture&limit=50');

    expect(status).toBe(200);
    expect(body.data?.products).toEqual([]);
    expect(body.data?.pagination.total).toBe(0);
  });

  it('filters by specification and tolerates malformed specification JSON', () => {
    const spec = encodeURIComponent(JSON.stringify({ material: 'Steel' }));
    const filtered = call<{ products: Array<{ specifications: Record<string, string> }> }>(
      'GET',
      `/products?specifications=${spec}&limit=50`
    ).body.data;

    expect(filtered?.products.length).toBeGreaterThan(0);
    expect(filtered?.products.every(p => p.specifications.material === 'Steel')).toBe(true);

    // A broken filter must not take the catalog down with it.
    expect(call('GET', '/products?specifications=%7Bbroken').status).toBe(200);
  });

  it('exposes distinct categories and grouped specification values', () => {
    const categories = call<string[]>('GET', '/products/categories').body.data ?? [];
    expect(categories).toContain('Machinery');
    expect(new Set(categories).size).toBe(categories.length);

    const specs = call<Record<string, string[]>>('GET', '/products/specifications').body.data ?? {};
    expect(Object.keys(specs).length).toBeGreaterThan(0);
    expect(Array.isArray(specs.material)).toBe(true);
  });

  it('reads one product and 404s on an unknown id', () => {
    expect(call<{ id: number }>('GET', '/products/1').body.data?.id).toBe(1);
    expect(call('GET', '/products/9999').status).toBe(404);
  });

  it('lets a supplier publish only under its own identity', () => {
    const { status, body } = call<{ id: number; supplierId: number }>(
      'POST',
      '/products',
      { name: 'Lathe', supplierId: 999, unitPrice: 100, minimumOrderQuantity: 1 },
      asSupplier()
    );

    expect(status).toBe(201);
    expect(body.data?.supplierId).toBe(2);
  });

  it('blocks a buyer from creating, updating or deleting products', () => {
    const buyer = asBuyer();

    expect(call('POST', '/products', { name: 'x' }, buyer).status).toBe(403);
    expect(call('PUT', '/products/1', { name: 'x' }, buyer).status).toBe(403);
    expect(call('DELETE', '/products/1', {}, buyer).status).toBe(403);
  });

  it("stops a supplier from touching another supplier's product", () => {
    // Product 9 belongs to supplier2, not to supplier@example.com.
    expect(call('PUT', '/products/9', { name: 'x' }, asSupplier()).status).toBe(403);
    expect(call('DELETE', '/products/9', {}, asSupplier()).status).toBe(403);
  });

  it('updates and deletes as admin, and persists the deletion', () => {
    const admin = asAdmin();

    expect(
      call<{ name: string }>('PUT', '/products/1', { name: 'Renamed' }, admin).body.data?.name
    ).toBe('Renamed');

    expect(call('DELETE', '/products/1', {}, admin).status).toBe(200);
    expect(call('GET', '/products/1').status).toBe(404);
  });
});

describe('demo API — quotations', () => {
  it('creates a quotation for a customer and prices it', () => {
    const { status, body } = call<{ id: number; totalAmount: number; items: unknown[] }>(
      'POST',
      '/quotations',
      { items: [{ productId: 1, quantity: 10 }] },
      asBuyer()
    );

    expect(status).toBe(201);
    expect(body.data?.items).toHaveLength(1);
    expect(body.data?.totalAmount).toBe(1500);
  });

  it('rejects an empty item list and a quantity below the product MOQ', () => {
    const buyer = asBuyer();

    expect(call('POST', '/quotations', { items: [] }, buyer).status).toBe(400);

    const belowMoq = call('POST', '/quotations', { items: [{ productId: 1, quantity: 2 }] }, buyer);
    expect(belowMoq.status).toBe(400);
    expect(belowMoq.body.error).toMatch(/Minimum order quantity/);
  });

  it('only lets customers create quotations', () => {
    expect(
      call('POST', '/quotations', { items: [{ productId: 1, quantity: 10 }] }, asSupplier()).status
    ).toBe(403);
  });

  it('scopes the customer list to the signed-in company', () => {
    const rows = call<Array<{ companyId: number }>>('GET', '/quotations', {}, asBuyer()).body.data;

    expect(rows?.length).toBeGreaterThan(0);
    expect(rows?.every(q => q.companyId === 3)).toBe(true);
    expect(call('GET', '/quotations', {}, asSupplier()).status).toBe(403);
  });

  it('shows a supplier only quotations containing its own products', () => {
    const rows = call<Array<{ items: Array<{ product: { supplierId: number } }> }>>(
      'GET',
      '/quotations/supplier',
      {},
      asSupplier()
    ).body.data;

    expect(rows?.length).toBeGreaterThan(0);
    expect(rows?.every(q => q.items.some(i => i.product.supplierId === 2))).toBe(true);
  });

  it('gates quotation detail by ownership', () => {
    expect(call('GET', '/quotations/1', {}, asBuyer()).status).toBe(200);
    expect(call('GET', '/quotations/1', {}, asAdmin()).status).toBe(200);
    expect(call('GET', '/quotations/9999', {}, asAdmin()).status).toBe(404);

    // supplier4 sells chemicals; quotation 1 is a bearing from supplier 2.
    const otherSupplier = signIn('supplier4@example.com', 'supplier123');
    expect(call('GET', '/quotations/1', {}, otherSupplier).status).toBe(403);
  });

  it('lets a supplier update a quotation it owns but not one it does not', () => {
    // Quotation 5 holds product 3, which belongs to supplier@example.com.
    const updated = call<{ status: string; adminNotes: string }>(
      'PUT',
      '/quotations/supplier/5',
      { status: 'processed', adminNotes: 'Accepted' },
      asSupplier()
    );

    expect(updated.status).toBe(200);
    expect(updated.body.data?.status).toBe('processed');

    const foreign = signIn('supplier4@example.com', 'supplier123');
    expect(call('PUT', '/quotations/supplier/1', { status: 'rejected' }, foreign).status).toBe(403);
  });

  it('reserves the admin quotation routes for admins', () => {
    expect(call('GET', '/quotations/admin/all', {}, asAdmin()).body.data).toHaveLength(5);
    expect(call('GET', '/quotations/admin/all', {}, asBuyer()).status).toBe(403);

    const updated = call<{ status: string }>(
      'PUT',
      '/quotations/admin/1',
      { status: 'rejected' },
      asAdmin()
    );
    expect(updated.body.data?.status).toBe('rejected');
    expect(call('PUT', '/quotations/admin/1', { status: 'rejected' }, asBuyer()).status).toBe(403);
  });

  it('calculates a quote with tier discount, shipping and tax', () => {
    const { body } = call<{
      calculations: {
        grandTotal: number;
        totalSavings: number;
        items: Array<{ tierDiscount: number }>;
      };
      summary: { total: string; totalItems: number };
    }>(
      'POST',
      '/quotations/calculate',
      { items: [{ productId: 1, quantity: 100 }], shippingMethod: 'standard' },
      asBuyer()
    );

    const data = body.data;
    // Product 1 tier: 51-200 units -> 10% off R$150.
    expect(data?.calculations.items[0].tierDiscount).toBe(0.1);
    expect(data?.calculations.totalSavings).toBe(1500);
    expect(data?.summary.totalItems).toBe(1);
    expect(data?.summary.total).toMatch(/^R\$ /);
  });

  it('surfaces a below-MOQ calculation as a 400', () => {
    const { status } = call(
      'POST',
      '/quotations/calculate',
      { items: [{ productId: 1, quantity: 1 }] },
      asBuyer()
    );

    expect(status).toBe(400);
  });

  it('compares every supplier in the product category', () => {
    const { body } = call<{
      quotes: Array<{ supplier: { companyName: string }; quote: unknown; error?: string }>;
      shippingMethod: string;
    }>(
      'POST',
      '/quotations/compare-suppliers',
      { productId: 9, quantity: 20, shippingMethod: 'express' },
      asBuyer()
    );

    expect(body.data?.quotes.length).toBeGreaterThan(1);
    expect(body.data?.shippingMethod).toBe('express');
    expect(body.data?.quotes.some(q => q.quote !== null)).toBe(true);
  });

  it('reports a per-supplier error instead of failing the whole comparison', () => {
    // Quantity 1 is below the MOQ of some catalog entries in this category.
    const { body } = call<{ quotes: Array<{ quote: unknown; error?: string }> }>(
      'POST',
      '/quotations/compare-suppliers',
      { productId: 1, quantity: 1 },
      asBuyer()
    );

    expect(body.data?.quotes.some(q => q.quote === null && q.error)).toBe(true);
  });
});

describe('demo API — orders', () => {
  const placeOrder = (token: string) =>
    call<{
      id: string;
      status: string;
      totalAmount: number;
      items: Array<{ orderId: number }>;
    }>('POST', '/orders', { quotationId: 3 }, token);

  it('creates an order from a quotation and completes that quotation', () => {
    const buyer = asBuyer();
    const { status, body } = placeOrder(buyer);

    expect(status).toBe(201);
    expect(body.data?.status).toBe('pending');
    const quotation = getState().quotations.find(q => q.id === 3);
    expect(body.data?.totalAmount).toBeGreaterThan(quotation?.totalAmount ?? 0);
    expect(body.data?.items[0].orderId).toBe(Number(body.data?.id.replace('demo-order-', '')));
    expect(quotation?.status).toBe('completed');
  });

  it('only converts an owned, processed, unexpired quotation', () => {
    const buyer = asBuyer();
    expect(call('POST', '/orders', { quotationId: 4 }, buyer).status).toBe(400);

    const processed = getState().quotations.find(q => q.id === 3);
    if (!processed) throw new Error('Missing processed demo quotation');
    processed.validUntil = new Date(Date.now() - 1);
    expect(call('POST', '/orders', { quotationId: 3 }, buyer).status).toBe(400);
  });

  it('refuses a second order for the same quotation', () => {
    // Quotations 1 and 2 already carry a seeded order; 3 does not.
    const buyer = asBuyer();
    expect(call('POST', '/orders', { quotationId: 3 }, buyer).status).toBe(201);
    expect(call('POST', '/orders', { quotationId: 3 }, buyer).status).toBe(409);
  });

  it("refuses to order against another company's quotation", () => {
    const outsider = signIn('supplier4@example.com', 'supplier123');
    expect(call('POST', '/orders', { quotationId: 3 }, outsider).status).toBe(404);
  });

  it('scopes the order list per role', () => {
    const buyerRows = call<{ orders: unknown[]; pagination: { total: number } }>(
      'GET',
      '/orders?page=1&limit=10',
      {},
      asBuyer()
    ).body.data;
    expect(buyerRows?.pagination.total).toBe(2);

    const supplierRows = call<{ orders: Array<{ id: string }> }>('GET', '/orders', {}, asSupplier())
      .body.data;
    expect(supplierRows?.orders.length).toBeGreaterThan(0);

    const filtered = call<{ orders: Array<{ status: string }> }>(
      'GET',
      '/orders?status=delivered',
      {},
      asBuyer()
    ).body.data;
    expect(filtered?.orders.every(o => o.status === 'delivered')).toBe(true);
  });

  it('reads one order, its history, and blocks a company that does not own it', () => {
    expect(call<{ id: string }>('GET', '/orders/demo-order-1', {}, asBuyer()).body.data?.id).toBe(
      'demo-order-1'
    );

    const history = call<{ timeline: Array<{ status: string; canTransitionTo: string[] }> }>(
      'GET',
      '/orders/demo-order-1/history',
      {},
      asBuyer()
    ).body.data;
    expect(history?.timeline[0].status).toBe('pending');
    const timeline = history?.timeline ?? [];
    expect(timeline[timeline.length - 1]?.status).toBe('delivered');

    const outsider = signIn('supplier4@example.com', 'supplier123');
    expect(call('GET', '/orders/demo-order-1', {}, outsider).status).toBe(403);
    expect(call('GET', '/orders/demo-order-1/history', {}, outsider).status).toBe(403);
    expect(call('GET', '/orders/nope', {}, asBuyer()).status).toBe(404);
  });

  it('enforces the status transition rules', () => {
    const admin = asAdmin();

    // demo-order-2 is shipped; delivered is legal, pending is not.
    expect(call('PUT', '/orders/demo-order-2/status', { status: 'pending' }, admin).status).toBe(
      400
    );

    const delivered = call<{ status: string; trackingNumber: string }>(
      'PUT',
      '/orders/demo-order-2/status',
      { status: 'delivered', trackingNumber: 'BR1', notes: 'Left at dock' },
      admin
    );
    expect(delivered.body.data?.status).toBe('delivered');

    // A delivered order is terminal.
    expect(call('PUT', '/orders/demo-order-2/status', { status: 'cancelled' }, admin).status).toBe(
      400
    );
  });

  it('requires valid shipping metadata for processing-to-shipped transitions', () => {
    const orderId = placeOrder(asBuyer()).body.data?.id;
    if (!orderId) throw new Error('Failed to create demo order');
    const supplier = asSupplier();

    expect(
      call('PUT', `/orders/${orderId}/status`, { status: 'processing' }, supplier).status
    ).toBe(200);
    expect(call('PUT', `/orders/${orderId}/status`, { status: 'shipped' }, supplier).status).toBe(
      400
    );
    expect(
      call(
        'PUT',
        `/orders/${orderId}/status`,
        { status: 'shipped', trackingNumber: 'BR1', nfeAccessKey: '1'.repeat(44) },
        supplier
      ).status
    ).toBe(400);

    const shipped = call<{
      status: string;
      nfeAccessKey: string;
      estimatedDeliveryDate: string;
    }>(
      'PUT',
      `/orders/${orderId}/status`,
      {
        status: 'shipped',
        trackingNumber: 'BR1',
        nfeAccessKey: '35240312345678000195550010000014761000047680',
      },
      supplier
    );
    expect(shipped.body.data).toMatchObject({
      status: 'shipped',
      nfeAccessKey: '35240312345678000195550010000014761000047680',
    });
    expect(shipped.body.data?.estimatedDeliveryDate).toBeTruthy();
  });

  it('keeps status updates away from buyers', () => {
    expect(
      call('PUT', '/orders/demo-order-1/status', { status: 'cancelled' }, asBuyer()).status
    ).toBe(403);
  });

  it('serves admin-only order listings and stats', () => {
    const all = call<{ pagination: { total: number } }>('GET', '/orders/admin/all', {}, asAdmin())
      .body.data;
    expect(all?.pagination.total).toBe(2);

    const stats = call<{ statusCounts: Record<string, number>; totalOrders: number }>(
      'GET',
      '/orders/admin/stats',
      {},
      asAdmin()
    ).body.data;
    expect(stats?.totalOrders).toBe(2);
    expect(stats?.statusCounts.delivered).toBe(1);
    expect(stats?.statusCounts.cancelled).toBe(0);

    expect(call('GET', '/orders/admin/all', {}, asBuyer()).status).toBe(403);
    expect(call('GET', '/orders/admin/stats', {}, asBuyer()).status).toBe(403);
  });
});

describe('demo API — admin', () => {
  it('aggregates transactions with revenue and status counts', () => {
    const { body } = call<{
      orders: Array<{ user: { companyName: string } }>;
      totalRevenue: number;
      totalOrders: number;
      ordersByStatus: Record<string, number>;
    }>('GET', '/admin/transactions', {}, asAdmin());

    expect(body.data?.totalOrders).toBe(2);
    expect(body.data?.totalRevenue).toBeGreaterThan(0);
    expect(body.data?.orders[0].user.companyName).toBe('Buyer Corp');
    expect(body.data?.ordersByStatus.delivered).toBe(1);
  });

  it('filters transactions by status and date range', () => {
    const admin = asAdmin();

    expect(
      call<{ totalOrders: number }>('GET', '/admin/transactions?status=shipped', {}, admin).body
        .data?.totalOrders
    ).toBe(1);

    const future = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    expect(
      call<{ totalOrders: number }>('GET', `/admin/transactions?startDate=${future}`, {}, admin)
        .body.data?.totalOrders
    ).toBe(0);
  });

  it('pages the verification queue and honours each filter', () => {
    const admin = asAdmin();

    const pending = call<{ companies: Array<{ status: string }>; totalCount: number }>(
      'GET',
      '/admin/companies/queue?filter=pending&page=1&limit=10',
      {},
      admin
    ).body.data;
    expect(pending?.totalCount).toBe(2);
    expect(pending?.companies.every(c => c.status === 'pending')).toBe(true);

    const all = call<{ totalCount: number }>('GET', '/admin/companies/queue?filter=all', {}, admin)
      .body.data;
    expect(all?.totalCount).toBeGreaterThan(pending?.totalCount ?? 0);

    const unvalidated = call<{ companies: Array<{ cnpjValidated: boolean }> }>(
      'GET',
      '/admin/companies/queue?filter=unvalidated_cnpj',
      {},
      admin
    ).body.data;
    expect(unvalidated?.companies.every(c => !c.cnpjValidated)).toBe(true);
  });

  it('approves a company and validates its CNPJ', () => {
    const admin = asAdmin();

    const verified = call<{ message: string }>(
      'PUT',
      '/admin/companies/101/verify',
      { status: 'approved', validateCNPJ: true },
      admin
    );
    expect(verified.body.data?.message).toMatch(/approved/);
    expect(getState().companies.find(c => c.id === 101)?.cnpjValidated).toBe(true);

    const rejected = call<{ message: string }>(
      'PUT',
      '/admin/companies/102/verify',
      { status: 'rejected' },
      admin
    );
    expect(rejected.body.data?.message).toMatch(/rejected/);

    const validated = call<{ user: { cnpjValidated: boolean } }>(
      'POST',
      '/admin/companies/103/validate-cnpj',
      {},
      admin
    );
    expect(validated.body.data?.user.cnpjValidated).toBe(true);

    expect(call('PUT', '/admin/companies/9999/verify', { status: 'approved' }, admin).status).toBe(
      404
    );
  });

  it('keeps every admin route away from non-admins', () => {
    const buyer = asBuyer();

    expect(call('GET', '/admin/transactions', {}, buyer).status).toBe(403);
    expect(call('GET', '/admin/companies/queue', {}, buyer).status).toBe(403);
    expect(call('PUT', '/admin/companies/101/verify', { status: 'approved' }, buyer).status).toBe(
      403
    );
    expect(call('POST', '/admin/companies/101/validate-cnpj', {}, buyer).status).toBe(403);
  });
});

describe('demo API — routing', () => {
  it('answers an unknown route with 404 in the backend envelope', () => {
    const { status, body } = call('GET', '/nope');

    expect(status).toBe(404);
    expect(body).toEqual({ success: false, error: 'Not found: GET /nope' });
  });

  it('matches literal paths before their :id siblings', () => {
    // Would resolve as quotation id "supplier"/"admin" if ordering were wrong.
    expect(call('GET', '/quotations/supplier', {}, asSupplier()).status).toBe(200);
    expect(call('GET', '/orders/admin/stats', {}, asAdmin()).status).toBe(200);
    expect(call('GET', '/products/categories').status).toBe(200);
  });

  it('ignores a trailing slash and is case-insensitive about the method', () => {
    expect(call('get', '/products/categories/').status).toBe(200);
  });

  it('logs out without requiring a session', () => {
    expect(call('POST', '/auth/logout').status).toBe(200);
  });
});

describe('demo API — persistence', () => {
  it('survives a reload and is restored by resetState', () => {
    const buyer = asBuyer();
    call('POST', '/quotations', { items: [{ productId: 2, quantity: 1 }] }, buyer);

    const saved = window.localStorage.getItem('crescebr_demo_state');
    expect(saved).toBeTruthy();
    expect(JSON.parse(saved as string).quotations).toHaveLength(6);

    resetState();
    expect(getState().quotations).toHaveLength(5);
  });

  it('falls back to a fresh state when stored data is unusable', () => {
    window.localStorage.setItem('crescebr_demo_state', '{not json');
    resetState();

    expect(getState().products).toHaveLength(20);
  });
});
