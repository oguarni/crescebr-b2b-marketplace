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

## Known Issues (2026-03-28)

1. **Cache path bug**: `cache-dependency-path` points to `backend/package-lock.json` and `frontend/package-lock.json` — these don't exist. Only root `package-lock.json` exists. Fix: change both to `package-lock.json`.
2. **Workspace install**: `npm ci` runs in subdirectories (`working-directory: backend`) but npm workspaces require install from root. Fix: install from root, then run lint/build/test in subdirectories.
3. **Missing shared build**: Backend and frontend depend on `@shared/types` but CI doesn't build shared first. Fix: add `npm run shared:build` step before backend/frontend jobs, or restructure as a single job with ordered steps.
4. **Backend tests OOM**: May need `NODE_OPTIONS=--max-old-space-size=4096` environment variable in CI.

## Rules

1. **Never commit secrets** to workflow files — use GitHub Secrets
2. **CI uses `npm ci`** (not `npm install`) for reproducible builds
3. **Both jobs must pass** before merging to `main`
4. **Coverage artifacts** are uploaded for both backend and frontend
5. **Docker port binding**: Use `127.0.0.1:5432:5432` for PostgreSQL in non-dev environments
6. **Environment variables**: All sensitive values (`JWT_SECRET`, `DB_PASSWORD`) must come from environment, never hardcoded
