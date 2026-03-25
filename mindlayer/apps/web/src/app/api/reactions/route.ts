import { NextRequest, NextResponse } from 'next/server';
import { submitReactionSchema } from '@/lib/validations';
import db from '@/lib/db';
import { updateBeliefGraph } from '@/lib/services/belief-graph';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = submitReactionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: validation.error.message },
        { status: 400 }
      );
    }

    const { claimId, stance, context, note } = validation.data;
    const userId = user.id;

    const claim = await db.claim.findUnique({
      where: { id: claimId },
      include: {
        claimConcepts: true,
      },
    });

    if (!claim) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Claim not found' },
        { status: 404 }
      );
    }

    const previousPosition = await db.position.findFirst({
      where: { userId, claimId },
      orderBy: { createdAt: 'desc' },
    });

    const position = await db.position.create({
      data: {
        userId,
        claimId,
        stance,
        note,
        context: context || 'digest',
        supersedesId: previousPosition?.id,
      },
    });

    const conceptIds = claim.claimConcepts.map(cc => cc.conceptId);
    await updateBeliefGraph(userId, claimId, stance, conceptIds);

    await db.analyticsEvent.create({
      data: {
        userId,
        type: 'position_recorded',
        surface: context || 'digest',
        payload: {
          positionId: position.id,
          claimId,
          stance,
          isEvolution: !!previousPosition,
          previousStance: previousPosition?.stance,
        },
      },
    });

    return NextResponse.json({
      positionId: position.id,
      claimId,
      stance,
      createdAt: position.createdAt.toISOString(),
      isEvolution: !!previousPosition,
    });
  } catch (error) {
    console.error('Reaction error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to record reaction' },
      { status: 500 }
    );
  }
}

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
    const claimId = searchParams.get('claimId');

    if (claimId) {
      const positions = await db.position.findMany({
        where: { userId, claimId },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ positions });
    }

    const recentPositions = await db.position.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        claim: {
          include: {
            source: true,
            claimConcepts: {
              include: { concept: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ positions: recentPositions });
  } catch (error) {
    console.error('Get reactions error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch reactions' },
      { status: 500 }
    );
  }
}
