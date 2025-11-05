-- AlterTable: Add attendeeCount field to meetings table
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "attendeeCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing meetings with attendee count
UPDATE "meetings" 
SET "attendeeCount" = COALESCE(array_length("attendees", 1), 0) 
WHERE "attendeeCount" = 0;

