-- Drop old unique constraint on (userId, provider)
-- Add new unique constraint on (userId, provider, email)

-- First, drop the old constraint
ALTER TABLE "calendar_accounts" DROP CONSTRAINT IF EXISTS "calendar_accounts_userId_provider_key";

-- Add the new constraint
ALTER TABLE "calendar_accounts" ADD CONSTRAINT "calendar_accounts_userId_provider_email_key" UNIQUE ("userId", "provider", "email");
