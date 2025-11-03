-- AlterTable: Update default value for alertMinutesBefore from 5 to 10
ALTER TABLE "user_preferences" ALTER COLUMN "alertMinutesBefore" SET DEFAULT 10;

-- Update existing records that have the old default value of 5 to the new default of 10
UPDATE "user_preferences" SET "alertMinutesBefore" = 10 WHERE "alertMinutesBefore" = 5;

