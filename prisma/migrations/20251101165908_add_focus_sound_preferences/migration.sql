-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "enableFocusSound" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "focusSoundType" TEXT NOT NULL DEFAULT 'calm-ocean';

