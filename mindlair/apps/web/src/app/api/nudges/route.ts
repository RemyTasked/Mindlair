import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { createBlindSpotNudges } from '@/lib/services/belief-graph';
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

    const nudges = await db.nudge.findMany({
      where: {
        userId,
        status,
        expiresAt: { gt: new Date() },
      },
      include: {
        concept: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Get total pending count
    const totalPending = await db.nudge.count({
      where: {
        userId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
    });

    // Map nudges to include conceptLabel
    const mappedNudges = nudges.map(nudge => ({
      ...nudge,
      conceptLabel: nudge.concept?.label || 'General',
    }));

    return NextResponse.json({ 
      nudges: mappedNudges,
      totalPending,
    });
  } catch (error) {
    console.error('Nudges error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch nudges' },
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
    const { nudgeId, action, feedback } = body;

    const nudge = await db.nudge.findUnique({
      where: { id: nudgeId },
    });

    if (!nudge || nudge.userId !== userId) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Nudge not found' },
        { status: 404 }
      );
    }

    if (action === 'click' || action === 'clicked') {
      await db.nudge.update({
        where: { id: nudgeId },
        data: {
          status: 'clicked',
          clickedAt: new Date(),
        },
      });

      await db.analyticsEvent.create({
        data: {
          userId,
          type: 'nudge_clicked',
          surface: 'web',
          payload: {
            nudgeId,
            nudgeType: nudge.type,
            conceptId: nudge.conceptId,
          },
        },
      });
    } else if (action === 'dismiss' || action === 'dismissed') {
      await db.nudge.update({
        where: { id: nudgeId },
        data: {
          status: 'dismissed',
          dismissedAt: new Date(),
          feedback,
        },
      });

      await db.analyticsEvent.create({
        data: {
          userId,
          type: 'nudge_dismissed',
          surface: 'web',
          payload: {
            nudgeId,
            nudgeType: nudge.type,
            conceptId: nudge.conceptId,
            feedback,
          },
        },
      });
    } else if (action === 'helpful' || action === 'not_helpful') {
      await db.nudge.update({
        where: { id: nudgeId },
        data: {
          feedback: action,
        },
      });

      await db.analyticsEvent.create({
        data: {
          userId,
          type: 'nudge_feedback',
          surface: 'web',
          payload: {
            nudgeId,
            nudgeType: nudge.type,
            conceptId: nudge.conceptId,
            feedback: action,
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Nudge action error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to update nudge' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const nudgeType = searchParams.get('type') || 'all';

    let echoCreatedCount = 0;
    let blindSpotCreatedCount = 0;

    // Generate echo chamber nudges
    if (nudgeType === 'all' || nudgeType === 'echo_chamber') {
      const echoFlaggedBeliefs = await db.belief.findMany({
        where: {
          userId,
          echoFlagged: true,
        },
        include: {
          concept: true,
        },
      });

      for (const belief of echoFlaggedBeliefs) {
        const existingNudge = await db.nudge.findFirst({
          where: {
            userId,
            conceptId: belief.conceptId,
            type: 'echo_chamber',
            status: 'pending',
            expiresAt: { gt: new Date() },
          },
        });

        if (!existingNudge) {
          await db.nudge.create({
            data: {
              userId,
              conceptId: belief.conceptId,
              type: 'echo_chamber',
              sourceUrl: '',
              sourceTitle: `Explore ${belief.concept.label}`,
              framing: `You've consistently ${belief.direction === 'positive' ? 'agreed with' : 'disagreed with'} claims about ${belief.concept.label}. Want to see a different perspective?`,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
          echoCreatedCount++;
        }
      }
    }

    // Generate blind spot nudges
    if (nudgeType === 'all' || nudgeType === 'blind_spot') {
      blindSpotCreatedCount = await createBlindSpotNudges(userId);
    }

    return NextResponse.json({ 
      success: true, 
      createdCount: echoCreatedCount + blindSpotCreatedCount,
      echoCreatedCount,
      blindSpotCreatedCount,
    });
  } catch (error) {
    console.error('Generate nudges error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to generate nudges' },
      { status: 500 }
    );
  }
}
