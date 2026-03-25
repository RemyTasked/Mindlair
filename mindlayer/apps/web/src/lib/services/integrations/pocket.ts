const POCKET_API_BASE = 'https://getpocket.com/v3';
const POCKET_AUTH_URL = 'https://getpocket.com/auth';

export interface PocketItem {
  item_id: string;
  resolved_id: string;
  given_url: string;
  resolved_url: string;
  given_title: string;
  resolved_title: string;
  favorite: '0' | '1';
  status: '0' | '1' | '2';
  excerpt: string;
  is_article: '0' | '1';
  has_image: '0' | '1' | '2';
  has_video: '0' | '1' | '2';
  word_count: string;
  tags?: Record<string, { item_id: string; tag: string }>;
  authors?: Record<string, { item_id: string; author_id: string; name: string; url: string }>;
  images?: Record<string, { item_id: string; image_id: string; src: string }>;
  time_added: string;
  time_read: string;
  time_updated: string;
  time_favorited: string;
  listen_duration_estimate: number;
}

export interface PocketRetrieveResponse {
  status: number;
  complete: number;
  list: Record<string, PocketItem>;
  since: number;
}

export class PocketClient {
  private consumerKey: string;
  private accessToken: string;

  constructor(consumerKey: string, accessToken: string) {
    this.consumerKey = consumerKey;
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, data: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(`${POCKET_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Accept': 'application/json',
      },
      body: JSON.stringify({
        consumer_key: this.consumerKey,
        access_token: this.accessToken,
        ...data,
      }),
    });

    if (!response.ok) {
      const errorHeader = response.headers.get('X-Error');
      throw new Error(`Pocket API error: ${response.status} ${errorHeader || response.statusText}`);
    }

    return response.json();
  }

  async retrieve(params: {
    state?: 'unread' | 'archive' | 'all';
    favorite?: 0 | 1;
    tag?: string;
    contentType?: 'article' | 'video' | 'image';
    sort?: 'newest' | 'oldest' | 'title' | 'site';
    detailType?: 'simple' | 'complete';
    count?: number;
    offset?: number;
    since?: number;
  } = {}): Promise<PocketRetrieveResponse> {
    return this.request('/get', params);
  }

  async retrieveAll(since?: number): Promise<PocketItem[]> {
    const response = await this.retrieve({
      state: 'all',
      detailType: 'complete',
      since,
    });

    return Object.values(response.list);
  }

  static getAuthUrl(consumerKey: string, redirectUri: string): { url: string; requestToken: Promise<string> } {
    const requestTokenPromise = fetch(`${POCKET_API_BASE}/oauth/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Accept': 'application/json',
      },
      body: JSON.stringify({
        consumer_key: consumerKey,
        redirect_uri: redirectUri,
      }),
    })
      .then(res => res.json())
      .then(data => data.code as string);

    return {
      url: `${POCKET_AUTH_URL}/authorize`,
      requestToken: requestTokenPromise,
    };
  }

  static async exchangeToken(consumerKey: string, requestToken: string): Promise<{ accessToken: string; username: string }> {
    const response = await fetch(`${POCKET_API_BASE}/oauth/authorize`, {
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
      throw new Error('Failed to exchange Pocket token');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      username: data.username,
    };
  }
}

export function mapPocketToSource(item: PocketItem): {
  url: string;
  title: string;
  contentType: string;
  surface: string;
  consumedAt: string;
  metadata: Record<string, unknown>;
} {
  let contentType = 'article';
  if (item.has_video === '1' || item.has_video === '2') {
    contentType = 'video';
  } else if (item.listen_duration_estimate > 0) {
    contentType = 'audio';
  }

  const authors = item.authors 
    ? Object.values(item.authors).map(a => a.name)
    : [];

  const tags = item.tags
    ? Object.values(item.tags).map(t => t.tag)
    : [];

  return {
    url: item.resolved_url || item.given_url,
    title: item.resolved_title || item.given_title || item.resolved_url,
    contentType,
    surface: 'pocket_import',
    consumedAt: new Date(parseInt(item.time_added) * 1000).toISOString(),
    metadata: {
      excerpt: item.excerpt,
      wordCount: parseInt(item.word_count) || undefined,
      authors,
      tags,
      favorite: item.favorite === '1',
      status: item.status === '1' ? 'archived' : item.status === '2' ? 'deleted' : 'unread',
      pocketItemId: item.item_id,
      listenDurationEstimate: item.listen_duration_estimate,
    },
  };
}
