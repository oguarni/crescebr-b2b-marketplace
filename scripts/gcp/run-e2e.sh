#!/usr/bin/env bash
#
# run-e2e.sh — install deps, build shared types, and run the Playwright suite.
# Playwright itself boots the backend (which auto-migrates + seeds the demo
# accounts) and the Vite dev server, runs headless, then tears them down.
#
# Run ON the VM from the repo root:  bash scripts/gcp/run-e2e.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "==> Ensuring backend/.env exists"
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "    created backend/.env from .env.example"
fi

echo "==> Making sure PostgreSQL is up"
sudo service postgresql start || true

# Reset the database to a clean state so migrate + seed are deterministic.
# The seeder (20240101000001-initial-data) is a plain bulkInsert with no
# conflict handling, so re-running it against a populated DB fails on the
# unique email constraint. Dropping the DB each run keeps E2E repeatable.
# WITH (FORCE) (PostgreSQL 13+) drops even if a stale connection lingers.
DB_NAME="${DB_NAME:-crescebr}"
echo "==> Resetting the '$DB_NAME' database for a clean run"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);
CREATE DATABASE ${DB_NAME};
SQL

echo "==> Installing workspace dependencies (frontend/backend/shared)"
npm run setup

echo "==> Building shared types (backend + frontend import from it)"
npm run shared:build

echo "==> Installing e2e deps + headless Chromium"
npm --prefix e2e install
npm --prefix e2e run install:browsers

echo "==> Running Playwright (headless)"
npm --prefix e2e test

echo ""
echo "==> Done. HTML report at e2e/playwright-report/ (copy it down with gcloud compute scp)."
