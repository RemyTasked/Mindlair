import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getSessionByToken,
  clearSessionCookie,
  deleteSession,
  deleteAllUserSessions,
  setSessionCookie,
} from '@/lib/auth';

const SESSION_COOKIE_NAME = 'mindlair_session';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    // Validate session and refresh expiry if needed (pass true for refreshIfNeeded)
    const user = await getSessionByToken(sessionCookie.value, true);

    if (!user) {
      // Session was invalid or expired - clear the cookie
      await clearSessionCookie();
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    // Refresh the cookie to extend its lifetime
    await setSessionCookie(sessionCookie.value);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 200 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const allDevices = searchParams.get('all') === 'true';

    const user = await getSessionFromCookie();

    if (user && allDevices) {
      await deleteAllUserSessions(user.id);
    } else {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
      if (sessionCookie?.value) {
        await deleteSession(sessionCookie.value);
      }
    }

    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }
}
