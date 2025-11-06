-- AlterTable
ALTER TABLE "users" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/New_York';

-- Update existing users to detect timezone from their calendar or set to UTC
-- This will be updated when users log in and we detect their browser timezone

