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

    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 5), 20) : 5;

    const mergedIdsParam = request.nextUrl.searchParams.get('mergedIds');
    const mergedIds = mergedIdsParam ? mergedIdsParam.split(',').map(id => id.trim()).filter(Boolean) : [];

    const allConceptIds = [conceptId.trim(), ...mergedIds];

    const rows = await db.position.findMany({
      where: {
        userId: user.id,
        stance: { not: 'skip' },
        claim: {
          claimConcepts: { some: { conceptId: { in: allConceptIds } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        stance: true,
        context: true,
        createdAt: true,
        claim: { 
          select: { 
            id: true, 
            text: true,
            claimConcepts: {
              where: { conceptId: { in: allConceptIds } },
              select: { concept: { select: { label: true } } },
            },
          } 
        },
      },
    });

    const positions = rows.map((r) => ({
      stance: r.stance,
      context: r.context,
      createdAt: r.createdAt.toISOString(),
      claim: {
        id: r.claim.id,
        textPreview: previewText(r.claim.text),
        contributingConcepts: r.claim.claimConcepts.map(cc => cc.concept.label),
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
