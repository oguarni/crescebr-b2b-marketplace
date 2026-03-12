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
│   └── errorHandler.test.ts              # Error handler
├── models/__tests__/
│   ├── OrderStatusHistory.test.ts         # Order status model
│   └── User.test.ts                       # User model
├── repositories/__tests__/
│   ├── order.repository.test.ts           # Order repo
│   ├── product.repository.test.ts         # Product repo
│   └── quotation.repository.test.ts       # Quotation repo
├── services/__tests__/
│   ├── cnpjService.test.ts                # CNPJ verification
│   ├── orderStatusService.test.ts         # Order status logic
│   └── quoteService.test.ts              # Quote calculation
├── utils/__tests__/
│   ├── csvImporter.test.ts                # CSV import utility
│   └── jwt.test.ts                        # JWT utility
└── validators/__tests__/
    └── order.validators.test.ts           # Order validators
```

---

## Coverage Report (2026-03-12)

**Overall**: 52.57% statements | 48.72% branches | 48.38% functions | 52.44% lines

### By Layer

| Layer        | Stmts | Branch | Funcs | Lines | Status       |
| ------------ | ----- | ------ | ----- | ----- | ------------ |
| Repositories | 100%  | 100%   | 94.7% | 100%  | GOOD         |
| Models       | 83.7% | 0%     | 40%   | 83.7% | OK           |
| Services     | 74.3% | 68%    | 65.7% | 75.1% | NEEDS WORK   |
| Controllers  | 64%   | 53.1%  | 56.2% | 64.4% | NEEDS WORK   |
| Utils        | 67.3% | 67%    | 43.9% | 66.5% | NEEDS WORK   |
| Validators   | 56.1% | 44.4%  | 50%   | 53.8% | NEEDS WORK   |
| Middleware   | 17.7% | 13.8%  | 12.7% | 15.5% | CRITICAL     |
| Routes       | 0%    | 100%   | 0%    | 0%    | N/A (wiring) |

### Zero-Coverage Files (Priority Order)

1. **middleware/rbac.ts** - CRITICAL: Permission engine untested
2. **middleware/rateLimiting.ts** - CRITICAL: Rate limiter untested
3. **middleware/validation.ts** - HIGH: Input validation untested
4. **controllers/productsController.ts** - HIGH: Entire controller untested
5. **services/adminService.ts** - HIGH: 14% coverage
6. **validators/auth.validators.ts** - MEDIUM
7. **validators/product.validators.ts** - MEDIUM
8. **utils/jwt.ts** - MEDIUM: 41% coverage (refresh/session logic untested)

### Failing Tests (4 failures in 3 suites)

Check current status by running: `cd backend && NODE_ENV=test npx jest --runInBand --forceExit`

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
