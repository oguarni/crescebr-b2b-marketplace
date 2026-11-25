import axios, { type AxiosInstance } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { demoAdapter } from '../adapter';
import { resetState } from '../store';

const client = (): AxiosInstance => {
  const instance = axios.create({ baseURL: '/api/v1' });
  instance.defaults.adapter = demoAdapter;
  return instance;
};

const withToken = async (): Promise<AxiosInstance> => {
  const api = client();
  const { data } = await api.post('/auth/login-email', {
    email: 'admin@crescebr.com',
    password: 'admin123',
  });
  api.defaults.headers.common.Authorization = `Bearer ${data.data.token}`;
  return api;
};

beforeEach(() => {
  window.localStorage.clear();
  resetState();
});

describe('demo adapter', () => {
  it('strips the API prefix and resolves a route', async () => {
    const { status, data } = await client().get('/products/categories');

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('folds axios `params` into the query string', async () => {
    const { data } = await client().get('/products', { params: { category: 'Machinery' } });

    expect(data.data.products.length).toBeGreaterThan(0);
    expect(data.data.products.every((p: { category: string }) => p.category === 'Machinery')).toBe(
      true
    );
  });

  it('serializes dates to ISO strings the way a real response does', async () => {
    // Regression: pages call `createdAt.split('T')`, which throws on a live Date.
    const api = await withToken();
    const { data } = await api.get('/admin/transactions');

    expect(data.data.orders.length).toBeGreaterThan(0);
    for (const order of data.data.orders) {
      expect(typeof order.createdAt).toBe('string');
      expect(() => order.createdAt.split('T')).not.toThrow();
    }

    const quotations = (await api.get('/quotations/admin/all')).data.data;
    expect(typeof quotations[0].createdAt).toBe('string');
  });

  it('rejects a non-2xx response as an AxiosError carrying the status', async () => {
    await expect(client().get('/products/9999')).rejects.toMatchObject({
      response: { status: 404, data: { success: false } },
    });
  });

  it('rejects an unauthenticated call with 401 so the interceptor can log out', async () => {
    await expect(client().get('/auth/me')).rejects.toMatchObject({
      response: { status: 401 },
    });
  });

  it('sends a JSON body through to the handler', async () => {
    const api = client();
    const { data } = await api.post('/auth/login', {
      cnpj: '33.333.333/0001-33',
      password: 'buyer123',
    });

    expect(data.data.user.email).toBe('buyer@example.com');
  });
});

describe('demo adapter — CSV import', () => {
  it('reads an uploaded file and imports its valid rows under the supplier', async () => {
    const api = client();
    const { data: login } = await api.post('/auth/login-email', {
      email: 'supplier@example.com',
      password: 'supplier123',
    });
    api.defaults.headers.common.Authorization = `Bearer ${login.data.token}`;

    const csv = [
      'name,description,price,imageUrl,category,supplierId,tierPricing',
      '"Parafuso M8","Aço inox",2.5,https://example.com/p.png,components,999,"[{""minQuantity"":100,""maxQuantity"":null,""discount"":0.1}]"',
      '"Sem preço","Linha inválida",0,https://example.com/p.png,components,,',
      '"URL ruim","Outra",3,not-a-url,components,,"{}"',
    ].join('\n');
    const form = new FormData();
    form.append('csvFile', new File([csv], 'produtos.csv', { type: 'text/csv' }));

    const { data } = await api.post('/products/import/csv', form);

    expect(data.data).toEqual({
      imported: 1,
      failed: 2,
      totalErrors: 2,
      errors: [
        { row: 3, error: 'Valid price is required (must be a positive number)' },
        {
          row: 4,
          error: 'Invalid image URL format, Tier pricing must be a valid JSON array',
        },
      ],
    });
    const { data: catalog } = await api.get('/products', { params: { search: 'Parafuso' } });
    const imported = catalog.data.products[0];
    // The importing supplier owns the product, whatever supplierId the file says.
    expect(imported).toMatchObject({ name: 'Parafuso M8', supplierId: login.data.user.id });
    expect(imported.tierPricing).toEqual([{ minQuantity: 100, maxQuantity: null, discount: 0.1 }]);
  });

  it('refuses an import without a file, and from an admin', async () => {
    const supplierApi = client();
    const { data: login } = await supplierApi.post('/auth/login-email', {
      email: 'supplier@example.com',
      password: 'supplier123',
    });
    supplierApi.defaults.headers.common.Authorization = `Bearer ${login.data.token}`;
    await expect(supplierApi.post('/products/import/csv', {})).rejects.toMatchObject({
      response: { status: 400 },
    });

    const admin = await withToken();
    const form = new FormData();
    form.append('csvFile', new File(['name'], 'p.csv'));
    form.append('skipErrors', 'true');
    await expect(admin.post('/products/import/csv', form)).rejects.toMatchObject({
      response: { status: 403 },
    });
  });
});
