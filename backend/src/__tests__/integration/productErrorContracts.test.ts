import request from 'supertest';
import fs from 'fs';
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

const csv =
  'name,description,price,imageUrl,category\nImported product,Synthetic,10,https://example.com/image.png,test\n';
const product = { name: 'New product', description: 'Synthetic', price: 10, category: 'test' };

describe('product mutation and import error contracts', () => {
  it('already keeps missing CRUD resources at 404', async () => {
    const response = await request(app)
      .delete('/api/v1/products/99')
      .set(actor(4, 'admin'))
      .expect(404);
    expect(response.body).toEqual({ success: false, error: 'Product not found' });
  });

  it('already hides unexpected CRUD writes', async () => {
    jest.spyOn(models.Product, 'create').mockRejectedValueOnce(new Error(internalMessage));
    const response = await request(app)
      .post('/api/v1/products')
      .set(actor(2, 'supplier'))
      .send(product)
      .expect(500);
    expect(response.body).toEqual({ success: false, error: 'Server Error' });
  });

  it('already enforces product ownership with 403', async () => {
    const response = await request(app)
      .put('/api/v1/products/1')
      .set(actor(3, 'supplier'))
      .send(product)
      .expect(403);
    expect(response.body.success).toBe(false);
    expect((await models.Product.findByPk(1))?.name).toBe('Contract product');
  });

  it('hides filesystem upload failures behind a 500', async () => {
    const mkdir = fs.mkdirSync;
    jest.spyOn(fs, 'mkdirSync').mockImplementation((...args) => {
      if (args[0] === 'uploads') throw new Error('EACCES: cannot create /private/uploads');
      return mkdir(...args);
    });
    const response = await request(app)
      .post('/api/v1/products/import/csv')
      .set(actor(2, 'supplier'))
      .attach('csvFile', Buffer.from(csv), { filename: 'test.csv', contentType: 'text/csv' })
      .expect(500);
    expect(response.body).toEqual({ success: false, error: 'Server Error' });
  });

  it('retains known file-type and multipart-limit failures as 400', async () => {
    const wrongType = await request(app)
      .post('/api/v1/products/import/csv')
      .set(actor(2, 'supplier'))
      .attach('csvFile', Buffer.from(csv), { filename: 'test.png', contentType: 'image/png' })
      .expect(400);
    expect(wrongType.body.error).toBe('Only CSV files are allowed');
    const wrongField = await request(app)
      .post('/api/v1/products/import/csv')
      .set(actor(2, 'supplier'))
      .attach('wrongFile', Buffer.from(csv), { filename: 'test.csv', contentType: 'text/csv' })
      .expect(400);
    expect(wrongField.body.error).toBe('Unexpected file field');
  });

  it('preserves import row validation and partial-result shape', async () => {
    const response = await request(app)
      .post('/api/v1/products/import/csv')
      .set(actor(2, 'supplier'))
      .attach('csvFile', Buffer.from(csv.replace(',10,', ',invalid,')), {
        filename: 'test.csv',
        contentType: 'text/csv',
      })
      .expect(200);
    expect(response.body.success).toBe(false);
    expect(response.body.data).toMatchObject({ imported: 0, failed: 1, totalErrors: 1 });
    expect(response.body.data.errors[0].error).toBe(
      'Valid price is required (must be a positive number)'
    );
  });

  it('hides raw database messages inside the existing import result', async () => {
    jest.spyOn(models.Product, 'create').mockRejectedValueOnce(new Error(internalMessage));
    const response = await request(app)
      .post('/api/v1/products/import/csv')
      .set(actor(2, 'supplier'))
      .attach('csvFile', Buffer.from(csv), { filename: 'test.csv', contentType: 'text/csv' })
      .expect(200);
    expect(response.body.data).toMatchObject({ imported: 0, failed: 1, totalErrors: 1 });
    expect(response.body.data.errors[0].error).toBe('Failed to import product');
    expect(JSON.stringify(response.body)).not.toContain(internalMessage);
  });

  it('hides unexpected batch startup failures inside the existing import result', async () => {
    jest.spyOn(models.sequelize, 'transaction').mockRejectedValueOnce(new Error(internalMessage));
    const response = await request(app)
      .post('/api/v1/products/import/csv')
      .set(actor(2, 'supplier'))
      .attach('csvFile', Buffer.from(csv), { filename: 'test.csv', contentType: 'text/csv' })
      .expect(200);
    expect(response.body.data.errors[0].error).toBe('Failed to process CSV file');
    expect(JSON.stringify(response.body)).not.toContain(internalMessage);
  });
});
