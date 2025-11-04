-- Emergency fix: Manually drop old columns from production database
-- Run this directly on Railway's PostgreSQL database

BEGIN;

-- Drop old columns if they exist
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "enablePresleyFlow";
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "presleyFlowTime";
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "enableMorningRecap";

-- Verify they're gone
DO $$
DECLARE
    old_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_count
    FROM information_schema.columns 
    WHERE table_name = 'user_preferences' 
    AND column_name IN ('enablePresleyFlow', 'presleyFlowTime', 'enableMorningRecap');
    
    IF old_count > 0 THEN
        RAISE EXCEPTION 'Old columns still exist!';
    ELSE
        RAISE NOTICE '✅ All old columns removed';
    END IF;
END $$;

COMMIT;

