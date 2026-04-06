import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import db from './db';

const SESSION_COOKIE_NAME = 'mindlayer_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAGIC_LINK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
  createdAt: Date;
}

export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createMagicLinkToken(email: string): Promise<string> {
  const token = generateToken();
  const hashedToken = hashToken(token);

  await db.magicLinkToken.create({
    data: {
      email: email.toLowerCase(),
      token: hashedToken,
      expiresAt: new Date(Date.now() + MAGIC_LINK_DURATION_MS),
    },
  });

  return token;
}

/** Removes a magic-link row so failed email sends do not count toward rate limits. */
export async function revokeMagicLinkToken(plaintextToken: string): Promise<void> {
  const hashedToken = hashToken(plaintextToken);
  await db.magicLinkToken.deleteMany({
    where: { token: hashedToken },
  });
}

export async function verifyMagicLinkToken(token: string): Promise<string | null> {
  const hashedToken = hashToken(token);

  const magicLink = await db.magicLinkToken.findUnique({
    where: { token: hashedToken },
  });

  if (!magicLink) {
    return null;
  }

  if (magicLink.usedAt) {
    return null;
  }

  if (magicLink.expiresAt < new Date()) {
    return null;
  }

  await db.magicLinkToken.update({
    where: { id: magicLink.id },
    data: { usedAt: new Date() },
  });

  return magicLink.email;
}

export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const token = generateToken();
  const hashedToken = hashToken(token);

  await db.session.create({
    data: {
      userId,
      token: hashedToken,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
      userAgent,
      ipAddress,
    },
  });

  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionFromCookie(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  return getSessionByToken(sessionCookie.value);
}

export async function getSessionByToken(token: string): Promise<AuthUser | null> {
  const hashedToken = hashToken(token);

  const session = await db.session.findUnique({
    where: { token: hashedToken },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } });
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    emailVerified: session.user.emailVerified,
    createdAt: session.user.createdAt,
  };
}

export async function deleteSession(token: string): Promise<void> {
  const hashedToken = hashToken(token);
  
  await db.session.deleteMany({
    where: { token: hashedToken },
  });
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await db.session.deleteMany({
    where: { userId },
  });
}

export async function validateApiKey(apiKey: string): Promise<AuthUser | null> {
  const key = await db.apiKey.findUnique({
    where: { key: apiKey },
    include: { user: true },
  });

  if (!key) {
    return null;
  }

  await db.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    id: key.user.id,
    email: key.user.email,
    name: key.user.name,
    emailVerified: key.user.emailVerified,
    createdAt: key.user.createdAt,
  };
}

export async function createApiKey(userId: string, name: string): Promise<string> {
  const key = `ml_${generateToken(24)}`;

  await db.apiKey.create({
    data: {
      userId,
      key,
      name,
    },
  });

  return key;
}

export async function listApiKeys(userId: string) {
  return db.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      key: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteApiKey(userId: string, keyId: string): Promise<boolean> {
  const result = await db.apiKey.deleteMany({
    where: {
      id: keyId,
      userId,
    },
  });

  return result.count > 0;
}

export async function getOrCreateUser(email: string): Promise<AuthUser> {
  const normalizedEmail = email.toLowerCase();

  let user = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        email: normalizedEmail,
        emailVerified: new Date(),
      },
    });
  } else if (!user.emailVerified) {
    user = await db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

export async function getAuthFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return validateApiKey(apiKey);
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (sessionCookie?.value) {
    return getSessionByToken(sessionCookie.value);
  }

  return null;
}

export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getAuthFromRequest(request);
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function checkMagicLinkRateLimit(email: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const recentRequests = await db.magicLinkToken.count({
    where: {
      email: email.toLowerCase(),
      createdAt: { gte: oneHourAgo },
    },
  });

  // Successful sends only: failed deliveries revoke their row (see magic-link route).
  return recentRequests < 5;
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
