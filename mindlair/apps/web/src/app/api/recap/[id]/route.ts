import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import db from '@/lib/db';
import { markRecapViewed } from '@/lib/jobs/weekly-recap';

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

    const recap = await db.weeklyRecap.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        awards: {
          include: {
            card: {
              select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                tier: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!recap) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Recap not found' },
        { status: 404 }
      );
    }

    // Mark as viewed
    if (!recap.viewedAt) {
      await markRecapViewed(id);
    }

    return NextResponse.json({
      recap: {
        id: recap.id,
        weekStart: recap.weekStart.toISOString(),
        stats: recap.stats,
        deliveredAt: recap.deliveredAt?.toISOString() || null,
        viewedAt: recap.viewedAt?.toISOString() || new Date().toISOString(),
        createdAt: recap.createdAt.toISOString(),
      },
      awards: recap.awards.map((a) => ({
        id: a.id,
        card: a.card,
        awardedAt: a.awardedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get recap detail error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch recap' },
      { status: 500 }
    );
  }
}
