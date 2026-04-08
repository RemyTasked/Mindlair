-- Add comment digest preferences to user_settings
ALTER TABLE "user_settings" ADD COLUMN "commentDigestInterval" INTEGER NOT NULL DEFAULT 240;
ALTER TABLE "user_settings" ADD COLUMN "lastCommentDigestAt" TIMESTAMP(3);

-- Add commentsEnabled to posts
ALTER TABLE "posts" ADD COLUMN "commentsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Create comments table
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "stance" TEXT NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "aiScreeningPassed" BOOLEAN NOT NULL DEFAULT false,
    "isHiddenByAuthor" BOOLEAN NOT NULL DEFAULT false,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- Create comment_reactions table
CREATE TABLE "comment_reactions" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stance" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_reactions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for comments
CREATE INDEX "comments_postId_createdAt_idx" ON "comments"("postId", "createdAt");
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");

-- Create indexes for comment_reactions
CREATE INDEX "comment_reactions_commentId_idx" ON "comment_reactions"("commentId");
CREATE UNIQUE INDEX "comment_reactions_commentId_userId_key" ON "comment_reactions"("commentId", "userId");

-- Add foreign keys for comments
ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys for comment_reactions
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
