# CresceBR - B2B Marketplace

## Language Configuration

**Always use English** for:

- Code comments and documentation
- Commit messages
- Variable and function names
- All generated content

---

## Overview

B2B Marketplace connecting buyer and supplier companies with quotation system, order management, and CNPJ verification.

## Architecture

```
CresceBR/
├── frontend/       # React 19 + TypeScript + Vite + MUI
├── backend/        # Node.js + Express 5 + PostgreSQL + Sequelize
├── shared/         # Shared TypeScript types
└── docker-compose.yml
```

### Current Pattern: Simplified Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      ROUTES + MIDDLEWARE                     │
│              (auth, rbac, validation, rate-limit)            │
├─────────────────────────────────────────────────────────────┤
│                        CONTROLLERS                           │
│         HTTP request/response handling ONLY                  │
├─────────────────────────────────────────────────────────────┤
│                         SERVICES                             │
│         ALL business logic and orchestration                 │
├─────────────────────────────────────────────────────────────┤
│                       REPOSITORIES                           │
│         Data access patterns and queries                     │
├─────────────────────────────────────────────────────────────┤
│                    MODELS (Sequelize ORM)                    │
│         Schema definitions and associations                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Architectural Principles (MANDATORY)

### KISS (Keep It Simple, Stupid)

- No unnecessary abstractions
- Avoid patterns that don't provide immediate value
- Prefer simple solutions over "enterprise" patterns

### YAGNI (You Aren't Gonna Need It)

- Don't add features or abstractions for hypothetical future needs
- Build what's needed NOW
- Refactor when requirements actually change

### DRY (Don't Repeat Yourself)

- Extract repeated code into shared utilities
- Use repositories for repeated query patterns
- Centralize validation rules

### Separation of Concerns

- Controllers: HTTP handling ONLY (no business logic)
- Services: Business logic and orchestration
- Repositories: Data access patterns
- Middleware: Cross-cutting concerns (auth, validation, logging)

---

## Quick Setup

```bash
# Install dependencies
npm run setup

# Development (frontend + backend)
npm run dev

# With Docker
docker-compose up -d
```

## Workspace Commands

```bash
npm run dev          # Start frontend (5173) and backend (3001)
npm run build        # Production build
npm run test         # Run tests in all subprojects
npm run lint         # Lint all subprojects
npm run clean        # Remove node_modules and dist
```

## Ports

| Service    | Port | URL                       |
| ---------- | ---- | ------------------------- |
| Frontend   | 5173 | http://localhost:5173     |
| Backend    | 3001 | http://localhost:3001/api |
| PostgreSQL | 5432 | localhost:5432            |

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for tokens
- `VITE_API_URL` - API URL for frontend

## Test Accounts

```
Admin:     admin@crescebr.com / admin123
Supplier:  supplier@example.com / supplier123
Buyer:     buyer@example.com / buyer123
```

## Conventions

### Git

- Main branch: `main`
- Feature branches: `feature/<feature-name>`
- Bug fix branches: `fix/<bug-name>`
- Documentation branches: `docs/<description>`
- Refactor branches: `refactor/<description>`
- Commits in English, descriptive and concise

### Code

- TypeScript strict mode across the project
- ESLint + Prettier for formatting
- Tests required before merging to main

## API Prefix

All backend endpoints are served under `API_PREFIX` (default: `/api/v1`).

## Main Endpoints

- `POST /api/v1/auth/login` - Authentication (CNPJ-based)
- `POST /api/v1/auth/login-email` - Authentication (email-based)
- `GET /api/v1/products` - List products (public)
- `POST /api/v1/quotations` - Create quotation (customer only)
- `GET /api/v1/orders` - List orders (authenticated)
- `GET /api/v1/admin/dashboard` - Admin dashboard (admin only)
- `GET /api/v1/ratings/top-suppliers` - Top suppliers (public)

---

## Specialized CLAUDE.md Files

| File                               | Domain        | Purpose                                        |
| ---------------------------------- | ------------- | ---------------------------------------------- |
| `backend/CLAUDE.md`                | Backend core  | Tech stack, refactoring tasks, code patterns   |
| `frontend/CLAUDE.md`               | Frontend core | Tech stack, hooks extraction, UI patterns      |
| `backend/src/middleware/CLAUDE.md` | Security      | RBAC, auth, rate limiting, validation rules    |
| `backend/src/__tests__/CLAUDE.md`  | Testing       | Coverage data, test patterns, priority targets |

## Custom Commands

| Command            | Purpose                                                |
| ------------------ | ------------------------------------------------------ |
| `/diagnose`        | Full project diagnostic (build, lint, tests, security) |
| `/test-backend`    | Run backend tests with coverage                        |
| `/test-frontend`   | Run frontend tests with coverage                       |
| `/security-audit`  | Security audit of middleware and routes                |
| `/coverage-report` | Generate and analyze test coverage                     |
| `/fix-tests`       | Find and fix failing tests                             |

---

## Refactoring Status

See individual CLAUDE.md files in `backend/` and `frontend/` for detailed refactoring tasks.

### Priority Order

1. **Backend refactoring** (higher impact on maintainability)
2. **Frontend refactoring** (lower priority, mostly hooks extraction)

### Validation After Refactoring

After completing any refactoring task:

1. Run `npm run test` - All tests must pass
2. Run `npm run lint` - No linting errors
3. Run `npm run build` - Build must succeed
4. Manual test: Login with each role and verify core flows work

---

## Known Issues (Updated 2026-03-27)

### Fixed
- ~~CORS allows all origins~~ → Now environment-aware (production restricted)
- ~~404 handler commented out~~ → Active
- ~~Middleware at 17.7% coverage~~ → 100% coverage
- ~~Backend 52% overall~~ → 94.16% overall
- ~~Architecture: authController and ordersController still have direct Model access~~ → Phase 4 complete: authService.ts, orderService.ts created; adminService expanded
- ~~TypeScript error: productsService.ts imageUrl non-nullable~~ → Fixed: parameter typed as `string | null`
- ~~Backend test compile: quotationsController.test.ts TS2345~~ → Suite now compiles and passes (45 tests)
- ~~Dockerfiles on node:18~~ → Updated to node:20-alpine (all 4 Dockerfiles)
- ~~Backend module system conflict (`type:module` + commonjs tsconfig)~~ → Removed `"type": "module"` from backend/package.json
- ~~X-User-Permissions header leak~~ → Removed (guarded by NODE_ENV=development in addPermissionsToResponse)
- ~~403 responses leak userRole/userStatus~~ → Removed from requirePermission, requireAnyPermission, requireAllPermissions
- ~~Unprotected import endpoints~~ → `/products/import/stats` and `/products/import/sample` now require auth + role + rate limit
- ~~Unauthenticated logout route~~ → `POST /auth/logout` now rate-limited with authRateLimit
- ~~Hardcoded admin email rate-limit bypass~~ → Removed `admin@crescebr.com` hardcoded bypass; dev-only skip retained
- ~~`backend/.env.test` committed to git~~ → Untracked; `.gitignore` now excludes `.env.test`, `.env.staging`, `.env.production`
- ~~Engine constraint `>=16`~~ → Was already `>=20` in package.json; Dockerfiles now aligned to node:20

- ~~In-memory refresh token store~~ → Migrated to Redis (`ioredis`, `refresh:<token>` + `refresh:user:<id>` SET, TTL-based cleanup)
- ~~In-memory rate limit store~~ → Migrated to Redis (INCR + EXPIRE pattern, fail-open on errors)
- ~~`express-validator` v6.x EOL~~ → Upgraded to v7.x; `handleValidationErrors` centralizes boilerplate; `e.param` → `e.path`; `checkFalsy` → `values: 'falsy'`
- ~~Frontend Dockerfile `--legacy-peer-deps`~~ → Removed; root `package-lock.json` copied into build context

### Open
1. **Frontend tests**: 12 failing across 6 suites (timeouts, label mismatches)
2. **Architecture**: 8/9 services bypass repository layer — `order.repository.ts` is dead code → Decision needed: wire or delete
3. **Backend tests**: `adminController.test.ts` has 29 pre-existing failures (service mock shape mismatches)
