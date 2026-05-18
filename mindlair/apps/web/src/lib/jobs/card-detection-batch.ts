import db from '@/lib/db';
import { updateUserClusters, getClusterStats, calculateGiniCoefficient } from '@/lib/services/clustering';
import { 
  updateUserMetrics, 
  getPlatformAverageMetrics,
  checkSteelMannerPattern,
  type UserMetricsData 
} from '@/lib/services/user-metrics';
import {
  getInboundLinkCount,
  getEarlySubscriptions,
  checkInheritancePattern,
  getClaimSpreadCount,
} from '@/lib/services/cross-user-signals';

const MIN_MAP_SIZE = 50; // Minimum claims for rare card eligibility
const MIN_MAP_SIZE_SIMPLE = 30; // Lower threshold for simpler patterns

interface RareCardCheck {
  slug: string;
  check: (userId: string, metrics: UserMetricsData, platformAvg: Awaited<ReturnType<typeof getPlatformAverageMetrics>>) => Promise<{
    earned: boolean;
    evidence: Record<string, unknown>;
  }>;
}

async function awardRareCard(
  userId: string,
  slug: string,
  evidence: Record<string, unknown>
): Promise<boolean> {
  const card = await db.card.findUnique({
    where: { slug },
  });

  if (!card) {
    console.warn(`Rare card not found: ${slug}`);
    return false;
  }

  const existing = await db.cardAward.findUnique({
    where: {
      userId_cardId: {
        userId,
        cardId: card.id,
      },
    },
  });

  if (existing) {
    // Update isActive status if pattern is still active
    await db.cardAward.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
    return false;
  }

  await db.cardAward.create({
    data: {
      userId,
      cardId: card.id,
      evidence,
      isActive: true,
    },
  });

  console.log(`Awarded rare card ${slug} to user ${userId}`);
  return true;
}

const RARE_CARD_CHECKS: RareCardCheck[] = [
  {
    slug: 'the_synthesizer',
    check: async (userId, metrics) => {
      // High rate of cross-cluster connections
      if (metrics.totalClaims < MIN_MAP_SIZE) {
        return { earned: false, evidence: {} };
      }

      // Get cluster stats
      const clusterStats = await getClusterStats(userId);
      
      // Need multiple clusters and good connectivity
      if (clusterStats.clusterCount < 3) {
        return { earned: false, evidence: {} };
      }

      // Check synthesis rate (simplified: even distribution suggests synthesis)
      const gini = clusterStats.giniCoefficient;
      const isSynthesizer = gini < 0.4 && clusterStats.clusterCount >= 4;

      return {
        earned: isSynthesizer,
        evidence: {
          clusterCount: clusterStats.clusterCount,
          giniCoefficient: gini,
          pattern: 'Cross-cluster synthesis detected',
          timestamp: new Date().toISOString(),
        },
      };
    },
  },
  {
    slug: 'the_specialist',
    check: async (userId, metrics) => {
      if (metrics.totalClaims < MIN_MAP_SIZE) {
        return { earned: false, evidence: {} };
      }

      const clusterStats = await getClusterStats(userId);
      const sizes = clusterStats.clusterSizes;
      
      if (sizes.length === 0) {
        return { earned: false, evidence: {} };
      }

      const maxSize = Math.max(...sizes);
      const secondMax = sizes.length > 1 
        ? Math.max(...sizes.filter(s => s !== maxSize))
        : 0;

      // Dominant cluster with 30+ claims, no other cluster > 10
      const isSpecialist = maxSize >= 30 && secondMax <= 10;

      return {
        earned: isSpecialist,
        evidence: {
          dominantClusterSize: maxSize,
          secondLargestCluster: secondMax,
          pattern: 'Deep specialization in single domain',
          timestamp: new Date().toISOString(),
        },
      };
    },
  },
  {
    slug: 'the_generalist',
    check: async (userId, metrics) => {
      if (metrics.totalClaims < MIN_MAP_SIZE) {
        return { earned: false, evidence: {} };
      }

      const clusterStats = await getClusterStats(userId);
      
      // Need at least 5 clusters with even distribution
      if (clusterStats.clusterCount < 5) {
        return { earned: false, evidence: {} };
      }

      const gini = clusterStats.giniCoefficient;
      const isGeneralist = gini < 0.3;

      return {
        earned: isGeneralist,
        evidence: {
          clusterCount: clusterStats.clusterCount,
          giniCoefficient: gini,
          pattern: 'Even distribution across many domains',
          timestamp: new Date().toISOString(),
        },
      };
    },
  },
  {
    slug: 'the_contrarian',
    check: async (userId, metrics, platformAvg) => {
      if (metrics.totalClaims < MIN_MAP_SIZE) {
        return { earned: false, evidence: {} };
      }

      // Dispute rate must be significantly higher than platform average
      const threshold = platformAvg.avgDisputeRate * 1.5;
      const isContrarian = metrics.disputeRate90d > threshold && metrics.disputeRate90d > 0.25;

      return {
        earned: isContrarian,
        evidence: {
          userDisputeRate: metrics.disputeRate90d,
          platformAverage: platformAvg.avgDisputeRate,
          threshold,
          pattern: 'Consistently contrarian positions',
          timestamp: new Date().toISOString(),
        },
      };
    },
  },
  {
    slug: 'the_steel_manner',
    check: async (userId, metrics) => {
      if (metrics.totalClaims < MIN_MAP_SIZE_SIMPLE) {
        return { earned: false, evidence: {} };
      }

      const steelManResult = await checkSteelMannerPattern(userId);

      return {
        earned: steelManResult.hasPattern,
        evidence: {
          instances: steelManResult.instances,
          examples: steelManResult.evidence,
          pattern: 'Disputes followed by fair articulation',
          timestamp: new Date().toISOString(),
        },
      };
    },
  },
  {
    slug: 'the_revisionist',
    check: async (userId, metrics) => {
      if (metrics.totalClaims < MIN_MAP_SIZE_SIMPLE) {
        return { earned: false, evidence: {} };
      }

      // Revision rate > 10%
      const isRevisionist = metrics.revisionRate90d > 0.10;

      return {
        earned: isRevisionist,
        evidence: {
          revisionRate: metrics.revisionRate90d,
          threshold: 0.10,
          pattern: 'Regular belief updates',
          timestamp: new Date().toISOString(),
        },
      };
    },
  },
  {
    slug: 'the_questioner',
    check: async (userId, metrics) => {
      if (metrics.totalClaims < MIN_MAP_SIZE_SIMPLE) {
        return { earned: false, evidence: {} };
      }

      // Qualified reaction rate > 30%
      const isQuestioner = metrics.qualifiedReactionRate > 0.30;

      return {
        earned: isQuestioner,
        evidence: {
          qualifiedReactionRate: metrics.qualifiedReactionRate,
          threshold: 0.30,
          pattern: 'High nuance in reactions',
          timestamp: new Date().toISOString(),
        },
      };
    },
  },
  // ============================================
  // Cross-User Cards
  // ============================================
  {
    slug: 'the_anchor',
    check: async (userId, metrics) => {
      if (metrics.totalClaims < MIN_MAP_SIZE_SIMPLE) {
        return { earned: false, evidence: {} };
      }

      // Get inbound link count from cross-user signals
      const inboundCount = await getInboundLinkCount(userId);

      // Need 10+ inbound links to qualify
      const isAnchor = inboundCount >= 10;

      return {
        earned: isAnchor,
        evidence: {
          inboundLinkCount: inboundCount,
          threshold: 10,
          pattern: 'Claims frequently referenced by others',
          timestamp: new Date().toISOString(),
        },
      };
    },
  },
  {
    slug: 'the_early_reader',
    check: async (userId) => {
      // Check for qualifying early subscriptions
      const earlySubscriptions = await getEarlySubscriptions(userId);

      // Need at least one qualifying subscription
      const isEarlyReader = earlySubscriptions.length > 0;

      return {
        earned: isEarlyReader,
        evidence: {
          qualifyingSubscriptions: earlySubscriptions.length,
          pattern: 'Subscribed to creators before they grew',
          timestamp: new Date().toISOString(),
        },
      };
    },
  },
  {
    slug: 'the_cartographer',
    check: async (userId, metrics) => {
      if (metrics.totalClaims < MIN_MAP_SIZE_SIMPLE) {
        return { earned: false, evidence: {} };
      }

      // Get user's claims and check for spread
      const userClaims = await db.position.findMany({
        where: { userId },
        select: { claimId: true },
        distinct: ['claimId'],
      });

      let maxSpread = 0;
      let bestClaimId = null;

      for (const { claimId } of userClaims.slice(0, 50)) { // Limit for performance
        const spreadInfo = await getClaimSpreadCount(claimId);
        if (spreadInfo.isFirst && spreadInfo.spreadCount > maxSpread) {
          maxSpread = spreadInfo.spreadCount;
          bestClaimId = claimId;
        }
      }

      // Need 10+ users to have similar claims that came after
      const isCartographer = maxSpread >= 10;

      return {
        earned: isCartographer,
        evidence: {
          maxSpread,
          spreadClaimId: bestClaimId,
          threshold: 10,
          pattern: 'First to surface claims that spread',
          timestamp: new Date().toISOString(),
        },
      };
    },
  },
  {
    slug: 'the_inheritor',
    check: async (userId, metrics) => {
      if (metrics.totalClaims < MIN_MAP_SIZE_SIMPLE) {
        return { earned: false, evidence: {} };
      }

      // Check for inheritance pattern
      const inheritanceInfo = await checkInheritancePattern(userId);

      return {
        earned: inheritanceInfo.hasPattern,
        evidence: {
          instanceCount: inheritanceInfo.instanceCount,
          conceptOverlap: inheritanceInfo.conceptOverlap,
          pattern: 'Builds on ideas from followed creators',
          timestamp: new Date().toISOString(),
        },
      };
    },
  },
];

export async function runRareCardDetectionForUser(userId: string): Promise<string[]> {
  const awardedCards: string[] = [];

  try {
    // Update clusters
    await updateUserClusters(userId);

    // Update metrics
    const metrics = await updateUserMetrics(userId);

    // Get platform averages
    const platformAvg = await getPlatformAverageMetrics();

    // Run each rare card check
    for (const cardCheck of RARE_CARD_CHECKS) {
      try {
        const result = await cardCheck.check(userId, metrics, platformAvg);
        if (result.earned) {
          const awarded = await awardRareCard(userId, cardCheck.slug, result.evidence);
          if (awarded) {
            awardedCards.push(cardCheck.slug);
          }
        }
      } catch (error) {
        console.error(`Error checking ${cardCheck.slug} for user ${userId}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error in rare card detection for user ${userId}:`, error);
  }

  return awardedCards;
}

export async function runNightlyCardDetection(): Promise<{
  usersProcessed: number;
  cardsAwarded: number;
  errors: number;
}> {
  console.log('Starting nightly card detection batch...');

  // Get all users with sufficient map density
  const eligibleUsers = await db.user.findMany({
    where: {
      positions: {
        some: {},
      },
    },
    select: {
      id: true,
      _count: {
        select: {
          positions: true,
        },
      },
    },
  });

  // Filter to users with meaningful activity
  const usersToProcess = eligibleUsers.filter(
    (u) => u._count.positions >= MIN_MAP_SIZE_SIMPLE
  );

  console.log(`Processing ${usersToProcess.length} users with sufficient activity`);

  let usersProcessed = 0;
  let cardsAwarded = 0;
  let errors = 0;

  for (const user of usersToProcess) {
    try {
      const awarded = await runRareCardDetectionForUser(user.id);
      cardsAwarded += awarded.length;
      usersProcessed++;
    } catch (error) {
      console.error(`Error processing user ${user.id}:`, error);
      errors++;
    }
  }

  // Update inactive status for rare cards where pattern no longer holds
  await updateArchetypeActiveStatus();

  console.log(`Nightly card detection complete: ${usersProcessed} users, ${cardsAwarded} cards awarded, ${errors} errors`);

  return {
    usersProcessed,
    cardsAwarded,
    errors,
  };
}

async function updateArchetypeActiveStatus(): Promise<void> {
  // Get all rare card awards
  const rareCards = await db.card.findMany({
    where: { tier: 'rare' },
  });

  const rareCardIds = rareCards.map((c) => c.id);

  const awards = await db.cardAward.findMany({
    where: {
      cardId: { in: rareCardIds },
      isActive: true,
    },
    include: {
      card: true,
    },
  });

  const platformAvg = await getPlatformAverageMetrics();

  for (const award of awards) {
    try {
      const metrics = await db.userMetrics.findUnique({
        where: { userId: award.userId },
      });

      if (!metrics) continue;

      const metricsData: UserMetricsData = {
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

      // Find the check for this card
      const check = RARE_CARD_CHECKS.find((c) => c.slug === award.card.slug);
      if (!check) continue;

      const result = await check.check(award.userId, metricsData, platformAvg);

      // If pattern no longer holds, mark as inactive
      if (!result.earned && award.isActive) {
        await db.cardAward.update({
          where: { id: award.id },
          data: { isActive: false },
        });
      }
    } catch (error) {
      console.error(`Error updating active status for award ${award.id}:`, error);
    }
  }
}

// API route handler for cron job
export async function handleNightlyJob(): Promise<{
  success: boolean;
  stats: {
    usersProcessed: number;
    cardsAwarded: number;
    errors: number;
  };
}> {
  try {
    const stats = await runNightlyCardDetection();
    return {
      success: true,
      stats,
    };
  } catch (error) {
    console.error('Nightly card detection job failed:', error);
    return {
      success: false,
      stats: {
        usersProcessed: 0,
        cardsAwarded: 0,
        errors: 1,
      },
    };
  }
}
