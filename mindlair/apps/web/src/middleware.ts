import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/verify',
  '/privacy',
  '/security',
  '/how-it-works',
  '/install',
  '/offline',
];

const PUBLIC_API_PATHS = [
  '/api/auth/magic-link',
  '/api/auth/verify',
  '/api/auth/session',
  '/api/push/vapid-key',
];

const PROTECTED_APP_PATHS = [
  '/map',
  '/timeline',
  '/inbox',
  '/settings',
  '/query',
  '/wrapped',
  '/fingerprint',
  '/onboarding',
  '/feed',
  '/publish',
  '/my-posts',
  '/post',
  '/profile',
  '/nudges',
];

/**
 * 308 to a single hostname so session cookies and PWA installs stay on one origin
 * (e.g. www vs apex). Skips Vercel preview hosts and local dev.
 */
function tryCanonicalHostRedirect(request: NextRequest): NextResponse | null {
  const host = request.nextUrl.hostname.toLowerCase();
  if (host.endsWith('.vercel.app')) return null;
  if (host === 'localhost' || host === '127.0.0.1') return null;

  const explicit = process.env.CANONICAL_HOST?.trim().toLowerCase();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  let canonicalHost: string | null = explicit || null;
  let protocol = 'https:';

  if (appUrl) {
    try {
      const u = new URL(appUrl);
      if (!canonicalHost) canonicalHost = u.hostname.toLowerCase();
      if (!explicit) protocol = u.protocol;
    } catch {
      return null;
    }
  }

  if (!canonicalHost) return null;
  if (host === canonicalHost) return null;

  const dest = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    `${protocol}//${canonicalHost}`,
  );
  return NextResponse.redirect(dest, 308);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/icons') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const canonicalRedirect = tryCanonicalHostRedirect(request);
  if (canonicalRedirect) return canonicalRedirect;

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname) || PUBLIC_API_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    const apiKey = request.headers.get('x-api-key');
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    if (apiKey || sessionCookie?.value) {
      return NextResponse.next();
    }

    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401 },
    );
  }

  // Check if path requires authentication
  const requiresAuth = PROTECTED_APP_PATHS.some(
    p => pathname === p || pathname.startsWith(p + '/'),
  );

  if (requiresAuth) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      const base = process.env.NEXT_PUBLIC_APP_URL || request.url;
      const loginUrl = new URL('/login', base);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
