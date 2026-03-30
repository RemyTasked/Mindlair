import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { fetchPocketItems, mapPocketItemToSource } from '@/lib/services/integrations/pocket';
import { isContentExplicit } from '@/lib/services/content-filter';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const connection = await db.connectedSource.findUnique({
      where: { userId_provider: { userId: user.id, provider: 'pocket' } },
    });

    if (!connection?.accessToken) {
      return NextResponse.json({ code: 'NOT_CONNECTED', message: 'Pocket not connected' }, { status: 400 });
    }

    const since = connection.lastSyncAt
      ? Math.floor(connection.lastSyncAt.getTime() / 1000)
      : undefined;

    const items = await fetchPocketItems(connection.accessToken, since);

    let imported = 0;
    for (const item of items) {
      if (item.status === 'deleted') continue;

      const mapped = mapPocketItemToSource(item);

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
          wordCount: mapped.metadata.wordCount,
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
      totalItems: items.length,
      imported,
    });
  } catch (error) {
    console.error('Pocket sync error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to sync Pocket' }, { status: 500 });
  }
}
