-- Add prepMode and prepFlowResponses to FocusSession for behavioral insights
ALTER TABLE "focus_sessions" ADD COLUMN IF NOT EXISTS "prepMode" TEXT;
ALTER TABLE "focus_sessions" ADD COLUMN IF NOT EXISTS "prepFlowResponses" JSONB;

