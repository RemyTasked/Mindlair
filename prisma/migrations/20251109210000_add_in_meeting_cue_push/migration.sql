-- Add push notification preferences for in-meeting and post-meeting cues
ALTER TABLE "delivery_settings" 
  ADD COLUMN IF NOT EXISTS "pushInMeetingCues" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pushPostMeetingCues" BOOLEAN NOT NULL DEFAULT true;

