-- Card System Migration
-- Adds Card, CardAward, WeeklyRecap, UserMetrics, ClaimSimilarity, and UserGrowthSnapshot models
-- Also extends Claim and Concept models with embedding and clustering fields

-- ============================================
-- Extend existing models
-- ============================================

-- Add embedding and versioning fields to claims
ALTER TABLE "claims" ADD COLUMN "embeddingJson" JSONB;
ALTER TABLE "claims" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "claims" ADD COLUMN "previousId" TEXT;
ALTER TABLE "claims" ADD COLUMN "changeType" TEXT;
ALTER TABLE "claims" ADD COLUMN "clusterId" TEXT;

-- Add self-reference for claim history
ALTER TABLE "claims" ADD CONSTRAINT "claims_previousId_fkey" FOREIGN KEY ("previousId") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index on clusterId for claims
CREATE INDEX "claims_clusterId_idx" ON "claims"("clusterId");

-- Add clustering fields to concepts
ALTER TABLE "concepts" ADD COLUMN "clusterId" TEXT;
ALTER TABLE "concepts" ADD COLUMN "clusterDepth" INTEGER NOT NULL DEFAULT 0;

-- Add index on clusterId for concepts
CREATE INDEX "concepts_clusterId_idx" ON "concepts"("clusterId");

-- ============================================
-- Card System Tables
-- ============================================

-- Cards catalog
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hint" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "category" TEXT,
    "iconUrl" TEXT,
    "detectionRule" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- Unique index on slug
CREATE UNIQUE INDEX "cards_slug_key" ON "cards"("slug");

-- Card awards (user earned cards)
CREATE TABLE "card_awards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "recapId" TEXT,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_awards_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one award per card per user
CREATE UNIQUE INDEX "card_awards_userId_cardId_key" ON "card_awards"("userId", "cardId");
CREATE INDEX "card_awards_userId_awardedAt_idx" ON "card_awards"("userId", "awardedAt");
CREATE INDEX "card_awards_recapId_idx" ON "card_awards"("recapId");

-- Foreign keys for card_awards
ALTER TABLE "card_awards" ADD CONSTRAINT "card_awards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "card_awards" ADD CONSTRAINT "card_awards_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Weekly recaps
CREATE TABLE "weekly_recaps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "stats" JSONB NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_recaps_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one recap per week per user
CREATE UNIQUE INDEX "weekly_recaps_userId_weekStart_key" ON "weekly_recaps"("userId", "weekStart");
CREATE INDEX "weekly_recaps_userId_weekStart_idx" ON "weekly_recaps"("userId", "weekStart");

-- Foreign key for weekly_recaps
ALTER TABLE "weekly_recaps" ADD CONSTRAINT "weekly_recaps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key from card_awards to weekly_recaps
ALTER TABLE "card_awards" ADD CONSTRAINT "card_awards_recapId_fkey" FOREIGN KEY ("recapId") REFERENCES "weekly_recaps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- User Metrics (Rolling Window Aggregates)
-- ============================================

CREATE TABLE "user_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "disputeRate90d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revisionRate90d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualifiedReactionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "synthesisRate90d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalClaims" INTEGER NOT NULL DEFAULT 0,
    "totalPositions" INTEGER NOT NULL DEFAULT 0,
    "clusterCount" INTEGER NOT NULL DEFAULT 0,
    "maxClusterDepth" INTEGER NOT NULL DEFAULT 0,
    "inboundLinkCount" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_metrics_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one metrics row per user
CREATE UNIQUE INDEX "user_metrics_userId_key" ON "user_metrics"("userId");

-- Foreign key for user_metrics
ALTER TABLE "user_metrics" ADD CONSTRAINT "user_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Cross-User Similarity
-- ============================================

CREATE TABLE "claim_similarities" (
    "id" TEXT NOT NULL,
    "claimAId" TEXT NOT NULL,
    "claimBId" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_similarities_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one similarity record per claim pair
CREATE UNIQUE INDEX "claim_similarities_claimAId_claimBId_key" ON "claim_similarities"("claimAId", "claimBId");
CREATE INDEX "claim_similarities_claimAId_idx" ON "claim_similarities"("claimAId");
CREATE INDEX "claim_similarities_claimBId_idx" ON "claim_similarities"("claimBId");

-- Foreign keys for claim_similarities
ALTER TABLE "claim_similarities" ADD CONSTRAINT "claim_similarities_claimAId_fkey" FOREIGN KEY ("claimAId") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "claim_similarities" ADD CONSTRAINT "claim_similarities_claimBId_fkey" FOREIGN KEY ("claimBId") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- User Growth Snapshots (Early Reader detection)
-- ============================================

CREATE TABLE "user_growth_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriberCount" INTEGER NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_growth_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_growth_snapshots_userId_snapshotAt_idx" ON "user_growth_snapshots"("userId", "snapshotAt");
