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

    const [totalBeliefs, strongBeliefs, tensions, concepts] = await Promise.all([
      db.belief.count({ where: { userId } }),
      db.belief.count({ where: { userId, strength: { gte: 0.7 } } }),
      db.tension.count({
        where: {
          resolved: false,
          OR: [
            { conceptA: { beliefs: { some: { userId } } } },
            { conceptB: { beliefs: { some: { userId } } } },
          ],
        },
      }),
      db.belief.groupBy({
        by: ['conceptId'],
        where: { userId },
      }).then(r => r.length),
    ]);

    return NextResponse.json({
      totalBeliefs,
      strongBeliefs,
      tensions,
      concepts,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
