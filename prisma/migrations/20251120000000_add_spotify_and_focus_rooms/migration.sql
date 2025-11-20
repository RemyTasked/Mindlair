-- CreateTable
CREATE TABLE IF NOT EXISTS "spotify_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "displayName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spotify_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "focus_room_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "timerOption" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "creditsEarned" INTEGER NOT NULL DEFAULT 0,
    "audioSource" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "focus_room_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "spotify_accounts_userId_key" ON "spotify_accounts"("userId");

-- AddForeignKey
ALTER TABLE "spotify_accounts" ADD CONSTRAINT "spotify_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_room_sessions" ADD CONSTRAINT "focus_room_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

