#!/bin/bash

echo "🚀 Setting up new database..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in environment"
    echo "Please make sure you've updated DATABASE_URL in Railway dashboard"
    exit 1
fi

echo "✅ DATABASE_URL found"
echo ""

# Run migrations
echo "Step 1: Running Prisma migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrations completed successfully!"
    echo ""
    echo "Step 2: Generating Prisma client..."
    npx prisma generate
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🎉 SUCCESS! New database is ready!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Your app should now deploy successfully!"
        echo "Check Railway dashboard - the meet-cute service should be deploying now."
        echo ""
        echo "Next steps:"
        echo "1. Visit https://www.meetcuteal.com to verify"
        echo "2. Sign up with your email"
        echo "3. Reconnect your calendar"
        echo "4. Configure your preferences"
        echo ""
    else
        echo "❌ Failed to generate Prisma client"
        exit 1
    fi
else
    echo "❌ Migrations failed"
    exit 1
fi

