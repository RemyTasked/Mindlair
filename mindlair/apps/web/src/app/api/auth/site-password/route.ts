import { NextRequest, NextResponse } from 'next/server';

export const SITE_ACCESS_COOKIE = 'mindlair-site-access';

export async function POST(request: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD;

  if (!sitePassword) {
    return NextResponse.json({ redirectTo: '/' });
  }

  let body: { password?: string; redirect?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { password, redirect } = body;

  if (password !== sitePassword) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const redirectTo = redirect && redirect.startsWith('/') ? redirect : '/';

  const response = NextResponse.json({ redirectTo });
  response.cookies.set(SITE_ACCESS_COOKIE, sitePassword, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}
