import { NextRequest, NextResponse } from 'next/server';
import {
  verifyMagicLinkToken,
  getOrCreateUser,
  createSession,
  setSessionCookie,
} from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/services/email';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url;

  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/verify?error=missing_token', baseUrl));
    }

    const email = await verifyMagicLinkToken(token);

    if (!email) {
      return NextResponse.redirect(new URL('/verify?error=invalid_token', baseUrl));
    }

    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    const isNewUser = !existingUser;

    const user = await getOrCreateUser(email);

    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor?.split(',')[0].trim() || undefined;

    const sessionToken = await createSession(user.id, userAgent, ipAddress);
    await setSessionCookie(sessionToken);

    if (isNewUser) {
      sendWelcomeEmail(email, user.name || undefined).catch(console.error);
      return NextResponse.redirect(new URL('/onboarding', baseUrl));
    }

    const fullUser = await db.user.findUnique({ where: { id: user.id }, select: { onboardingComplete: true } });
    if (fullUser && !fullUser.onboardingComplete) {
      return NextResponse.redirect(new URL('/onboarding', baseUrl));
    }

    return NextResponse.redirect(new URL('/map', baseUrl));
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.redirect(new URL('/verify?error=verification_failed', baseUrl));
  }
}
