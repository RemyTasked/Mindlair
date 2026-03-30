/**
 * Spotify podcast history integration.
 * Uses Spotify Web API to fetch recently played episodes (podcasts).
 * OAuth 2.0 Authorization Code Flow with PKCE.
 */

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export function getSpotifyConfig() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/spotify/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify client credentials not configured');
  }

  return { clientId, clientSecret, redirectUri };
}

export function buildSpotifyAuthUrl(state: string): string {
  const { clientId, redirectUri } = getSpotifyConfig();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'user-read-recently-played user-read-playback-position',
    redirect_uri: redirectUri,
    state,
    show_dialog: 'true',
  });

  return `${SPOTIFY_AUTH_URL}?${params}`;
}

export async function exchangeSpotifyCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const { clientId, clientSecret, redirectUri } = getSpotifyConfig();

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify token exchange failed: ${text}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function refreshSpotifyToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const { clientId, clientSecret } = getSpotifyConfig();

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Spotify token');
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export interface SpotifyEpisode {
  name: string;
  description: string;
  durationMs: number;
  externalUrl: string;
  showName: string;
  showPublisher: string;
  playedAt: string;
}

export async function fetchRecentlyPlayedEpisodes(
  accessToken: string,
  after?: number,
): Promise<SpotifyEpisode[]> {
  const params = new URLSearchParams({
    limit: '50',
    type: 'episode',
  });
  if (after) {
    params.set('after', after.toString());
  }

  const response = await fetch(`${SPOTIFY_API_BASE}/me/player/recently-played?${params}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('TOKEN_EXPIRED');
    throw new Error(`Spotify API error: ${response.status}`);
  }

  const data = await response.json();

  const episodes: SpotifyEpisode[] = [];
  for (const item of data.items || []) {
    const track = item.track;
    if (track?.type !== 'episode') continue;

    episodes.push({
      name: track.name,
      description: (track.description || '').slice(0, 500),
      durationMs: track.duration_ms,
      externalUrl: track.external_urls?.spotify || `https://open.spotify.com/episode/${track.id}`,
      showName: track.show?.name || 'Unknown Show',
      showPublisher: track.show?.publisher || '',
      playedAt: item.played_at,
    });
  }

  return episodes;
}

export function mapEpisodeToSource(episode: SpotifyEpisode) {
  return {
    url: episode.externalUrl,
    title: `${episode.showName}: ${episode.name}`,
    contentType: 'podcast' as const,
    surface: 'spotify_import' as const,
    consumedAt: episode.playedAt,
    metadata: {
      author: episode.showPublisher,
      outlet: episode.showName,
      videoDurationMs: episode.durationMs,
    },
  };
}
