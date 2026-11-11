import request from 'supertest';
import {
  app,
  models,
  seedMutationContracts,
  restoreMutationContracts,
} from './mutationContractFixtures';
import { CNPJService } from '../../services/cnpjService';

/**
 * Public sign-up through the real auth router, services and database.
 *
 * The route test proves the gate sits in front of mocked controllers. This one
 * proves that, in production, a request that would otherwise create an account
 * creates nothing: no row, and no call to the external CNPJ provider. The
 * positive controls send the same payload where sign-up is allowed, so the 403
 * cannot come from a payload that was invalid anyway.
 */

const originalNodeEnv = process.env.NODE_ENV;
const originalOptIn = process.env.PUBLIC_REGISTRATION;

const input = (action: string) => ({
  email: `gate-${action}@example.com`,
  password: 'test-fixture',
  cpf: '98765432100',
  address: 'Synthetic test address',
  companyName: 'Gate company',
  corporateName: 'Gate company LTDA',
  cnpj: '11.222.333/0001-81',
  industrySector: 'machinery',
  companyType: 'buyer',
});

let cnpjLookup: jest.SpyInstance;

beforeEach(async () => {
  await seedMutationContracts();
  cnpjLookup = jest
    .spyOn(CNPJService, 'validateCNPJWithAPI')
    .mockResolvedValue({ valid: true, companyName: 'Gate company' });
  // The global setup mocks utils/jwt without generateTokenPair, which the
  // register controllers call once the account exists. Token issuing is not
  // what these tests are about, so a fixed pair stands in for it here.
  jest.requireMock<Record<string, unknown>>('../../utils/jwt').generateTokenPair = jest
    .fn()
    .mockResolvedValue({ accessToken: 'test-access', refreshToken: 'test-refresh' });
});

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalOptIn === undefined) delete process.env.PUBLIC_REGISTRATION;
  else process.env.PUBLIC_REGISTRATION = originalOptIn;
  restoreMutationContracts();
});

describe.each(['register', 'register-supplier'])('public sign-up at /auth/%s', action => {
  it('creates nothing in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.PUBLIC_REGISTRATION;
    const before = await models.User.count();

    const response = await request(app).post(`/api/v1/auth/${action}`).send(input(action));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ success: false, error: 'Public registration is disabled' });
    expect(await models.User.count()).toBe(before);
    expect(cnpjLookup).not.toHaveBeenCalled();
  });

  it('creates the account outside production (control)', async () => {
    process.env.NODE_ENV = 'test';
    const before = await models.User.count();

    const response = await request(app).post(`/api/v1/auth/${action}`).send(input(action));

    expect(response.status).toBe(201);
    expect(await models.User.count()).toBe(before + 1);
  });

  it('creates the account in production only after the explicit opt-in', async () => {
    process.env.NODE_ENV = 'production';
    process.env.PUBLIC_REGISTRATION = 'true';
    const before = await models.User.count();

    const response = await request(app).post(`/api/v1/auth/${action}`).send(input(action));

    expect(response.status).toBe(201);
    expect(await models.User.count()).toBe(before + 1);
  });
});
