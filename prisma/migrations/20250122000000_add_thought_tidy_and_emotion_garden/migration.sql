-- CreateTable
CREATE TABLE IF NOT EXISTS "thought_tidy_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "completedAt" TIMESTAMP(3),
    "creditsEarned" INTEGER NOT NULL DEFAULT 0,
    "thoughts" JSONB NOT NULL,
    "keptCount" INTEGER NOT NULL DEFAULT 0,
    "parkedCount" INTEGER NOT NULL DEFAULT 0,
    "releasedCount" INTEGER NOT NULL DEFAULT 0,
    "actionItems" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thought_tidy_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "emotion_checkins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "emotion" TEXT NOT NULL,
    "intensity" INTEGER NOT NULL DEFAULT 5,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emotion_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "emotion_garden_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gardenData" JSONB NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emotion_garden_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "thought_tidy_sessions_userId_date_idx" ON "thought_tidy_sessions"("userId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "emotion_checkins_userId_date_idx" ON "emotion_checkins"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "thought_tidy_sessions_userId_date_key" ON "thought_tidy_sessions"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "emotion_garden_states_userId_key" ON "emotion_garden_states"("userId");

-- AddForeignKey
ALTER TABLE "thought_tidy_sessions" ADD CONSTRAINT "thought_tidy_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emotion_checkins" ADD CONSTRAINT "emotion_checkins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emotion_garden_states" ADD CONSTRAINT "emotion_garden_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

