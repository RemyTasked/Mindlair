#!/bin/bash
set -e

echo "Cleaning up old migration records..."

# Clean up failed/old migrations directly in the database
psql $DATABASE_URL -c "DELETE FROM \"_prisma_migrations\" WHERE migration_name LIKE '20251101%' OR finished_at IS NULL;" || echo "No old migrations to clean"

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting application..."
npm run start

