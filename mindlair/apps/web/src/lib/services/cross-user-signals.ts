/**
 * Cross-User Signals Service
 * 
 * This service provides privacy-bounded access to cross-user data.
 * All queries return aggregate counts and patterns, never identifying
 * information about other users' maps.
 * 
 * Privacy Principles:
 * - What a user CAN see: Their own claims, aggregate counts, earned cards
 * - What a user CANNOT see: Which users linked to them, other users' claim text
 */

import db from '@/lib/db';

export interface InboundLinkInfo {
  totalCount: number;
  topClaimsCount: number;
  pattern: string;
}

export interface ClaimSpreadInfo {
  spreadCount: number;
  isFirst: boolean;
  daysSinceFirst: number;
}

export interface EarlySubInfo {
  subscribedToId: string;
  subscribedAt: Date;
  subscriberCountAtTime: number;
  currentSubscriberCount: number;
  qualifiesForCard: boolean;
}

export interface InheritanceInfo {
  hasPattern: boolean;
  instanceCount: number;
  conceptOverlap: string[];
}

/**
 * Get aggregate count of inbound links to a user's claims.
 * Used for The Anchor card detection.
 * 
 * Privacy: Returns only aggregate count, not who linked or which specific claims.
 */
export async function getInboundLinkCount(userId: string): Promise<number> {
  // Get user's claims
  const userClaims = await db.position.findMany({
    where: { userId },
    select: { claimId: true },
    distinct: ['claimId'],
  });

  const userClaimIds = userClaims.map((p) => p.claimId);

  if (userClaimIds.length === 0) return 0;

  // Count similarity edges where user's claims are target
  // Only count if the similar claim is from a different user
  const similarities = await db.claimSimilarity.findMany({
    where: {
      OR: [
        { claimAId: { in: userClaimIds } },
        { claimBId: { in: userClaimIds } },
      ],
    },
    include: {
      claimA: {
        include: {
          source: { select: { userId: true } },
        },
      },
      claimB: {
        include: {
          source: { select: { userId: true } },
        },
      },
    },
  });

  let inboundCount = 0;

  for (const sim of similarities) {
    const aIsUserClaim = userClaimIds.includes(sim.claimAId);
    const bIsUserClaim = userClaimIds.includes(sim.claimBId);

    // Count as inbound if the other claim is from a different user
    if (aIsUserClaim && sim.claimB.source.userId !== userId) {
      inboundCount++;
    }
    if (bIsUserClaim && sim.claimA.source.userId !== userId) {
      inboundCount++;
    }
  }

  return inboundCount;
}

/**
 * Get information about a user's claims being referenced by others.
 * Privacy-bounded: returns aggregates only.
 */
export async function getInboundLinkInfo(userId: string): Promise<InboundLinkInfo> {
  const totalCount = await getInboundLinkCount(userId);

  // Get count of user's claims that have any inbound links
  const userClaims = await db.position.findMany({
    where: { userId },
    select: { claimId: true },
    distinct: ['claimId'],
  });

  const userClaimIds = userClaims.map((p) => p.claimId);

  const claimsWithLinks = await db.claimSimilarity.groupBy({
    by: ['claimAId'],
    where: {
      claimAId: { in: userClaimIds },
    },
    _count: true,
  });

  const claimsWithLinksB = await db.claimSimilarity.groupBy({
    by: ['claimBId'],
    where: {
      claimBId: { in: userClaimIds },
    },
    _count: true,
  });

  const uniqueLinkedClaims = new Set([
    ...claimsWithLinks.map((c) => c.claimAId),
    ...claimsWithLinksB.map((c) => c.claimBId),
  ]);

  return {
    totalCount,
    topClaimsCount: uniqueLinkedClaims.size,
    pattern: totalCount > 10 ? 'high_influence' : totalCount > 0 ? 'some_influence' : 'none',
  };
}

/**
 * Check if a user's claim was first in a similarity cluster.
 * Used for The Cartographer card detection.
 * 
 * Privacy: Returns only whether user was first, not who came after.
 */
export async function getClaimSpreadCount(claimId: string): Promise<ClaimSpreadInfo> {
  const claim = await db.claim.findUnique({
    where: { id: claimId },
    select: {
      extractedAt: true,
      source: { select: { userId: true } },
    },
  });

  if (!claim) {
    return { spreadCount: 0, isFirst: false, daysSinceFirst: 0 };
  }

  // Get all similar claims
  const similarities = await db.claimSimilarity.findMany({
    where: {
      OR: [{ claimAId: claimId }, { claimBId: claimId }],
    },
    include: {
      claimA: {
        select: {
          id: true,
          extractedAt: true,
          source: { select: { userId: true } },
        },
      },
      claimB: {
        select: {
          id: true,
          extractedAt: true,
          source: { select: { userId: true } },
        },
      },
    },
  });

  // Count spread and check if this claim was first
  const otherClaims = similarities.flatMap((sim) => {
    const claims = [];
    if (sim.claimAId !== claimId) claims.push(sim.claimA);
    if (sim.claimBId !== claimId) claims.push(sim.claimB);
    return claims;
  });

  // Only count claims from different users
  const spreadClaims = otherClaims.filter(
    (c) => c.source.userId !== claim.source.userId
  );

  // Check if this claim was created before all similar claims
  const isFirst = spreadClaims.every(
    (c) => c.extractedAt > claim.extractedAt
  );

  const daysSinceFirst = Math.floor(
    (Date.now() - claim.extractedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    spreadCount: spreadClaims.length,
    isFirst,
    daysSinceFirst,
  };
}

/**
 * Get information about early subscriptions.
 * Used for The Early Reader card detection.
 * 
 * Privacy: Returns subscription info with anonymized growth data.
 */
export async function getEarlySubscriptions(userId: string): Promise<EarlySubInfo[]> {
  // Get user's subscriptions with timestamps
  const subscriptions = await db.subscription.findMany({
    where: { subscriberId: userId },
    select: {
      subscribedToId: true,
      createdAt: true,
    },
  });

  const results: EarlySubInfo[] = [];

  for (const sub of subscriptions) {
    // Get subscriber count at time of subscription
    const subscriberCountAtTime = await db.userGrowthSnapshot.findFirst({
      where: {
        userId: sub.subscribedToId,
        snapshotAt: { lte: sub.createdAt },
      },
      orderBy: { snapshotAt: 'desc' },
      select: { subscriberCount: true },
    });

    // Get current subscriber count
    const currentCount = await db.subscription.count({
      where: { subscribedToId: sub.subscribedToId },
    });

    const countAtTime = subscriberCountAtTime?.subscriberCount ?? 0;

    // Qualifies if subscribed when < 10 subscribers and now > 100
    const qualifiesForCard = countAtTime < 10 && currentCount > 100;

    results.push({
      subscribedToId: sub.subscribedToId,
      subscribedAt: sub.createdAt,
      subscriberCountAtTime: countAtTime,
      currentSubscriberCount: currentCount,
      qualifiesForCard,
    });
  }

  return results.filter((r) => r.qualifiesForCard);
}

/**
 * Check for intellectual inheritance pattern.
 * Used for The Inheritor card detection.
 * 
 * Detects: User published posts with claims semantically similar to 
 * claims from posts by users they subscribe to.
 * 
 * Privacy: Returns pattern info without identifying specific subscribed users.
 */
export async function checkInheritancePattern(userId: string): Promise<InheritanceInfo> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get users this person subscribes to
  const subscriptions = await db.subscription.findMany({
    where: { subscriberId: userId },
    select: { subscribedToId: true },
  });

  const subscribedUserIds = subscriptions.map((s) => s.subscribedToId);

  if (subscribedUserIds.length === 0) {
    return { hasPattern: false, instanceCount: 0, conceptOverlap: [] };
  }

  // Get recent posts from subscribed users
  const subscribedPosts = await db.post.findMany({
    where: {
      authorId: { in: subscribedUserIds },
      status: 'published',
      publishedAt: { gte: thirtyDaysAgo },
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

  // Get user's recent published posts
  const userPosts = await db.post.findMany({
    where: {
      authorId: userId,
      status: 'published',
      publishedAt: { gte: thirtyDaysAgo },
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

  // Extract concepts from subscribed posts
  const subscribedConcepts = new Set<string>();
  for (const post of subscribedPosts) {
    for (const claim of post.source?.claims || []) {
      for (const cc of claim.claimConcepts) {
        subscribedConcepts.add(cc.concept.label.toLowerCase());
      }
    }
  }

  // Check for concept overlap with user's posts
  const overlappingConcepts: string[] = [];
  let instanceCount = 0;

  for (const post of userPosts) {
    for (const claim of post.source?.claims || []) {
      for (const cc of claim.claimConcepts) {
        const label = cc.concept.label.toLowerCase();
        if (subscribedConcepts.has(label)) {
          if (!overlappingConcepts.includes(cc.concept.label)) {
            overlappingConcepts.push(cc.concept.label);
          }
          instanceCount++;
        }
      }
    }
  }

  // Pattern exists if 3+ instances of concept inheritance
  const hasPattern = instanceCount >= 3;

  return {
    hasPattern,
    instanceCount,
    conceptOverlap: overlappingConcepts.slice(0, 5), // Limit to 5 examples
  };
}

/**
 * Update the inbound link count in user metrics.
 * Called by nightly batch job.
 */
export async function updateInboundLinkCounts(): Promise<number> {
  const users = await db.user.findMany({
    where: {
      positions: { some: {} },
    },
    select: { id: true },
  });

  let updated = 0;

  for (const user of users) {
    try {
      const count = await getInboundLinkCount(user.id);
      
      await db.userMetrics.upsert({
        where: { userId: user.id },
        update: { inboundLinkCount: count },
        create: {
          userId: user.id,
          inboundLinkCount: count,
        },
      });
      
      updated++;
    } catch (error) {
      console.error(`Failed to update inbound link count for user ${user.id}:`, error);
    }
  }

  return updated;
}
