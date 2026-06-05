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
