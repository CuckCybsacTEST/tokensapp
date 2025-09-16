#!/bin/sh
set -e

echo "[entrypoint] Starting container..."

# Auto-create schema when using SQLite inside the container
if [ -n "$DATABASE_URL" ] && echo "$DATABASE_URL" | grep -q "^file:"; then
  echo "[entrypoint] Detected SQLite DATABASE_URL ($DATABASE_URL). Running prisma db push..."
  npx prisma db push --skip-generate || {
    echo "[entrypoint] prisma db push failed (continuing anyway)";
  }
  if [ "${SEED_ON_START}" = "1" ]; then
    echo "[entrypoint] SEED_ON_START=1 -> running npm run seed"
    npm run seed || true
  fi
fi

echo "[entrypoint] Launching app (npm start)"
exec npm start
