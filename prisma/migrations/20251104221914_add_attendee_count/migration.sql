-- Add attendeeCount field to Meeting table
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "attendeeCount" INTEGER NOT NULL DEFAULT 0;

-- Update existing meetings to have correct attendee count
UPDATE "meetings" SET "attendeeCount" = array_length("attendees", 1) WHERE "attendeeCount" = 0 AND "attendees" IS NOT NULL;

