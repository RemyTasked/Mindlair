import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

function generateInsightText(
  direction: string,
  stability: number,
  echoFlagged: boolean,
  label: string,
  positionCount: number
): string {
  const lowerLabel = label.toLowerCase();
  
  if (direction === 'negative' && stability > 0.6) {
    return `You consistently push back on ${lowerLabel} arguments.`;
  }
  if (direction === 'positive' && echoFlagged) {
    return `This is a strongly held position — consider exploring counterarguments.`;
  }
  if (direction === 'positive' && stability > 0.7) {
    return `You've shown consistent agreement with ${lowerLabel} claims.`;
  }
  if (direction === 'mixed' && positionCount > 5) {
    return `Your views on ${lowerLabel} are nuanced — you see multiple sides.`;
  }
  if (direction === 'negative' && positionCount > 3) {
    return `You tend to disagree with mainstream ${lowerLabel} positions.`;
  }
  if (direction === 'positive') {
    return `You generally align with ${lowerLabel} perspectives.`;
  }
  if (direction === 'negative') {
    return `You often challenge ${lowerLabel} claims.`;
  }
  return `You've engaged with ${lowerLabel} from various angles.`;
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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

    const conceptId = request.nextUrl.searchParams.get('conceptId')?.trim();
    if (!conceptId) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'conceptId is required' },
        { status: 400 },
      );
    }

    const [belief, concept, rows, userData] = await Promise.all([
      db.belief.findUnique({
        where: {
          userId_conceptId: { userId: user.id, conceptId },
        },
        select: {
          direction: true,
          strength: true,
          stability: true,
          echoFlagged: true,
          positionCount: true,
        },
      }),
      db.concept.findUnique({
        where: { id: conceptId },
        select: { label: true },
      }),
      db.position.findMany({
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
          stance: true,
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
      }),
      db.user.findUnique({
        where: { id: user.id },
        select: { createdAt: true },
      }),
    ]);

    const sourceSeen = new Map<string, string>();
    const sources: Array<{
      id: string;
      title: string;
      url: string;
      outlet: string | null;
      date: string;
      stance: string;
    }> = [];

    let lastActive: string | null = null;
    const engagementByMonth: Record<string, number> = {};
    
    for (const r of rows) {
      if (!lastActive) lastActive = r.createdAt.toISOString();
      
      const monthKey = getMonthKey(r.createdAt);
      engagementByMonth[monthKey] = (engagementByMonth[monthKey] || 0) + 1;
      
      const src = r.claim.source;
      if (!src) continue;
      
      if (!sourceSeen.has(src.id)) {
        sourceSeen.set(src.id, r.stance);
        if (sources.length < 8) {
          sources.push({
            id: src.id,
            title: src.title || src.url.slice(0, 80) || 'Source',
            url: src.url,
            outlet: src.outlet,
            date: src.consumedAt.toISOString(),
            stance: r.stance,
          });
        }
      }
    }

    const now = new Date();
    const userSignup = userData?.createdAt ? new Date(userData.createdAt) : now;
    const signupMonth = new Date(userSignup.getFullYear(), userSignup.getMonth(), 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthsData: Array<{ month: string; count: number }> = [];
    const tempDate = new Date(signupMonth);
    
    while (tempDate <= currentMonth) {
      const key = getMonthKey(tempDate);
      const monthName = tempDate.toLocaleString('en-US', { month: 'short' });
      monthsData.push({
        month: monthName,
        count: engagementByMonth[key] || 0,
      });
      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    const insightText = belief && concept
      ? generateInsightText(
          belief.direction,
          belief.stability,
          belief.echoFlagged,
          concept.label,
          belief.positionCount
        )
      : null;

    return NextResponse.json({
      reactionCount: rows.length,
      sourceCount: sourceSeen.size,
      lastActive,
      sources,
      insightText,
      engagementByMonth: monthsData,
      belief: belief
        ? {
            direction: belief.direction,
            strength: belief.strength,
            stability: belief.stability,
            echoFlagged: belief.echoFlagged,
          }
        : null,
    });
  } catch (error) {
    console.error('concept-summary error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch concept summary' },
      { status: 500 },
    );
  }
}
