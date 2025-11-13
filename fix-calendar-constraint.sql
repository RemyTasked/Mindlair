-- Emergency fix for calendar_accounts unique constraint
-- This script is idempotent and can be run multiple times safely

-- Step 1: Drop the old (userId, provider) constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'calendar_accounts_userId_provider_key'
    AND table_name = 'calendar_accounts'
  ) THEN
    ALTER TABLE "calendar_accounts" DROP CONSTRAINT "calendar_accounts_userId_provider_key";
    RAISE NOTICE 'Dropped old constraint: calendar_accounts_userId_provider_key';
  ELSE
    RAISE NOTICE 'Old constraint calendar_accounts_userId_provider_key does not exist (already fixed)';
  END IF;
END $$;

-- Step 2: Drop the old unique index if it exists (sometimes constraints create indexes)
DROP INDEX IF EXISTS "calendar_accounts_userId_provider_key";

-- Step 3: Add the new (userId, provider, email) constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'calendar_accounts_userId_provider_email_key'
    AND table_name = 'calendar_accounts'
  ) THEN
    ALTER TABLE "calendar_accounts" 
      ADD CONSTRAINT "calendar_accounts_userId_provider_email_key" 
      UNIQUE ("userId", "provider", "email");
    RAISE NOTICE 'Added new constraint: calendar_accounts_userId_provider_email_key';
  ELSE
    RAISE NOTICE 'New constraint calendar_accounts_userId_provider_email_key already exists (no action needed)';
  END IF;
END $$;

-- Step 4: Ensure the primary calendar index exists
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_accounts_primary_idx"
  ON "calendar_accounts" ("userId", "provider")
  WHERE "isPrimary" = true;

-- Verify final state
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'calendar_accounts'
  AND constraint_type = 'UNIQUE';

