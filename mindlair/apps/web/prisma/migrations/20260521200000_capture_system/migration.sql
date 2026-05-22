-- Capture System Migration
-- Idempotent: uses IF NOT EXISTS and DO $$ blocks for safe re-runs

-- ============================================
-- New: captures table
-- ============================================
CREATE TABLE IF NOT EXISTS "captures" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rawText" TEXT,
    "rawAudioUrl" TEXT,
    "rawAudioMs" INTEGER,
    "sourceId" TEXT,
    "candidateClaims" JSONB,
    "errorReason" TEXT,
    "parentCaptureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "captures_pkey" PRIMARY KEY ("id")
);

-- Indexes for captures
CREATE INDEX IF NOT EXISTS "captures_userId_status_idx" ON "captures"("userId", "status");
CREATE INDEX IF NOT EXISTS "captures_userId_createdAt_idx" ON "captures"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "captures_parentCaptureId_idx" ON "captures"("parentCaptureId");

-- Foreign keys for captures (idempotent)
DO $$ BEGIN
    ALTER TABLE "captures" ADD CONSTRAINT "captures_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "captures" ADD CONSTRAINT "captures_sourceId_fkey" 
        FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "captures" ADD CONSTRAINT "captures_parentCaptureId_fkey" 
        FOREIGN KEY ("parentCaptureId") REFERENCES "captures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- New: extraction_feedback table
-- ============================================
CREATE TABLE IF NOT EXISTS "extraction_feedback" (
    "id" TEXT NOT NULL,
    "captureId" TEXT NOT NULL,
    "claimText" TEXT NOT NULL,
    "finalText" TEXT,
    "action" TEXT NOT NULL,
    "stanceBefore" TEXT,
    "stanceAfter" TEXT,
    "modelVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extraction_feedback_pkey" PRIMARY KEY ("id")
);

-- Indexes for extraction_feedback
CREATE INDEX IF NOT EXISTS "extraction_feedback_captureId_idx" ON "extraction_feedback"("captureId");
CREATE INDEX IF NOT EXISTS "extraction_feedback_action_createdAt_idx" ON "extraction_feedback"("action", "createdAt");

-- Foreign key for extraction_feedback (idempotent)
DO $$ BEGIN
    ALTER TABLE "extraction_feedback" ADD CONSTRAINT "extraction_feedback_captureId_fkey" 
        FOREIGN KEY ("captureId") REFERENCES "captures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- Modify: sources table - add transcriptText
-- ============================================
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "transcriptText" TEXT;

-- ============================================
-- Modify: claims table - add capture system fields
-- ============================================
ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "captureId" TEXT;
ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "extractedFrom" TEXT;
ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "aiStance" TEXT;

-- Index for claims.captureId
CREATE INDEX IF NOT EXISTS "claims_captureId_idx" ON "claims"("captureId");

-- Foreign key for claims.captureId (idempotent)
DO $$ BEGIN
    ALTER TABLE "claims" ADD CONSTRAINT "claims_captureId_fkey" 
        FOREIGN KEY ("captureId") REFERENCES "captures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- Modify: positions table - add confidence
-- ============================================
ALTER TABLE "positions" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
