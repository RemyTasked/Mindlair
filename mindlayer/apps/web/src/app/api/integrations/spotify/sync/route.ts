import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import {
  fetchRecentlyPlayedEpisodes,
  refreshSpotifyToken,
  mapEpisodeToSource,
} from '@/lib/services/integrations/spotify';
import { isContentExplicit } from '@/lib/services/content-filter';
import { getDomainFromUrl } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const connection = await db.connectedSource.findUnique({
      where: { userId_provider: { userId: user.id, provider: 'spotify' } },
    });

    if (!connection || !connection.accessToken) {
      return NextResponse.json({ code: 'NOT_CONNECTED', message: 'Spotify not connected' }, { status: 400 });
    }

    let accessToken = connection.accessToken;

    if (connection.expiresAt && connection.expiresAt < new Date()) {
      if (!connection.refreshToken) {
        return NextResponse.json({ code: 'TOKEN_EXPIRED', message: 'Reconnect Spotify' }, { status: 401 });
      }
      const refreshed = await refreshSpotifyToken(connection.refreshToken);
      accessToken = refreshed.accessToken;

      await db.connectedSource.update({
        where: { id: connection.id },
        data: {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt: refreshed.expiresAt,
        },
      });
    }

    let episodes;
    try {
      episodes = await fetchRecentlyPlayedEpisodes(accessToken);
    } catch (err) {
      console.error('Spotify fetch error:', err);
      if (err instanceof Error && err.message === 'TOKEN_EXPIRED' && connection.refreshToken) {
        try {
          const refreshed = await refreshSpotifyToken(connection.refreshToken);
          accessToken = refreshed.accessToken;
          await db.connectedSource.update({
            where: { id: connection.id },
            data: {
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken,
              expiresAt: refreshed.expiresAt,
            },
          });
          episodes = await fetchRecentlyPlayedEpisodes(accessToken);
        } catch (refreshErr) {
          console.error('Spotify token refresh failed:', refreshErr);
          return NextResponse.json({ 
            code: 'TOKEN_REFRESH_FAILED', 
            message: 'Please reconnect Spotify - your authorization has expired' 
          }, { status: 401 });
        }
      } else if (err instanceof Error && err.message.includes('Spotify API error: 403')) {
        return NextResponse.json({ 
          code: 'FORBIDDEN', 
          message: 'Spotify access denied. Your account may need to be added to the app\'s allowed users list.' 
        }, { status: 403 });
      } else {
        throw err;
      }
    }

    let imported = 0;
    for (const episode of episodes) {
      const mapped = mapEpisodeToSource(episode);

      const filter = isContentExplicit({ url: mapped.url, title: mapped.title });
      if (filter.blocked) continue;

      const existing = await db.source.findFirst({
        where: { userId: user.id, url: mapped.url },
      });
      if (existing) continue;

      await db.source.create({
        data: {
          userId: user.id,
          url: mapped.url,
          title: mapped.title,
          outlet: episode.showName || getDomainFromUrl(mapped.url),
          author: episode.showPublisher || null,
          contentType: mapped.contentType,
          surface: mapped.surface,
          videoDurationMs: episode.durationMs,
          consumedAt: new Date(mapped.consumedAt),
        },
      });
      imported++;
    }

    await db.connectedSource.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      synced: true,
      totalEpisodes: episodes.length,
      imported,
      message: episodes.length === 0 
        ? 'No podcast episodes found in your recent listening history. Spotify only tracks podcasts, not music.'
        : `Imported ${imported} podcast episode${imported !== 1 ? 's' : ''}`,
    });
  } catch (error) {
    console.error('Spotify sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('Spotify API error: 403')) {
      return NextResponse.json({ 
        code: 'FORBIDDEN', 
        message: 'Spotify access denied. Your account may need to be added to the app\'s allowed users list.' 
      }, { status: 403 });
    }
    
    return NextResponse.json({ 
      code: 'INTERNAL_ERROR', 
      message: 'Failed to sync Spotify. Please try disconnecting and reconnecting.' 
    }, { status: 500 });
  }
}
