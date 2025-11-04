-- Force update schema to match current Prisma schema
-- This migration is idempotent and safe to run multiple times

-- Drop old columns if they exist
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "presleyFlowTime";
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "enableMorningRecap";
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "enablePresleyFlow";

-- Add new columns if they don't exist
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "morningFlowTime" TEXT NOT NULL DEFAULT '06:00';
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "eveningFlowTime" TEXT NOT NULL DEFAULT '18:00';
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "enableMorningFlow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "enableEveningFlow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "enableWellnessReminders" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "wellnessReminderFrequency" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "enableVoiceNarration" BOOLEAN NOT NULL DEFAULT true;

-- Add push notification column to delivery settings
ALTER TABLE "delivery_settings" ADD COLUMN IF NOT EXISTS "pushEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Create push_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- Create indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'push_subscriptions_endpoint_key') THEN
        CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'push_subscriptions_userId_idx') THEN
        CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");
    END IF;
END $$;

-- Add foreign key if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_userId_fkey'
    ) THEN
        ALTER TABLE "push_subscriptions" 
        ADD CONSTRAINT "push_subscriptions_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create presley_flow_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS "presley_flow_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "flowType" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "journalNote" TEXT,
    "dailyOutcomes" TEXT,
    "reflectionText" TEXT,
    "performanceRating" INTEGER,
    "improvementNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "presley_flow_sessions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for presley_flow_sessions if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'presley_flow_sessions_userId_date_flowType_key') THEN
        CREATE UNIQUE INDEX "presley_flow_sessions_userId_date_flowType_key" ON "presley_flow_sessions"("userId", "date", "flowType");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'presley_flow_sessions_userId_date_idx') THEN
        CREATE INDEX "presley_flow_sessions_userId_date_idx" ON "presley_flow_sessions"("userId", "date");
    END IF;
END $$;

-- Add foreign key for presley_flow_sessions if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'presley_flow_sessions_userId_fkey'
    ) THEN
        ALTER TABLE "presley_flow_sessions" 
        ADD CONSTRAINT "presley_flow_sessions_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add isOrganizer column to meetings if it doesn't exist
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "isOrganizer" BOOLEAN NOT NULL DEFAULT false;

