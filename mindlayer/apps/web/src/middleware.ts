import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'mindlayer_session';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/verify',
  '/privacy',
  '/security',
  '/how-it-works',
  '/install',
];

const PUBLIC_API_PATHS = [
  '/api/auth/magic-link',
  '/api/auth/verify',
  '/api/auth/session',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/static') ||
      pathname.includes('.')) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.includes(pathname) || PUBLIC_API_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    const apiKey = request.headers.get('x-api-key');
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    
    if (apiKey || sessionCookie?.value) {
      return NextResponse.next();
    }

    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401 }
    );
  }

  if (pathname.startsWith('/map') || 
      pathname.startsWith('/timeline') || 
      pathname.startsWith('/inbox') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/query') ||
      pathname.startsWith('/wrapped') ||
      pathname.startsWith('/onboarding')) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie?.value) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
