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

    const belief = await db.belief.findFirst({
      where: { userId: user.id, conceptId },
    });
    if (!belief) {
      return NextResponse.json({ tensions: [] });
    }

    const rows = await db.tension.findMany({
      where: {
        OR: [{ conceptAId: conceptId }, { conceptBId: conceptId }],
      },
      include: {
        conceptA: { select: { id: true, label: true } },
        conceptB: { select: { id: true, label: true } },
      },
    });

    const tensions = rows.map(t => {
      const isA = t.conceptAId === conceptId;
      const other = isA ? t.conceptB : t.conceptA;
      let explanation: string | null = null;
      if (t.metadata && typeof t.metadata === 'object' && !Array.isArray(t.metadata)) {
        const m = t.metadata as Record<string, unknown>;
        if (typeof m.explanation === 'string') explanation = m.explanation;
        else if (typeof m.summary === 'string') explanation = m.summary;
      }
      return {
        otherId: other.id,
        otherLabel: other.label,
        tensionType: t.tensionType,
        surfacedCount: t.surfacedCount,
        resolved: t.resolved,
        explanation,
      };
    });

    return NextResponse.json({ tensions });
  } catch (error) {
    console.error('tensions-for error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch tensions' },
      { status: 500 },
    );
  }
}
