#!/bin/bash

echo "Cleaning up old migration records..."

# Try to clean up failed/old migrations (ignore errors if table doesn't exist yet)
psql $DATABASE_URL -c "DELETE FROM \"_prisma_migrations\" WHERE migration_name LIKE '20251101%' OR finished_at IS NULL;" 2>/dev/null || echo "Skipping migration cleanup (table may not exist yet)"

echo "Running Prisma migrations..."
npx prisma migrate deploy

if [ $? -ne 0 ]; then
  echo "Migration failed, exiting..."
  exit 1
fi

echo "Starting application..."
npm run start

