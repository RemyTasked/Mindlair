import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import db from '@/lib/db';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const session = await getSessionFromRequest(request);
    const userId = session?.userId;

    const card = await db.card.findUnique({
      where: { slug },
    });

    if (!card) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Card not found' },
        { status: 404 }
      );
    }

    let isEarned = false;
    let awardedAt: string | null = null;
    let evidence: unknown = null;
    let isShared = false;
    let isActive = true;

    if (userId) {
      const award = await db.cardAward.findUnique({
        where: {
          userId_cardId: {
            userId,
            cardId: card.id,
          },
        },
      });

      if (award) {
        isEarned = true;
        awardedAt = award.awardedAt.toISOString();
        evidence = award.evidence;
        isShared = award.isShared;
        isActive = award.isActive;
      }
    }

    // Get some stats about this card
    const awardCount = await db.cardAward.count({
      where: { cardId: card.id },
    });

    return NextResponse.json({
      card: {
        id: card.id,
        slug: card.slug,
        name: card.name,
        description: card.description,
        hint: isEarned ? null : card.hint, // Hide hint if already earned
        tier: card.tier,
        category: card.category,
        sortOrder: card.sortOrder,
        isEarned,
        awardedAt,
        evidence: isEarned ? evidence : null, // Only show evidence if earned
        isShared,
        isActive,
      },
      stats: {
        totalAwarded: awardCount,
      },
    });
  } catch (error) {
    console.error('Get card error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch card' },
      { status: 500 }
    );
  }
}
