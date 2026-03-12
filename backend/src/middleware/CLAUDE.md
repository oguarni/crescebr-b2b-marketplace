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

**Role Guards** (simple role checks):

- `isAdmin`, `isSupplier`, `isCustomer` - Single-role middleware
- `hasRole(allowedRoles[])` - Multi-role middleware
- `isApprovedSupplier` - Role + status check (hits DB)

**Resource Ownership** (hit DB to verify):

- `isResourceOwner(field)` - Generic ownership check
- `canModifyProduct` - Supplier can only modify own products, admin can modify any
- `canAccessOrder` - Customer sees own orders, supplier sees orders with their products, admin sees all

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

**Implementation**: Custom in-memory store with periodic cleanup (15min interval).

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

## Known Issues (Diagnostic: 2026-03-12)

### Critical

1. **0% test coverage** on `rbac.ts`, `rateLimiting.ts`, `validation.ts`
2. **Auth middleware** only 29.78% statement coverage

### Warnings

- **Duplicate role guards**: `auth.ts` has `isAdmin`/`isSupplier`/`isCustomer`/`hasRole` AND `rbac.ts` has `requireRole`. Both do the same thing. Consolidate to `requireRole` from `rbac.ts`.
- **DB hits in middleware**: `requirePermission`, `isApprovedSupplier`, `canModifyProduct`, `canAccessOrder` all hit DB. Consider caching user permissions in JWT payload or request-level cache.
- **In-memory rate limiter**: Won't work across multiple server instances. Replace with Redis-backed solution before horizontal scaling.
- **CORS open**: `origin: true` allows all origins. Restrict to known frontend URLs in production.
- **Permission header leak**: `addPermissionsToResponse` sends permissions via `X-User-Permissions` header.
- **404 handler commented out** in `server.ts`

---

## Rules for Modifying This Layer

1. **Never bypass auth middleware** - All protected routes must use `authenticateJWT`
2. **Use `requireRole` or `requirePermission`** in routes, not inline role checks in controllers
3. **All POST/PUT/PATCH routes must have validation** middleware
4. **Rate limiting is mandatory** on all public-facing routes
5. **Test any changes** - Security code must have test coverage
6. **No raw SQL** - Always use Sequelize parameterized queries
7. **Sanitize all user input** - Use `.trim().escape()` on string fields
