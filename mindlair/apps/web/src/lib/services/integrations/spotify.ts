/**
 * Spotify podcast integration.
 * Spotify's /me/player/recently-played is documented as tracks-only (no podcast episodes).
 * We combine: recently-played (episode objects if ever present), currently-playing with
 * additional_types=episode, and saved episodes (Your Episodes / library).
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

/** Scopes required for podcast sync across supported endpoints. */
export function buildSpotifyAuthUrl(state: string): string {
  const { clientId, redirectUri } = getSpotifyConfig();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: [
      'user-read-recently-played',
      'user-read-playback-position',
      'user-read-currently-playing',
      'user-library-read',
    ].join(' '),
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
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
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
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
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

function mapApiEpisodeToSpotifyEpisode(
  episode: {
    id: string;
    name: string;
    description?: string;
    duration_ms: number;
    external_urls?: { spotify?: string };
    show?: { name?: string; publisher?: string };
  },
  playedAt: string
): SpotifyEpisode {
  return {
    name: episode.name,
    description: (episode.description || '').slice(0, 500),
    durationMs: episode.duration_ms,
    externalUrl: episode.external_urls?.spotify || `https://open.spotify.com/episode/${episode.id}`,
    showName: episode.show?.name || 'Unknown Show',
    showPublisher: episode.show?.publisher || '',
    playedAt,
  };
}

/**
 * Recently played — official docs: tracks only; we still parse episode-typed items if present.
 * Do NOT pass undocumented query params (e.g. type=episode) — Spotify may return 400.
 */
export async function fetchRecentlyPlayedEpisodes(
  accessToken: string,
  after?: number
): Promise<SpotifyEpisode[]> {
  const params = new URLSearchParams({ limit: '50' });
  if (after) {
    params.set('after', after.toString());
  }

  const response = await fetch(`${SPOTIFY_API_BASE}/me/player/recently-played?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('TOKEN_EXPIRED');
    throw new Error(`Spotify API error: ${response.status}`);
  }

  const data = await response.json();
  const episodes: SpotifyEpisode[] = [];

  for (const item of data.items || []) {
    const track = item.track;
    if (!track || track.type !== 'episode') continue;

    episodes.push(
      mapApiEpisodeToSpotifyEpisode(track, item.played_at || new Date().toISOString())
    );
  }

  return episodes;
}

/** Episode playing right now (or paused but “active”), if any. */
export async function fetchCurrentlyPlayingEpisode(accessToken: string): Promise<SpotifyEpisode | null> {
  const response = await fetch(
    `${SPOTIFY_API_BASE}/me/player/currently-playing?additional_types=episode`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (response.status === 204) return null;
  if (response.status === 401) throw new Error('TOKEN_EXPIRED');
  if (!response.ok) {
    console.warn('[Spotify] currently-playing not available:', response.status);
    return null;
  }

  const data = await response.json();
  const item = data.item;
  if (!item || item.type !== 'episode') return null;

  return mapApiEpisodeToSpotifyEpisode(item, new Date().toISOString());
}

/** Saved episodes in the user’s library (“Your Episodes”). Requires user-library-read. */
export async function fetchSavedEpisodes(accessToken: string): Promise<SpotifyEpisode[]> {
  const response = await fetch(`${SPOTIFY_API_BASE}/me/episodes?limit=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 401) throw new Error('TOKEN_EXPIRED');
  if (!response.ok) {
    console.warn('[Spotify] saved episodes not available (reconnect may be needed):', response.status);
    return [];
  }

  const data = await response.json();
  const episodes: SpotifyEpisode[] = [];

  for (const row of data.items || []) {
    const ep = row.episode;
    if (!ep || ep.type !== 'episode') continue;
    episodes.push(mapApiEpisodeToSpotifyEpisode(ep, row.added_at || new Date().toISOString()));
  }

  return episodes;
}

function episodeKey(url: string): string {
  return url.split('?')[0].toLowerCase();
}

/**
 * Merge all supported podcast sources; dedupe by episode URL.
 * Order: recently played (preserves played_at), then currently playing, then saved.
 */
export async function fetchPodcastEpisodesForSync(accessToken: string): Promise<SpotifyEpisode[]> {
  const map = new Map<string, SpotifyEpisode>();

  const add = (list: SpotifyEpisode[]) => {
    for (const ep of list) {
      const k = episodeKey(ep.externalUrl);
      if (!map.has(k)) map.set(k, ep);
    }
  };

  const recent = await fetchRecentlyPlayedEpisodes(accessToken);
  add(recent);

  const current = await fetchCurrentlyPlayingEpisode(accessToken);
  if (current) add([current]);

  const saved = await fetchSavedEpisodes(accessToken);
  add(saved);

  return Array.from(map.values());
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
