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
    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const digest = await db.digest.findFirst({
      where: {
        userId,
        status,
        expiresAt: { gt: new Date() },
      },
      orderBy: { generatedAt: 'desc' },
    });

    if (!digest) {
      const newDigest = await generateDigest(userId);
      return NextResponse.json({ digest: newDigest });
    }

    const claimIds = (digest.items as { claimId: string }[]).map(item => item.claimId);
    const claims = await db.claim.findMany({
      where: { id: { in: claimIds } },
      include: {
        source: true,
        claimConcepts: {
          include: { concept: true },
        },
        positions: {
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const claimMap = new Map(claims.map(c => [c.id, c]));
    const orderedClaims = claimIds.map(id => claimMap.get(id)).filter(Boolean);

    return NextResponse.json({
      digest: {
        id: digest.id,
        window: digest.window,
        status: digest.status,
        generatedAt: digest.generatedAt.toISOString(),
        expiresAt: digest.expiresAt.toISOString(),
      },
      claims: orderedClaims,
    });
  } catch (error) {
    console.error('Digest error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch digest' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }
    const userId = user.id;
    const body = await request.json();
    const { digestId, action } = body;

    const digest = await db.digest.findUnique({
      where: { id: digestId },
    });

    if (!digest || digest.userId !== userId) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Digest not found' },
        { status: 404 }
      );
    }

    if (action === 'open') {
      await db.digest.update({
        where: { id: digestId },
        data: {
          status: 'opened',
          openedAt: new Date(),
        },
      });

      await db.analyticsEvent.create({
        data: {
          userId,
          type: 'digest_opened',
          surface: 'web',
          payload: { digestId, window: digest.window },
        },
      });
    } else if (action === 'complete') {
      const openedAt = digest.openedAt || new Date();
      const durationMs = Date.now() - openedAt.getTime();

      await db.digest.update({
        where: { id: digestId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          durationMs,
        },
      });

      await db.analyticsEvent.create({
        data: {
          userId,
          type: 'digest_completed',
          surface: 'web',
          payload: { digestId, durationMs, window: digest.window },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Digest action error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to update digest' },
      { status: 500 }
    );
  }
}

async function generateDigest(userId: string) {
  const recentSources = await db.source.findMany({
    where: {
      userId,
      consumedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    include: {
      claims: {
        where: {
          positions: { none: { userId } },
        },
        take: 1,
      },
    },
    orderBy: { consumedAt: 'desc' },
    take: 20,
  });

  const claimIds = recentSources
    .flatMap(s => s.claims)
    .slice(0, 10)
    .map(c => ({ claimId: c.id, priority: 1 }));

  if (claimIds.length === 0) {
    const anyClaims = await db.claim.findMany({
      where: {
        positions: { none: { userId } },
      },
      take: 10,
      orderBy: { extractedAt: 'desc' },
    });
    claimIds.push(...anyClaims.map(c => ({ claimId: c.id, priority: 0.5 })));
  }

  const hour = new Date().getHours();
  const window = hour < 12 ? 'morning' : 'evening';

  const digest = await db.digest.create({
    data: {
      userId,
      window,
      items: claimIds,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    },
  });

  return {
    id: digest.id,
    window: digest.window,
    status: digest.status,
    generatedAt: digest.generatedAt.toISOString(),
    expiresAt: digest.expiresAt.toISOString(),
    claimCount: claimIds.length,
  };
}
