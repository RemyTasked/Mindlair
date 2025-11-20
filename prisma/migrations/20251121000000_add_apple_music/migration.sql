-- CreateTable
CREATE TABLE IF NOT EXISTS "apple_music_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appleMusicId" TEXT NOT NULL,
    "displayName" TEXT,
    "userToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apple_music_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "apple_music_accounts_userId_key" ON "apple_music_accounts"("userId");

-- AddForeignKey
ALTER TABLE "apple_music_accounts" ADD CONSTRAINT "apple_music_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

