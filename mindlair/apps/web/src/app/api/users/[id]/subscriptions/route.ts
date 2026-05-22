import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/users/:id/subscriptions
 * Returns the list of users that :id is subscribed to.
 * Query params:
 *   - type: "subscriptions" (default) | "subscribers"
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetUserId } = await params;
    const viewer = await getAuthFromRequest(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') === 'subscribers' ? 'subscribers' : 'subscriptions';

    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    if (viewer && viewer.id !== targetUserId) {
      const blocked = await db.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: targetUserId,
            blockedId: viewer.id,
          },
        },
      });

      if (blocked) {
        return NextResponse.json(
          { code: 'BLOCKED', message: 'You cannot view this list' },
          { status: 403 }
        );
      }
    }

    const userSelect = {
      id: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
      _count: {
        select: {
          posts: { where: { status: 'published' as const } },
          subscribers: true,
        },
      },
    };

    let users: Array<{
      id: string;
      name: string | null;
      avatarUrl: string | null;
      memberSince: string;
      postCount: number;
      subscriberCount: number;
      subscribedSince: string;
    }>;

    if (type === 'subscriptions') {
      const subs = await db.subscription.findMany({
        where: { subscriberId: targetUserId },
        orderBy: { createdAt: 'desc' },
        include: { subscribedTo: { select: userSelect } },
      });
      users = subs.map((s) => ({
        id: s.subscribedTo.id,
        name: s.subscribedTo.name,
        avatarUrl: s.subscribedTo.avatarUrl,
        memberSince: s.subscribedTo.createdAt.toISOString(),
        postCount: s.subscribedTo._count.posts,
        subscriberCount: s.subscribedTo._count.subscribers,
        subscribedSince: s.createdAt.toISOString(),
      }));
    } else {
      const subs = await db.subscription.findMany({
        where: { subscribedToId: targetUserId },
        orderBy: { createdAt: 'desc' },
        include: { subscriber: { select: userSelect } },
      });
      users = subs.map((s) => ({
        id: s.subscriber.id,
        name: s.subscriber.name,
        avatarUrl: s.subscriber.avatarUrl,
        memberSince: s.subscriber.createdAt.toISOString(),
        postCount: s.subscriber._count.posts,
        subscriberCount: s.subscriber._count.subscribers,
        subscribedSince: s.createdAt.toISOString(),
      }));
    }

    let viewerSubscriptionIds: Set<string> = new Set();
    if (viewer) {
      const viewerSubs = await db.subscription.findMany({
        where: {
          subscriberId: viewer.id,
          subscribedToId: { in: users.map((u) => u.id) },
        },
        select: { subscribedToId: true },
      });
      viewerSubscriptionIds = new Set(viewerSubs.map((s) => s.subscribedToId));
    }

    return NextResponse.json({
      type,
      users: users.map((u) => ({
        ...u,
        isSubscribedByViewer: viewer ? viewerSubscriptionIds.has(u.id) : false,
        isSelf: viewer ? viewer.id === u.id : false,
      })),
    });
  } catch (error) {
    console.error('Get subscriptions list error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch subscription list' },
      { status: 500 }
    );
  }
}
