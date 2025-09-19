#!/bin/sh
set -e

echo "[entrypoint] Starting container..."

# Prepare persistent data dir for DB and generated assets if mounted
DATA_DIR="/data"
POSTERS_DIR="/app/public/posters"
TEMPLATES_DIR="/app/public/templates"

if [ -d "$DATA_DIR" ]; then
  echo "[entrypoint] Detected data volume at $DATA_DIR"
  # Ensure subdirs
  mkdir -p "$DATA_DIR/db" "$DATA_DIR/public/posters" "$DATA_DIR/public/templates"

  # If DATABASE_URL points to sqlite file inside /app, re-point to /data
  if [ -n "$DATABASE_URL" ] && echo "$DATABASE_URL" | grep -qi "^file:"; then
    DB_PATH=$(echo "$DATABASE_URL" | sed 's/^file:\/*//')
    case "$DB_PATH" in
      /*) : ;; # absolute path -> leave it
      *)
        # Switch to /data/db/prod.db while preserving relative path intent
        export DATABASE_URL="file:$DATA_DIR/db/prod.db"
        echo "[entrypoint] Overriding DATABASE_URL to $DATABASE_URL (persistent)"
        ;;
    esac
  fi

  # One-time move existing posters/templates to data if data side is empty
  if [ -d "$POSTERS_DIR" ] && [ -z "$(ls -A "$DATA_DIR/public/posters" 2>/dev/null)" ] && [ -n "$(ls -A "$POSTERS_DIR" 2>/dev/null)" ]; then
    echo "[entrypoint] Migrating existing posters to $DATA_DIR/public/posters"
    cp -r "$POSTERS_DIR/"* "$DATA_DIR/public/posters/" 2>/dev/null || true
  fi
  if [ -d "$TEMPLATES_DIR" ] && [ -z "$(ls -A "$DATA_DIR/public/templates" 2>/dev/null)" ] && [ -n "$(ls -A "$TEMPLATES_DIR" 2>/dev/null)" ]; then
    echo "[entrypoint] Migrating existing templates to $DATA_DIR/public/templates"
    cp -r "$TEMPLATES_DIR/"* "$DATA_DIR/public/templates/" 2>/dev/null || true
  fi

  # Link back into /app/public for serving
  if [ -d "$POSTERS_DIR" ] || [ -L "$POSTERS_DIR" ]; then rm -rf "$POSTERS_DIR"; fi
  ln -s "$DATA_DIR/public/posters" "$POSTERS_DIR"
  if [ -d "$TEMPLATES_DIR" ] || [ -L "$TEMPLATES_DIR" ]; then rm -rf "$TEMPLATES_DIR"; fi
  ln -s "$DATA_DIR/public/templates" "$TEMPLATES_DIR"
fi

# Auto-migrate schema based on DATABASE_URL
if [ -n "$DATABASE_URL" ]; then
  if echo "$DATABASE_URL" | grep -qi "^file:"; then
    echo "[entrypoint] Detected SQLite DATABASE_URL ($DATABASE_URL). Running prisma migrate deploy..."
    npx prisma migrate deploy --skip-generate || {
      echo "[entrypoint] prisma migrate deploy failed (continuing anyway)";
    }
  elif echo "$DATABASE_URL" | grep -Eqi "^postgres(|ql)://"; then
    echo "[entrypoint] Detected Postgres DATABASE_URL. Running prisma migrate deploy..."
    npx prisma migrate deploy || {
      echo "[entrypoint] prisma migrate deploy failed (continuing anyway)";
    }
  else
    echo "[entrypoint] Unknown DATABASE_URL scheme. Skipping prisma migrations."
  fi
  # Seeding is disabled by default. To seed, set ALLOW_SEED=1 and run `npm run seed` manually.
fi

echo "[entrypoint] Launching app (npm start)"
exec npm start
