import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie';

const SITE_ACCESS_COOKIE = 'mindlair-site-access';

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
  '/api/auth/site-password',
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

  // Site-wide password gate — only active when SITE_PASSWORD env var is set.
  // Bypassed for:
  //   - the gate page/API themselves
  //   - cron jobs (use CRON_SECRET)
  //   - magic link verification (token is its own proof of access)
  //   - users who already have a valid session cookie (they're already in)
  const sitePassword = process.env.SITE_PASSWORD;
  if (sitePassword) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    const hasSession = Boolean(sessionCookie?.value);

    const bypassPaths = new Set([
      '/password',
      '/api/auth/site-password',
      '/verify',
      '/api/auth/verify',
    ]);
    const isCronRoute = pathname.startsWith('/api/cron/');
    const isBypassPath = bypassPaths.has(pathname);

    if (!isBypassPath && !isCronRoute && !hasSession) {
      const accessCookie = request.cookies.get(SITE_ACCESS_COOKIE);
      if (accessCookie?.value !== sitePassword) {
        const base = process.env.NEXT_PUBLIC_APP_URL || request.url;
        const dest = new URL('/password', base);
        if (pathname !== '/') {
          dest.searchParams.set(
            'redirect',
            pathname + request.nextUrl.search,
          );
        }
        return NextResponse.redirect(dest);
      }
    }
  }

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname) || PUBLIC_API_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    // Cron routes have their own auth (CRON_SECRET via Authorization header)
    if (pathname.startsWith('/api/cron/')) {
      return NextResponse.next();
    }

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
