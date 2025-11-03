#!/bin/bash
# Script to reset Prisma migrations and rebuild database

echo "Resetting Prisma migrations..."

# Drop and recreate the _prisma_migrations table
npx prisma migrate reset --force --skip-seed

echo "Migration reset complete!"

