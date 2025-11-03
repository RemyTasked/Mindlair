-- AlterTable: Add isOrganizer field to meetings
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "isOrganizer" BOOLEAN NOT NULL DEFAULT false;

