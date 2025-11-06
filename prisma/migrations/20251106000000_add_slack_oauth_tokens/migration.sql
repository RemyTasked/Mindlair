-- AlterTable
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "slackAccessToken" TEXT,
ADD COLUMN IF NOT EXISTS "slackTeamId" TEXT,
ADD COLUMN IF NOT EXISTS "slackTeamName" TEXT,
ADD COLUMN IF NOT EXISTS "slackChannelId" TEXT,
ADD COLUMN IF NOT EXISTS "slackChannelName" TEXT;

-- Update slackUserId column (rename if exists from old schema)
DO $$ 
BEGIN
  -- Add slackUserId if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_settings' 
    AND column_name = 'slackUserId'
  ) THEN
    ALTER TABLE "delivery_settings" ADD COLUMN "slackUserId" TEXT;
  END IF;
END $$;

