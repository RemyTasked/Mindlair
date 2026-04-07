import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      );
    }

    const conceptId = request.nextUrl.searchParams.get('conceptId')?.trim();
    if (!conceptId) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'conceptId is required' },
        { status: 400 },
      );
    }

    const rows = await db.position.findMany({
      where: {
        userId: user.id,
        stance: { not: 'skip' },
        claim: {
          claimConcepts: { some: { conceptId } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 120,
      select: {
        createdAt: true,
        claim: {
          select: {
            source: {
              select: {
                id: true,
                title: true,
                url: true,
                outlet: true,
                consumedAt: true,
              },
            },
          },
        },
      },
    });

    const sourceSeen = new Set<string>();
    const sources: Array<{
      id: string;
      title: string;
      url: string;
      outlet: string | null;
      date: string;
    }> = [];

    let lastActive: string | null = null;
    for (const r of rows) {
      if (!lastActive) lastActive = r.createdAt.toISOString();
      const src = r.claim.source;
      if (!src || sourceSeen.has(src.id)) continue;
      sourceSeen.add(src.id);
      if (sources.length < 8) {
        sources.push({
          id: src.id,
          title: src.title || src.url.slice(0, 80) || 'Source',
          url: src.url,
          outlet: src.outlet,
          date: src.consumedAt.toISOString(),
        });
      }
    }

    return NextResponse.json({
      reactionCount: rows.length,
      sourceCount: sourceSeen.size,
      lastActive,
      sources,
    });
  } catch (error) {
    console.error('concept-summary error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch concept summary' },
      { status: 500 },
    );
  }
}
