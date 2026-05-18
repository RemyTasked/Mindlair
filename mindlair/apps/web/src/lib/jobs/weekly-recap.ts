import db from '@/lib/db';

interface WeeklyStats {
  positionsTaken: number;
  claimsEngaged: number;
  postsPublished: number;
  subscriptionsGained: number;
  subscriptionsMade: number;
  conceptsExplored: number;
  streakDays: number;
}

/**
 * Calculate the start of the current week (Sunday).
 */
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

/**
 * Calculate the start of the previous week.
 */
function getPreviousWeekStart(): Date {
  const weekStart = getWeekStart();
  weekStart.setDate(weekStart.getDate() - 7);
  return weekStart;
}

/**
 * Get weekly stats for a user.
 */
async function getWeeklyStats(
  userId: string,
  weekStart: Date
): Promise<WeeklyStats> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Positions taken this week
  const positions = await db.position.findMany({
    where: {
      userId,
      createdAt: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
    select: {
      claimId: true,
    },
  });

  const positionsTaken = positions.length;
  const claimsEngaged = new Set(positions.map((p) => p.claimId)).size;

  // Posts published this week
  const postsPublished = await db.post.count({
    where: {
      authorId: userId,
      status: 'published',
      publishedAt: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
  });

  // Subscriptions gained this week
  const subscriptionsGained = await db.subscription.count({
    where: {
      subscribedToId: userId,
      createdAt: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
  });

  // Subscriptions made this week
  const subscriptionsMade = await db.subscription.count({
    where: {
      subscriberId: userId,
      createdAt: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
  });

  // Concepts explored this week
  const conceptsThisWeek = await db.position.findMany({
    where: {
      userId,
      createdAt: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
    select: {
      claim: {
        select: {
          claimConcepts: {
            select: { conceptId: true },
          },
        },
      },
    },
  });

  const conceptIds = new Set<string>();
  for (const pos of conceptsThisWeek) {
    for (const cc of pos.claim.claimConcepts) {
      conceptIds.add(cc.conceptId);
    }
  }
  const conceptsExplored = conceptIds.size;

  // Streak days
  const metrics = await db.userMetrics.findUnique({
    where: { userId },
    select: { currentStreak: true },
  });
  const streakDays = metrics?.currentStreak || 0;

  return {
    positionsTaken,
    claimsEngaged,
    postsPublished,
    subscriptionsGained,
    subscriptionsMade,
    conceptsExplored,
    streakDays,
  };
}

/**
 * Generate weekly recap for a user.
 */
export async function generateWeeklyRecap(userId: string): Promise<string | null> {
  const weekStart = getPreviousWeekStart();

  // Check if recap already exists
  const existing = await db.weeklyRecap.findUnique({
    where: {
      userId_weekStart: {
        userId,
        weekStart,
      },
    },
  });

  if (existing) {
    return existing.id;
  }

  // Get stats for the week
  const stats = await getWeeklyStats(userId, weekStart);

  // Only create recap if there was some activity
  if (stats.positionsTaken === 0 && stats.postsPublished === 0) {
    return null;
  }

  // Get card awards from this week
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const awards = await db.cardAward.findMany({
    where: {
      userId,
      awardedAt: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
  });

  // Create recap
  const recap = await db.weeklyRecap.create({
    data: {
      userId,
      weekStart,
      stats: stats as unknown as Record<string, unknown>,
    },
  });

  // Link awards to recap
  if (awards.length > 0) {
    await db.cardAward.updateMany({
      where: {
        id: { in: awards.map((a) => a.id) },
      },
      data: {
        recapId: recap.id,
      },
    });
  }

  return recap.id;
}

/**
 * Run weekly recap generation for all active users.
 */
export async function runWeeklyRecapGeneration(): Promise<{
  usersProcessed: number;
  recapsCreated: number;
  errors: number;
}> {
  console.log('Starting weekly recap generation...');

  // Get all users with activity in the past week
  const weekStart = getPreviousWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const activeUsers = await db.user.findMany({
    where: {
      OR: [
        {
          positions: {
            some: {
              createdAt: {
                gte: weekStart,
                lt: weekEnd,
              },
            },
          },
        },
        {
          posts: {
            some: {
              publishedAt: {
                gte: weekStart,
                lt: weekEnd,
              },
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  console.log(`Found ${activeUsers.length} active users`);

  let usersProcessed = 0;
  let recapsCreated = 0;
  let errors = 0;

  for (const user of activeUsers) {
    try {
      const recapId = await generateWeeklyRecap(user.id);
      usersProcessed++;
      if (recapId) {
        recapsCreated++;
      }
    } catch (error) {
      console.error(`Error generating recap for user ${user.id}:`, error);
      errors++;
    }
  }

  console.log(
    `Weekly recap generation complete: ${usersProcessed} users, ${recapsCreated} recaps, ${errors} errors`
  );

  return {
    usersProcessed,
    recapsCreated,
    errors,
  };
}

/**
 * Get a user's current week recap (or most recent).
 */
export async function getUserRecap(userId: string): Promise<{
  recap: {
    id: string;
    weekStart: Date;
    stats: WeeklyStats;
    deliveredAt: Date | null;
    viewedAt: Date | null;
  } | null;
  awards: Array<{
    id: string;
    card: {
      name: string;
      tier: string;
    };
    awardedAt: Date;
  }>;
}> {
  const recap = await db.weeklyRecap.findFirst({
    where: { userId },
    orderBy: { weekStart: 'desc' },
    include: {
      awards: {
        include: {
          card: {
            select: { name: true, tier: true },
          },
        },
      },
    },
  });

  if (!recap) {
    return { recap: null, awards: [] };
  }

  return {
    recap: {
      id: recap.id,
      weekStart: recap.weekStart,
      stats: recap.stats as unknown as WeeklyStats,
      deliveredAt: recap.deliveredAt,
      viewedAt: recap.viewedAt,
    },
    awards: recap.awards.map((a) => ({
      id: a.id,
      card: a.card,
      awardedAt: a.awardedAt,
    })),
  };
}

/**
 * Mark a recap as viewed.
 */
export async function markRecapViewed(recapId: string): Promise<void> {
  await db.weeklyRecap.update({
    where: { id: recapId },
    data: { viewedAt: new Date() },
  });
}

/**
 * Get recap history for a user.
 */
export async function getRecapHistory(
  userId: string,
  limit = 12
): Promise<
  Array<{
    id: string;
    weekStart: Date;
    stats: WeeklyStats;
    cardCount: number;
    viewedAt: Date | null;
  }>
> {
  const recaps = await db.weeklyRecap.findMany({
    where: { userId },
    orderBy: { weekStart: 'desc' },
    take: limit,
    include: {
      _count: {
        select: { awards: true },
      },
    },
  });

  return recaps.map((r) => ({
    id: r.id,
    weekStart: r.weekStart,
    stats: r.stats as unknown as WeeklyStats,
    cardCount: r._count.awards,
    viewedAt: r.viewedAt,
  }));
}
