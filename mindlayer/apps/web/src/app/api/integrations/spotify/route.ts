import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { buildSpotifyAuthUrl } from '@/lib/services/integrations/spotify';
import db from '@/lib/db';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const connection = await db.connectedSource.findUnique({
      where: { userId_provider: { userId: user.id, provider: 'spotify' } },
      select: { id: true, lastSyncAt: true, createdAt: true },
    });

    return NextResponse.json({ connected: !!connection, connection });
  } catch (error) {
    console.error('Spotify status error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to get status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const state = `${user.id}:${crypto.randomBytes(16).toString('hex')}`;
    const authUrl = buildSpotifyAuthUrl(state);

    return NextResponse.json({ authUrl, state });
  } catch (error) {
    console.error('Spotify connect error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to initiate Spotify auth' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    await db.connectedSource.deleteMany({
      where: { userId: user.id, provider: 'spotify' },
    });

    return NextResponse.json({ disconnected: true });
  } catch (error) {
    console.error('Spotify disconnect error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to disconnect' }, { status: 500 });
  }
}
