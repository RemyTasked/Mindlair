#!/bin/bash
# Run database migrations before starting the server

echo "🔄 Running database migrations..."

# Run Prisma migrations
npx prisma migrate deploy

echo "✅ Migrations complete!"

