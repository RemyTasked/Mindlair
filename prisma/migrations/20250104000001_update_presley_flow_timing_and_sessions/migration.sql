-- AlterTable: Update Presley Flow preferences
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "presleyFlowTime";
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "enableMorningRecap";
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "enablePresleyFlow";

ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "morningFlowTime" TEXT NOT NULL DEFAULT '06:00';
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "eveningFlowTime" TEXT NOT NULL DEFAULT '18:00';
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "enableMorningFlow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "enableEveningFlow" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: Presley Flow Sessions
CREATE TABLE IF NOT EXISTS "presley_flow_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "flowType" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "journalNote" TEXT,
    "dailyOutcomes" TEXT,
    "reflectionText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presley_flow_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "presley_flow_sessions_userId_date_flowType_key" ON "presley_flow_sessions"("userId", "date", "flowType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "presley_flow_sessions_userId_date_idx" ON "presley_flow_sessions"("userId", "date");

-- AddForeignKey
ALTER TABLE "presley_flow_sessions" ADD CONSTRAINT "presley_flow_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

