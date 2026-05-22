-- Post Citations Migration
-- Idempotent: uses IF NOT EXISTS and DO $$ blocks for safe re-runs

-- ============================================
-- New: post_citations table
-- ============================================
CREATE TABLE IF NOT EXISTS "post_citations" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "author" TEXT,
    "outlet" TEXT,
    "excerpt" TEXT,
    "contentType" TEXT NOT NULL DEFAULT 'article',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_citations_pkey" PRIMARY KEY ("id")
);

-- Index for citations
CREATE INDEX IF NOT EXISTS "post_citations_postId_idx" ON "post_citations"("postId");

-- Foreign key for citations (idempotent)
DO $$ BEGIN
    ALTER TABLE "post_citations" ADD CONSTRAINT "post_citations_postId_fkey"
        FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
