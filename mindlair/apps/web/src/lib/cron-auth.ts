import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates a cron request by checking the Authorization header
 * against the CRON_SECRET env var.
 *
 * Returns null if authorized, or a 401 NextResponse if not.
 *
 * Caller pattern:
 *   const unauthorized = assertCronAuth(request);
 *   if (unauthorized) return unauthorized;
 */
export function assertCronAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error('[cron] CRON_SECRET not configured — refusing all cron calls');
    return NextResponse.json(
      { code: 'NOT_CONFIGURED', message: 'Cron is not configured on the server' },
      { status: 503 }
    );
  }

  const header = request.headers.get('authorization') || '';
  const provided = header.startsWith('Bearer ')
    ? header.slice(7).trim()
    : header.trim();

  if (provided !== secret) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Invalid cron credentials' },
      { status: 401 }
    );
  }

  return null;
}
