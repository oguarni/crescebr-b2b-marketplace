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

const actions = [
  { method: 'get', path: '/orders/not-a-uuid/history', id: 1, role: 'customer', field: 'orderId' },
  {
    method: 'put',
    path: '/orders/not-a-uuid/status',
    body: { status: 'processing' },
    id: 4,
    role: 'admin',
    field: 'orderId',
  },
  {
    method: 'patch',
    path: '/orders/not-a-uuid/nfe',
    body: {},
    id: 4,
    role: 'admin',
    field: 'orderId',
  },
  {
    method: 'put',
    path: '/admin/companies/not-an-id/verify',
    body: { status: 'approved' },
    id: 4,
    role: 'admin',
    field: 'userId',
  },
  {
    method: 'put',
    path: '/admin/companies/2147483648/status',
    body: { status: 'approved' },
    id: 4,
    role: 'admin',
    field: 'userId',
  },
  {
    method: 'post',
    path: '/admin/companies/1junk/validate-cnpj',
    body: {},
    id: 4,
    role: 'admin',
    field: 'userId',
  },
  { method: 'get', path: '/admin/companies/1.5', id: 4, role: 'admin', field: 'userId' },
  { method: 'get', path: '/admin/companies/0/metrics', id: 4, role: 'admin', field: 'userId' },
  {
    method: 'put',
    path: '/admin/products/not-an-id/moderate',
    body: { action: 'remove' },
    id: 4,
    role: 'admin',
    field: 'productId',
  },
  {
    method: 'put',
    path: '/products/1junk',
    body: { name: 'Changed', description: 'Synthetic', price: 10, category: 'test' },
    id: 2,
    role: 'supplier',
    field: 'id',
  },
  { method: 'delete', path: '/products/2147483648', id: 4, role: 'admin', field: 'id' },
  {
    method: 'post',
    path: '/ratings',
    body: { supplierId: 2, score: 4, orderId: 'not-a-uuid' },
    id: 1,
    role: 'customer',
    field: 'orderId',
  },
  {
    method: 'put',
    path: '/ratings/not-an-id',
    body: { score: 4 },
    id: 1,
    role: 'customer',
    field: 'ratingId',
  },
  { method: 'delete', path: '/ratings/2147483648', id: 1, role: 'customer', field: 'ratingId' },
  {
    method: 'post',
    path: '/orders',
    body: { quotationId: 2147483648 },
    id: 1,
    role: 'customer',
    field: 'quotationId',
  },
  {
    method: 'post',
    path: '/quotations',
    body: { items: [{ productId: 2147483648, quantity: 5 }] },
    id: 1,
    role: 'customer',
    field: 'items[0].productId',
  },
  {
    method: 'post',
    path: '/quotations/calculate',
    body: { items: [{ productId: 2147483648, quantity: 5 }] },
    id: 1,
    role: 'customer',
    field: 'items[0].productId',
  },
  {
    method: 'post',
    path: '/quotations/compare-suppliers',
    body: { productId: 2147483648, quantity: 5 },
    id: 1,
    role: 'customer',
    field: 'productId',
  },
  {
    method: 'post',
    path: '/ratings',
    body: { supplierId: 2147483648, score: 4 },
    id: 1,
    role: 'customer',
    field: 'supplierId',
  },
  ...(['invalid', 2147483648] as const).map(supplierId => ({
    method: 'post' as const,
    path: '/quotations/compare-suppliers',
    body: { productId: 1, quantity: 5, supplierIds: [supplierId] },
    id: 1,
    role: 'customer',
    field: 'supplierIds[0]',
  })),
] as const;

it.each(actions)('rejects malformed mutation identifiers: $method $path', async action => {
  const orderRead = jest.spyOn(models.Order, 'findByPk');
  const userRead = jest.spyOn(models.User, 'findByPk');
  const productRead = jest.spyOn(models.Product, 'findByPk');
  const orderLookup = jest.spyOn(models.Order, 'findOne');
  const userLookup = jest.spyOn(models.User, 'findOne');
  const ratingLookup = jest.spyOn(models.Rating, 'findOne');
  const response = await request(app)
    [action.method](`/api/v1${action.path}`)
    .set(actor(action.id, action.role))
    .send('body' in action ? action.body : {})
    .expect(400);
  expect(response.body).toMatchObject({
    success: false,
    error: 'Validation failed',
    details: expect.arrayContaining([expect.objectContaining({ path: action.field })]),
  });
  expect(orderRead).not.toHaveBeenCalled();
  expect(orderLookup).not.toHaveBeenCalled();
  expect(ratingLookup).not.toHaveBeenCalled();
  expect(productRead).not.toHaveBeenCalled();
  // Supplier approval legitimately checks the actor before validating product IDs.
  if (action.role === 'supplier') {
    expect(userRead).toHaveBeenCalledTimes(1);
    expect(userRead).toHaveBeenCalledWith(action.id);
    expect(userLookup).toHaveBeenCalledTimes(1);
    expect(userLookup).toHaveBeenCalledWith(expect.objectContaining({ where: { id: action.id } }));
  } else {
    expect(userRead).not.toHaveBeenCalled();
    expect(userLookup).not.toHaveBeenCalled();
  }
  expect((await models.Product.findByPk(1))?.name).toBe('Contract product');
});
