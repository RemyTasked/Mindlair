#!/bin/bash
echo "🔧 Fixing Railway Database Migration..."
echo ""
echo "Step 1: Installing Railway CLI (if needed)..."
npm list -g @railway/cli > /dev/null 2>&1 || npm install -g @railway/cli

echo ""
echo "Step 2: Logging in to Railway..."
railway login

echo ""
echo "Step 3: Linking to project..."
railway link

echo ""
echo "Step 4: Running database fix..."
railway run --service postgres -- psql -c "UPDATE _prisma_migrations SET rolled_back_at = NOW(), finished_at = NOW() WHERE finished_at IS NULL; SELECT 'Fixed ' || COUNT(*) || ' failed migrations' FROM _prisma_migrations WHERE rolled_back_at IS NOT NULL;"

echo ""
echo "Step 5: Applying constraint fix..."
railway run --service postgres -- psql << 'SQL'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_accounts_userId_provider_key') THEN
        ALTER TABLE calendar_accounts DROP CONSTRAINT calendar_accounts_userId_provider_key;
        RAISE NOTICE 'Dropped old constraint';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_accounts_userId_provider_email_key') THEN
        ALTER TABLE calendar_accounts ADD CONSTRAINT calendar_accounts_userId_provider_email_key UNIQUE ("userId", provider, email);
        RAISE NOTICE 'Added new constraint';
    END IF;
END $$;
SQL

echo ""
echo "✅ Database fix complete!"
echo "The app will automatically redeploy."
