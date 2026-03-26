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

## Rules

1. **Never commit secrets** to workflow files — use GitHub Secrets
2. **CI uses `npm ci`** (not `npm install`) for reproducible builds
3. **Both jobs must pass** before merging to `main`
4. **Coverage artifacts** are uploaded for both backend and frontend
5. **Docker port binding**: Use `127.0.0.1:5432:5432` for PostgreSQL in non-dev environments
6. **Environment variables**: All sensitive values (`JWT_SECRET`, `DB_PASSWORD`) must come from environment, never hardcoded
