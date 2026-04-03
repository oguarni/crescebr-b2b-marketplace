# Security & Middleware Layer

## Overview

This directory contains the security rules engine for the CresceBR backend. All cross-cutting security concerns are implemented here.

---

## Architecture

```
middleware/
├── auth.ts          # JWT authentication + role-specific guards + resource ownership
├── rbac.ts          # Permission-based access control (RBAC) engine
├── rateLimiting.ts  # In-memory rate limiter with predefined profiles
├── validation.ts    # Input validation rules (express-validator)
└── errorHandler.ts  # Centralized error handling + asyncHandler
```

---

## Security Components

### 1. Authentication (`auth.ts`)

**Primary**: `authenticateJWT` - Extracts and verifies JWT from Authorization header.

**Resource Ownership** (hit DB to verify):

- `isResourceOwner(field)` - Generic ownership check
- `canModifyProduct` - Supplier can only modify own products, admin can modify any
- `canAccessOrder` - Customer sees own orders, supplier sees orders with their products, admin sees all

**Note**: Legacy role guards (`isAdmin`, `isSupplier`, `isCustomer`, `hasRole`) have been removed. Use `requireRole` from `rbac.ts` instead.

### 2. RBAC Engine (`rbac.ts`)

**Permission Enum**: 17 granular permissions across 5 domains:

- User management (3): `MANAGE_USERS`, `VIEW_USERS`, `APPROVE_SUPPLIERS`
- Products (3): `MANAGE_ALL_PRODUCTS`, `MANAGE_OWN_PRODUCTS`, `VIEW_PRODUCTS`
- Orders (4): `MANAGE_ALL_ORDERS`, `MANAGE_RELATED_ORDERS`, `VIEW_OWN_ORDERS`, `UPDATE_ORDER_STATUS`
- Quotations (4): `MANAGE_ALL_QUOTATIONS`, `CREATE_QUOTATIONS`, `VIEW_OWN_QUOTATIONS`, `PROCESS_QUOTATIONS`
- Admin (4): `ACCESS_ADMIN_PANEL`, `VIEW_ANALYTICS`, `EXPORT_DATA`, `MANAGE_SYSTEM_CONFIG`, `MANAGE_COMPANY_VERIFICATION`

**Role-Permission Mapping**:
| Permission | admin | supplier | customer |
|---|---|---|---|
| MANAGE_USERS | Y | - | - |
| VIEW_USERS | Y | - | - |
| APPROVE_SUPPLIERS | Y | - | - |
| MANAGE_ALL_PRODUCTS | Y | - | - |
| MANAGE_OWN_PRODUCTS | - | Y* | - |
| VIEW_PRODUCTS | Y | Y | Y |
| MANAGE_ALL_ORDERS | Y | - | - |
| MANAGE_RELATED_ORDERS | - | Y* | - |
| VIEW_OWN_ORDERS | - | - | Y |
| UPDATE_ORDER_STATUS | Y | Y\* | - |
| MANAGE_ALL_QUOTATIONS | Y | - | - |
| CREATE_QUOTATIONS | - | - | Y |
| VIEW_OWN_QUOTATIONS | - | Y | Y |
| PROCESS_QUOTATIONS | Y | - | - |
| ACCESS_ADMIN_PANEL | Y | - | - |
| VIEW_ANALYTICS | Y | - | - |
| EXPORT_DATA | Y | - | - |

_Supplier permissions marked with `_`require`status: 'approved'`.

**Middleware Factories**:

- `requirePermission(permission)` - Single permission check (hits DB for status)
- `requireAnyPermission(permissions[])` - OR logic
- `requireAllPermissions(permissions[])` - AND logic
- `requireRole(...roles)` - Simple role check (no DB hit)
- `checkPermission(userId, permission)` - Helper for in-controller checks

### 3. Rate Limiting (`rateLimiting.ts`)

**Implementation**: Redis-backed rate limiter. Fails open (logs and continues) on Redis errors — intentional tradeoff (availability > strict limiting).

**Predefined Profiles**:
| Profile | Window | Max Requests | Use Case |
|---|---|---|---|
| `generalRateLimit` | 1 hour | 1000 | Default API endpoints |
| `authRateLimit` | 15 min | 5 (100 in dev) | Login/register |
| `searchRateLimit` | 15 min | 200 | Product search/catalog |
| `uploadRateLimit` | 1 hour | 10 | File uploads |
| `cnpjValidationRateLimit` | 1 hour | 20 | CNPJ verification |
| `quoteRateLimit` | 1 hour | 100 | Quote calculations |
| `adminRateLimit` | 1 hour | 500 | Admin operations |
| `emailRateLimit` | 1 hour | 5 | Email sending |
| `exportRateLimit` | 1 hour | 10 | Data exports |
| `burstRateLimit` | 1 min | 20 | Spike protection |
| `progressiveRateLimit` | Dynamic | Dynamic | Per-role adaptive limits |

### 4. Input Validation (`validation.ts`)

Comprehensive express-validator rules for:

- User registration/login (with CPF/CNPJ format)
- Product CRUD (with tier pricing validation)
- Quotation creation
- Order creation/update
- Rating creation
- File upload (type + size)
- Pagination and search queries
- Company verification
- CNPJ format

### 5. Error Handler (`errorHandler.ts`)

Catches and normalizes:

- Sequelize `ValidationError` -> 400
- Sequelize `SequelizeUniqueConstraintError` -> 400
- `JsonWebTokenError` -> 401
- `TokenExpiredError` -> 401
- Unhandled errors -> 500

Also exports `asyncHandler` wrapper for async route handlers.

---

## Known Issues (Diagnostic: 2026-03-26)

### Test Coverage: ✅ EXCELLENT

All middleware files at 100% statement coverage (auth.ts, rbac.ts, rateLimiting.ts, errorHandler.ts).

### Fixed Since Last Audit

- ~~0% test coverage on rbac.ts, rateLimiting.ts~~ → 100% coverage
- ~~Auth middleware only 29.78%~~ → 100% coverage
- ~~CORS `origin: true`~~ → Now environment-aware (`server.ts:20-30`)
- ~~404 handler commented out~~ → Active (`server.ts:48-54`)

### Remaining Warnings

- **DB hits in middleware**: `requirePermission`, `isApprovedSupplier`, `canModifyProduct`, `canAccessOrder` all hit DB. Consider request-level caching if latency becomes an issue.
- **Lint error**: `rateLimiting.ts:131` — `req` param should be `_req` (unused in adminRateLimit skipIf)
- **`addPermissionsToResponse`**: Exported from `rbac.ts` but not wired into any route — safe, no production header leak.

---

## Rules for Modifying This Layer

1. **Never bypass auth middleware** - All protected routes must use `authenticateJWT`
2. **Use `requireRole` or `requirePermission`** in routes, not inline role checks in controllers
3. **All POST/PUT/PATCH routes must have validation** middleware
4. **Rate limiting is mandatory** on all public-facing routes
5. **Test any changes** - Security code must have test coverage
6. **No raw SQL** - Always use Sequelize parameterized queries
7. **Sanitize all user input** - Use `.trim().escape()` on string fields
