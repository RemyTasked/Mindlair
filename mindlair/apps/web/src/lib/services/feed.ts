import db from '@/lib/db';

interface FeedPost {
  id: string;
  headlineClaim: string;
  body: string;
  authorStance: string;
  publishedAt: Date | null;
  topicTags: string[];
  authorId: string;
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  reactions: { stance: string }[];
  _count: { reactions: number };
}

interface ScoredPost extends FeedPost {
  score: number;
  reactionCounts: Record<string, number>;
}

interface UserBelief {
  conceptId: string;
  concept: { label: string };
  direction: string;
  strength: number;
  sameDirectionStreak: number;
}

export async function generateFeed(
  userId: string,
  options: {
    limit?: number;
    cursor?: string;
    filter?: 'subscriptions' | 'discover' | null;
  } = {}
): Promise<{
  posts: ScoredPost[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const { limit = 20, cursor, filter } = options;

  // Get user's belief map (engaged concepts)
  const userBeliefs = await db.belief.findMany({
    where: { userId },
    include: { concept: true },
  });

  // Get users this person is subscribed to
  const subscriptions = await db.subscription.findMany({
    where: { subscriberId: userId },
    select: { subscribedToId: true },
  });
  const subscribedIds = subscriptions.map(s => s.subscribedToId);

  // Get blocked users (both directions)
  const blocks = await db.block.findMany({
    where: {
      OR: [{ blockerId: userId }, { blockedId: userId }],
    },
  });
  const blockedIds = [...new Set([
    ...blocks.map(b => b.blockerId),
    ...blocks.map(b => b.blockedId),
  ])].filter(id => id !== userId);

  // Fetch candidate posts
  const posts = await db.post.findMany({
    where: {
      status: 'published',
      authorId: { notIn: [...blockedIds, userId] },
    },
    include: {
      author: {
        select: { id: true, name: true, avatarUrl: true },
      },
      reactions: {
        select: { stance: true },
      },
      _count: {
        select: { reactions: true },
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: 100,
  });

  // Score posts
  const scoredPosts = scorePostsForFeed(posts as FeedPost[], userBeliefs, subscribedIds);

  // Apply filter
  let filteredPosts = scoredPosts;
  if (filter === 'subscriptions') {
    filteredPosts = scoredPosts.filter(p => subscribedIds.includes(p.authorId));
  } else if (filter === 'discover') {
    filteredPosts = scoredPosts.filter(p => !subscribedIds.includes(p.authorId));
  }

  // Sort by score
  filteredPosts.sort((a, b) => b.score - a.score);

  // Apply cursor pagination
  let startIndex = 0;
  if (cursor) {
    const cursorIndex = filteredPosts.findIndex(p => p.id === cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + limit + 1);
  const hasMore = paginatedPosts.length > limit;
  const results = hasMore ? paginatedPosts.slice(0, -1) : paginatedPosts;
  const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].id : null;

  return { posts: results, nextCursor, hasMore };
}

function scorePostsForFeed(
  posts: FeedPost[],
  userBeliefs: UserBelief[],
  subscribedIds: string[]
): ScoredPost[] {
  return posts.map(post => {
    let score = 0;

    // 1. Subscription boost (+50)
    if (subscribedIds.includes(post.authorId)) {
      score += 50;
    }

    // 2. Topic relevance (+20 per matching tag)
    const matchingTags = post.topicTags.filter(tag =>
      userBeliefs.some(b => b.concept.label.toLowerCase() === tag.toLowerCase())
    );
    score += matchingTags.length * 20;

    // 3. Contested content bonus (+30)
    const reactionCounts = post.reactions.reduce(
      (acc, r) => {
        acc[r.stance] = (acc[r.stance] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const agreeCount = reactionCounts['agree'] || 0;
    const disagreeCount = reactionCounts['disagree'] || 0;
    const totalOpinions = agreeCount + disagreeCount;

    if (totalOpinions >= 5) {
      const disagreeRatio = disagreeCount / totalOpinions;
      if (disagreeRatio >= 0.3 && disagreeRatio <= 0.7) {
        score += 30;
      }
    }

    // 4. Challenge boost (+15) - surface opposing views for echo-chamber topics
    const userStrongBeliefs = userBeliefs.filter(b => b.strength > 0.7);
    for (const belief of userStrongBeliefs) {
      const matchesConcept = post.topicTags.some(
        tag => tag.toLowerCase() === belief.concept.label.toLowerCase()
      );
      if (matchesConcept && belief.sameDirectionStreak >= 3) {
        score += 15;
      }
    }

    // 5. Recency factor
    const ageHours = (Date.now() - (post.publishedAt?.getTime() || 0)) / (1000 * 60 * 60);
    if (ageHours < 24) score += 25;
    else if (ageHours < 72) score += 15;
    else if (ageHours < 168) score += 5;

    // 6. Engagement factor (max +20)
    score += Math.min(post._count.reactions * 2, 20);

    return { ...post, score, reactionCounts };
  });
}

export function balanceFeedPerspectives(
  posts: ScoredPost[],
  userBeliefs: UserBelief[]
): ScoredPost[] {
  // Apply nudge logic: for every 3 reinforcing posts, include 1 challenging post
  const result: ScoredPost[] = [];
  let reinforcingCount = 0;

  const challenging: ScoredPost[] = [];
  const reinforcing: ScoredPost[] = [];

  // Separate posts into challenging and reinforcing
  for (const post of posts) {
    let isChallenge = false;

    for (const belief of userBeliefs) {
      const matchesTopic = post.topicTags.some(
        tag => tag.toLowerCase() === belief.concept.label.toLowerCase()
      );

      if (matchesTopic && belief.sameDirectionStreak >= 3) {
        // This post is on a topic where user has consistent views
        // Check if reactions suggest it's contrary to their view
        const totalReactions = post.reactionCounts['agree'] || 0 + (post.reactionCounts['disagree'] || 0);
        if (totalReactions > 5) {
          const disagreeRatio = (post.reactionCounts['disagree'] || 0) / totalReactions;
          // If most people disagree and user usually agrees on this topic (or vice versa)
          if (
            (belief.direction === 'positive' && disagreeRatio > 0.6) ||
            (belief.direction === 'negative' && disagreeRatio < 0.4)
          ) {
            isChallenge = true;
            break;
          }
        }
      }
    }

    if (isChallenge) {
      challenging.push(post);
    } else {
      reinforcing.push(post);
    }
  }

  // Interleave: 3 reinforcing, 1 challenging
  let challengeIndex = 0;
  for (const post of reinforcing) {
    result.push(post);
    reinforcingCount++;

    if (reinforcingCount >= 3 && challengeIndex < challenging.length) {
      result.push(challenging[challengeIndex]);
      challengeIndex++;
      reinforcingCount = 0;
    }
  }

  // Add remaining challenging posts
  while (challengeIndex < challenging.length) {
    result.push(challenging[challengeIndex]);
    challengeIndex++;
  }

  return result;
}

export function prioritizeContested(posts: ScoredPost[]): ScoredPost[] {
  // Bubble up highly contested posts (40-60% agree/disagree split)
  return posts.sort((a, b) => {
    const aTotal = (a.reactionCounts['agree'] || 0) + (a.reactionCounts['disagree'] || 0);
    const bTotal = (b.reactionCounts['agree'] || 0) + (b.reactionCounts['disagree'] || 0);

    // Need at least 10 reactions to be considered "contested"
    const aContested = aTotal >= 10 && isContested(a.reactionCounts);
    const bContested = bTotal >= 10 && isContested(b.reactionCounts);

    if (aContested && !bContested) return -1;
    if (!aContested && bContested) return 1;

    return b.score - a.score;
  });
}

function isContested(counts: Record<string, number>): boolean {
  const agree = counts['agree'] || 0;
  const disagree = counts['disagree'] || 0;
  const total = agree + disagree;

  if (total === 0) return false;

  const ratio = disagree / total;
  return ratio >= 0.35 && ratio <= 0.65;
}

export async function getBeliefProximityUsers(
  userId: string,
  limit = 10
): Promise<{ userId: string; overlap: number; name: string | null }[]> {
  // Get user's belief map
  const userBeliefs = await db.belief.findMany({
    where: { userId },
    select: { conceptId: true, direction: true },
  });

  if (userBeliefs.length === 0) return [];

  const userBeliefMap = new Map(
    userBeliefs.map(b => [b.conceptId, b.direction])
  );

  // Get blocked users
  const blocks = await db.block.findMany({
    where: {
      OR: [{ blockerId: userId }, { blockedId: userId }],
    },
  });
  const blockedIds = new Set([
    ...blocks.map(b => b.blockerId),
    ...blocks.map(b => b.blockedId),
  ]);

  // Get other users with beliefs in similar concepts
  const otherUserBeliefs = await db.belief.findMany({
    where: {
      conceptId: { in: Array.from(userBeliefMap.keys()) },
      userId: { not: userId },
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  // Calculate overlap scores
  const userOverlaps = new Map<string, { overlap: number; name: string | null }>();

  for (const belief of otherUserBeliefs) {
    if (blockedIds.has(belief.userId)) continue;

    const userDirection = userBeliefMap.get(belief.conceptId);
    if (!userDirection) continue;

    const current = userOverlaps.get(belief.userId) || { overlap: 0, name: belief.user.name };

    // Same direction = +1, opposite = -0.5
    if (belief.direction === userDirection) {
      current.overlap += 1;
    } else if (belief.direction !== 'mixed' && userDirection !== 'mixed') {
      current.overlap -= 0.5;
    }

    userOverlaps.set(belief.userId, current);
  }

  // Sort by overlap and return top matches
  return Array.from(userOverlaps.entries())
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit);
}
