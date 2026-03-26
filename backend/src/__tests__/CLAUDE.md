# Backend Test Guide

## Framework & Config

- **Jest 30** with `ts-jest` preset
- Config: `backend/jest.config.js`
- Setup: `backend/src/__tests__/setup.ts`
- Test timeout: 30s
- Run: `cd backend && NODE_ENV=test npx jest --runInBand --forceExit --detectOpenHandles`

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
│   ├── order.repository.test.ts           # Order repo
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

## Coverage Report (2026-03-26)

**Overall**: 94.16% statements | 89.53% branches | 93.93% functions | 94.15% lines

### By Layer

| Layer        | Stmts  | Branch | Funcs  | Lines  | Status       |
| ------------ | ------ | ------ | ------ | ------ | ------------ |
| Middleware   | 100%   | 99.4%  | 100%   | 100%   | EXCELLENT    |
| Models       | 100%   | 100%   | 100%   | 100%   | EXCELLENT    |
| Validators   | 100%   | 88.9%  | 100%   | 100%   | EXCELLENT    |
| Services     | 98.75% | 95.2%  | 100%   | 98.9%  | EXCELLENT    |
| Utils        | 98.59% | 94.6%  | 97.6%  | 98.5%  | EXCELLENT    |
| Controllers  | 84.16% | 74.1%  | 80.3%  | 84.1%  | GOOD         |
| Repositories | 83.33% | 100%   | 84.2%  | 90.9%  | GOOD         |
| Routes       | 0%     | 100%   | 0%     | 0%     | N/A (wiring) |

### Zero-Coverage Files

1. **controllers/quotationsController.ts** - 0% (test suite fails to compile — TS2345 type mismatch in mock at line 1066)
2. **repositories/index.ts** - 0% (re-export barrel, low priority)

### Failing Tests (1 suite, 0 test failures)

`quotationsController.test.ts` fails to compile due to a TypeScript error: mock for `getMultipleSupplierQuotes` returns an incomplete `QuoteCalculationResult` type. All 936 individual tests pass.

Check current status: `cd backend && NODE_ENV=test npx jest --runInBand --forceExit`

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
