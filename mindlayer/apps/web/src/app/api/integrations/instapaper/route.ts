import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { InstapaperClient, mapInstapaperToSource } from '@/lib/services/integrations/instapaper';
import { getAuthFromRequest } from '@/lib/auth';

const INSTAPAPER_CONSUMER_KEY = process.env.INSTAPAPER_CONSUMER_KEY || '';
const INSTAPAPER_CONSUMER_SECRET = process.env.INSTAPAPER_CONSUMER_SECRET || '';

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
    const { action, username, password } = body;

    if (action === 'connect') {
      if (!username || !password) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Username and password required' },
          { status: 400 }
        );
      }

      try {
        const { oauthToken, oauthTokenSecret } = await InstapaperClient.getAccessToken(
          INSTAPAPER_CONSUMER_KEY,
          INSTAPAPER_CONSUMER_SECRET,
          username,
          password
        );

        const credentials = JSON.stringify({ oauthToken, oauthTokenSecret });

        await db.connectedSource.upsert({
          where: {
            userId_provider: { userId, provider: 'instapaper' },
          },
          create: {
            userId,
            provider: 'instapaper',
            accessToken: credentials,
          },
          update: {
            accessToken: credentials,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Instapaper connected',
        });
      } catch (error) {
        return NextResponse.json(
          { code: 'AUTH_FAILED', message: 'Invalid Instapaper credentials' },
          { status: 401 }
        );
      }
    }

    if (action === 'sync') {
      const connection = await db.connectedSource.findUnique({
        where: {
          userId_provider: { userId, provider: 'instapaper' },
        },
      });

      if (!connection?.accessToken) {
        return NextResponse.json(
          { code: 'NOT_CONNECTED', message: 'Instapaper not connected' },
          { status: 400 }
        );
      }

      const credentials = JSON.parse(connection.accessToken);
      const client = new InstapaperClient({
        consumerKey: INSTAPAPER_CONSUMER_KEY,
        consumerSecret: INSTAPAPER_CONSUMER_SECRET,
        oauthToken: credentials.oauthToken,
        oauthTokenSecret: credentials.oauthTokenSecret,
      });

      const bookmarks = await client.listAllBookmarks();

      let importedCount = 0;
      for (const bookmark of bookmarks) {
        const sourceData = mapInstapaperToSource(bookmark);

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
            },
          });
          importedCount++;
        }
      }

      await db.connectedSource.update({
        where: {
          userId_provider: { userId, provider: 'instapaper' },
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
            provider: 'instapaper',
            importedCount,
            totalFound: bookmarks.length,
          },
        },
      });

      return NextResponse.json({
        success: true,
        imported: importedCount,
        total: bookmarks.length,
      });
    }

    if (action === 'disconnect') {
      await db.connectedSource.delete({
        where: {
          userId_provider: { userId, provider: 'instapaper' },
        },
      });

      return NextResponse.json({ success: true, message: 'Instapaper disconnected' });
    }

    return NextResponse.json(
      { code: 'INVALID_ACTION', message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Instapaper integration error:', error);
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
        userId_provider: { userId, provider: 'instapaper' },
      },
    });

    return NextResponse.json({
      connected: !!connection,
      lastSyncAt: connection?.lastSyncAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('Instapaper status error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to check status' },
      { status: 500 }
    );
  }
}
