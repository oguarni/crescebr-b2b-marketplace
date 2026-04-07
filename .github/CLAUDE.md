# CI/CD & Infrastructure

> For global rules, see root [CLAUDE.md](../CLAUDE.md).

## GitHub Actions Pipeline

**File**: `.github/workflows/ci.yml`

**Triggers**: Push to `main`, PRs targeting `main`

### Jobs

| Job      | Steps                              | Services          |
| -------- | ---------------------------------- | ----------------- |
| Backend  | Install → Lint → Build → Test     | PostgreSQL 15     |
| Frontend | Install → Lint → Build → Test     | None              |

Both jobs upload coverage artifacts on completion.

**Node version**: 20 (pinned in workflow)

## Docker

**File**: `docker-compose.yml`

| Service    | Image/Build     | Port         | Notes                          |
| ---------- | --------------- | ------------ | ------------------------------ |
| PostgreSQL | postgres:15     | 5432:5432    | Bind to `127.0.0.1` in prod   |
| Backend    | backend/        | 3001:3001    | Depends on postgres            |
| Frontend   | frontend/       | 8080:80      | Nginx for production           |

**Network**: `crescebr-net` (bridge)
**Volume**: `postgres_data` (persistent)

## Database

**Migrations**: `backend/src/migrations/` — Sequelize CLI migrations for schema changes

Run migrations: `cd backend && npm run db:migrate`
Undo last migration: `cd backend && npm run db:migrate:undo`

**Seeders**: `backend/src/seeders/` — test data for development

Seed all: `cd backend && npm run db:seed`
Undo all seeds: `cd backend && npm run db:seed:undo`

**Migration order matters**: migrations run in filename-timestamp order. Always `db:migrate` before `db:seed`.

---

## Redis

Used for rate limiting. Connection via `REDIS_URL` env var (default: `redis://localhost:6379`).

Rate limiter **fails open** on Redis errors — intentional tradeoff (availability > strict limiting).

---

## Port Reference

| Service    | Dev Port | Docker Port | Notes                   |
| ---------- | -------- | ----------- | ----------------------- |
| Frontend   | 5173     | 8080        | Vite dev / Nginx prod   |
| Backend    | 3001     | 3001        | Express API             |
| PostgreSQL | 5432     | 5432        | Bind `127.0.0.1` in prod|
| Redis      | 6379     | 6379        | Bind `127.0.0.1` in prod|

---

## Known Issues (Updated 2026-04-04)

### Fixed
1. ~~Cache path bug~~ — Only root `package-lock.json` exists; subdirectory paths removed
2. ~~Workspace install~~ — Install from root, run build/test in subdirectories
3. ~~Missing shared build~~ — `npm run shared:build` added before backend/frontend jobs
4. **Backend tests OOM**: `NODE_OPTIONS=--max-old-space-size=4096` set in CI `env`

## Rules

1. **Never commit secrets** to workflow files — use GitHub Secrets
2. **CI uses `npm ci`** (not `npm install`) for reproducible builds
3. **Both jobs must pass** before merging to `main`
4. **Coverage artifacts** are uploaded for both backend and frontend
5. **Docker port binding**: Use `127.0.0.1:5432:5432` for PostgreSQL in non-dev environments
6. **Environment variables**: All sensitive values (`JWT_SECRET`, `DB_PASSWORD`) must come from environment, never hardcoded
