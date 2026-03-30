import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getRequestToken, buildPocketAuthUrl } from '@/lib/services/integrations/pocket';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const connection = await db.connectedSource.findUnique({
      where: { userId_provider: { userId: user.id, provider: 'pocket' } },
      select: { id: true, lastSyncAt: true, createdAt: true },
    });

    return NextResponse.json({ connected: !!connection, connection });
  } catch (error) {
    console.error('Pocket status error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to get status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const requestToken = await getRequestToken();
    const authUrl = buildPocketAuthUrl(requestToken);

    // Store request_token temporarily in the connected source for callback
    await db.connectedSource.upsert({
      where: { userId_provider: { userId: user.id, provider: 'pocket' } },
      create: {
        userId: user.id,
        provider: 'pocket',
        refreshToken: requestToken, // temp store for request_token
      },
      update: {
        refreshToken: requestToken,
      },
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Pocket connect error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to initiate Pocket auth' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    await db.connectedSource.deleteMany({
      where: { userId: user.id, provider: 'pocket' },
    });

    return NextResponse.json({ disconnected: true });
  } catch (error) {
    console.error('Pocket disconnect error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to disconnect' }, { status: 500 });
  }
}
