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

## Known Issues (Updated 2026-04-03)

### Fixed (historical — see git log for details)
- CORS, 404 handler, middleware coverage, backend coverage, service extraction, Dockerfiles, module system, header leaks, import endpoints, rate limiting, Redis migration, express-validator v7, frontend Dockerfile — all resolved
- CI workflow: cache paths, workspace install, shared build order — fixed
- `.env.test` git tracking — confirmed not tracked
- Frontend lint errors (38) — fixed (D-4)
- Frontend tests (45 failing) — fixed (D-5)
- `POST /auth/logout` missing `authenticateJWT` — fixed (2026-04-03)
- JWT fallback secret active in staging/QA — tightened to `NODE_ENV === 'development'` only (2026-04-03)
- Rating PUT/DELETE lacked role restriction — added `requireRole` middleware (2026-04-03)

### Open
1. **Backend lint errors**: 8x `fail` not defined in `ratingsService.test.ts`, 1 unused `req` in `rateLimiting.ts:131`, 1 stale eslint-disable in `productsController.test.ts`
2. **Backend tests OOM**: `jest --runInBand` hits heap limit without `--max-old-space-size=4096` in `backend/package.json` test script (CI has it via `NODE_OPTIONS`)
3. **Architecture (intentional)**: Services use direct Sequelize model access — this is the accepted pattern (KISS/YAGNI). `quotation.service.ts` uses repositories as an example, not a mandate. `order.repository.ts` exists but no service uses it — document and leave as-is.
4. **DRY violation**: `authController.ts` has 5x identical `generateTokenPair` payload construction — extract `buildTokenPayload(user)` helper
5. **Bundle size**: `AdminTransactionMonitoringPage` 338KB, `index.js` 529KB (exceeds Vite 500KB warning) — add `manualChunks` to Vite config
6. **Vulnerabilities**: npm audit findings — run `npm audit fix` and add `overrides` for unfixable transitive deps
7. **Docker security**: Backend Dockerfile runs as root (add `USER node`); DB/Redis ports bound to `0.0.0.0` (bind to `127.0.0.1`)
