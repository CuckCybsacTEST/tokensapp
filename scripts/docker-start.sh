#!/bin/sh
set -e

echo "[entrypoint] Starting container..."

# Auto-migrate schema based on DATABASE_URL
if [ -n "$DATABASE_URL" ]; then
  if echo "$DATABASE_URL" | grep -qi "^file:"; then
    echo "[entrypoint] Detected SQLite DATABASE_URL ($DATABASE_URL). Running prisma db push..."
    npx prisma db push --skip-generate || {
      echo "[entrypoint] prisma db push failed (continuing anyway)";
    }
  elif echo "$DATABASE_URL" | grep -Eqi "^postgres(|ql)://"; then
    echo "[entrypoint] Detected Postgres DATABASE_URL. Running prisma migrate deploy..."
    npx prisma migrate deploy || {
      echo "[entrypoint] prisma migrate deploy failed (continuing anyway)";
    }
  else
    echo "[entrypoint] Unknown DATABASE_URL scheme. Skipping prisma migrations."
  fi
  if [ "${SEED_ON_START}" = "1" ]; then
    echo "[entrypoint] SEED_ON_START=1 -> running npm run seed"
    npm run seed || true
  fi
fi

echo "[entrypoint] Launching app (npm start)"
exec npm start
