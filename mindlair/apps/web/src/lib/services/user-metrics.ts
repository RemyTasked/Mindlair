import db from '@/lib/db';
import { getClusterStats } from './clustering';

export interface UserMetricsData {
  userId: string;
  disputeRate90d: number;
  revisionRate90d: number;
  qualifiedReactionRate: number;
  synthesisRate90d: number;
  totalClaims: number;
  totalPositions: number;
  clusterCount: number;
  maxClusterDepth: number;
  inboundLinkCount: number;
  currentStreak: number;
  longestStreak: number;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export async function computeUserMetrics(userId: string): Promise<UserMetricsData> {
  const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS);

  // Get all positions for the user
  const allPositions = await db.position.findMany({
    where: { userId },
    select: {
      id: true,
      stance: true,
      createdAt: true,
      claimId: true,
      supersedesId: true,
    },
  });

  // Get positions in the last 90 days
  const recentPositions = allPositions.filter(
    (p) => p.createdAt >= ninetyDaysAgo
  );

  // Calculate dispute rate (disagree positions / total positions)
  const disagreeCount = recentPositions.filter(
    (p) => p.stance === 'disagree'
  ).length;
  const disputeRate90d = recentPositions.length > 0
    ? disagreeCount / recentPositions.length
    : 0;

  // Calculate qualified reaction rate (complicated / total)
  const complicatedCount = recentPositions.filter(
    (p) => p.stance === 'complicated'
  ).length;
  const qualifiedReactionRate = recentPositions.length > 0
    ? complicatedCount / recentPositions.length
    : 0;

  // Calculate revision rate (positions that supersede others / total distinct claims)
  const distinctClaimIds = new Set(allPositions.map((p) => p.claimId));
  const revisionCount = allPositions.filter((p) => p.supersedesId !== null).length;
  const revisionRate90d = distinctClaimIds.size > 0
    ? revisionCount / distinctClaimIds.size
    : 0;

  // Get cluster stats
  const clusterStats = await getClusterStats(userId);

  // Calculate synthesis rate (cross-cluster connections)
  // This is a simplified version - in production you'd track new cross-cluster edges
  const synthesisRate90d = 0; // TODO: Track cross-cluster edge creation over time

  // Get total claims the user has positions on
  const totalClaims = distinctClaimIds.size;
  const totalPositions = allPositions.length;

  // Get user metrics for streak info (or create if doesn't exist)
  let existingMetrics = await db.userMetrics.findUnique({
    where: { userId },
  });

  const currentStreak = existingMetrics?.currentStreak || 0;
  const longestStreak = existingMetrics?.longestStreak || 0;

  // Inbound link count (other users' claims similar to this user's - computed elsewhere)
  const inboundLinkCount = existingMetrics?.inboundLinkCount || 0;

  return {
    userId,
    disputeRate90d,
    revisionRate90d,
    qualifiedReactionRate,
    synthesisRate90d,
    totalClaims,
    totalPositions,
    clusterCount: clusterStats.clusterCount,
    maxClusterDepth: clusterStats.maxClusterDepth,
    inboundLinkCount,
    currentStreak,
    longestStreak,
  };
}

export async function updateUserMetrics(userId: string): Promise<UserMetricsData> {
  const metrics = await computeUserMetrics(userId);

  await db.userMetrics.upsert({
    where: { userId },
    update: {
      disputeRate90d: metrics.disputeRate90d,
      revisionRate90d: metrics.revisionRate90d,
      qualifiedReactionRate: metrics.qualifiedReactionRate,
      synthesisRate90d: metrics.synthesisRate90d,
      totalClaims: metrics.totalClaims,
      totalPositions: metrics.totalPositions,
      clusterCount: metrics.clusterCount,
      maxClusterDepth: metrics.maxClusterDepth,
      lastComputedAt: new Date(),
    },
    create: {
      userId,
      disputeRate90d: metrics.disputeRate90d,
      revisionRate90d: metrics.revisionRate90d,
      qualifiedReactionRate: metrics.qualifiedReactionRate,
      synthesisRate90d: metrics.synthesisRate90d,
      totalClaims: metrics.totalClaims,
      totalPositions: metrics.totalPositions,
      clusterCount: metrics.clusterCount,
      maxClusterDepth: metrics.maxClusterDepth,
    },
  });

  return metrics;
}

export async function getPlatformAverageMetrics(): Promise<{
  avgDisputeRate: number;
  avgRevisionRate: number;
  avgQualifiedReactionRate: number;
}> {
  const allMetrics = await db.userMetrics.findMany({
    where: {
      totalPositions: { gte: 10 }, // Only include users with meaningful activity
    },
    select: {
      disputeRate90d: true,
      revisionRate90d: true,
      qualifiedReactionRate: true,
    },
  });

  if (allMetrics.length === 0) {
    return {
      avgDisputeRate: 0.15, // Default platform average
      avgRevisionRate: 0.05,
      avgQualifiedReactionRate: 0.20,
    };
  }

  const avgDisputeRate =
    allMetrics.reduce((sum, m) => sum + m.disputeRate90d, 0) / allMetrics.length;
  const avgRevisionRate =
    allMetrics.reduce((sum, m) => sum + m.revisionRate90d, 0) / allMetrics.length;
  const avgQualifiedReactionRate =
    allMetrics.reduce((sum, m) => sum + m.qualifiedReactionRate, 0) / allMetrics.length;

  return {
    avgDisputeRate,
    avgRevisionRate,
    avgQualifiedReactionRate,
  };
}

export async function getUserMetrics(userId: string): Promise<UserMetricsData | null> {
  const metrics = await db.userMetrics.findUnique({
    where: { userId },
  });

  if (!metrics) return null;

  return {
    userId: metrics.userId,
    disputeRate90d: metrics.disputeRate90d,
    revisionRate90d: metrics.revisionRate90d,
    qualifiedReactionRate: metrics.qualifiedReactionRate,
    synthesisRate90d: metrics.synthesisRate90d,
    totalClaims: metrics.totalClaims,
    totalPositions: metrics.totalPositions,
    clusterCount: metrics.clusterCount,
    maxClusterDepth: metrics.maxClusterDepth,
    inboundLinkCount: metrics.inboundLinkCount,
    currentStreak: metrics.currentStreak,
    longestStreak: metrics.longestStreak,
  };
}

export async function checkSteelMannerPattern(userId: string): Promise<{
  hasPattern: boolean;
  instances: number;
  evidence: Array<{
    disputedClaimId: string;
    articulatingPostId: string;
    timeBetween: number;
  }>;
}> {
  const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS);

  // Find disputes in the last 90 days
  const disputes = await db.position.findMany({
    where: {
      userId,
      stance: 'disagree',
      createdAt: { gte: ninetyDaysAgo },
    },
    include: {
      claim: {
        include: {
          claimConcepts: {
            include: { concept: true },
          },
        },
      },
    },
  });

  // Find published posts in the last 90 days
  const posts = await db.post.findMany({
    where: {
      authorId: userId,
      status: 'published',
      publishedAt: { gte: ninetyDaysAgo },
    },
    include: {
      source: {
        include: {
          claims: {
            include: {
              claimConcepts: {
                include: { concept: true },
              },
            },
          },
        },
      },
    },
  });

  // Check for steel-manning pattern:
  // User disputed a claim, then later published a post with similar concepts
  // where they're "steelmanning" (articulating the opposing view fairly)
  const evidence: Array<{
    disputedClaimId: string;
    articulatingPostId: string;
    timeBetween: number;
  }> = [];

  for (const dispute of disputes) {
    const disputedConcepts = dispute.claim.claimConcepts.map(
      (cc) => cc.concept.label.toLowerCase()
    );

    for (const post of posts) {
      // Post must be after the dispute
      if (!post.publishedAt || post.publishedAt <= dispute.createdAt) continue;

      // Check if post is steelmanning stance
      if (post.authorStance !== 'steelmanning') continue;

      // Check for concept overlap
      const postConcepts = post.source?.claims.flatMap((c) =>
        c.claimConcepts.map((cc) => cc.concept.label.toLowerCase())
      ) || [];

      const overlap = disputedConcepts.some((dc) =>
        postConcepts.some((pc) => 
          pc.includes(dc) || dc.includes(pc)
        )
      );

      if (overlap) {
        const timeBetween = post.publishedAt.getTime() - dispute.createdAt.getTime();
        evidence.push({
          disputedClaimId: dispute.claimId,
          articulatingPostId: post.id,
          timeBetween,
        });
      }
    }
  }

  return {
    hasPattern: evidence.length >= 3,
    instances: evidence.length,
    evidence: evidence.slice(0, 5), // Limit evidence to 5 examples
  };
}

export async function updateAllUserMetrics(): Promise<number> {
  // Get all users with at least some activity
  const activeUsers = await db.user.findMany({
    where: {
      positions: {
        some: {},
      },
    },
    select: { id: true },
  });

  let updated = 0;
  for (const user of activeUsers) {
    try {
      await updateUserMetrics(user.id);
      updated++;
    } catch (error) {
      console.error(`Failed to update metrics for user ${user.id}:`, error);
    }
  }

  return updated;
}
