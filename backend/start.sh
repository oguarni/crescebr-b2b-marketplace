#!/bin/sh
set -e

echo "Starting CresceBR backend..."

# Wait for a TCP database host (local / Docker Compose).
# Cloud SQL Unix sockets are ready at mount time, so no wait is needed there.
case "$DB_HOST" in
  /cloudsql/*) echo "Cloud SQL socket detected ($DB_HOST); skipping TCP wait." ;;
  "") echo "DB_HOST not set; skipping TCP wait." ;;
  *)
    echo "Waiting for database at $DB_HOST:${DB_PORT:-5432}..."
    until nc -z "$DB_HOST" "${DB_PORT:-5432}"; do
      echo "Database not ready, waiting..."
      sleep 2
    done
    echo "Database is ready." ;;
esac

# Run migrations with a few retries (the DB connection can settle a moment after start).
n=0
until npx sequelize-cli db:migrate; do
  n=$((n + 1))
  if [ "$n" -ge 5 ]; then
    echo "Migrations failed after $n attempts."
    exit 1
  fi
  echo "Migration attempt $n failed; retrying in 5s..."
  sleep 5
done
echo "Migrations applied."

# Seed only when explicitly requested (production) or in local development.
# The seeder is safe to re-run: unique constraints reject duplicates.
if [ "$SEED_ON_START" = "true" ] || [ "$NODE_ENV" = "development" ]; then
  echo "Seeding database..."
  npx sequelize-cli db:seed:all || echo "Seed step reported errors (likely already seeded); continuing."
fi

# Resolve the compiled entrypoint. tsc emits under dist/src when the shared
# workspace is part of the compilation (the Docker build), or dist/server.js otherwise.
if [ -f dist/server.js ]; then
  ENTRY=dist/server.js
elif [ -f dist/src/server.js ]; then
  ENTRY=dist/src/server.js
else
  ENTRY=$(find dist -name server.js | head -n1)
fi

if [ -z "$ENTRY" ]; then
  echo "Could not find compiled server.js under dist/."
  exit 1
fi

echo "Starting application ($ENTRY)..."
exec node "$ENTRY"
