-- AlterTable
ALTER TABLE "focus_sessions" ADD COLUMN "mindState" TEXT;
ALTER TABLE "focus_sessions" ADD COLUMN "breathingFlowType" TEXT;

-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN "enableWellnessReminders" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN "wellnessReminderFrequency" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "wellness_checkins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "mindState" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wellness_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wellness_checkins_userId_createdAt_idx" ON "wellness_checkins"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "wellness_checkins" ADD CONSTRAINT "wellness_checkins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

