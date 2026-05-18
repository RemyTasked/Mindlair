import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { toggleCardShare } from '@/lib/services/card-detection';
import db from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const award = await db.cardAward.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        card: true,
      },
    });

    if (!award) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Card award not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      award: {
        id: award.id,
        card: {
          id: award.card.id,
          slug: award.card.slug,
          name: award.card.name,
          description: award.card.description,
          hint: award.card.hint,
          tier: award.card.tier,
          category: award.card.category,
        },
        evidence: award.evidence,
        isActive: award.isActive,
        isShared: award.isShared,
        awardedAt: award.awardedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get card award error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch card award' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'toggle_share') {
      const result = await toggleCardShare(user.id, id);
      
      if (!result) {
        return NextResponse.json(
          { code: 'NOT_FOUND', message: 'Card award not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        isShared: result.isShared,
      });
    }

    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Update card award error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to update card award' },
      { status: 500 }
    );
  }
}
