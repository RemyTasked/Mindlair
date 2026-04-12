import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { referencedPostSelect, serializeReferencedPost } from '@/lib/posts/referenced-post';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetUserId } = await params;
    const user = await getAuthFromRequest(request);

    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            posts: { where: { status: 'published' } },
            subscribers: true,
            subscriptions: true,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if viewing user is blocked
    if (user && user.id !== targetUserId) {
      const blocked = await db.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: targetUserId,
            blockedId: user.id,
          },
        },
      });

      if (blocked) {
        return NextResponse.json(
          { code: 'BLOCKED', message: 'You cannot view this profile' },
          { status: 403 }
        );
      }
    }

    // Get belief map summary (top concepts)
    const beliefs = await db.belief.findMany({
      where: { userId: targetUserId },
      include: { concept: true },
      orderBy: { positionCount: 'desc' },
      take: 10,
    });

    // Get relationship status if authenticated
    let relationship = null;
    if (user && user.id !== targetUserId) {
      const [subscribed, subscribedBy, blocking, blockedBy] = await Promise.all([
        db.subscription.findUnique({
          where: {
            subscriberId_subscribedToId: {
              subscriberId: user.id,
              subscribedToId: targetUserId,
            },
          },
        }),
        db.subscription.findUnique({
          where: {
            subscriberId_subscribedToId: {
              subscriberId: targetUserId,
              subscribedToId: user.id,
            },
          },
        }),
        db.block.findUnique({
          where: {
            blockerId_blockedId: {
              blockerId: user.id,
              blockedId: targetUserId,
            },
          },
        }),
        db.block.findUnique({
          where: {
            blockerId_blockedId: {
              blockerId: targetUserId,
              blockedId: user.id,
            },
          },
        }),
      ]);

      relationship = {
        subscribed: !!subscribed,
        subscribedBy: !!subscribedBy,
        blocking: !!blocking,
        blockedBy: !!blockedBy,
      };
    }

    // Get recent published posts
    const posts = await db.post.findMany({
      where: {
        authorId: targetUserId,
        status: 'published',
      },
      select: {
        id: true,
        headlineClaim: true,
        authorStance: true,
        publishedAt: true,
        topicTags: true,
        referencedPost: { select: referencedPostSelect },
        _count: { select: { reactions: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      user: {
        id: targetUser.id,
        name: targetUser.name,
        avatarUrl: targetUser.avatarUrl,
        memberSince: targetUser.createdAt.toISOString(),
        postCount: targetUser._count.posts,
        subscriberCount: targetUser._count.subscribers,
        subscriptionCount: targetUser._count.subscriptions,
      },
      relationship,
      beliefMap: beliefs.map(b => ({
        conceptId: b.conceptId,
        label: b.concept.label,
        direction: b.direction,
        strength: b.strength,
        stability: b.stability,
        positionCount: b.positionCount,
      })),
      recentPosts: posts.map(p => ({
        id: p.id,
        headlineClaim: p.headlineClaim,
        authorStance: p.authorStance,
        publishedAt: p.publishedAt?.toISOString(),
        topicTags: p.topicTags,
        reactionCount: p._count.reactions,
        referencedPost: serializeReferencedPost(p.referencedPost),
      })),
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}
