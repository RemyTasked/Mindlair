-- Ensure multi-calendar support allows multiple accounts per provider/email combo
-- Some environments still have the original (userId, provider) unique constraint,
-- so we drop it defensively and enforce the newer (userId, provider, email) key.

-- Drop old constraint if it exists
ALTER TABLE "calendar_accounts"
  DROP CONSTRAINT IF EXISTS "calendar_accounts_userId_provider_key";

-- Drop old index if it exists
DROP INDEX IF EXISTS "calendar_accounts_userId_provider_key";

-- Only add the new constraint if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'calendar_accounts_userId_provider_email_key'
  ) THEN
    ALTER TABLE "calendar_accounts"
      ADD CONSTRAINT "calendar_accounts_userId_provider_email_key"
      UNIQUE ("userId", "provider", "email");
  END IF;
END $$;

-- Maintain partial unique index so only one primary calendar exists per provider
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_accounts_primary_idx"
  ON "calendar_accounts" ("userId", "provider")
  WHERE "isPrimary" = true;
