-- Fix calendar account unique constraint (v2 - idempotent)
-- This migration safely handles the constraint change even if partially applied

-- Drop old unique constraint on (userId, provider) if it exists
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
END $$;

-- Add new unique constraint on (userId, provider, email) if it doesn't exist
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
END $$;
