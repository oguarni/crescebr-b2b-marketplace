# Backend Test Guide

## Framework & Config

- **Jest 30** with a `ts-jest` transform using `tsconfig.test.json`
- Config: `backend/jest.config.js`
- Setup: `backend/src/__tests__/setup.ts`
- Test timeout: 30s
- Run: `npm test -w backend` — the script first type-checks application and test files, then sets
  `NODE_ENV=test`, the coverage flags and `NODE_OPTIONS=--max-old-space-size=4096` for Jest.
- `tsconfig.test.json` enables isolated file transpilation for Jest; the separate `tsc` step still
  performs full type checking. The production build keeps `tsconfig.json` and excludes test files.
  Calling `npx jest` directly omits the type-check step and heap setting.
- Jest uses two workers and recycles them above 512 MB between files. For focused open-handle
  debugging, use `npm run test:handles -w backend -- --runTestsByPath src/path/__tests__/file.test.ts`.
  That diagnostic runs serially and does not recycle workers; use the normal command for full runs.
- `test:watch` type-checks once before starting Jest. Run `npm run typecheck -w backend` again to
  check subsequent edits, or run `npx tsc --noEmit -p tsconfig.test.json --watch` from `backend/`.

---

## Test Structure

```
src/
├── __tests__/
│   ├── setup.ts                           # Global test setup (mocks DB)
│   └── integration/
│       └── setup.ts                       # Integration test setup
├── controllers/__tests__/
│   ├── adminController.test.ts            # Admin endpoints
│   ├── authController.test.ts             # Auth endpoints
│   ├── ordersController.test.ts           # Order endpoints
│   ├── productsController.test.ts         # Product endpoints
│   ├── quotationsController.test.ts       # Quotation endpoints
│   └── ratingsController.test.ts          # Rating endpoints
├── middleware/__tests__/
│   ├── auth.test.ts                       # JWT auth middleware
│   ├── errorHandler.test.ts              # Error handler
│   ├── rateLimiting.test.ts              # Rate limiting
│   └── rbac.test.ts                      # RBAC permission engine
├── models/__tests__/
│   ├── OrderStatusHistory.test.ts         # Order status model
│   ├── Product.test.ts                    # Product model
│   └── User.test.ts                       # User model
├── repositories/__tests__/
│   ├── product.repository.test.ts         # Product repo
│   └── quotation.repository.test.ts       # Quotation repo
├── services/__tests__/
│   ├── adminService.test.ts               # Admin service
│   ├── cnpjService.test.ts                # CNPJ verification
│   ├── orderStatusService.test.ts         # Order status logic
│   ├── productsService.test.ts            # Products service
│   ├── quotationService.test.ts           # Quotation service
│   ├── quoteService.test.ts               # Quote calculation
│   └── ratingsService.test.ts             # Ratings service
├── utils/__tests__/
│   ├── csvImporter.test.ts                # CSV import utility
│   └── jwt.test.ts                        # JWT utility
└── validators/__tests__/
    ├── auth.validators.test.ts            # Auth validators
    ├── index.test.ts                      # Validator barrel exports
    ├── order.validators.test.ts           # Order validators
    └── product.validators.test.ts         # Product validators
```

---

## Coverage Report (2026-08-30)

**Suite**: 42 test suites, **1,299 tests, all passing**.

**Overall**: 99.89% statements (1,888/1,890) | 99.03% branches (1,022/1,032) | 99.70% functions
(337/338) | 99.94% lines (1,771/1,772).

Basis: Istanbul's `json-summary` reporter — `npm test -- --coverageReporters=json-summary`, then read
`coverage/coverage-summary.json`. **Statements and lines are different metrics** and the two totals
are close enough to swap by accident: the Clover reporter's `statements` attribute carries Istanbul's
*line* data, which is how 99.49% was previously published as a statement figure. Quote the
json-summary, and regenerate rather than copy — these move with every merge.

### By Layer

| Layer        | Stmts   | Branch | Funcs   | Lines   | Covered/total stmts |
| ------------ | ------- | ------ | ------- | ------- | ------------------- |
| Controllers  | 100%    | 98.54% | 100%    | 100%    | 411/411             |
| Repositories | 100%    | 100%   | 100%    | 100%    | 32/32               |
| Models       | 100%    | 91.67% | 100%    | 100%    | 49/49               |
| Middleware   | 100%    | 99.44% | 100%    | 100%    | 368/368             |
| Services     | 100%    | 99.36% | 100%    | 100%    | 668/668             |
| Utils        | 99.33%  | 98.69% | 98.46%  | 99.63%  | 297/299             |
| Validators   | 100%    | 100%   | 100%    | 100%    | 63/63               |

Middleware, services, and validators now have 100% statement coverage. The two remaining uncovered
statements are isolated utility fallbacks; routes remain intentionally excluded from collection.

### Known Test Issues

1. **OOM**: the explicit 4 GB heap cap fixed an earlier failure, but a later full workspace run
   exhausted it during a serial run with open-handle tracing. Jest now recycles worker processes
   between files and transpiles each file separately;
   `npm test` and `npm run typecheck` check the complete application/test program with `tsc` first.
   The heap cap and coverage thresholds remain unchanged.
2. ~~**Lint errors in tests**: `ratingsService.test.ts` uses `fail()` (8 occurrences)~~ → Fixed (2026-04-04)

Check current status: `cd backend && npm test`

---

## Test Patterns

### Controller Tests

Controllers are tested with mocked Sequelize models. Pattern:

```typescript
jest.mock('../../models/ModelName', () => ({
  default: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
}));
```

### Service Tests

Services mock the repository layer or model layer.

### Repository Tests

Repositories mock the Sequelize model methods directly.

---

## Writing New Tests

### Naming Convention

- File: `<source-file-name>.test.ts`
- Location: `__tests__/` directory adjacent to source
- Describe blocks: Match function/class name
- It blocks: `it('should <behavior> when <condition>')`

### Test Template

```typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock dependencies BEFORE imports
jest.mock('../../models/ModelName', () => ({
  default: {
    /* mocks */
  },
}));

describe('functionName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return expected result when given valid input', async () => {
    // Arrange
    // Act
    // Assert
  });

  it('should throw error when given invalid input', async () => {
    // Arrange
    // Act & Assert
    await expect(fn()).rejects.toThrow('Expected error');
  });
});
```

### Priority Test Targets

When writing new tests, prioritize:

1. Security middleware (RBAC, rate limiting) - Highest impact
2. Controllers with business logic - High user-facing impact
3. Services with complex logic - Core business rules
4. Validators - Input boundary enforcement
