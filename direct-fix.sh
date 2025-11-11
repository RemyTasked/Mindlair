#!/bin/bash
echo "🔧 Direct Database Fix via Railway"
echo ""
echo "Getting database connection string..."

# Get the DATABASE_URL from Railway
DB_URL=$(railway variables --json | grep -o '"DATABASE_URL":"[^"]*' | cut -d'"' -f4)

if [ -z "$DB_URL" ]; then
    echo "❌ Could not get DATABASE_URL from Railway"
    echo "Let's try a different approach..."
    echo ""
    echo "Run this command to get your DATABASE_URL:"
    echo "railway variables"
    exit 1
fi

echo "✅ Got database connection"
echo ""
echo "Running SQL fix..."

# Run the SQL directly
railway run --service postgres psql "$DB_URL" << 'SQL'
-- Mark failed migrations as rolled back
UPDATE "_prisma_migrations" 
SET rolled_back_at = NOW(), 
    finished_at = NOW()
WHERE finished_at IS NULL;

-- Drop old constraint
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_accounts_userId_provider_key') THEN
        ALTER TABLE "calendar_accounts" DROP CONSTRAINT "calendar_accounts_userId_provider_key";
        RAISE NOTICE 'Dropped old constraint';
    END IF;
END $$;

-- Add new constraint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_accounts_userId_provider_email_key') THEN
        ALTER TABLE "calendar_accounts" ADD CONSTRAINT "calendar_accounts_userId_provider_email_key" UNIQUE ("userId", "provider", "email");
        RAISE NOTICE 'Added new constraint';
    END IF;
END $$;

-- Show results
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No failed migrations!'
        ELSE '⚠️ Still have ' || COUNT(*) || ' failed migrations'
    END as status
FROM "_prisma_migrations" 
WHERE finished_at IS NULL;
SQL

echo ""
echo "✅ SQL executed!"
echo ""
echo "Now triggering a redeploy..."
railway up --detach

echo ""
echo "✅ Redeploy triggered!"
echo "Check Railway dashboard - the app should deploy successfully now!"
