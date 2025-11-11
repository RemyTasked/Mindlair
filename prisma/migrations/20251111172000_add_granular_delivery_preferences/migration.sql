-- Add granular delivery preferences for Email, Slack, and SMS
-- This allows users to control exactly which notifications they receive via each channel

-- Email granular preferences
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "emailPreMeetingCues" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "emailInMeetingCues" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "emailPostMeetingCues" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "emailPresleyFlow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "emailWellnessReminders" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "emailMeetingInsights" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "emailMorningRecap" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "emailDailyWrapUp" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "emailWindingDown" BOOLEAN NOT NULL DEFAULT true;

-- Slack granular preferences
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "slackPreMeetingCues" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "slackInMeetingCues" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "slackPostMeetingCues" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "slackPresleyFlow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "slackWellnessReminders" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "slackMeetingInsights" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "slackMorningRecap" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "slackDailyWrapUp" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "slackWindingDown" BOOLEAN NOT NULL DEFAULT true;

-- SMS granular preferences
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "smsPreMeetingCues" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "smsInMeetingCues" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "smsPostMeetingCues" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "smsPresleyFlow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "smsWellnessReminders" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "smsMeetingInsights" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "smsMorningRecap" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "smsDailyWrapUp" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "smsWindingDown" BOOLEAN NOT NULL DEFAULT true;

