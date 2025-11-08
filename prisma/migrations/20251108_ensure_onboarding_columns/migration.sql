-- Ensure onboarding columns exist (idempotent)
-- This migration is safe to run multiple times

DO $$ 
BEGIN
  -- Add onboardingCompleted column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'onboardingCompleted'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add onboardingData column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'onboardingData'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "onboardingData" JSONB;
  END IF;
END $$;

