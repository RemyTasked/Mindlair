-- Add sound preference learning fields to FocusSession
ALTER TABLE "focus_sessions" ADD COLUMN "soundType" TEXT;
ALTER TABLE "focus_sessions" ADD COLUMN "usedAISound" BOOLEAN NOT NULL DEFAULT true;

