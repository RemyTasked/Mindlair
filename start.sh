#!/bin/bash
set -e

echo "========================================="
echo "Starting Meet Cute Deployment"
echo "========================================="

echo "Checking database connection..."
psql $DATABASE_URL -c "SELECT 1;" || { echo "Database connection failed!"; exit 1; }

echo "Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "Migration completed successfully!"
echo "Checking applied migrations..."
psql $DATABASE_URL -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"

echo "Verifying schema..."
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name IN ('enablePresleyFlow', 'enableMorningFlow', 'enableEveningFlow');"

echo "Starting application..."
node dist/server.js

