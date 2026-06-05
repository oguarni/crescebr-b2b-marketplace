#!/usr/bin/env bash
#
# provision-vm.sh — one-time OS-level setup on a fresh Debian 12 GCP VM.
# Installs Node.js 20, PostgreSQL, and git, then creates the dev database that
# matches backend/.env.example (user=postgres / pass=mysecretpassword / db=crescebr).
#
# Run ON the VM:  bash provision-vm.sh
#
set -euo pipefail

echo "==> Updating apt and installing base packages"
sudo apt-get update -y
sudo apt-get install -y curl git ca-certificates gnupg postgresql postgresql-contrib

echo "==> Installing Node.js 20 (NodeSource)"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "    node $(node -v) / npm $(npm -v)"

echo "==> Configuring PostgreSQL (db=crescebr, user=postgres)"
sudo service postgresql start
# Match backend/.env.example credentials.
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
ALTER USER postgres WITH PASSWORD 'mysecretpassword';
SELECT 'CREATE DATABASE crescebr'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'crescebr')\gexec
SQL

echo ""
echo "==> Provisioning complete."
echo "    Next: clone the repo and run scripts/gcp/run-e2e.sh"
