import db from '@/lib/db';

export type CardEventType =
  | 'position_created'
  | 'belief_created'
  | 'post_published'
  | 'quick_take_created'
  | 'source_created'
  | 'subscription_created'
  | 'subscriber_gained';

export interface CardEvent {
  type: CardEventType;
  userId: string;
  payload: Record<string, unknown>;
}

export interface AwardedCard {
  cardId: string;
  slug: string;
  name: string;
  tier: string;
  evidence: Record<string, unknown>;
}

const CARD_SLUGS = {
  FIRST_REACTION: 'first_reaction',
  FIRST_LIGHT: 'first_light',
  FIRST_WORDS: 'first_words',
  FIRST_TAKE: 'first_take',
  BROWSER_BOUND: 'browser_bound',
  TEN_DEEP: 'ten_deep',
  HUNDRED_STRONG: 'hundred_strong',
  WEEK_ONE: 'week_one',
  READER: 'reader',
  READ: 'read',
} as const;

async function awardCard(
  userId: string,
  slug: string,
  evidence: Record<string, unknown>
): Promise<AwardedCard | null> {
  const card = await db.card.findUnique({
    where: { slug },
  });

  if (!card) {
    console.warn(`Card not found: ${slug}`);
    return null;
  }

  // Check if already awarded
  const existing = await db.cardAward.findUnique({
    where: {
      userId_cardId: {
        userId,
        cardId: card.id,
      },
    },
  });

  if (existing) {
    return null;
  }

  // Award the card
  await db.cardAward.create({
    data: {
      userId,
      cardId: card.id,
      evidence,
      isActive: true,
    },
  });

  return {
    cardId: card.id,
    slug: card.slug,
    name: card.name,
    tier: card.tier,
    evidence,
  };
}

async function checkFirstReaction(userId: string, payload: Record<string, unknown>): Promise<AwardedCard | null> {
  const positionCount = await db.position.count({
    where: { userId },
  });

  if (positionCount === 1) {
    return awardCard(userId, CARD_SLUGS.FIRST_REACTION, {
      triggeredBy: 'first_position',
      positionId: payload.positionId,
      claimId: payload.claimId,
      timestamp: new Date().toISOString(),
    });
  }

  return null;
}

async function checkFirstLight(userId: string, payload: Record<string, unknown>): Promise<AwardedCard | null> {
  const beliefCount = await db.belief.count({
    where: { userId },
  });

  if (beliefCount === 1) {
    return awardCard(userId, CARD_SLUGS.FIRST_LIGHT, {
      triggeredBy: 'first_belief',
      conceptId: payload.conceptId,
      timestamp: new Date().toISOString(),
    });
  }

  return null;
}

async function checkFirstWords(userId: string, payload: Record<string, unknown>): Promise<AwardedCard | null> {
  const publishedCount = await db.post.count({
    where: {
      authorId: userId,
      status: 'published',
    },
  });

  if (publishedCount === 1) {
    return awardCard(userId, CARD_SLUGS.FIRST_WORDS, {
      triggeredBy: 'first_published_post',
      postId: payload.postId,
      timestamp: new Date().toISOString(),
    });
  }

  return null;
}

async function checkFirstTake(userId: string, payload: Record<string, unknown>): Promise<AwardedCard | null> {
  // Quick takes are posts with a specific pattern or tag
  // For now, we'll treat any short post as a quick take
  const quickTakeCount = await db.post.count({
    where: {
      authorId: userId,
      status: 'published',
      body: {
        // Quick takes are typically shorter
      },
    },
  });

  // This would need more sophisticated detection based on how quick takes are defined
  // For now, skip this check as quick_take_created would be a separate event
  return null;
}

async function checkBrowserBound(userId: string, payload: Record<string, unknown>): Promise<AwardedCard | null> {
  const surface = payload.surface as string;
  
  if (surface === 'chrome_extension' || surface === 'firefox_extension' || surface === 'safari_extension') {
    const extensionSourceCount = await db.source.count({
      where: {
        userId,
        surface: {
          in: ['chrome_extension', 'firefox_extension', 'safari_extension'],
        },
      },
    });

    if (extensionSourceCount === 1) {
      return awardCard(userId, CARD_SLUGS.BROWSER_BOUND, {
        triggeredBy: 'first_extension_source',
        sourceId: payload.sourceId,
        surface,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return null;
}

async function checkTenDeep(userId: string): Promise<AwardedCard | null> {
  const distinctClaimCount = await db.position.groupBy({
    by: ['claimId'],
    where: { userId },
  });

  if (distinctClaimCount.length === 10) {
    return awardCard(userId, CARD_SLUGS.TEN_DEEP, {
      triggeredBy: 'claim_milestone',
      claimCount: 10,
      timestamp: new Date().toISOString(),
    });
  }

  return null;
}

async function checkHundredStrong(userId: string): Promise<AwardedCard | null> {
  const distinctClaimCount = await db.position.groupBy({
    by: ['claimId'],
    where: { userId },
  });

  if (distinctClaimCount.length === 100) {
    return awardCard(userId, CARD_SLUGS.HUNDRED_STRONG, {
      triggeredBy: 'claim_milestone',
      claimCount: 100,
      timestamp: new Date().toISOString(),
    });
  }

  return null;
}

async function checkWeekOne(userId: string): Promise<AwardedCard | null> {
  // Get or create user metrics
  let metrics = await db.userMetrics.findUnique({
    where: { userId },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!metrics) {
    metrics = await db.userMetrics.create({
      data: {
        userId,
        lastActivityDate: today,
        currentStreak: 1,
        longestStreak: 1,
      },
    });
    return null;
  }

  const lastActivity = metrics.lastActivityDate;
  
  if (!lastActivity) {
    await db.userMetrics.update({
      where: { userId },
      data: {
        lastActivityDate: today,
        currentStreak: 1,
      },
    });
    return null;
  }

  const lastActivityDate = new Date(lastActivity);
  lastActivityDate.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    // Same day, no update needed
    return null;
  } else if (daysDiff === 1) {
    // Consecutive day
    const newStreak = metrics.currentStreak + 1;
    const longestStreak = Math.max(newStreak, metrics.longestStreak);

    await db.userMetrics.update({
      where: { userId },
      data: {
        lastActivityDate: today,
        currentStreak: newStreak,
        longestStreak,
      },
    });

    if (newStreak === 7) {
      return awardCard(userId, CARD_SLUGS.WEEK_ONE, {
        triggeredBy: 'streak_milestone',
        streakDays: 7,
        timestamp: new Date().toISOString(),
      });
    }
  } else {
    // Streak broken
    await db.userMetrics.update({
      where: { userId },
      data: {
        lastActivityDate: today,
        currentStreak: 1,
      },
    });
  }

  return null;
}

async function checkReader(userId: string, payload: Record<string, unknown>): Promise<AwardedCard | null> {
  const subscriptionCount = await db.subscription.count({
    where: { subscriberId: userId },
  });

  if (subscriptionCount === 1) {
    return awardCard(userId, CARD_SLUGS.READER, {
      triggeredBy: 'first_subscription',
      subscribedToId: payload.subscribedToId,
      timestamp: new Date().toISOString(),
    });
  }

  return null;
}

async function checkRead(userId: string): Promise<AwardedCard | null> {
  const subscriberCount = await db.subscription.count({
    where: { subscribedToId: userId },
  });

  if (subscriberCount === 1) {
    return awardCard(userId, CARD_SLUGS.READ, {
      triggeredBy: 'first_subscriber',
      timestamp: new Date().toISOString(),
    });
  }

  return null;
}

export async function checkCommonCardTriggers(event: CardEvent): Promise<AwardedCard[]> {
  const { type, userId, payload } = event;
  const awards: AwardedCard[] = [];

  try {
    switch (type) {
      case 'position_created': {
        const firstReaction = await checkFirstReaction(userId, payload);
        if (firstReaction) awards.push(firstReaction);

        const tenDeep = await checkTenDeep(userId);
        if (tenDeep) awards.push(tenDeep);

        const hundredStrong = await checkHundredStrong(userId);
        if (hundredStrong) awards.push(hundredStrong);

        const weekOne = await checkWeekOne(userId);
        if (weekOne) awards.push(weekOne);
        break;
      }

      case 'belief_created': {
        const firstLight = await checkFirstLight(userId, payload);
        if (firstLight) awards.push(firstLight);
        break;
      }

      case 'post_published': {
        const firstWords = await checkFirstWords(userId, payload);
        if (firstWords) awards.push(firstWords);

        const weekOne = await checkWeekOne(userId);
        if (weekOne) awards.push(weekOne);
        break;
      }

      case 'quick_take_created': {
        const firstTake = await checkFirstTake(userId, payload);
        if (firstTake) awards.push(firstTake);

        const weekOne = await checkWeekOne(userId);
        if (weekOne) awards.push(weekOne);
        break;
      }

      case 'source_created': {
        const browserBound = await checkBrowserBound(userId, payload);
        if (browserBound) awards.push(browserBound);

        const weekOne = await checkWeekOne(userId);
        if (weekOne) awards.push(weekOne);
        break;
      }

      case 'subscription_created': {
        const reader = await checkReader(userId, payload);
        if (reader) awards.push(reader);
        break;
      }

      case 'subscriber_gained': {
        const read = await checkRead(userId);
        if (read) awards.push(read);
        break;
      }
    }
  } catch (error) {
    console.error('Error checking card triggers:', error);
  }

  return awards;
}

export async function getUserCardAwards(userId: string): Promise<{
  awards: Array<{
    id: string;
    card: {
      id: string;
      slug: string;
      name: string;
      description: string;
      tier: string;
      category: string | null;
    };
    evidence: unknown;
    isActive: boolean;
    isShared: boolean;
    awardedAt: Date;
  }>;
}> {
  const awards = await db.cardAward.findMany({
    where: { userId },
    include: {
      card: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          tier: true,
          category: true,
        },
      },
    },
    orderBy: { awardedAt: 'desc' },
  });

  return { awards };
}

export async function getCardCatalog(userId?: string): Promise<{
  cards: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    hint: string;
    tier: string;
    category: string | null;
    sortOrder: number;
    isEarned: boolean;
    awardedAt: Date | null;
  }>;
}> {
  const cards = await db.card.findMany({
    orderBy: [{ tier: 'asc' }, { sortOrder: 'asc' }],
  });

  let earnedCardIds: Set<string> = new Set();
  let awardDates: Map<string, Date> = new Map();

  if (userId) {
    const awards = await db.cardAward.findMany({
      where: { userId },
      select: { cardId: true, awardedAt: true },
    });
    earnedCardIds = new Set(awards.map((a) => a.cardId));
    awardDates = new Map(awards.map((a) => [a.cardId, a.awardedAt]));
  }

  return {
    cards: cards.map((card) => ({
      id: card.id,
      slug: card.slug,
      name: card.name,
      description: card.description,
      hint: card.hint,
      tier: card.tier,
      category: card.category,
      sortOrder: card.sortOrder,
      isEarned: earnedCardIds.has(card.id),
      awardedAt: awardDates.get(card.id) || null,
    })),
  };
}

export async function toggleCardShare(
  userId: string,
  awardId: string
): Promise<{ isShared: boolean } | null> {
  const award = await db.cardAward.findFirst({
    where: {
      id: awardId,
      userId,
    },
  });

  if (!award) {
    return null;
  }

  const updated = await db.cardAward.update({
    where: { id: awardId },
    data: { isShared: !award.isShared },
  });

  return { isShared: updated.isShared };
}
