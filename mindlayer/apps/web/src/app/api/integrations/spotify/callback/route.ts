import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { exchangeSpotifyCode } from '@/lib/services/integrations/spotify';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(`${appUrl}/settings?spotify=error&reason=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?spotify=error&reason=missing_params`);
  }

  const stateParts = state.split(':');
  const userId = stateParts[0];
  const returnTo = stateParts[2] || '/settings';
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/settings?spotify=error&reason=invalid_state`);
  }

  try {
    const tokens = await exchangeSpotifyCode(code);

    await db.connectedSource.upsert({
      where: { userId_provider: { userId, provider: 'spotify' } },
      create: {
        userId,
        provider: 'spotify',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    });

    return NextResponse.redirect(`${appUrl}${returnTo}?spotify=connected`);
  } catch (err) {
    console.error('Spotify callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?spotify=error&reason=token_exchange_failed`);
  }
}
