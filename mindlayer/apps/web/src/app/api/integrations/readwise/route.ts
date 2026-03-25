import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ReadwiseClient, mapReadwiseToSource } from '@/lib/services/integrations/readwise';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }
    const userId = user.id;
    const body = await request.json();
    const { action, accessToken } = body;

    if (action === 'connect') {
      if (!accessToken) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Access token required' },
          { status: 400 }
        );
      }

      const client = new ReadwiseClient(accessToken);
      const isValid = await client.validateToken();

      if (!isValid) {
        return NextResponse.json(
          { code: 'INVALID_TOKEN', message: 'Invalid Readwise access token' },
          { status: 401 }
        );
      }

      await db.connectedSource.upsert({
        where: {
          userId_provider: { userId, provider: 'readwise' },
        },
        create: {
          userId,
          provider: 'readwise',
          accessToken,
        },
        update: {
          accessToken,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, message: 'Readwise connected' });
    }

    if (action === 'sync') {
      const connection = await db.connectedSource.findUnique({
        where: {
          userId_provider: { userId, provider: 'readwise' },
        },
      });

      if (!connection?.accessToken) {
        return NextResponse.json(
          { code: 'NOT_CONNECTED', message: 'Readwise not connected' },
          { status: 400 }
        );
      }

      const client = new ReadwiseClient(connection.accessToken);
      const lastSyncAt = connection.lastSyncAt?.toISOString();

      const books = await client.exportAll(lastSyncAt);

      let importedCount = 0;
      for (const book of books) {
        const sourceData = mapReadwiseToSource(book);

        const existingSource = await db.source.findFirst({
          where: {
            userId,
            url: sourceData.url,
          },
        });

        if (!existingSource) {
          await db.source.create({
            data: {
              userId,
              url: sourceData.url,
              title: sourceData.title,
              contentType: sourceData.contentType,
              surface: sourceData.surface,
              consumedAt: new Date(sourceData.consumedAt),
              author: sourceData.metadata.author as string,
            },
          });
          importedCount++;
        }
      }

      await db.connectedSource.update({
        where: {
          userId_provider: { userId, provider: 'readwise' },
        },
        data: {
          lastSyncAt: new Date(),
        },
      });

      await db.analyticsEvent.create({
        data: {
          userId,
          type: 'integration_sync',
          surface: 'web',
          payload: {
            provider: 'readwise',
            importedCount,
            totalFound: books.length,
          },
        },
      });

      return NextResponse.json({
        success: true,
        imported: importedCount,
        total: books.length,
      });
    }

    if (action === 'disconnect') {
      await db.connectedSource.delete({
        where: {
          userId_provider: { userId, provider: 'readwise' },
        },
      });

      return NextResponse.json({ success: true, message: 'Readwise disconnected' });
    }

    return NextResponse.json(
      { code: 'INVALID_ACTION', message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Readwise integration error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Integration error' },
      { status: 500 }
    );
  }
}

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

    const connection = await db.connectedSource.findUnique({
      where: {
        userId_provider: { userId, provider: 'readwise' },
      },
    });

    return NextResponse.json({
      connected: !!connection,
      lastSyncAt: connection?.lastSyncAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('Readwise status error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to check status' },
      { status: 500 }
    );
  }
}
