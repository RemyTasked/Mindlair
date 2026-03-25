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

    const connections = await db.connectedSource.findMany({
      where: { userId },
    });

    const integrations = ['readwise', 'pocket', 'instapaper'].map(provider => {
      const connection = connections.find(c => c.provider === provider);
      return {
        provider,
        connected: !!connection,
        lastSyncAt: connection?.lastSyncAt?.toISOString() || null,
        connectedAt: connection?.createdAt?.toISOString() || null,
      };
    });

    const sourcesByProvider = await db.source.groupBy({
      by: ['surface'],
      where: {
        userId,
        surface: {
          in: ['readwise_import', 'pocket_import', 'instapaper_import'],
        },
      },
      _count: true,
    });

    const sourceCounts = Object.fromEntries(
      sourcesByProvider.map(item => [item.surface, item._count])
    );

    return NextResponse.json({
      integrations: integrations.map(i => ({
        ...i,
        sourceCount: sourceCounts[`${i.provider}_import`] || 0,
      })),
    });
  } catch (error) {
    console.error('Integrations status error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}
