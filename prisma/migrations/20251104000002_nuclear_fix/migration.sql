-- NUCLEAR FIX: Force drop old columns and ensure new schema
-- This migration is safe to run multiple times

-- First, drop the old columns if they exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' AND column_name = 'enablePresleyFlow'
    ) THEN
        ALTER TABLE "user_preferences" DROP COLUMN "enablePresleyFlow";
        RAISE NOTICE 'Dropped enablePresleyFlow column';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' AND column_name = 'presleyFlowTime'
    ) THEN
        ALTER TABLE "user_preferences" DROP COLUMN "presleyFlowTime";
        RAISE NOTICE 'Dropped presleyFlowTime column';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' AND column_name = 'enableMorningRecap'
    ) THEN
        ALTER TABLE "user_preferences" DROP COLUMN "enableMorningRecap";
        RAISE NOTICE 'Dropped enableMorningRecap column';
    END IF;
END $$;

-- Now ensure all new columns exist with correct defaults
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "morningFlowTime" TEXT NOT NULL DEFAULT '06:00';
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "eveningFlowTime" TEXT NOT NULL DEFAULT '18:00';
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "enableMorningFlow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "enableEveningFlow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "enableWellnessReminders" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "wellnessReminderFrequency" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "enableVoiceNarration" BOOLEAN NOT NULL DEFAULT true;

-- Ensure delivery_settings has pushEnabled
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "pushEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Ensure meetings has isOrganizer
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "isOrganizer" BOOLEAN NOT NULL DEFAULT false;

-- Verify the changes
DO $$
DECLARE
    old_cols INTEGER;
    new_cols INTEGER;
BEGIN
    -- Check for old columns
    SELECT COUNT(*) INTO old_cols
    FROM information_schema.columns 
    WHERE table_name = 'user_preferences' 
    AND column_name IN ('enablePresleyFlow', 'presleyFlowTime', 'enableMorningRecap');
    
    -- Check for new columns
    SELECT COUNT(*) INTO new_cols
    FROM information_schema.columns 
    WHERE table_name = 'user_preferences' 
    AND column_name IN ('enableMorningFlow', 'enableEveningFlow', 'morningFlowTime', 'eveningFlowTime');
    
    RAISE NOTICE 'Old columns remaining: %', old_cols;
    RAISE NOTICE 'New columns present: %', new_cols;
    
    IF old_cols > 0 THEN
        RAISE EXCEPTION 'Old columns still exist! Migration failed.';
    END IF;
    
    IF new_cols < 4 THEN
        RAISE EXCEPTION 'New columns missing! Expected 4, found %', new_cols;
    END IF;
    
    RAISE NOTICE '✅ Migration successful - schema is correct';
END $$;

