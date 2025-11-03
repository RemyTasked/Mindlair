-- Backfill existing user_preferences records with new fields
-- This ensures old accounts work with the new schema

-- Add default values for any NULL fields in existing records
UPDATE user_preferences 
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

