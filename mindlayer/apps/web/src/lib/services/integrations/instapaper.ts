const INSTAPAPER_API_BASE = 'https://www.instapaper.com/api/1.1';

export interface InstapaperBookmark {
  bookmark_id: number;
  url: string;
  title: string;
  description: string;
  time: number;
  progress: number;
  progress_timestamp: number;
  type: 'bookmark' | 'error';
  starred: '0' | '1';
  private_source: string;
  hash: string;
}

export interface InstapaperFolder {
  folder_id: number;
  title: string;
  slug: string;
  display_title: string;
  sync_to_mobile: number;
  position: number;
  type: 'folder' | 'error';
}

export interface InstapaperHighlight {
  highlight_id: number;
  bookmark_id: number;
  text: string;
  note: string;
  time: number;
  position: number;
  type: 'highlight' | 'error';
}

export class InstapaperClient {
  private consumerKey: string;
  private consumerSecret: string;
  private oauthToken: string;
  private oauthTokenSecret: string;

  constructor(credentials: {
    consumerKey: string;
    consumerSecret: string;
    oauthToken: string;
    oauthTokenSecret: string;
  }) {
    this.consumerKey = credentials.consumerKey;
    this.consumerSecret = credentials.consumerSecret;
    this.oauthToken = credentials.oauthToken;
    this.oauthTokenSecret = credentials.oauthTokenSecret;
  }

  private generateOAuthSignature(
    method: string,
    url: string,
    params: Record<string, string>
  ): string {
    const sortedParams = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const signatureBase = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(sortedParams),
    ].join('&');

    const signingKey = `${encodeURIComponent(this.consumerSecret)}&${encodeURIComponent(this.oauthTokenSecret)}`;

    const hmac = require('crypto').createHmac('sha1', signingKey);
    return hmac.update(signatureBase).digest('base64');
  }

  private getOAuthParams(): Record<string, string> {
    return {
      oauth_consumer_key: this.consumerKey,
      oauth_token: this.oauthToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: Math.random().toString(36).substring(2),
      oauth_version: '1.0',
    };
  }

  private async request<T>(
    endpoint: string,
    method: string = 'POST',
    data: Record<string, string> = {}
  ): Promise<T> {
    const url = `${INSTAPAPER_API_BASE}${endpoint}`;
    const oauthParams = this.getOAuthParams();
    const allParams = { ...oauthParams, ...data };
    
    const signature = this.generateOAuthSignature(method, url, allParams);
    allParams.oauth_signature = signature;

    const authHeader = 'OAuth ' + Object.entries(oauthParams)
      .concat([['oauth_signature', signature]])
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(', ');

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: method !== 'GET' ? new URLSearchParams(data).toString() : undefined,
    });

    if (!response.ok) {
      throw new Error(`Instapaper API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async verifyCredentials(): Promise<{ user_id: number; username: string }[]> {
    return this.request('/account/verify_credentials');
  }

  async listBookmarks(params: {
    limit?: number;
    folder_id?: string;
    have?: string;
  } = {}): Promise<(InstapaperBookmark | InstapaperFolder)[]> {
    const data: Record<string, string> = {};
    if (params.limit) data.limit = params.limit.toString();
    if (params.folder_id) data.folder_id = params.folder_id;
    if (params.have) data.have = params.have;

    return this.request('/bookmarks/list', 'POST', data);
  }

  async getHighlights(bookmarkId: number): Promise<InstapaperHighlight[]> {
    return this.request(`/bookmarks/${bookmarkId}/highlights`);
  }

  async listAllBookmarks(): Promise<InstapaperBookmark[]> {
    const result = await this.listBookmarks({ limit: 500 });
    return result.filter((item): item is InstapaperBookmark => item.type === 'bookmark');
  }

  static async getAccessToken(
    consumerKey: string,
    consumerSecret: string,
    username: string,
    password: string
  ): Promise<{ oauthToken: string; oauthTokenSecret: string }> {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: Math.random().toString(36).substring(2),
      oauth_version: '1.0',
      x_auth_username: username,
      x_auth_password: password,
      x_auth_mode: 'client_auth',
    };

    const url = `${INSTAPAPER_API_BASE}/oauth/access_token`;
    const sortedParams = Object.entries(oauthParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const signatureBase = [
      'POST',
      encodeURIComponent(url),
      encodeURIComponent(sortedParams),
    ].join('&');

    const signingKey = `${encodeURIComponent(consumerSecret)}&`;
    const hmac = require('crypto').createHmac('sha1', signingKey);
    const signature = hmac.update(signatureBase).digest('base64');

    oauthParams.oauth_signature = signature;

    const authHeader = 'OAuth ' + Object.entries(oauthParams)
      .filter(([k]) => k.startsWith('oauth_'))
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(', ');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        x_auth_username: username,
        x_auth_password: password,
        x_auth_mode: 'client_auth',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to get Instapaper access token');
    }

    const text = await response.text();
    const params = new URLSearchParams(text);
    
    return {
      oauthToken: params.get('oauth_token') || '',
      oauthTokenSecret: params.get('oauth_token_secret') || '',
    };
  }
}

export function mapInstapaperToSource(bookmark: InstapaperBookmark): {
  url: string;
  title: string;
  contentType: string;
  surface: string;
  consumedAt: string;
  metadata: Record<string, unknown>;
} {
  return {
    url: bookmark.url,
    title: bookmark.title || bookmark.url,
    contentType: 'article',
    surface: 'instapaper_import',
    consumedAt: new Date(bookmark.time * 1000).toISOString(),
    metadata: {
      description: bookmark.description,
      progress: bookmark.progress,
      starred: bookmark.starred === '1',
      instapaperBookmarkId: bookmark.bookmark_id,
      hash: bookmark.hash,
    },
  };
}
