-- CreateTable
CREATE TABLE "winding_down_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "winding_down_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "winding_down_sessions_userId_date_idx" ON "winding_down_sessions"("userId", "date");

-- AddForeignKey
ALTER TABLE "winding_down_sessions" ADD CONSTRAINT "winding_down_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

