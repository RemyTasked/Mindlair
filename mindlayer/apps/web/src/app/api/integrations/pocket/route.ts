import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { PocketClient, mapPocketToSource } from '@/lib/services/integrations/pocket';
import { getAuthFromRequest } from '@/lib/auth';

const POCKET_CONSUMER_KEY = process.env.POCKET_CONSUMER_KEY || '';

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
    const { action, requestToken, accessToken } = body;

    if (action === 'get_auth_url') {
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/settings?pocket=callback`;
      
      const response = await fetch('https://getpocket.com/v3/oauth/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Accept': 'application/json',
        },
        body: JSON.stringify({
          consumer_key: POCKET_CONSUMER_KEY,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get Pocket request token');
      }

      const data = await response.json();
      const authUrl = `https://getpocket.com/auth/authorize?request_token=${data.code}&redirect_uri=${encodeURIComponent(redirectUri)}`;

      return NextResponse.json({
        authUrl,
        requestToken: data.code,
      });
    }

    if (action === 'exchange_token') {
      if (!requestToken) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Request token required' },
          { status: 400 }
        );
      }

      const { accessToken: token, username } = await PocketClient.exchangeToken(
        POCKET_CONSUMER_KEY,
        requestToken
      );

      await db.connectedSource.upsert({
        where: {
          userId_provider: { userId, provider: 'pocket' },
        },
        create: {
          userId,
          provider: 'pocket',
          accessToken: token,
        },
        update: {
          accessToken: token,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Pocket connected',
        username,
      });
    }

    if (action === 'sync') {
      const connection = await db.connectedSource.findUnique({
        where: {
          userId_provider: { userId, provider: 'pocket' },
        },
      });

      if (!connection?.accessToken) {
        return NextResponse.json(
          { code: 'NOT_CONNECTED', message: 'Pocket not connected' },
          { status: 400 }
        );
      }

      const client = new PocketClient(POCKET_CONSUMER_KEY, connection.accessToken);
      const lastSyncAt = connection.lastSyncAt 
        ? Math.floor(connection.lastSyncAt.getTime() / 1000)
        : undefined;

      const items = await client.retrieveAll(lastSyncAt);

      let importedCount = 0;
      for (const item of items) {
        const sourceData = mapPocketToSource(item);

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
              wordCount: sourceData.metadata.wordCount as number | undefined,
            },
          });
          importedCount++;
        }
      }

      await db.connectedSource.update({
        where: {
          userId_provider: { userId, provider: 'pocket' },
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
            provider: 'pocket',
            importedCount,
            totalFound: items.length,
          },
        },
      });

      return NextResponse.json({
        success: true,
        imported: importedCount,
        total: items.length,
      });
    }

    if (action === 'disconnect') {
      await db.connectedSource.delete({
        where: {
          userId_provider: { userId, provider: 'pocket' },
        },
      });

      return NextResponse.json({ success: true, message: 'Pocket disconnected' });
    }

    return NextResponse.json(
      { code: 'INVALID_ACTION', message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Pocket integration error:', error);
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
        userId_provider: { userId, provider: 'pocket' },
      },
    });

    return NextResponse.json({
      connected: !!connection,
      lastSyncAt: connection?.lastSyncAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('Pocket status error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to check status' },
      { status: 500 }
    );
  }
}
