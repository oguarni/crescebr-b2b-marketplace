import request from 'supertest';
import axios from 'axios';
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
const admin = actor(4, 'admin');

describe.each(['register', 'register-supplier'])('CNPJ failures during %s', action => {
  const input = {
    email: 'new-contract@example.com',
    password: 'test-fixture',
    cpf: '98765432100',
    address: 'Synthetic test address',
    companyName: 'New company',
    corporateName: 'New company LTDA',
    cnpj: '11.222.333/0001-81',
    industrySector: 'machinery',
    companyType: 'supplier',
  };

  it('preserves invalid CNPJ as a 400 without creating an account', async () => {
    const response = await request(app)
      .post(`/api/v1/auth/${action}`)
      .send({ ...input, cnpj: '00000000000000' })
      .expect(400);
    expect(response.body).toEqual({ success: false, error: 'Invalid CNPJ format' });
    expect(await models.User.count()).toBe(4);
  });

  it.each([{ code: 'ECONNABORTED' }, { response: { status: 429 } }])(
    'distinguishes provider unavailability (%j) from bad registration data',
    async failure => {
      (axios.get as jest.Mock).mockRejectedValueOnce(failure);
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const response = await request(app).post(`/api/v1/auth/${action}`).send(input).expect(503);
      expect(response.body).toEqual({ success: false, error: 'Server Error' });
      expect(await models.User.count()).toBe(4);
    }
  );
});

describe('admin errors through real services and HTTP middleware', () => {
  it.each(['verify', 'status', 'validate-cnpj', 'details'])(
    'keeps missing companies at 404 during %s',
    async action => {
      const route = request(app);
      const response = await (
        action === 'validate-cnpj'
          ? route.post('/api/v1/admin/companies/99/validate-cnpj')
          : action === 'details'
            ? route.get('/api/v1/admin/companies/99')
            : route.put(`/api/v1/admin/companies/99/${action}`).send({ status: 'approved' })
      )
        .set(admin)
        .expect(404);
      expect(response.body).toEqual({
        success: false,
        error:
          action === 'status' || action === 'details' ? 'Company not found' : 'Supplier not found',
      });
    }
  );

  it('keeps a missing moderated product at 404', async () => {
    const response = await request(app)
      .put('/api/v1/admin/products/99/moderate')
      .set(admin)
      .send({ action: 'remove' })
      .expect(404);
    expect(response.body).toEqual({ success: false, error: 'Product not found' });
  });

  it('keeps missing CNPJ validation at 400', async () => {
    await models.User.update({ cnpj: '' }, { where: { id: 3 }, validate: false });
    const response = await request(app)
      .post('/api/v1/admin/companies/3/validate-cnpj')
      .set(admin)
      .expect(400);
    expect(response.body).toEqual({ success: false, error: 'Supplier has no CNPJ to validate' });
  });

  it('represents invalid CNPJ format as an approval validation failure rather than 500', async () => {
    await models.User.update({ cnpj: '00000000000000', status: 'pending' }, { where: { id: 2 } });
    const response = await request(app)
      .put('/api/v1/admin/companies/2/verify')
      .set(admin)
      .send({ status: 'approved' })
      .expect(400);
    expect(response.body).toEqual({ success: false, error: 'Invalid CNPJ format' });
    expect((await models.User.findByPk(2))?.status).toBe('pending');
  });

  it('represents an unregistered CNPJ as invalid approval data rather than a missing supplier', async () => {
    (axios.get as jest.Mock).mockRejectedValueOnce({ response: { status: 404 } });
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
    const response = await request(app)
      .put('/api/v1/admin/companies/2/verify')
      .set(admin)
      .send({ status: 'approved' })
      .expect(400);
    expect(response.body).toEqual({ success: false, error: 'CNPJ not found' });
  });

  it.each([{ code: 'ECONNABORTED' }, { response: { status: 429 } }])(
    'distinguishes a retryable CNPJ provider failure (%j) from invalid approval data',
    async failure => {
      (axios.get as jest.Mock).mockRejectedValueOnce(failure);
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const response = await request(app)
        .put('/api/v1/admin/companies/2/verify')
        .set(admin)
        .send({ status: 'approved' })
        .expect(503);
      expect(response.body).toEqual({ success: false, error: 'Server Error' });
    }
  );

  it.each(['verify', 'status', 'validate-cnpj', 'details'])(
    'hides unexpected company lookup failures during %s',
    async action => {
      jest.spyOn(models.User, 'findOne').mockRejectedValueOnce(new Error(internalMessage));
      const route = request(app);
      const response = await (
        action === 'validate-cnpj'
          ? route.post('/api/v1/admin/companies/2/validate-cnpj')
          : action === 'details'
            ? route.get('/api/v1/admin/companies/2')
            : route.put(`/api/v1/admin/companies/2/${action}`).send({ status: 'rejected' })
      )
        .set(admin)
        .expect(500);
      expect(response.body).toEqual({ success: false, error: 'Server Error' });
    }
  );

  it('hides unexpected moderation writes', async () => {
    jest
      .spyOn(models.Product.prototype, 'destroy')
      .mockRejectedValueOnce(new Error(internalMessage));
    const response = await request(app)
      .put('/api/v1/admin/products/1/moderate')
      .set(admin)
      .send({ action: 'remove' })
      .expect(500);
    expect(response.body).toEqual({ success: false, error: 'Server Error' });
    expect(await models.Product.count()).toBe(1);
  });

  it('hides unexpected company saves', async () => {
    jest.spyOn(models.User.prototype, 'save').mockRejectedValueOnce(new Error(internalMessage));
    const response = await request(app)
      .put('/api/v1/admin/companies/2/status')
      .set(admin)
      .send({ status: 'rejected' })
      .expect(500);
    expect(response.body).toEqual({ success: false, error: 'Server Error' });
    expect((await models.User.findByPk(2))?.status).toBe('approved');
  });

  it('retains the existing standalone CNPJ result shape and format-validation fallback', async () => {
    (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Network unavailable'));
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);
    const response = await request(app)
      .post('/api/v1/admin/companies/2/validate-cnpj')
      .set(admin)
      .expect(200);
    expect(response.body.data.cnpjValidation).toEqual({
      valid: true,
      error: 'Unable to validate CNPJ online, using format validation only',
    });
    expect(response.body.data.user.cnpjValidated).toBe(true);
  });

  it('keeps retryable classification out of the standalone validation response', async () => {
    (axios.get as jest.Mock).mockRejectedValueOnce({ code: 'ECONNABORTED' });
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
    const response = await request(app)
      .post('/api/v1/admin/companies/2/validate-cnpj')
      .set(admin)
      .expect(200);
    expect(response.body.data.cnpjValidation).toEqual({
      valid: false,
      error: 'Timeout validating CNPJ',
    });
  });
});
