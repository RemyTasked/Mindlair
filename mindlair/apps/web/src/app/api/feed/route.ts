import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { referencedPostSelect, serializeReferencedPost } from '@/lib/posts/referenced-post';

const EDITORIAL_EMAIL = 'discover@mindlair.app';

const CATEGORIES = [
  'technology',
  'psychology', 
  'economics',
  'health',
  'philosophy',
  'culture',
  'productivity',
  'sports',
] as const;

type Category = typeof CATEGORIES[number];

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
    const filter = searchParams.get('filter'); // 'subscriptions', 'discover', or null for mixed
    const category = searchParams.get('category') as Category | null; // category filter

    // Get user's belief map (engaged concepts)
    const userBeliefs = await db.belief.findMany({
      where: { userId: user.id },
      include: { concept: true },
    });

    const engagedConceptIds = userBeliefs.map(b => b.conceptId);

    // Get users this person is subscribed to
    const subscriptions = await db.subscription.findMany({
      where: { subscriberId: user.id },
      select: { subscribedToId: true },
    });
    const subscribedIds = subscriptions.map(s => s.subscribedToId);

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
    const baseWhere: any = {
      status: 'published' as const,
      authorId: { notIn: [...blockedIds, user.id] }, // Exclude blocked users and self
    };

    // Add category filter if provided
    if (category && CATEGORIES.includes(category)) {
      baseWhere.topicTags = { has: category };
    }

    // Get posts with their topic tags, reaction stats, and source info
    let posts = await db.post.findMany({
      where: baseWhere,
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true, email: true },
        },
        referencedPost: { select: referencedPostSelect },
        source: {
          select: { 
            url: true, 
            title: true, 
            outlet: true, 
            author: true,
            contentType: true,
          },
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

      // 1. Subscription boost
      if (subscribedIds.includes(post.authorId)) {
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
    if (filter === 'subscriptions') {
      filteredPosts = scoredPosts.filter(p => subscribedIds.includes(p.authorId));
    } else if (filter === 'discover') {
      filteredPosts = scoredPosts.filter(p => !subscribedIds.includes(p.authorId));
    }

    // Backfill with editorial content if Discover feed is sparse
    if ((filter === 'discover' || !filter) && filteredPosts.length < 15) {
      const existingIds = filteredPosts.map(p => p.id);
      
      const editorialWhere: any = {
        status: 'published' as const,
        author: { email: EDITORIAL_EMAIL },
        id: { notIn: existingIds },
      };
      
      if (category && CATEGORIES.includes(category)) {
        editorialWhere.topicTags = { has: category };
      }

      const editorialPosts = await db.post.findMany({
        where: editorialWhere,
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true, email: true },
          },
          referencedPost: { select: referencedPostSelect },
          source: {
            select: { 
              url: true, 
              title: true, 
              outlet: true, 
              author: true,
              contentType: true,
            },
          },
          reactions: {
            select: { stance: true },
          },
          _count: {
            select: { reactions: true },
          },
        },
        orderBy: { publishedAt: 'desc' },
        take: 30 - filteredPosts.length,
      });

      // Score editorial posts and merge
      const scoredEditorial = editorialPosts.map(post => {
        const reactionCounts = post.reactions.reduce(
          (acc, r) => {
            acc[r.stance] = (acc[r.stance] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );
        return { ...post, score: 10, reactionCounts, isEditorial: true };
      });

      filteredPosts = [...filteredPosts, ...scoredEditorial];
    }

    // Sort by score
    filteredPosts.sort((a, b) => b.score - a.score);

    // For You, Discover, etc.: omit posts the user already answered (non-skip reactions). Subscriptions keeps full author feed.
    if (filter !== 'subscriptions' && filteredPosts.length > 0) {
      const discoverIds = filteredPosts.map(p => p.id);
      const answered = await db.postReaction.findMany({
        where: {
          userId: user.id,
          postId: { in: discoverIds },
          stance: { not: 'skip' },
        },
        select: { postId: true },
      });
      const answeredIds = new Set(answered.map(a => a.postId));
      filteredPosts = filteredPosts.filter(p => !answeredIds.has(p.id));
    }

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
        thumbnailUrl: post.thumbnailUrl,
        author: {
          id: post.author.id,
          name: post.author.name,
          avatarUrl: post.author.avatarUrl,
        },
        source: post.source ? {
          url: post.source.url,
          title: post.source.title,
          outlet: post.source.outlet,
          author: post.source.author,
          contentType: post.source.contentType,
        } : null,
        isSubscribed: subscribedIds.includes(post.authorId),
        isEditorial: post.author.email === EDITORIAL_EMAIL,
        totalReactions: post._count.reactions,
        userReaction: userReactionMap.get(post.id) || null,
        reactionCounts: userReactionMap.has(post.id) ? post.reactionCounts : null,
        referencedPost: serializeReferencedPost(post.referencedPost),
      })),
      categories: CATEGORIES,
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
