export default {
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 30000,
  // I recycle workers between files instead of retaining every suite in one heap.
  maxWorkers: 2,
  workerIdleMemoryLimit: '512MB',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/config/**',
    '!src/models/index.ts',
    '!src/routes/**',
    '!src/__tests__/setup.ts',
    '!src/__tests__/integration/**',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  // Set just below the levels actually measured (99.94 lines / 99.89 stmts /
  // 99.70 funcs / 99.03 branches) so a regression fails the build instead of
  // going unnoticed. Raise these when coverage rises; never lower them to make
  // a build pass.
  coverageThreshold: {
    global: {
      lines: 99.9,
      statements: 99.8,
      functions: 99.5,
      branches: 99,
    },
  },
  verbose: true,
};
