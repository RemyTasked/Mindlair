#!/bin/bash
set -e

echo "========================================="
echo "Starting Meet Cute Deployment"
echo "========================================="

echo "Checking database connection..."
psql $DATABASE_URL -c "SELECT 1;" || { echo "Database connection failed!"; exit 1; }

echo "Checking for failed migrations..."
psql $DATABASE_URL -c "SELECT migration_name, finished_at, logs FROM _prisma_migrations WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1;" || echo "No failed migrations table yet"

echo "Fixing calendar_accounts unique constraint..."
psql $DATABASE_URL -f fix-calendar-constraint.sql || echo "Calendar constraint fix failed (may already be correct)"

echo "Cleaning up any failed migrations..."
psql $DATABASE_URL -c "DELETE FROM _prisma_migrations WHERE migration_name LIKE '%add_attendee_count%' AND finished_at IS NULL;" || echo "No failed migrations to clean"
psql $DATABASE_URL -c "UPDATE _prisma_migrations SET finished_at = NOW(), rolled_back_at = NOW() WHERE migration_name = '20250103210000_backfill_existing_preferences' AND finished_at IS NULL;" || echo "No backfill migration to fix"
psql $DATABASE_URL -c "UPDATE _prisma_migrations SET finished_at = NOW(), rolled_back_at = NOW() WHERE migration_name = '20251112192100_drop_old_calendar_unique' AND finished_at IS NULL;" || echo "No calendar unique migration to fix"

echo "Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "Migration completed successfully!"
echo "Checking applied migrations..."
psql $DATABASE_URL -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"

echo "Verifying schema..."
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name IN ('enablePresleyFlow', 'enableMorningFlow', 'enableEveningFlow');"

echo "Starting application..."
node dist/server.js

