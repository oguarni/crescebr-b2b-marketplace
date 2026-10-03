import type { Options } from 'sequelize';

const originalEnv = process.env;

afterEach(() => {
  process.env = originalEnv;
  jest.resetModules();
});

function loadConfigs(overrides: Record<string, string | undefined>) {
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    DB_USER: 'fixture-role',
    DB_PASSWORD: 'fixture-not-a-credential',
    DB_HOST: '127.0.0.1',
    DB_PORT: '5444',
    DB_NAME: 'development_database',
    TEST_DB_NAME: 'isolated_test_database',
    ...overrides,
  };
  const constructor = jest.fn();
  let cli: Record<string, Options> = {};
  jest.isolateModules(() => {
    jest.doMock('sequelize', () => ({ Sequelize: constructor }));
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    // The shared setup mocks database.ts, so explicitly exercise the real
    // runtime configuration without opening a connection or reading .env.
    jest.requireActual('../database');
    cli = jest.requireActual('../../../config/config.cjs');
  });
  return { runtime: constructor.mock.calls[0][0] as Options, cli };
}

describe('runtime database configuration', () => {
  it.each(['development', 'test', 'production'])(
    'should use the same connection settings as the CLI in %s',
    environment => {
      const { runtime, cli } = loadConfigs({ NODE_ENV: environment });
      for (const key of ['username', 'password', 'database', 'host', 'port', 'dialect'] as const) {
        expect(runtime[key]).toBe(cli[environment][key]);
      }
    }
  );

  it('should never inherit the development database name in test mode', () => {
    const { runtime } = loadConfigs({ TEST_DB_NAME: undefined });

    expect(runtime.database).toBe('crescebr_test');
    expect(runtime.database).not.toBe(process.env.DB_NAME);
  });

  it('should use the CLI localhost and port defaults in test mode', () => {
    const { runtime, cli } = loadConfigs({ DB_HOST: undefined, DB_PORT: undefined });

    expect(runtime.host).toBe(cli.test.host);
    expect(runtime.port).toBe(cli.test.port);
  });

  it('should fail before constructing a connection when the password is missing', () => {
    expect(() => loadConfigs({ DB_PASSWORD: undefined })).toThrow('DB_PASSWORD is not set');
  });
});
