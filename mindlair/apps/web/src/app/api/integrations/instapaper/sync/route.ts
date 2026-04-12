import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { fetchInstapaperBookmarks, mapInstapaperBookmarkToSource } from '@/lib/services/integrations/instapaper';
import { isContentExplicit } from '@/lib/services/content-filter';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const connection = await db.connectedSource.findUnique({
      where: { userId_provider: { userId: user.id, provider: 'instapaper' } },
    });

    if (!connection?.accessToken || !connection?.refreshToken) {
      return NextResponse.json({ code: 'NOT_CONNECTED', message: 'Instapaper not connected' }, { status: 400 });
    }

    let bookmarks;
    try {
      bookmarks = await fetchInstapaperBookmarks(
        connection.accessToken,
        connection.refreshToken,
      );
    } catch (err) {
      if (err instanceof Error && err.message === 'TOKEN_EXPIRED') {
        return NextResponse.json({ code: 'TOKEN_EXPIRED', message: 'Reconnect Instapaper' }, { status: 401 });
      }
      throw err;
    }

    let imported = 0;
    for (const bookmark of bookmarks) {
      const mapped = mapInstapaperBookmarkToSource(bookmark);

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
          outlet: mapped.metadata.outlet || null,
          contentType: mapped.contentType,
          surface: mapped.surface,
          completionPercent: mapped.metadata.completionPercent || null,
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
      totalBookmarks: bookmarks.length,
      imported,
    });
  } catch (error) {
    console.error('Instapaper sync error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to sync Instapaper' }, { status: 500 });
  }
}
