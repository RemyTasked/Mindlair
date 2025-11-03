-- AlterTable: Add performance rating and improvement notes to Presley Flow sessions
ALTER TABLE "presley_flow_sessions" ADD COLUMN IF NOT EXISTS "performanceRating" INTEGER;
ALTER TABLE "presley_flow_sessions" ADD COLUMN IF NOT EXISTS "improvementNotes" TEXT;

