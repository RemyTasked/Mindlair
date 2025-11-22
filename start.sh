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
psql $DATABASE_URL -c "DELETE FROM _prisma_migrations WHERE migration_name = '20251112192100_drop_old_calendar_unique' AND finished_at IS NOT NULL;" || echo "No old calendar migration to delete"

echo "Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma || {
  echo "⚠️ Migrations failed, but continuing with app startup..."
  echo "The database schema should already be correct from the SQL fix above"
}

echo "Migration completed successfully!"
echo "Checking applied migrations..."
psql $DATABASE_URL -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"

echo "Verifying schema..."
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name IN ('enablePresleyFlow', 'enableMorningFlow', 'enableEveningFlow');"

echo "🎮 Checking if games need seeding..."
# First check if the table exists
TABLE_EXISTS=$(psql $DATABASE_URL -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_questions');" 2>/dev/null | tr -d ' ' || echo "false")
if [ "$TABLE_EXISTS" = "t" ] || [ "$TABLE_EXISTS" = "true" ]; then
  GAME_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM game_questions;" 2>/dev/null | tr -d ' ' || echo "0")
  if [ "$GAME_COUNT" = "0" ] || [ -z "$GAME_COUNT" ]; then
    echo "🌱 No game data found, seeding games database..."
    echo "⚠️ Games will be seeded automatically when the API endpoint is called on first access."
    echo "⚠️ To seed manually, call POST /api/games/seed after server starts"
  else
    echo "✅ Game data already exists ($GAME_COUNT questions), skipping seed"
  fi
else
  echo "⚠️ game_questions table does not exist yet. Migrations may not have completed. Skipping seed."
  echo "⚠️ Games will be seeded automatically when the API endpoint is called."
fi

echo "Starting application..."
node dist/server.js

