-- Manual fix for failed Prisma migration
-- Run this directly in Railway's PostgreSQL console

-- Step 1: Check current migration state
SELECT migration_name, started_at, finished_at, rolled_back_at 
FROM "_prisma_migrations" 
WHERE finished_at IS NULL 
ORDER BY started_at DESC;

-- Step 2: Mark ALL failed migrations as rolled back
UPDATE "_prisma_migrations" 
SET rolled_back_at = NOW(), 
    finished_at = NOW()
WHERE finished_at IS NULL;

-- Step 3: Drop old constraint if exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'calendar_accounts_userId_provider_key'
    ) THEN
        ALTER TABLE "calendar_accounts" DROP CONSTRAINT "calendar_accounts_userId_provider_key";
        RAISE NOTICE 'Dropped old constraint';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop old constraint: %', SQLERRM;
END $$;

-- Step 4: Add new constraint if doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'calendar_accounts_userId_provider_email_key'
    ) THEN
        ALTER TABLE "calendar_accounts" ADD CONSTRAINT "calendar_accounts_userId_provider_email_key" UNIQUE ("userId", "provider", "email");
        RAISE NOTICE 'Added new constraint';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add new constraint: %', SQLERRM;
END $$;

-- Step 5: Verify the fix
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'calendar_accounts'::regclass
AND conname LIKE '%userId%';

-- Step 6: Check migration state again
SELECT migration_name, started_at, finished_at, rolled_back_at 
FROM "_prisma_migrations" 
WHERE migration_name LIKE '%calendar%'
ORDER BY started_at DESC;

