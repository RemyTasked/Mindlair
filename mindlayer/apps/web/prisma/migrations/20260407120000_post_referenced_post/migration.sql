-- AlterTable
ALTER TABLE "posts" ADD COLUMN "referencedPostId" TEXT;

-- CreateIndex
CREATE INDEX "posts_referencedPostId_idx" ON "posts"("referencedPostId");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_referencedPostId_fkey" FOREIGN KEY ("referencedPostId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
