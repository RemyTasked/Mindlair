-- Relax unique constraint to allow multiple accounts per provider/email pair
ALTER TABLE "calendar_accounts"
  DROP CONSTRAINT IF EXISTS "calendar_accounts_userId_provider_key";

ALTER TABLE "calendar_accounts"
  ADD COLUMN IF NOT EXISTS "label" TEXT NOT NULL DEFAULT '';

ALTER TABLE "calendar_accounts"
  ADD COLUMN IF NOT EXISTS "color" TEXT;

ALTER TABLE "calendar_accounts"
  ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "calendar_accounts"
  ADD CONSTRAINT "calendar_accounts_userId_provider_email_key" UNIQUE ("userId", "provider", "email");

-- Ensure only one primary calendar per provider (optional, but helpful)
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_accounts_primary_idx"
  ON "calendar_accounts" ("userId", "provider")
  WHERE "isPrimary" = true;

-- Meeting metadata for calendar references
ALTER TABLE "meetings"
  ADD COLUMN IF NOT EXISTS "calendarAccountId" TEXT;

ALTER TABLE "meetings"
  ADD COLUMN IF NOT EXISTS "calendarLabel" TEXT;

ALTER TABLE "meetings"
  ADD COLUMN IF NOT EXISTS "calendarColor" TEXT;

ALTER TABLE "meetings"
  ADD CONSTRAINT "meetings_calendarAccountId_fkey"
    FOREIGN KEY ("calendarAccountId") REFERENCES "calendar_accounts"("id") ON DELETE SET NULL;

-- Backfill labels and primary flags for existing accounts
UPDATE "calendar_accounts"
SET "label" = CASE
  WHEN "provider" = 'google' THEN 'Google • ' || "email"
  WHEN "provider" = 'microsoft' THEN 'Microsoft • ' || "email"
  ELSE COALESCE(NULLIF("label", ''), INITCAP("provider") || ' • ' || "email")
END
WHERE COALESCE(NULLIF("label", ''), '') = '';

WITH ranked_accounts AS (
  SELECT id, "userId", "provider",
         ROW_NUMBER() OVER (PARTITION BY "userId", "provider" ORDER BY "createdAt" NULLS FIRST) AS rn
  FROM "calendar_accounts"
)
UPDATE "calendar_accounts" AS ca
SET "isPrimary" = ranked_accounts.rn = 1
FROM ranked_accounts
WHERE ca.id = ranked_accounts.id;
