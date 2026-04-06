import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

const PREVIEW_LEN = 140;

function previewText(text: string): string {
  const t = text.trim();
  if (t.length <= PREVIEW_LEN) return t;
  return `${t.slice(0, PREVIEW_LEN).trim()}…`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      );
    }

    const conceptId = request.nextUrl.searchParams.get('conceptId');
    if (!conceptId || !conceptId.trim()) {
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
          claimConcepts: { some: { conceptId: conceptId.trim() } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        stance: true,
        context: true,
        createdAt: true,
        claim: { select: { id: true, text: true } },
      },
    });

    const positions = rows.map((r) => ({
      stance: r.stance,
      context: r.context,
      createdAt: r.createdAt.toISOString(),
      claim: {
        id: r.claim.id,
        textPreview: previewText(r.claim.text),
      },
    }));

    return NextResponse.json({ positions });
  } catch (error) {
    console.error('Map recent-positions error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch recent positions' },
      { status: 500 },
    );
  }
}
