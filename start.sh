#!/bin/bash
set -e

echo "========================================="
echo "Starting Meet Cute Deployment"
echo "========================================="

echo "Checking database connection..."
psql $DATABASE_URL -c "SELECT 1;" || { echo "Database connection failed!"; exit 1; }

echo "Checking for failed migrations..."
psql $DATABASE_URL -c "SELECT migration_name, finished_at, logs FROM _prisma_migrations WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1;" || echo "No failed migrations table yet"

echo "Cleaning up any failed migrations..."
psql $DATABASE_URL -c "DELETE FROM _prisma_migrations WHERE migration_name LIKE '%add_attendee_count%' AND finished_at IS NULL;" || echo "No failed migrations to clean"

echo "Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "Migration completed successfully!"
echo "Checking applied migrations..."
psql $DATABASE_URL -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"

echo "Verifying schema..."
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name IN ('enablePresleyFlow', 'enableMorningFlow', 'enableEveningFlow');"

echo "Starting application..."
node dist/server.js

