-- Resolve failed migration and fix unique constraint
-- This migration will clean up the failed migration state and apply the fix

-- Step 1: Mark the failed migration as resolved (if it exists in _prisma_migrations)
-- This allows new migrations to run
DO $$ 
BEGIN
    -- Check if the failed migration exists
    IF EXISTS (
        SELECT 1 FROM "_prisma_migrations" 
        WHERE migration_name = '20251110213000_fix_calendar_account_unique_constraint'
        AND finished_at IS NULL
    ) THEN
        -- Mark it as rolled back so Prisma can continue
        UPDATE "_prisma_migrations" 
        SET rolled_back_at = NOW(), 
            finished_at = NOW()
        WHERE migration_name = '20251110213000_fix_calendar_account_unique_constraint'
        AND finished_at IS NULL;
        RAISE NOTICE 'Marked failed migration as rolled back';
    END IF;
END $$;

-- Step 2: Drop old unique constraint on (userId, provider) if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'calendar_accounts_userId_provider_key'
    ) THEN
        ALTER TABLE "calendar_accounts" DROP CONSTRAINT "calendar_accounts_userId_provider_key";
        RAISE NOTICE 'Dropped old constraint: calendar_accounts_userId_provider_key';
    ELSE
        RAISE NOTICE 'Old constraint does not exist, skipping';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping old constraint (may not exist): %', SQLERRM;
END $$;

-- Step 3: Add new unique constraint on (userId, provider, email) if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'calendar_accounts_userId_provider_email_key'
    ) THEN
        ALTER TABLE "calendar_accounts" ADD CONSTRAINT "calendar_accounts_userId_provider_email_key" UNIQUE ("userId", "provider", "email");
        RAISE NOTICE 'Added new constraint: calendar_accounts_userId_provider_email_key';
    ELSE
        RAISE NOTICE 'New constraint already exists, skipping';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding new constraint: %', SQLERRM;
END $$;
