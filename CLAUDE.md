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
- Reuse query helpers where they provide immediate value; direct model access remains standard
- Centralize validation rules

### Separation of Concerns

- Controllers: HTTP handling ONLY (no business logic)
- Services: Business logic and orchestration
- Repositories: Existing query helpers used by `quotation.service.ts`, not a required layer
- Middleware: Cross-cutting concerns (auth, validation, logging)

---

## Quick Setup

```bash
# Install dependencies
npm run setup

# Development (frontend + backend)
npm run dev

# With Docker
docker compose up -d
```

## Workspace Commands

```bash
npm run dev          # Start frontend (5173) and backend (3001)
npm run build        # Production build
npm run test         # Run tests in all subprojects
npm run lint         # Lint all subprojects
npm run typecheck    # Type-check all workspaces and the Vite config
npm run clean        # Remove node_modules and dist
```

## Ports

| Service    | Port | URL                       |
| ---------- | ---- | ------------------------- |
| Frontend   | 5173 | http://localhost:5173     |
| Backend    | 3001 | http://localhost:3001/api/v1 |
| PostgreSQL | 5432 | localhost:5432            |

## Environment Variables

Compose reads the root `.env`; host-side backend commands read `backend/.env`.
Use the corresponding `.env.example` as the starting point and configure:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - PostgreSQL connection settings
- `TEST_DB_NAME` - Optional isolated test database name (default: `crescebr_test`, never `DB_NAME`)
- `JWT_SECRET` - Secret key for tokens

`DB_PASSWORD` is required by both the runtime and the migration CLI. Neither reads `DATABASE_URL`.
The frontend uses the relative `/api/v1` path; Vite proxies it to port 3001 during development.

## Test Accounts

```
Admin:     admin@crescebr.com / admin123     CNPJ 00.000.000/0001-00
Supplier:  supplier@example.com / supplier123  CNPJ 22.222.222/0001-22
Buyer:     buyer@example.com / buyer123      CNPJ 33.333.333/0001-33
```

These are seeded into the local development database by `backend/seeders/`, and the same accounts are
**deliberately published on the hosted demo**: `LoginPage.tsx` renders them as one-click cards, and
`src/demo/data.ts` is generated from those seeders, so the two stay in step. They are demo fixtures,
not secrets — the hosted build has no backend to authenticate against. Change them in the seeder and
run `npm run demo:data`; never treat them as credentials for anything real.

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
- `GET /api/v1/quotations/supplier` - Quotations including the supplier's products (supplier/admin)
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

| Command             | Purpose                                                |
| ------------------- | ------------------------------------------------------ |
| `/diagnose`         | Full project diagnostic (build, lint, tests, security) |
| `/test-backend`     | Run backend tests with coverage                        |
| `/test-frontend`    | Run frontend tests with coverage                       |
| `/security-audit`   | Security audit of middleware and routes                |
| `/coverage-report`  | Generate and analyze test coverage                     |
| `/fix-tests`        | Find and fix failing tests                             |
| `/db-migrate`       | Run Sequelize migrations                               |
| `/db-seed`          | Seed the database with test data                       |
| `/docker-up`        | Start all Docker services                              |
| `/docker-down`      | Stop all Docker services                               |
| `/build-frontend`   | Production build + bundle size check                   |

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

## Known Issues (Updated 2026-04-04)

### Fixed (historical — see git log for details)
- CORS, 404 handler, middleware coverage, backend coverage, service extraction, Dockerfiles, module system, header leaks, import endpoints, rate limiting, Redis migration, express-validator v7, frontend Dockerfile — all resolved
- CI workflow: cache paths, workspace install, shared build order — fixed
- `.env.test` git tracking — confirmed not tracked
- Frontend lint errors (38) — fixed (D-4)
- Frontend tests (45 failing) — fixed (D-5)
- `POST /auth/logout` missing `authenticateJWT` — fixed (2026-04-03)
- JWT fallback secret active in staging/QA — tightened to `NODE_ENV === 'development'` only (2026-04-03)
- Rating PUT/DELETE lacked role restriction — added `requireRole` middleware (2026-04-03)
- Backend lint errors (`fail` in ratingsService, `_req` prefix, stale eslint-disable) — fixed (2026-04-04)
- DRY violation: `authController.ts` `buildTokenPayload` extracted — fixed (2026-04-04)
- Bundle size: `manualChunks` added to Vite config — fixed (2026-04-04)
- Vulnerabilities: root `overrides` added (2026-04-04). The `sqlite3` v6 upgrade from the same day was reverted to 5.1.7 on 2026-04-07 (`3f888a4`) because the v6 prebuilt binaries need glibc 2.38. sqlite3 is a dev-only test dependency, and the node-gyp/tar chain it installs still shows in `npm audit`.
- Docker security: `USER node` in backend Dockerfile; DB/Redis ports bound to `127.0.0.1` — fixed (2026-04-04)
- ~~Test credentials visible in LoginPage UI — wrapped in `import.meta.env.DEV` (2026-04-04)~~ —
  **no longer true, and no longer a defect** (corrected 2026-08-29). `LoginPage.tsx` renders the demo
  accounts unconditionally, with no `import.meta.env.DEV` guard, and that is deliberate: since the
  hosted build answers its own API in the browser (see "Hosted demo runs without a backend"), the
  cards are the way a visitor gets into the demo. They authenticate against `DEMO_PASSWORDS` in the
  bundle, not against any server. Do not re-add a `DEV` guard — it would lock visitors out of the
  public demo without protecting anything.
- Supplier RBAC: suppliers blocked from quotations (they hit the admin-only `GET /quotations/admin/all`, and the Supplier Dashboard failed with "Access denied"). Added supplier-scoped `GET /quotations/supplier` (server-side filtered to the supplier's products), made `PUT /quotations/supplier/:id` ownership-checked, scoped `getById` for suppliers, fixed the dashboard's broken detail/order navigation, and added the `supplier/quotations/:id` route — fixed (2026-05-29)

### Open
1. **Architecture (intentional)**: Services use direct Sequelize model access — this is the accepted pattern (KISS/YAGNI). `quotation.service.ts` uses repositories as an example, not a mandate. The unused `order.repository.ts` was deleted on 2026-04-02 (`07f40e6`).

## Hosted demo runs without a backend (2026-08-20)

Billing was disabled on GCP project `crescebr-portfolio-9048`, so Google deleted the Cloud Run
service and the Cloud SQL instance (`gcloud run services list` and `sql instances list` both return
0 items). Firebase Hosting survived on the free Spark tier, which is why the site loaded while every
`/api/v1/*` call returned 404 — `firebase.json` was still rewriting `/api/**` to a Cloud Run service
that no longer exists. That rewrite has been removed.

Cloud Run and Cloud SQL both require an active billing account, and Cloud SQL has no free tier, so
the public site now answers its own API calls in the browser:

- `frontend/src/demo/` is an axios **adapter**, not a mock library. Installing it replaces transport,
  so no request leaves the page and the app's interceptors (auth header, 401 logout) still run.
- It is opt-in via `VITE_DEMO_MODE`, defaulted to `true` for `vite build` in `vite.config.ts`.
  **Not** `.env.production` — that file is gitignored and would not survive a fresh clone. Build
  against a real API with `VITE_DEMO_MODE=false npm run build`. `npm run dev` is unaffected and still
  proxies to Express.
- `src/demo/data.ts` is **generated** — `npm run demo:data` replays `backend/seeders/` against a stub
  `queryInterface`. Do not hand-edit it; change the seeder and regenerate.
- `src/demo/pricing.ts` is a line-for-line port of `backend/src/services/quoteService.ts`. If that
  service changes, this must change with it.

Two traps worth keeping in mind:

- **The adapter must JSON round-trip its response** (`toWireFormat`). Handlers hold live `Date`
  objects, but the Express API delivers ISO strings, and pages like
  `AdminTransactionMonitoringPage` call `createdAt.split('T')`. Skipping serialization crashes those
  pages against the demo only — it was caught in a browser, not by unit tests.
- **Route order is load-bearing.** `/quotations/supplier` and `/orders/admin/all` must precede their
  `:id` siblings, since matching is first-wins.

Backend, seeders, migrations and jest suites are untouched and still the reference implementation —
they are simply not hosted.

## End-to-End Tests (Playwright, added 2026-08-07)

`e2e/` covers the seam the existing suites cannot reach. vitest tests the React app against mocked
services; jest tests the Express API against mocked boundaries. Neither can see a defect that lives
*between* them — auth token handling, the vite proxy, role gating on a real response, a migration the
frontend does not expect. That seam is the whole scope. It is not a second unit-test runner.

```bash
npx playwright install chromium # one-time browser setup; repeat after Playwright updates
npm run e2e            # services + full suite
npm run e2e:services   # postgres + redis up and waited on; idempotent
npm run e2e:ui         # Playwright UI mode
```

Conventions that are load-bearing:

- **`API_PREFIX` is `/api/v1`, not `/api`** (`backend/src/server.ts:15`). A health probe pointed at
  `/api/health` fails as a bare 120s `webServer` timeout that says nothing about the URL.
- **Locate by `id`, never by label.** Every form label on this app comes from i18n, so a
  `getByLabel(/email/i)` locator breaks the moment the interface language changes. `LoginPage` also
  opens on the **CNPJ tab** — `#email` is not rendered until the Email tab is selected, which is why
  `openEmailTab()` exists.
- **`ProtectedRoute` does not redirect on a role mismatch.** It redirects only when there is no
  session; a signed-in user with the wrong role keeps the URL and gets an MUI `<Alert>`. Asserting a
  URL change there asserts the opposite of the design — assert `getByRole('alert')`.
- **Seed credentials are fixtures, not secrets** — the same values are committed in
  `backend/seeders/`. They stay overridable via `E2E_*` env vars so a differently seeded CI database
  does not require editing specs.
- **globalSetup probes TCP ports, not the API.** Playwright has changed the ordering of `webServer`
  against `globalSetup` between releases, so a hook that asks the backend whether it is up reports
  the wrong thing on half of them.

### `seederStorage` (fixed 2026-08-07)

`backend/config/config.cjs` now sets `seederStorage: 'sequelize'`. sequelize-cli defaults it to
`'none'`, meaning seeders are never recorded and `db:seed:all` re-runs them every time. Because
`backend`'s `dev` script chains `db:migrate && db:seed:all && nodemon`, the **second** `npm run dev`
against a persistent postgres volume died on
`Validation error: Key (email)=(admin@crescebr.com) already exists` before the server started.
Tracking executed seeders makes that chain idempotent, which is what it always assumed.

A database seeded *before* this change has an empty `SequelizeSeeders` table and will try to re-seed
once. Record the existing run instead of dropping data:

```sql
INSERT INTO "SequelizeSeeders" (name) VALUES ('20240101000001-initial-data.cjs') ON CONFLICT DO NOTHING;
```

### `DB_PASSWORD` is required, with no fallback (2026-08-13)

`backend/config/config.cjs` now loads `backend/.env` itself and throws when `DB_PASSWORD` is unset.
Both halves matter:

- sequelize-cli does **not** load `.env`. Every value in `config.cjs` previously fell back to a
  hardcoded literal, so `npm run db:migrate` authenticated with the password published in
  `.env.example` instead of the one in `.env`. The CLI and the server were reading different
  credentials and agreed only by coincidence — rotating the database password broke migrations
  while the server kept working.
- `dotenv.config()` never overwrites an already-set variable, so the `DB_HOST=db` that Docker
  Compose injects still wins inside the container, and host-side runs still get `DB_HOST=localhost`.

The `test` entry deliberately reads `TEST_DB_NAME`, not `DB_NAME`: now that `.env` is loaded,
inheriting `DB_NAME` would aim `NODE_ENV=test` migrations — including `db:migrate:undo:all` — at the
development database.
