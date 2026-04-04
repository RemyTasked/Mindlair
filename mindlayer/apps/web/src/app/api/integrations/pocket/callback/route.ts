import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { exchangePocketToken } from '@/lib/services/integrations/pocket';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.redirect(`${appUrl}/settings?pocket=error&reason=not_authenticated`);
    }

    const connection = await db.connectedSource.findUnique({
      where: { userId_provider: { userId: user.id, provider: 'pocket' } },
    });

    if (!connection?.refreshToken) {
      return NextResponse.redirect(`${appUrl}/settings?pocket=error&reason=no_request_token`);
    }

    const requestToken = connection.refreshToken;
    const { accessToken, username } = await exchangePocketToken(requestToken);

    await db.connectedSource.update({
      where: { id: connection.id },
      data: {
        accessToken,
        refreshToken: null,
      },
    });

    const fullUser = await db.user.findUnique({ where: { id: user.id }, select: { onboardingComplete: true } });
    const returnTo = fullUser && !fullUser.onboardingComplete ? '/onboarding' : '/settings';
    return NextResponse.redirect(`${appUrl}${returnTo}?pocket=connected&username=${encodeURIComponent(username)}`);
  } catch (err) {
    console.error('Pocket callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?pocket=error&reason=exchange_failed`);
  }
}
