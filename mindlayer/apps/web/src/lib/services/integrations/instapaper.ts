/**
 * Instapaper integration.
 * Uses Instapaper's simple xAuth (username/password → OAuth token)
 * then Full API for fetching bookmarks.
 *
 * Instapaper uses OAuth 1.0a with xAuth for token exchange.
 * For simplicity, we use their "simple" auth endpoint which accepts
 * email + password and returns an oauth token pair.
 */

import crypto from 'crypto';

const INSTAPAPER_AUTH_URL = 'https://www.instapaper.com/api/1/oauth/access_token';
const INSTAPAPER_BOOKMARKS_URL = 'https://www.instapaper.com/api/1/bookmarks/list';
const INSTAPAPER_VERIFY_URL = 'https://www.instapaper.com/api/1/account/verify_credentials';

export function getInstapaperConfig() {
  const consumerKey = process.env.INSTAPAPER_CONSUMER_KEY;
  const consumerSecret = process.env.INSTAPAPER_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error('Instapaper credentials not configured');
  }

  return { consumerKey, consumerSecret };
}

function generateOAuthParams(consumerKey: string) {
  return {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
  };
}

function signRequest(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = '',
): string {
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

export async function authenticateInstapaper(
  email: string,
  password: string,
): Promise<{ oauthToken: string; oauthTokenSecret: string }> {
  const { consumerKey, consumerSecret } = getInstapaperConfig();

  const oauthParams = {
    ...generateOAuthParams(consumerKey),
    x_auth_username: email,
    x_auth_password: password,
    x_auth_mode: 'client_auth',
  };

  const signature = signRequest('POST', INSTAPAPER_AUTH_URL, oauthParams, consumerSecret);
  oauthParams['oauth_signature' as keyof typeof oauthParams] = signature;

  const body = new URLSearchParams(oauthParams);

  const response = await fetch(INSTAPAPER_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Instapaper auth failed: ${response.status}`);
  }

  const text = await response.text();
  const result = new URLSearchParams(text);

  const oauthToken = result.get('oauth_token');
  const oauthTokenSecret = result.get('oauth_token_secret');

  if (!oauthToken || !oauthTokenSecret) {
    throw new Error('Invalid auth response from Instapaper');
  }

  return { oauthToken, oauthTokenSecret };
}

export interface InstapaperBookmark {
  bookmarkId: number;
  url: string;
  title: string;
  description: string;
  time: number;
  progress: number;
  progressTimestamp: number;
  hash: string;
}

export async function fetchInstapaperBookmarks(
  oauthToken: string,
  oauthTokenSecret: string,
  folderId?: string,
): Promise<InstapaperBookmark[]> {
  const { consumerKey, consumerSecret } = getInstapaperConfig();

  const oauthParams: Record<string, string> = {
    ...generateOAuthParams(consumerKey),
    oauth_token: oauthToken,
    limit: '100',
  };
  if (folderId) oauthParams.folder_id = folderId;

  const signature = signRequest('POST', INSTAPAPER_BOOKMARKS_URL, oauthParams, consumerSecret, oauthTokenSecret);
  oauthParams.oauth_signature = signature;

  const body = new URLSearchParams(oauthParams);

  const response = await fetch(INSTAPAPER_BOOKMARKS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('TOKEN_EXPIRED');
    throw new Error(`Instapaper fetch failed: ${response.status}`);
  }

  const data = await response.json();
  const bookmarks: InstapaperBookmark[] = [];

  for (const item of data) {
    if (item.type !== 'bookmark') continue;
    bookmarks.push({
      bookmarkId: item.bookmark_id,
      url: item.url,
      title: item.title || item.url,
      description: (item.description || '').slice(0, 500),
      time: item.time,
      progress: item.progress || 0,
      progressTimestamp: item.progress_timestamp || 0,
      hash: item.hash || '',
    });
  }

  return bookmarks;
}

export async function verifyInstapaperCredentials(
  oauthToken: string,
  oauthTokenSecret: string,
): Promise<boolean> {
  const { consumerKey, consumerSecret } = getInstapaperConfig();

  const oauthParams: Record<string, string> = {
    ...generateOAuthParams(consumerKey),
    oauth_token: oauthToken,
  };

  const signature = signRequest('POST', INSTAPAPER_VERIFY_URL, oauthParams, consumerSecret, oauthTokenSecret);
  oauthParams.oauth_signature = signature;

  const body = new URLSearchParams(oauthParams);

  const response = await fetch(INSTAPAPER_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  return response.ok;
}

export function mapInstapaperBookmarkToSource(bookmark: InstapaperBookmark) {
  return {
    url: bookmark.url,
    title: bookmark.title,
    contentType: 'article' as const,
    surface: 'instapaper_import' as const,
    consumedAt: bookmark.time
      ? new Date(bookmark.time * 1000).toISOString()
      : new Date().toISOString(),
    metadata: {
      outlet: getDomainSimple(bookmark.url),
      completionPercent: bookmark.progress,
    },
  };
}

function getDomainSimple(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
