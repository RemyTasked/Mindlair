import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getUserCardAwards } from '@/lib/services/card-detection';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { awards } = await getUserCardAwards(user.id);

    // Group by tier
    const commonAwards = awards.filter((a) => a.card.tier === 'common');
    const rareAwards = awards.filter((a) => a.card.tier === 'rare');
    const legendaryAwards = awards.filter((a) => a.card.tier === 'legendary');

    return NextResponse.json({
      awards,
      grouped: {
        common: commonAwards,
        rare: rareAwards,
        legendary: legendaryAwards,
      },
      stats: {
        total: awards.length,
        common: commonAwards.length,
        rare: rareAwards.length,
        legendary: legendaryAwards.length,
        shared: awards.filter((a) => a.isShared).length,
      },
    });
  } catch (error) {
    console.error('Get card awards error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch card awards' },
      { status: 500 }
    );
  }
}
