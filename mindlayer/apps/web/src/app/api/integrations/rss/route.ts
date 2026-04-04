import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { fetchAndParseFeed, mapFeedItemToSource } from '@/lib/services/integrations/rss';
import { isContentExplicit } from '@/lib/services/content-filter';
import { getDomainFromUrl } from '@/lib/utils';

const addFeedSchema = z.object({
  url: z.string().url(),
});

const MAX_FEEDS_PER_USER = 100;

function normalizeToFeedUrl(input: string): string {
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();

    if (host.endsWith('.substack.com')) {
      return `${url.protocol}//${host}/feed`;
    }
    if (host.endsWith('.ghost.io') && !url.pathname.startsWith('/rss')) {
      return `${url.protocol}//${host}/rss/`;
    }
    if ((host === 'medium.com' || host.endsWith('.medium.com')) && !url.pathname.startsWith('/feed')) {
      const match = url.pathname.match(/^\/@([^/]+)/);
      if (match) {
        return `https://medium.com/feed/@${match[1]}`;
      }
    }

    return input;
  } catch {
    return input;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validation = addFeedSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: validation.error.message }, { status: 400 });
    }

    const feedCount = await db.rssFeed.count({ where: { userId: user.id } });
    if (feedCount >= MAX_FEEDS_PER_USER) {
      return NextResponse.json({ code: 'LIMIT_REACHED', message: `Maximum ${MAX_FEEDS_PER_USER} feeds allowed` }, { status: 400 });
    }

    const feedUrl = normalizeToFeedUrl(validation.data.url);

    const existing = await db.rssFeed.findUnique({
      where: { userId_url: { userId: user.id, url: feedUrl } },
    });
    if (existing) {
      return NextResponse.json({ code: 'DUPLICATE', message: 'Feed already added' }, { status: 409 });
    }

    const parsed = await fetchAndParseFeed(feedUrl);

    const feed = await db.rssFeed.create({
      data: {
        userId: user.id,
        url: feedUrl,
        title: parsed.meta.title,
        siteUrl: parsed.meta.siteUrl || null,
        lastSyncAt: new Date(),
        lastItemAt: parsed.items[0]?.publishedAt ? new Date(parsed.items[0].publishedAt) : null,
      },
    });

    const imported = await importFeedItems(user.id, feed.id, parsed.meta.title, parsed.items);

    return NextResponse.json({ feed, imported });
  } catch (error) {
    console.error('RSS add error:', error);
    const message = error instanceof Error ? error.message : 'Failed to add feed';
    return NextResponse.json({ code: 'FEED_ERROR', message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const feeds = await db.rssFeed.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ feeds });
  } catch (error) {
    console.error('RSS list error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to list feeds' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const feedId = searchParams.get('id');
    if (!feedId) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Feed id required' }, { status: 400 });
    }

    const deleted = await db.rssFeed.deleteMany({
      where: { id: feedId, userId: user.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Feed not found' }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('RSS delete error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to delete feed' }, { status: 500 });
  }
}

async function importFeedItems(
  userId: string,
  feedId: string,
  feedTitle: string,
  items: Awaited<ReturnType<typeof fetchAndParseFeed>>['items'],
): Promise<number> {
  let imported = 0;

  for (const item of items.slice(0, 50)) {
    const filter = isContentExplicit({ url: item.url, title: item.title });
    if (filter.blocked) continue;

    const existing = await db.source.findFirst({
      where: { userId, url: item.url },
    });
    if (existing) continue;

    const mapped = mapFeedItemToSource(item, feedTitle);
    await db.source.create({
      data: {
        userId,
        url: mapped.url,
        title: mapped.title,
        outlet: getDomainFromUrl(mapped.url),
        author: item.author,
        contentType: mapped.contentType,
        surface: 'rss_feed',
        publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
        consumedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
      },
    });
    imported++;
  }

  return imported;
}
