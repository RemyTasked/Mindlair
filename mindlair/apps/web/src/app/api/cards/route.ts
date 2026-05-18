import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getCardCatalog } from '@/lib/services/card-detection';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.userId;

    const { cards } = await getCardCatalog(userId);

    // Group cards by tier
    const commonCards = cards.filter((c) => c.tier === 'common');
    const rareCards = cards.filter((c) => c.tier === 'rare');
    const legendaryCards = cards.filter((c) => c.tier === 'legendary');

    // Calculate stats
    const earnedCount = cards.filter((c) => c.isEarned).length;
    const totalCount = cards.length;

    return NextResponse.json({
      cards,
      grouped: {
        common: commonCards,
        rare: rareCards,
        legendary: legendaryCards,
      },
      stats: {
        earned: earnedCount,
        total: totalCount,
        commonEarned: commonCards.filter((c) => c.isEarned).length,
        commonTotal: commonCards.length,
        rareEarned: rareCards.filter((c) => c.isEarned).length,
        rareTotal: rareCards.length,
        legendaryEarned: legendaryCards.filter((c) => c.isEarned).length,
        legendaryTotal: legendaryCards.length,
      },
    });
  } catch (error) {
    console.error('Get card catalog error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch card catalog' },
      { status: 500 }
    );
  }
}
