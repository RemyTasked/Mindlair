-- AlterTable: Add voice narration preference
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "enableVoiceNarration" BOOLEAN NOT NULL DEFAULT true;

