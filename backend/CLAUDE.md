# Backend - CresceBR

## Language Configuration

**Always use English** for:
- Code comments and documentation
- Commit messages
- Variable and function names
- All generated content

---

## Tech Stack
- Node.js 16+ with Express 5.1.0
- TypeScript 5.8.3
- PostgreSQL 15 + Sequelize ORM 6.37.7
- JWT (jsonwebtoken 9.0.2)
- Jest 30.0.3 + Supertest

## Target Folder Structure (After Refactoring)

```
src/
├── controllers/    # HTTP handling ONLY (thin controllers)
├── services/       # ALL business logic
├── repositories/   # NEW: Data access layer
├── validators/     # NEW: Extracted validation rules
├── models/         # Sequelize models (unchanged)
├── routes/         # Route definitions
├── middleware/     # Auth, RBAC, validation, rate limiting
├── config/         # Database configuration
├── types/          # Type definitions
├── utils/          # Utility functions
├── __tests__/      # Unit tests
├── migrations/     # Database migrations
├── seeders/        # Seed data
└── server.ts       # Entry point
```

---

## Code Patterns (Target State)

### Controllers (THIN - HTTP only)
```typescript
// CORRECT: Controller delegates everything to service
export const createQuotation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await quotationService.create(req.body.items, req.user!.id);
  res.status(201).json({ success: true, data: result });
});

// WRONG: Controller contains business logic
export const createQuotation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Validation logic here - WRONG
  // Database queries here - WRONG
  // Business rules here - WRONG
});
```

### Services (ALL business logic)
```typescript
// Services contain:
// - Input validation orchestration
// - Business rule enforcement
// - Repository calls for data access
// - Error handling with meaningful messages

class QuotationService {
  async create(items: CreateQuotationItem[], userId: number): Promise<Quotation> {
    await this.validateItems(items);
    const quotation = await quotationRepository.createWithItems(items, userId);
    return quotation;
  }
}
```

### Repositories (Data access patterns)
```typescript
// Repositories contain:
// - Sequelize queries with includes
// - Reusable query patterns
// - No business logic

export const quotationRepository = {
  findByIdWithItems: (id: number) => Quotation.findByPk(id, {
    include: [{ model: QuotationItem, as: 'items', include: [{ model: Product, as: 'product' }] }]
  }),

  findAllForCompany: (companyId: number) => Quotation.findAll({
    where: { companyId },
    include: [...],
    order: [['createdAt', 'DESC']]
  }),
};
```

### Validators (Extracted validation rules)
```typescript
// validators/quotation.validators.ts
export const createQuotationValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isInt({ min: 1 }).withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];
```

---

## Refactoring Tasks

### Phase 1: Create Repository Layer [PRIORITY: HIGH]

**Why**: The same Sequelize include patterns repeat 5+ times across controllers. Centralizing them improves maintainability and testability.

**Task 1.1: Create `src/repositories/quotation.repository.ts`**

```typescript
import Quotation from '../models/Quotation';
import QuotationItem from '../models/QuotationItem';
import Product from '../models/Product';
import User from '../models/User';

const QUOTATION_INCLUDES = {
  withItems: [
    {
      model: QuotationItem,
      as: 'items',
      include: [{ model: Product, as: 'product' }],
    },
  ],
  withItemsAndUser: [
    {
      model: QuotationItem,
      as: 'items',
      include: [{ model: Product, as: 'product' }],
    },
    {
      model: User,
      as: 'user',
      attributes: ['id', 'email', 'cpf', 'address', 'role'],
    },
  ],
};

export const quotationRepository = {
  findById: (id: number) => Quotation.findByPk(id),

  findByIdWithItems: (id: number) =>
    Quotation.findByPk(id, { include: QUOTATION_INCLUDES.withItems }),

  findByIdWithItemsAndUser: (id: number) =>
    Quotation.findByPk(id, { include: QUOTATION_INCLUDES.withItemsAndUser }),

  findAllForCompany: (companyId: number) =>
    Quotation.findAll({
      where: { companyId },
      include: QUOTATION_INCLUDES.withItems,
      order: [['createdAt', 'DESC']],
    }),

  findAll: () =>
    Quotation.findAll({
      include: QUOTATION_INCLUDES.withItemsAndUser,
      order: [['createdAt', 'DESC']],
    }),

  create: (data: { companyId: number; status: string; adminNotes: string | null }) =>
    Quotation.create(data),

  update: (quotation: Quotation, data: Partial<{ status: string; adminNotes: string }>) =>
    quotation.update(data),
};
```

**Task 1.2: Create `src/repositories/product.repository.ts`**

```typescript
import Product from '../models/Product';
import User from '../models/User';

export const productRepository = {
  findById: (id: number) => Product.findByPk(id),

  findByIdWithSupplier: (id: number) =>
    Product.findByPk(id, {
      include: [{ model: User, as: 'supplier', attributes: ['id', 'companyName', 'email'] }],
    }),

  findAllActive: () =>
    Product.findAll({
      where: { availability: ['in_stock', 'limited'] },
      include: [{ model: User, as: 'supplier', attributes: ['id', 'companyName'] }],
    }),

  findBySupplier: (supplierId: number) =>
    Product.findAll({ where: { supplierId } }),

  findByIds: (ids: number[]) =>
    Product.findAll({ where: { id: ids } }),
};
```

**Task 1.3: Create `src/repositories/order.repository.ts`**

```typescript
import Order from '../models/Order';
import Quotation from '../models/Quotation';
import User from '../models/User';
import OrderStatusHistory from '../models/OrderStatusHistory';

export const orderRepository = {
  findById: (id: string) => Order.findByPk(id),

  findByIdWithRelations: (id: string) =>
    Order.findByPk(id, {
      include: [
        { model: Quotation, as: 'quotation' },
        { model: User, as: 'buyer', attributes: ['id', 'email', 'companyName'] },
        { model: OrderStatusHistory, as: 'statusHistory' },
      ],
    }),

  findAllForBuyer: (buyerId: number) =>
    Order.findAll({
      where: { buyerId },
      include: [{ model: Quotation, as: 'quotation' }],
      order: [['createdAt', 'DESC']],
    }),

  findAll: () =>
    Order.findAll({
      include: [
        { model: Quotation, as: 'quotation' },
        { model: User, as: 'buyer', attributes: ['id', 'email', 'companyName'] },
      ],
      order: [['createdAt', 'DESC']],
    }),
};
```

**Task 1.4: Create `src/repositories/index.ts`**

```typescript
export { quotationRepository } from './quotation.repository';
export { productRepository } from './product.repository';
export { orderRepository } from './order.repository';
```

---

### Phase 2: Extract Validators [PRIORITY: MEDIUM]

**Why**: Validation arrays bloat controller files (50+ lines each). Extracting them improves readability.

**Task 2.1: Create `src/validators/quotation.validators.ts`**

```typescript
import { body } from 'express-validator';

export const createQuotationValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isInt({ min: 1 }).withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

export const updateQuotationValidation = [
  body('status')
    .isIn(['pending', 'processed', 'completed', 'rejected'])
    .withMessage('Invalid status'),
  body('adminNotes').optional().isString().withMessage('Admin notes must be a string'),
];

export const calculateQuoteValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isInt({ min: 1 }).withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('buyerLocation').optional().isString().withMessage('Buyer location must be a string'),
  body('supplierLocation').optional().isString().withMessage('Supplier location must be a string'),
  body('shippingMethod')
    .optional()
    .isIn(['standard', 'express', 'economy'])
    .withMessage('Invalid shipping method'),
];

export const compareSupplierQuotesValidation = [
  body('productId').isInt({ min: 1 }).withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('buyerLocation').optional().isString().withMessage('Buyer location must be a string'),
  body('supplierIds').optional().isArray().withMessage('Supplier IDs must be an array'),
  body('shippingMethod')
    .optional()
    .isIn(['standard', 'express', 'economy'])
    .withMessage('Invalid shipping method'),
];
```

**Task 2.2: Create `src/validators/product.validators.ts`**

Extract all product-related validations from `productsController.ts`.

**Task 2.3: Create `src/validators/order.validators.ts`**

Extract all order-related validations from `ordersController.ts`.

**Task 2.4: Create `src/validators/auth.validators.ts`**

Extract all auth-related validations from `authController.ts`.

**Task 2.5: Create `src/validators/index.ts`**

```typescript
export * from './quotation.validators';
export * from './product.validators';
export * from './order.validators';
export * from './auth.validators';
```

**Task 2.6: Update controllers to import from validators**

```typescript
// Before (in controller file)
export const createQuotationValidation = [...];

// After (in controller file)
import { createQuotationValidation } from '../validators/quotation.validators';
```

---

### Phase 3: Remove Redundant Authorization Checks [PRIORITY: HIGH]

**Why**: Controllers have inline role checks that duplicate what `middleware/rbac.ts` already provides. This creates 80+ lines of redundant code.

**Current Problem** (in `quotationsController.ts`):
```typescript
// Line 40-45 - Redundant check
if (userRole !== 'customer') {
  return res.status(403).json({
    success: false,
    error: 'Only customers can create quotations',
  });
}
```

**Solution**: Use `requireRole` or `requirePermission` middleware in routes instead.

**Task 3.1: Update `src/middleware/rbac.ts`**

Add a simple `requireRole` middleware if not exists:

```typescript
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};
```

**Task 3.2: Update `src/routes/quotations.ts`**

```typescript
import { requireRole } from '../middleware/rbac';
import { createQuotationValidation, updateQuotationValidation } from '../validators';

// Customer routes
router.post('/', authenticateJWT, requireRole('customer'), createQuotationValidation, createQuotation);
router.get('/', authenticateJWT, requireRole('customer'), getCustomerQuotations);

// Admin routes
router.get('/admin/all', authenticateJWT, requireRole('admin'), getAllQuotations);
router.put('/admin/:id', authenticateJWT, requireRole('admin'), updateQuotationValidation, updateQuotation);
```

**Task 3.3: Remove inline role checks from controllers**

After adding middleware, remove ALL inline checks like:
```typescript
// DELETE these blocks from controllers:
if (userRole !== 'customer') {
  return res.status(403).json({ ... });
}

if (userRole !== 'admin') {
  return res.status(403).json({ ... });
}
```

**Files to update:**
- `src/controllers/quotationsController.ts` - Remove ~6 inline checks
- `src/controllers/productsController.ts` - Remove supplier/admin checks
- `src/controllers/ordersController.ts` - Remove buyer/admin checks
- `src/controllers/adminController.ts` - Remove admin checks (use middleware)

---

### Phase 4: Move Data Access from Controllers to Services [PRIORITY: HIGH]

**Why**: Controllers should not contain `Model.findByPk()` or `Model.create()` calls. This violates separation of concerns.

**Task 4.1: Create `src/services/quotation.service.ts`**

```typescript
import { quotationRepository, productRepository } from '../repositories';
import { QuoteService } from './quoteService';
import QuotationItem from '../models/QuotationItem';

interface CreateQuotationInput {
  items: { productId: number; quantity: number }[];
  companyId: number;
}

class QuotationService {
  async validateAndCreate(input: CreateQuotationInput) {
    // Validate all products exist
    const productIds = input.items.map(item => item.productId);
    const products = await productRepository.findByIds(productIds);

    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = productIds.filter(id => !foundIds.includes(id));
      throw new Error(`Products not found: ${missingIds.join(', ')}`);
    }

    // Create quotation
    const quotation = await quotationRepository.create({
      companyId: input.companyId,
      status: 'pending',
      adminNotes: null,
    });

    // Create quotation items
    await Promise.all(
      input.items.map(item =>
        QuotationItem.create({
          quotationId: quotation.id,
          productId: item.productId,
          quantity: item.quantity,
        })
      )
    );

    // Return full quotation with items
    return quotationRepository.findByIdWithItems(quotation.id);
  }

  async getForCustomer(companyId: number) {
    return quotationRepository.findAllForCompany(companyId);
  }

  async getById(id: number, userId: number, userRole: string) {
    const quotation = await quotationRepository.findByIdWithItemsAndUser(id);

    if (!quotation) {
      throw new Error('Quotation not found');
    }

    // Access control
    if (userRole === 'customer' && quotation.companyId !== userId) {
      throw new Error('Access denied');
    }

    return quotation;
  }

  async getAllForAdmin() {
    return quotationRepository.findAll();
  }

  async updateByAdmin(id: number, data: { status?: string; adminNotes?: string }) {
    const quotation = await quotationRepository.findById(id);

    if (!quotation) {
      throw new Error('Quotation not found');
    }

    await quotationRepository.update(quotation, {
      status: data.status || quotation.status,
      adminNotes: data.adminNotes !== undefined ? data.adminNotes : quotation.adminNotes,
    });

    return quotationRepository.findByIdWithItemsAndUser(id);
  }
}

export const quotationService = new QuotationService();
```

**Task 4.2: Refactor `quotationsController.ts` to use service**

```typescript
import { quotationService } from '../services/quotation.service';

export const createQuotation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const quotation = await quotationService.validateAndCreate({
      items: req.body.items,
      companyId: req.user!.id,
    });

    res.status(201).json({ success: true, message: 'Quotation created successfully', data: quotation });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create quotation' });
  }
});

export const getCustomerQuotations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const quotations = await quotationService.getForCustomer(req.user!.id);
  res.status(200).json({ success: true, data: quotations });
});

// Continue for all other controller methods...
```

**Task 4.3: Apply same pattern to other controllers**

- `productsController.ts` → `productService.ts`
- `ordersController.ts` → `orderService.ts`
- `adminController.ts` → use existing services or create `adminService.ts`

---

### Phase 5: Convert Static Services to Injectable Classes [PRIORITY: LOW]

**Why**: Static methods are harder to mock in tests. Instance-based services with constructor injection are more testable.

**Task 5.1: Refactor `QuoteService` from static to instance-based**

```typescript
// Before
class QuoteService {
  static async calculateQuoteForItem(input) { ... }
}

// After
class QuoteService {
  constructor(private productRepository: typeof productRepository) {}

  async calculateQuoteForItem(input) {
    const product = await this.productRepository.findById(input.productId);
    // ...
  }
}

export const quoteService = new QuoteService(productRepository);
```

**Note**: This is lower priority. Only do this if you need better test isolation.

---

## Validation Checklist

After completing each phase, verify:

- [ ] `npm run test` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Manual test: Create quotation as customer
- [ ] Manual test: View quotations as admin
- [ ] Manual test: Update quotation status as admin

---

## What NOT to Change

These patterns are working well - do not refactor:

1. **Express middleware chain** - Well-structured authentication and RBAC
2. **Sequelize model definitions** - Clean schema with proper associations
3. **Error handling middleware** - Centralized error handling
4. **Route organization** - Clear separation by domain

---

## Commands

```bash
npm run dev          # Development with nodemon (port 3001)
npm run build        # Compile TypeScript
npm run start        # Production
npm run test         # Run Jest tests
npm run lint         # Lint code
```

## Environment Variables
- DATABASE_URL: PostgreSQL connection string
- JWT_SECRET: Secret key for tokens
- JWT_EXPIRES_IN: Token expiration (e.g., 24h)
- NODE_ENV: development | production | test
- PORT: Server port (default: 3001)

## System Roles
- `admin`: Full access, company verification
- `supplier`: Product and quotation management
- `buyer/customer`: Request quotations and place orders
