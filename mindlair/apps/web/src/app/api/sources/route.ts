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
    const limit = parseInt(searchParams.get('limit') || '10');

    const sources = await db.source.findMany({
      where: { userId },
      orderBy: { consumedAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { claims: true },
        },
      },
    });

    return NextResponse.json({
      sources: sources.map(source => ({
        id: source.id,
        title: source.title,
        url: source.url,
        consumedAt: source.consumedAt.toISOString(),
        claimCount: source._count.claims,
        contentType: source.contentType,
        surface: source.surface,
      })),
    });
  } catch (error) {
    console.error('Sources error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}
