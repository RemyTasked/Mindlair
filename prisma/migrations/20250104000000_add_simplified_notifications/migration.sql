-- AlterTable: Add simplified notification preferences to UserPreferences
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "notificationPrimaryChannel" TEXT DEFAULT 'push';
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "notificationSecondaryChannels" TEXT;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "notificationsMeetingMoments" BOOLEAN DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "notificationsDailyRhythm" BOOLEAN DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "notificationsWellness" BOOLEAN DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "quietHoursStart" TEXT;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "quietHoursEnd" TEXT;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "notificationPreset" TEXT DEFAULT 'balanced';

-- Migration: Convert existing DeliverySettings to simplified format
-- This preserves user intent while simplifying the structure
UPDATE "user_preferences" up
SET 
  "notificationPrimaryChannel" = CASE 
    WHEN EXISTS (
      SELECT 1 FROM "delivery_settings" ds 
      WHERE ds."userId" = up."userId" 
      AND ds."pushEnabled" = true
    ) THEN 'push'
    WHEN EXISTS (
      SELECT 1 FROM "delivery_settings" ds 
      WHERE ds."userId" = up."userId" 
      AND ds."emailEnabled" = true
    ) THEN 'email'
    ELSE 'push'
  END,
  "notificationSecondaryChannels" = CASE 
    WHEN EXISTS (
      SELECT 1 FROM "delivery_settings" ds 
      WHERE ds."userId" = up."userId" 
      AND (ds."slackEnabled" = true OR ds."smsEnabled" = true)
    ) THEN (
      SELECT CASE 
        WHEN ds."slackEnabled" = true AND ds."smsEnabled" = true THEN 'slack,sms'
        WHEN ds."slackEnabled" = true THEN 'slack'
        WHEN ds."smsEnabled" = true THEN 'sms'
        ELSE NULL
      END
      FROM "delivery_settings" ds
      WHERE ds."userId" = up."userId"
      LIMIT 1
    )
    ELSE NULL
  END,
  "notificationsMeetingMoments" = CASE 
    WHEN EXISTS (
      SELECT 1 FROM "delivery_settings" ds 
      WHERE ds."userId" = up."userId" 
      AND (
        (ds."pushEnabled" = true AND ds."pushPreMeetingCues" = true) OR
        (ds."emailEnabled" = true AND ds."emailPreMeetingCues" = true) OR
        (ds."slackEnabled" = true AND ds."slackPreMeetingCues" = true)
      )
    ) THEN true
    ELSE false
  END,
  "notificationsDailyRhythm" = CASE 
    WHEN EXISTS (
      SELECT 1 FROM "delivery_settings" ds 
      WHERE ds."userId" = up."userId" 
      AND (
        (ds."pushEnabled" = true AND ds."pushPresleyFlow" = true) OR
        (ds."emailEnabled" = true AND ds."emailPresleyFlow" = true) OR
        (ds."slackEnabled" = true AND ds."slackPresleyFlow" = true)
      )
    ) THEN true
    ELSE false
  END,
  "notificationsWellness" = CASE 
    WHEN EXISTS (
      SELECT 1 FROM "delivery_settings" ds 
      WHERE ds."userId" = up."userId" 
      AND (
        (ds."pushEnabled" = true AND ds."pushWellnessReminders" = true) OR
        (ds."emailEnabled" = true AND ds."emailWellnessReminders" = true) OR
        (ds."slackEnabled" = true AND ds."slackWellnessReminders" = true)
      )
    ) THEN true
    ELSE false
  END,
  "notificationPreset" = 'custom'
FROM "delivery_settings" ds
WHERE ds."userId" = up."userId";

-- Set defaults for users without DeliverySettings
UPDATE "user_preferences"
SET 
  "notificationPrimaryChannel" = 'push',
  "notificationsMeetingMoments" = true,
  "notificationsDailyRhythm" = true,
  "notificationsWellness" = true,
  "notificationPreset" = 'balanced'
WHERE "notificationPrimaryChannel" IS NULL;

