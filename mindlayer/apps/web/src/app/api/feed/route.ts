import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor');
    const filter = searchParams.get('filter'); // 'following', 'discover', or null for mixed

    // Get user's belief map (engaged concepts)
    const userBeliefs = await db.belief.findMany({
      where: { userId: user.id },
      include: { concept: true },
    });

    const engagedConceptIds = userBeliefs.map(b => b.conceptId);

    // Get users this person follows
    const following = await db.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    });
    const followingIds = following.map(f => f.followingId);

    // Get blocked users (both directions)
    const blocks = await db.block.findMany({
      where: {
        OR: [{ blockerId: user.id }, { blockedId: user.id }],
      },
    });
    const blockedIds = [
      ...blocks.map(b => b.blockerId),
      ...blocks.map(b => b.blockedId),
    ].filter(id => id !== user.id);

    // Build base query
    const baseWhere = {
      status: 'published' as const,
      authorId: { notIn: [...blockedIds, user.id] }, // Exclude blocked users and self
    };

    // Get posts with their topic tags and reaction stats
    let posts = await db.post.findMany({
      where: baseWhere,
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
      take: 100, // Fetch more to enable scoring
    });

    // Score posts for feed ranking
    const scoredPosts = posts.map(post => {
      let score = 0;

      // 1. Following boost
      if (followingIds.includes(post.authorId)) {
        score += 50;
      }

      // 2. Topic relevance (matches user's engaged concepts)
      const matchingTags = post.topicTags.filter(tag =>
        userBeliefs.some(b => b.concept.label.toLowerCase() === tag.toLowerCase())
      );
      score += matchingTags.length * 20;

      // 3. Contested content bonus (high disagree rate = interesting tension)
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
        // Bonus for contested content (40-60% disagree range)
        if (disagreeRatio >= 0.3 && disagreeRatio <= 0.7) {
          score += 30;
        }
      }

      // 4. Challenge boost - surface opposing views
      // Find if post's concepts conflict with user's strong beliefs
      const userStrongBeliefs = userBeliefs.filter(b => b.strength > 0.7);
      for (const belief of userStrongBeliefs) {
        const matchesConcept = post.topicTags.some(
          tag => tag.toLowerCase() === belief.concept.label.toLowerCase()
        );
        if (matchesConcept && belief.sameDirectionStreak >= 3) {
          // This is a topic user has consistent views on
          // Boost posts that might challenge them
          score += 15;
        }
      }

      // 5. Recency factor
      const ageHours = (Date.now() - (post.publishedAt?.getTime() || 0)) / (1000 * 60 * 60);
      if (ageHours < 24) score += 25;
      else if (ageHours < 72) score += 15;
      else if (ageHours < 168) score += 5;

      // 6. Engagement factor
      score += Math.min(post._count.reactions * 2, 20);

      return { ...post, score, reactionCounts };
    });

    // Apply filter
    let filteredPosts = scoredPosts;
    if (filter === 'following') {
      filteredPosts = scoredPosts.filter(p => followingIds.includes(p.authorId));
    } else if (filter === 'discover') {
      filteredPosts = scoredPosts.filter(p => !followingIds.includes(p.authorId));
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
    const nextCursor = hasMore ? results[results.length - 1]?.id : null;

    // Check which posts user has already reacted to
    const postIds = results.map(p => p.id);
    const userReactions = await db.postReaction.findMany({
      where: {
        userId: user.id,
        postId: { in: postIds },
      },
      select: { postId: true, stance: true },
    });
    const userReactionMap = new Map(userReactions.map(r => [r.postId, r.stance]));

    return NextResponse.json({
      posts: results.map(post => ({
        id: post.id,
        headlineClaim: post.headlineClaim,
        body: post.body.slice(0, 500) + (post.body.length > 500 ? '...' : ''),
        authorStance: post.authorStance,
        publishedAt: post.publishedAt?.toISOString(),
        topicTags: post.topicTags,
        author: post.author,
        isFollowing: followingIds.includes(post.authorId),
        totalReactions: post._count.reactions,
        // Only show reaction counts if user has reacted
        userReaction: userReactionMap.get(post.id) || null,
        reactionCounts: userReactionMap.has(post.id) ? post.reactionCounts : null,
      })),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Feed error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}
