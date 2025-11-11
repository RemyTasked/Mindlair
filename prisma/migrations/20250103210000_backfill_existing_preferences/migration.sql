-- Backfill existing user_preferences records with new fields
-- This ensures old accounts work with the new schema
-- This migration is idempotent and safe for empty databases

-- Add default values for any NULL fields in existing records
-- Only update if there are records to update (safe for empty databases)
DO $$
BEGIN
  -- Only run if there are any user_preferences records
  IF EXISTS (SELECT 1 FROM "user_preferences" LIMIT 1) THEN
    UPDATE "user_preferences" 
    SET 
      "enableVoiceNarration" = COALESCE("enableVoiceNarration", true),
      "morningFlowTime" = COALESCE("morningFlowTime", '06:00'),
      "eveningFlowTime" = COALESCE("eveningFlowTime", '18:00'),
      "enableMorningFlow" = COALESCE("enableMorningFlow", true),
      "enableEveningFlow" = COALESCE("enableEveningFlow", true),
      "enableWellnessReminders" = COALESCE("enableWellnessReminders", true),
      "wellnessReminderFrequency" = COALESCE("wellnessReminderFrequency", 3),
      "enableFocusSound" = COALESCE("enableFocusSound", true),
      "focusSoundType" = COALESCE("focusSoundType", 'calm-ocean')
    WHERE "enableVoiceNarration" IS NULL 
       OR "morningFlowTime" IS NULL 
       OR "eveningFlowTime" IS NULL 
       OR "enableMorningFlow" IS NULL 
       OR "enableEveningFlow" IS NULL;
  END IF;
END $$;

