import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { fetchReadwiseBooks, mapReadwiseBookToSource } from '@/lib/services/integrations/readwise';
import { isContentExplicit } from '@/lib/services/content-filter';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const connection = await db.connectedSource.findUnique({
      where: { userId_provider: { userId: user.id, provider: 'readwise' } },
    });

    if (!connection?.accessToken) {
      return NextResponse.json({ code: 'NOT_CONNECTED', message: 'Readwise not connected' }, { status: 400 });
    }

    const updatedAfter = connection.lastSyncAt?.toISOString();

    let books;
    try {
      books = await fetchReadwiseBooks(connection.accessToken, updatedAfter);
    } catch (err) {
      if (err instanceof Error && err.message === 'INVALID_TOKEN') {
        return NextResponse.json({ code: 'INVALID_TOKEN', message: 'Readwise token expired — please reconnect' }, { status: 401 });
      }
      throw err;
    }

    let imported = 0;
    for (const book of books) {
      if (book.numHighlights === 0) continue;

      const mapped = mapReadwiseBookToSource(book);

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
          author: mapped.metadata.author || null,
          contentType: mapped.contentType,
          surface: mapped.surface,
          consumedAt: mapped.consumedAt ? new Date(mapped.consumedAt) : new Date(),
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
      totalBooks: books.length,
      imported,
    });
  } catch (error) {
    console.error('Readwise sync error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to sync Readwise' }, { status: 500 });
  }
}
