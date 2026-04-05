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

    // Check if Spotify credentials are configured
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    // Debug: Log all env var keys that contain SPOTIFY
    const spotifyVars = Object.keys(process.env).filter(k => k.includes('SPOTIFY'));
    console.log('Available SPOTIFY env vars:', spotifyVars);
    console.log('SPOTIFY_CLIENT_ID length:', clientId?.length);
    console.log('SPOTIFY_CLIENT_SECRET length:', clientSecret?.length);
    
    if (!clientId || !clientSecret) {
      console.error('Spotify credentials missing:', { 
        hasClientId: !!clientId, 
        hasClientSecret: !!clientSecret,
        allEnvKeys: Object.keys(process.env).slice(0, 20) // Log first 20 env keys for debugging
      });
      return NextResponse.json({ 
        code: 'CONFIG_ERROR', 
        message: `Spotify is not configured. Found vars: ${spotifyVars.join(', ') || 'none'}. Please check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.`
      }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const returnTo = body.returnTo || '/settings';
    const state = `${user.id}:${crypto.randomBytes(16).toString('hex')}:${returnTo}`;
    const authUrl = buildSpotifyAuthUrl(state);

    return NextResponse.json({ authUrl, state });
  } catch (error) {
    console.error('Spotify connect error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: `Failed to initiate Spotify auth: ${errorMessage}` }, { status: 500 });
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
