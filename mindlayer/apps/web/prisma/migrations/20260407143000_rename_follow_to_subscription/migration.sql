-- Rename table follows to subscriptions
ALTER TABLE "follows" RENAME TO "subscriptions";

-- Rename columns
ALTER TABLE "subscriptions" RENAME COLUMN "followerId" TO "subscriberId";
ALTER TABLE "subscriptions" RENAME COLUMN "followingId" TO "subscribedToId";

-- Rename indexes (drop old, create new with correct names)
DROP INDEX IF EXISTS "follows_followerId_idx";
DROP INDEX IF EXISTS "follows_followingId_idx";
DROP INDEX IF EXISTS "follows_followerId_followingId_key";

CREATE INDEX "subscriptions_subscriberId_idx" ON "subscriptions"("subscriberId");
CREATE INDEX "subscriptions_subscribedToId_idx" ON "subscriptions"("subscribedToId");
CREATE UNIQUE INDEX "subscriptions_subscriberId_subscribedToId_key" ON "subscriptions"("subscriberId", "subscribedToId");
