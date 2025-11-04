-- AlterTable: Add intention field to focus_sessions
ALTER TABLE "focus_sessions" ADD COLUMN IF NOT EXISTS "intention" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "focus_sessions"."intention" IS 'User''s stated focus or goal for the meeting';

