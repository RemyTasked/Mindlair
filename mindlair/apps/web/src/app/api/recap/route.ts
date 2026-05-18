import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getUserRecap, getRecapHistory, markRecapViewed } from '@/lib/jobs/weekly-recap';

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
    const history = searchParams.get('history') === 'true';
    const limit = parseInt(searchParams.get('limit') || '12');

    if (history) {
      const recaps = await getRecapHistory(user.id, limit);
      return NextResponse.json({ recaps });
    }

    const recap = await getUserRecap(user.id);

    // Mark as viewed if it hasn't been
    if (recap.recap && !recap.recap.viewedAt) {
      await markRecapViewed(recap.recap.id);
    }

    return NextResponse.json(recap);
  } catch (error) {
    console.error('Get recap error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch recap' },
      { status: 500 }
    );
  }
}
