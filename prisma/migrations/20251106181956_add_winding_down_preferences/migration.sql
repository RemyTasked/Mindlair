-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN "enableWindingDown" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN "windingDownTime" TEXT NOT NULL DEFAULT '21:00';

-- AlterTable
ALTER TABLE "delivery_settings" ADD COLUMN "pushWindingDown" BOOLEAN NOT NULL DEFAULT true;

