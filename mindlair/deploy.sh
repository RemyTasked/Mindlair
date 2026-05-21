#!/bin/sh
# Mindlair production deploy entrypoint.
#
# Handles several scenarios that can occur on Railway when a service has been
# through multiple schema-management strategies (db push, manual SQL, prior
# apps using the same DB, etc.):
#
#   1. Fresh DB with no migration state: runs all migrations from scratch.
#   2. Existing DB already at the schema (P3005 — production was previously
#      synced via `prisma db push`): baselines the existing migration
#      directories as "already applied" so only new migrations actually run.
#   3. DB has stale FAILED migration rows from a previous app/state (P3009):
#      marks them as rolled-back so `migrate deploy` can move on.
#   4. Subsequent deploys: just runs `prisma migrate deploy` and any pending
#      migration files get applied.
#
# The migrate-deploy step is retried in a loop (up to MAX_ATTEMPTS) so that
# chained errors (e.g. P3009 → P3005 after cleanup) can be resolved
# automatically.
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

# Known stale migration names from previous app incarnations that may have
# left FAILED rows in _prisma_migrations on the production DB. These will be
# proactively marked as rolled-back if encountered. Any *other* failed
# migration found in the P3009 error output will also be handled dynamically.
KNOWN_STALE_MIGRATIONS="
20250104000000_add_simplified_notifications
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

resolve_failed_migrations() {
  # Parse failed migration names out of P3009 output. The error message looks
  # like: "The `20250104000000_xyz` migration started at ... failed".
  parsed=$(grep -oE 'The `[0-9A-Za-z_]+` migration' /tmp/migrate.log \
    | sed -E 's/^The `([^`]+)` migration$/\1/' \
    | sort -u)

  # Combine parsed names with the hardcoded known-stale list (dedup).
  combined=$(printf '%s\n%s\n' "$parsed" "$KNOWN_STALE_MIGRATIONS" \
    | tr ' ' '\n' \
    | sed '/^$/d' \
    | sort -u)

  if [ -z "$combined" ]; then
    echo "[deploy]   (no failed migration names could be parsed)"
    return 1
  fi

  for m in $combined; do
    echo "[deploy]   → marking stale failed migration as rolled-back: $m"
    npx prisma migrate resolve --rolled-back "$m" \
      || echo "[deploy]     (already resolved or not present: $m)"
  done
  return 0
}

baseline_existing_migrations() {
  echo "[deploy] Baselining historical migrations as already applied..."
  for migration in $BASELINE_MIGRATIONS; do
    echo "[deploy]   → resolving $migration (applied)"
    npx prisma migrate resolve --applied "$migration" \
      || echo "[deploy]     (already recorded or unreachable: $migration)"
  done
}

MAX_ATTEMPTS=5
attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  echo "[deploy] migrate deploy attempt $attempt/$MAX_ATTEMPTS..."
  if run_migrate_deploy; then
    echo "[deploy] Migrations applied successfully on attempt $attempt."
    break
  fi

  if grep -qE "P3009|failed migrations in the target database" /tmp/migrate.log; then
    echo "[deploy] P3009 detected — stale failed migration rows in _prisma_migrations."
    if ! resolve_failed_migrations; then
      echo "[deploy] Could not resolve failed migrations automatically. Bailing out."
      cat /tmp/migrate.log
      exit 1
    fi
  elif grep -qE "P3005|database schema is not empty" /tmp/migrate.log; then
    echo "[deploy] P3005 detected — production DB pre-dates Prisma migration tracking."
    baseline_existing_migrations
  else
    echo "[deploy] migrate deploy failed for a non-recoverable reason:"
    cat /tmp/migrate.log
    exit 1
  fi

  attempt=$((attempt + 1))
done

if [ "$attempt" -gt "$MAX_ATTEMPTS" ]; then
  echo "[deploy] migrate deploy still failing after $MAX_ATTEMPTS attempts. Aborting."
  exit 1
fi

echo "[deploy] Migrations complete."

echo "[deploy] Running prisma db seed (non-fatal)..."
npx prisma db seed || echo "[deploy] Seed step skipped or failed (non-fatal)"

echo "[deploy] Running thumbnail backfill (non-fatal)..."
npx tsx prisma/migrate-thumbnails.ts || echo "[deploy] Thumbnail migration failed (non-fatal)"

echo "[deploy] Starting Next.js server..."
exec npm run start
