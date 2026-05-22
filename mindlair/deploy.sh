#!/bin/sh
# Mindlair production deploy entrypoint.
#
# Handles all the migration-state messes that can happen on Railway when a
# service has been through multiple schema-management strategies (db push,
# manual SQL, prior apps using the same DB, etc.). Specifically:
#
#   P3005  – schema is not empty, no migration history → baseline historical
#            migrations as already applied.
#   P3009  – stale FAILED migration rows in _prisma_migrations:
#              • if the failed name IS one of *our* migrations (in BASELINE_MIGRATIONS),
#                its schema is already present in prod → mark APPLIED.
#              • otherwise → mark ROLLED-BACK (leftover from a previous app).
#   P3018  – a migration aborted mid-apply (typically because the schema
#            already exists from a prior db push). For our migrations, mark
#            the failing one APPLIED and retry; for genuinely new migrations,
#            bail out so the human can investigate.
#
# The migrate-deploy step is retried in a loop (up to MAX_ATTEMPTS) so that
# chained errors (e.g. P3009 → P3005 → P3018) can be resolved automatically.
#
# After migrations: runs the (non-fatal) seed + thumbnail backfill, then
# hands control to the Next.js app.

set -e

cd apps/web

# Historical migrations (in chronological order). Each of these represents
# schema that is *already* present in the production database because prod
# was previously kept in sync via `prisma db push`. They must therefore be
# marked APPLIED when recovering migration state — never re-run.
#
# New migrations should NOT be added to this list; they should run normally.
BASELINE_MIGRATIONS="
20260407120000_post_referenced_post
20260407143000_rename_follow_to_subscription
20260407200000_add_comments
20260408000000_add_post_thumbnail
20260517000000_remove_external_integrations
20260518000000_add_card_system
20260518000001_enable_pgvector
20260521000000_publishing_upgrades
"

# Migration names from previous app incarnations that may have left FAILED
# rows in _prisma_migrations on the production DB. These have NO files in
# prisma/migrations/, so they must be marked rolled-back to be forgotten.
KNOWN_STALE_MIGRATIONS="
20250104000000_add_simplified_notifications
"

is_baseline_migration() {
  for m in $BASELINE_MIGRATIONS; do
    if [ "$m" = "$1" ]; then
      return 0
    fi
  done
  return 1
}

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

# Mark a single migration appropriately given its identity.
resolve_one() {
  name="$1"
  if is_baseline_migration "$name"; then
    echo "[deploy]   → $name is one of our migrations; marking APPLIED (schema already present from db push era)"
    npx prisma migrate resolve --applied "$name" \
      || echo "[deploy]     (could not mark $name applied — may already be applied)"
  else
    echo "[deploy]   → $name is not in our migrations folder; marking ROLLED-BACK (stale from previous app)"
    npx prisma migrate resolve --rolled-back "$name" \
      || echo "[deploy]     (could not mark $name rolled-back — may already be in that state)"
  fi
}

handle_p3009() {
  # Parse all migration names mentioned in P3009 output. The error message
  # format is: "The `<name>` migration started at ... failed".
  parsed=$(grep -oE 'The `[0-9A-Za-z_]+` migration' /tmp/migrate.log \
    | sed -E 's/^The `([^`]+)` migration$/\1/' \
    | sort -u)

  if [ -z "$parsed" ]; then
    echo "[deploy]   (could not parse any failed migration name from P3009 output)"
    return 1
  fi

  for m in $parsed; do
    resolve_one "$m"
  done

  # Defensively also clear any known-stale rows (some may exist in failed
  # state but not surface in this particular error message).
  for m in $KNOWN_STALE_MIGRATIONS; do
    case " $parsed " in
      *" $m "*) ;;  # already handled above
      *)
        npx prisma migrate resolve --rolled-back "$m" > /dev/null 2>&1 || true
        ;;
    esac
  done

  return 0
}

handle_p3018() {
  # P3018: a migration failed mid-apply. The error includes:
  #   "Migration name: <name>"
  failed=$(grep -oE 'Migration name: [0-9A-Za-z_]+' /tmp/migrate.log \
    | sed -E 's/^Migration name: //' \
    | sort -u \
    | head -1)

  if [ -z "$failed" ]; then
    echo "[deploy]   (could not parse Migration name from P3018 output)"
    return 1
  fi

  echo "[deploy]   migration that failed mid-apply: $failed"

  if is_baseline_migration "$failed"; then
    echo "[deploy]   → $failed is one of our historical migrations; marking APPLIED"
    npx prisma migrate resolve --applied "$failed" \
      || echo "[deploy]     (could not mark $failed applied — may already be applied)"
    return 0
  fi

  # A migration that's NOT in our baseline list failed mid-apply. That
  # usually means a brand-new migration has a real bug — don't silently
  # paper over it.
  echo "[deploy] FATAL: a non-baseline migration ($failed) failed mid-apply."
  echo "[deploy] This likely indicates a real problem in the migration SQL."
  cat /tmp/migrate.log
  return 1
}

handle_p3005() {
  echo "[deploy] P3005 detected — baselining all historical migrations as applied..."
  for m in $BASELINE_MIGRATIONS; do
    echo "[deploy]   → resolving $m (applied)"
    npx prisma migrate resolve --applied "$m" \
      || echo "[deploy]     (already recorded or unreachable: $m)"
  done
}

MAX_ATTEMPTS=10
attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  echo "[deploy] migrate deploy attempt $attempt/$MAX_ATTEMPTS..."
  if run_migrate_deploy; then
    echo "[deploy] Migrations applied successfully on attempt $attempt."
    break
  fi

  if grep -qE "P3009|failed migrations in the target database" /tmp/migrate.log; then
    echo "[deploy] P3009 detected — failed migration rows in _prisma_migrations."
    if ! handle_p3009; then
      cat /tmp/migrate.log
      exit 1
    fi
  elif grep -qE "P3018|A migration failed to apply" /tmp/migrate.log; then
    echo "[deploy] P3018 detected — a migration aborted mid-apply."
    if ! handle_p3018; then
      exit 1
    fi
  elif grep -qE "P3005|database schema is not empty" /tmp/migrate.log; then
    handle_p3005
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
