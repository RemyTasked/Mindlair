import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { fetchAndParseFeed } from '@/lib/services/integrations/rss';
import { isContentExplicit } from '@/lib/services/content-filter';
import { getDomainFromUrl } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const feeds = await db.rssFeed.findMany({ where: { userId: user.id } });

    const results: { feedId: string; title: string | null; imported: number; error?: string }[] = [];

    for (const feed of feeds) {
      try {
        const parsed = await fetchAndParseFeed(feed.url);

        let imported = 0;
        const cutoff = feed.lastItemAt || new Date(0);

        for (const item of parsed.items) {
          const itemDate = item.publishedAt ? new Date(item.publishedAt) : null;
          if (itemDate && itemDate <= cutoff) continue;

          const filter = isContentExplicit({ url: item.url, title: item.title });
          if (filter.blocked) continue;

          const existing = await db.source.findFirst({
            where: { userId: user.id, url: item.url },
          });
          if (existing) continue;

          await db.source.create({
            data: {
              userId: user.id,
              url: item.url,
              title: item.title || item.url,
              outlet: getDomainFromUrl(item.url),
              author: item.author,
              contentType: item.contentType,
              surface: 'rss_feed',
              publishedAt: itemDate,
              consumedAt: itemDate || new Date(),
            },
          });
          imported++;
        }

        const newestDate = parsed.items[0]?.publishedAt ? new Date(parsed.items[0].publishedAt) : null;
        await db.rssFeed.update({
          where: { id: feed.id },
          data: {
            lastSyncAt: new Date(),
            title: parsed.meta.title || feed.title,
            ...(newestDate && newestDate > cutoff ? { lastItemAt: newestDate } : {}),
            errorCount: 0,
          },
        });

        results.push({ feedId: feed.id, title: feed.title, imported });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        await db.rssFeed.update({
          where: { id: feed.id },
          data: { errorCount: { increment: 1 } },
        });
        results.push({ feedId: feed.id, title: feed.title, imported: 0, error: msg });
      }
    }

    const totalImported = results.reduce((sum, r) => sum + r.imported, 0);

    return NextResponse.json({ synced: results.length, totalImported, results });
  } catch (error) {
    console.error('RSS sync error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to sync feeds' }, { status: 500 });
  }
}
