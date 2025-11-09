-- Add presence tracking fields to meetings
ALTER TABLE "meetings"
ADD COLUMN IF NOT EXISTS "calendarProvider" TEXT,
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS "statusSource" TEXT,
ADD COLUMN IF NOT EXISTS "actualStartTime" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "actualEndTime" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastPresenceCheck" TIMESTAMP(3);

-- Ensure status has a value for existing records
UPDATE "meetings"
SET "status" = COALESCE("status", 'scheduled');

-- Helpful index for presence/status queries
CREATE INDEX IF NOT EXISTS "meetings_status_idx" ON "meetings"("status");

