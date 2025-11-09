-- Fix lowEnergyStart and lowEnergyEnd columns to be TEXT instead of TIME
ALTER TABLE "cue_settings" 
  ALTER COLUMN "lowEnergyStart" TYPE TEXT USING "lowEnergyStart"::TEXT,
  ALTER COLUMN "lowEnergyEnd" TYPE TEXT USING "lowEnergyEnd"::TEXT;

