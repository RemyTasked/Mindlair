#!/bin/sh
# Mindlair production deploy entrypoint.
#
# This script handles three scenarios:
#   1. Fresh DB with no migration state: runs all migrations from scratch.
#   2. Existing DB already at the schema (production was previously synced via
#      `prisma db push`): baselines the existing migration directories as
#      "already applied" so only new migrations actually run.
#   3. Subsequent deploys: just runs `prisma migrate deploy` and any pending
#      migration files get applied.
#
# After migrations: runs the (non-fatal) seed + thumbnail backfill, then
# hands control to the Next.js app.

set -e

cd apps/web

# Migration directories in chronological order. New migrations should be added
# to this list to ensure deterministic baseline behavior. Anything in
# prisma/migrations/ that is NOT listed here will be treated as "new" (i.e.
# `migrate deploy` will try to run it) on the very next deploy.
BASELINE_MIGRATIONS="
20260407120000_post_referenced_post
20260407143000_rename_follow_to_subscription
20260407200000_add_comments
20260408000000_add_post_thumbnail
20260517000000_remove_external_integrations
20260518000000_add_card_system
20260518000001_enable_pgvector
"

run_migrate_deploy() {
  # Capture both stdout and stderr to the log without using PIPESTATUS
  # (PIPESTATUS is bash-only; this script runs under POSIX sh).
  if npx prisma migrate deploy > /tmp/migrate.log 2>&1; then
    cat /tmp/migrate.log
    return 0
  fi
  cat /tmp/migrate.log
  return 1
}

echo "[deploy] Attempting prisma migrate deploy..."
if ! run_migrate_deploy; then
  if grep -qE "P3005|database schema is not empty" /tmp/migrate.log; then
    echo "[deploy] P3005 detected — production DB pre-dates Prisma migration tracking."
    echo "[deploy] Baselining historical migrations as already applied..."
    for migration in $BASELINE_MIGRATIONS; do
      echo "[deploy]   → resolving $migration"
      npx prisma migrate resolve --applied "$migration" \
        || echo "[deploy]   (already recorded or unreachable: $migration)"
    done
    echo "[deploy] Retrying prisma migrate deploy..."
    npx prisma migrate deploy
  else
    echo "[deploy] migrate deploy failed for non-baseline reason:"
    cat /tmp/migrate.log
    exit 1
  fi
fi

echo "[deploy] Migrations complete."

echo "[deploy] Running prisma db seed (non-fatal)..."
npx prisma db seed || echo "[deploy] Seed step skipped or failed (non-fatal)"

echo "[deploy] Running thumbnail backfill (non-fatal)..."
npx tsx prisma/migrate-thumbnails.ts || echo "[deploy] Thumbnail migration failed (non-fatal)"

echo "[deploy] Starting Next.js server..."
exec npm run start
