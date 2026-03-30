/**
 * Pocket integration.
 * Uses Pocket's custom OAuth flow (request token → authorize → access token).
 * Syncs saved articles and their read status.
 */

const POCKET_REQUEST_URL = 'https://getpocket.com/v3/oauth/request';
const POCKET_AUTH_URL = 'https://getpocket.com/auth/authorize';
const POCKET_ACCESS_URL = 'https://getpocket.com/v3/oauth/authorize';
const POCKET_GET_URL = 'https://getpocket.com/v3/get';

export function getPocketConfig() {
  const consumerKey = process.env.POCKET_CONSUMER_KEY;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/pocket/callback`;

  if (!consumerKey) {
    throw new Error('Pocket consumer key not configured');
  }

  return { consumerKey, redirectUri };
}

export async function getRequestToken(): Promise<string> {
  const { consumerKey, redirectUri } = getPocketConfig();

  const response = await fetch(POCKET_REQUEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Accept': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: consumerKey,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Pocket request token failed: ${response.status}`);
  }

  const data = await response.json();
  return data.code;
}

export function buildPocketAuthUrl(requestToken: string): string {
  const { redirectUri } = getPocketConfig();
  const params = new URLSearchParams({
    request_token: requestToken,
    redirect_uri: `${redirectUri}?request_token=${requestToken}`,
  });
  return `${POCKET_AUTH_URL}?${params}`;
}

export async function exchangePocketToken(requestToken: string): Promise<{
  accessToken: string;
  username: string;
}> {
  const { consumerKey } = getPocketConfig();

  const response = await fetch(POCKET_ACCESS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Accept': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: consumerKey,
      code: requestToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Pocket access token failed: ${response.status}`);
  }

  const data = await response.json();
  return { accessToken: data.access_token, username: data.username };
}

export interface PocketItem {
  itemId: string;
  resolvedUrl: string;
  givenUrl: string;
  title: string;
  excerpt?: string;
  wordCount?: number;
  isArticle: boolean;
  isVideo: boolean;
  timeAdded: string;
  timeRead?: string;
  status: 'unread' | 'archived' | 'deleted';
}

export async function fetchPocketItems(
  accessToken: string,
  since?: number,
): Promise<PocketItem[]> {
  const { consumerKey } = getPocketConfig();

  const body: Record<string, unknown> = {
    consumer_key: consumerKey,
    access_token: accessToken,
    detailType: 'complete',
    sort: 'newest',
    count: 200,
  };
  if (since) body.since = since;

  const response = await fetch(POCKET_GET_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Pocket fetch failed: ${response.status}`);
  }

  const data = await response.json();
  const list = data.list || {};
  const items: PocketItem[] = [];

  for (const raw of Object.values(list)) {
    const item = raw as Record<string, unknown>;
    const resolvedUrl = (item.resolved_url as string) || (item.given_url as string) || '';
    if (!resolvedUrl) continue;

    const status = item.status === '1' ? 'archived' : item.status === '2' ? 'deleted' : 'unread';

    items.push({
      itemId: item.item_id as string,
      resolvedUrl,
      givenUrl: (item.given_url as string) || resolvedUrl,
      title: (item.resolved_title as string) || (item.given_title as string) || resolvedUrl,
      excerpt: (item.excerpt as string)?.slice(0, 500),
      wordCount: item.word_count ? parseInt(item.word_count as string) : undefined,
      isArticle: item.is_article === '1',
      isVideo: item.has_video === '2',
      timeAdded: new Date(parseInt(item.time_added as string) * 1000).toISOString(),
      timeRead: item.time_read && item.time_read !== '0'
        ? new Date(parseInt(item.time_read as string) * 1000).toISOString()
        : undefined,
      status,
    });
  }

  return items.sort((a, b) => new Date(b.timeAdded).getTime() - new Date(a.timeAdded).getTime());
}

export function mapPocketItemToSource(item: PocketItem) {
  return {
    url: item.resolvedUrl,
    title: item.title,
    contentType: item.isVideo ? 'video' : 'article',
    surface: 'pocket_import' as const,
    consumedAt: item.timeRead || item.timeAdded,
    metadata: {
      wordCount: item.wordCount,
      outlet: getDomainSimple(item.resolvedUrl),
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
