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

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const captures = await db.capture.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const captureIds = captures.map((c) => c.id);

    if (captureIds.length === 0) {
      return NextResponse.json({
        period: { days, since: since.toISOString() },
        totals: { kept: 0, dropped: 0, edited: 0, stance_flipped: 0 },
        ratios: { kept: 0, dropped: 0, edited: 0, stance_flipped: 0 },
        topEdits: [],
      });
    }

    const feedbackCounts = await db.extractionFeedback.groupBy({
      by: ['action'],
      where: {
        captureId: { in: captureIds },
        createdAt: { gte: since },
      },
      _count: true,
    });

    const totals: Record<string, number> = {
      kept: 0,
      dropped: 0,
      edited: 0,
      stance_flipped: 0,
    };

    for (const row of feedbackCounts) {
      if (row.action in totals) {
        totals[row.action] = row._count;
      }
    }

    const total = Object.values(totals).reduce((a, b) => a + b, 0);

    const ratios: Record<string, number> = {};
    for (const key of Object.keys(totals)) {
      ratios[key] = total > 0 ? Number((totals[key] / total).toFixed(4)) : 0;
    }

    const recentEdits = await db.extractionFeedback.findMany({
      where: {
        captureId: { in: captureIds },
        action: 'edited',
        finalText: { not: null },
        createdAt: { gte: since },
      },
      select: {
        claimText: true,
        finalText: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const topEdits = recentEdits.map((edit) => ({
      original: edit.claimText,
      edited: edit.finalText,
      date: edit.createdAt.toISOString(),
    }));

    const weeklyBreakdown = await db.$queryRaw<
      Array<{ week: Date; action: string; count: bigint }>
    >`
      SELECT 
        DATE_TRUNC('week', "createdAt") as week,
        action,
        COUNT(*) as count
      FROM extraction_feedback
      WHERE "captureId" = ANY(${captureIds})
        AND "createdAt" >= ${since}
      GROUP BY DATE_TRUNC('week', "createdAt"), action
      ORDER BY week DESC
    `;

    const weekly: Record<string, Record<string, number>> = {};
    for (const row of weeklyBreakdown) {
      const weekKey = new Date(row.week).toISOString().split('T')[0];
      if (!weekly[weekKey]) {
        weekly[weekKey] = { kept: 0, dropped: 0, edited: 0, stance_flipped: 0 };
      }
      if (row.action in weekly[weekKey]) {
        weekly[weekKey][row.action] = Number(row.count);
      }
    }

    return NextResponse.json({
      period: { days, since: since.toISOString() },
      totals,
      ratios,
      weekly,
      topEdits,
    });
  } catch (error) {
    console.error('Extraction stats error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch extraction stats' },
      { status: 500 }
    );
  }
}
