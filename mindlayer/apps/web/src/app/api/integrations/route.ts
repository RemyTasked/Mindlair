import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

const OAUTH_PROVIDERS = ['readwise', 'instapaper', 'spotify'];

const SURFACE_MAP: Record<string, string> = {
  readwise: 'readwise_import',
  instapaper: 'instapaper_import',
  spotify: 'spotify_import',
  youtube: 'youtube_import',
  rss: 'rss_feed',
};

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

    const [connections, sourcesByProvider, rssFeeds] = await Promise.all([
      db.connectedSource.findMany({ where: { userId } }),
      db.source.groupBy({
        by: ['surface'],
        where: {
          userId,
          surface: { in: Object.values(SURFACE_MAP) },
        },
        _count: true,
      }),
      db.rssFeed.findMany({
        where: { userId },
        select: { id: true, title: true, url: true, lastSyncAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const sourceCounts = Object.fromEntries(
      sourcesByProvider.map(item => [item.surface, item._count])
    );

    const integrations = OAUTH_PROVIDERS.map(provider => {
      const connection = connections.find(c => c.provider === provider);
      return {
        provider,
        connected: !!connection,
        lastSyncAt: connection?.lastSyncAt?.toISOString() || null,
        connectedAt: connection?.createdAt?.toISOString() || null,
        sourceCount: sourceCounts[SURFACE_MAP[provider]] || 0,
      };
    });

    const youtubeSourceCount = sourceCounts[SURFACE_MAP.youtube] || 0;
    const rssSourceCount = sourceCounts[SURFACE_MAP.rss] || 0;

    return NextResponse.json({
      integrations,
      youtube: {
        imported: youtubeSourceCount > 0,
        sourceCount: youtubeSourceCount,
      },
      rss: {
        feeds: rssFeeds,
        feedCount: rssFeeds.length,
        sourceCount: rssSourceCount,
      },
    });
  } catch (error) {
    console.error('Integrations status error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}
