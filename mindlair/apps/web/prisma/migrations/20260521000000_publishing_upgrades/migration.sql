-- Publishing Upgrades Migration
-- Adds title-first composer support, revision history, visibility controls, and notification preferences

-- Add title column to posts (initially nullable for migration, then backfill and make required)
ALTER TABLE "posts" ADD COLUMN "title" TEXT;

-- Backfill title from first 80 chars of headlineClaim for existing posts
UPDATE "posts" SET "title" = LEFT("headlineClaim", 80) WHERE "title" IS NULL;

-- Make title required
ALTER TABLE "posts" ALTER COLUMN "title" SET NOT NULL;

-- Add visibility column (public or unlisted)
ALTER TABLE "posts" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'public';

-- Add currentVersion for revision tracking
ALTER TABLE "posts" ADD COLUMN "currentVersion" INTEGER NOT NULL DEFAULT 1;

-- Add index on visibility for feed filtering
CREATE INDEX "posts_visibility_idx" ON "posts"("visibility");

-- Add notifyOnNewPost preference to user_settings
ALTER TABLE "user_settings" ADD COLUMN "notifyOnNewPost" BOOLEAN NOT NULL DEFAULT true;

-- Create PostRevision table for tracking post edit history
CREATE TABLE "post_revisions" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "headlineClaim" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorStance" "AuthorStance" NOT NULL,
    "topicTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "changeType" TEXT NOT NULL,
    "changeNote" VARCHAR(500),
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_revisions_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on postId + version
CREATE UNIQUE INDEX "post_revisions_postId_version_key" ON "post_revisions"("postId", "version");

-- Add index for querying revisions by post
CREATE INDEX "post_revisions_postId_idx" ON "post_revisions"("postId");

-- Add foreign key constraint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
