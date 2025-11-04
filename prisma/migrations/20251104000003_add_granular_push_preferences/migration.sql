-- AlterTable: Add granular push notification preferences to delivery_settings
ALTER TABLE "delivery_settings" 
  ADD COLUMN IF NOT EXISTS "pushPreMeetingCues" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pushPresleyFlow" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pushWellnessReminders" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pushMeetingInsights" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pushMorningRecap" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pushDailyWrapUp" BOOLEAN NOT NULL DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN "delivery_settings"."pushPreMeetingCues" IS 'Enable push notifications for pre-meeting focus session alerts';
COMMENT ON COLUMN "delivery_settings"."pushPresleyFlow" IS 'Enable push notifications for morning/evening Presley Flow alerts';
COMMENT ON COLUMN "delivery_settings"."pushWellnessReminders" IS 'Enable push notifications for wellness check-in reminders';
COMMENT ON COLUMN "delivery_settings"."pushMeetingInsights" IS 'Enable push notifications for post-meeting insights';
COMMENT ON COLUMN "delivery_settings"."pushMorningRecap" IS 'Enable push notifications for morning recap';
COMMENT ON COLUMN "delivery_settings"."pushDailyWrapUp" IS 'Enable push notifications for evening wrap-up';

