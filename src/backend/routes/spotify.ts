/**
 * Mind Garden - Spotify Integration Routes
 * 
 * Implements OAuth2 flow and Spotify Web API integration for:
 * - User authentication with Spotify
 * - Token management (access/refresh)
 * - Playlist retrieval and playback control
 * - Flow-specific music recommendations
 */

import express from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

const router = express.Router();

// Spotify API configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3001/api/spotify/callback';

// In-memory state storage (use Redis in production)
const oauthStateStore = new Map<string, { userId: string; timestamp: number }>();

// Cleanup old states every 10 minutes
setInterval(() => {
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;
  for (const [state, data] of oauthStateStore.entries()) {
    if (now - data.timestamp > TEN_MINUTES) {
      oauthStateStore.delete(state);
    }
  }
}, 10 * 60 * 1000);

// Required scopes for Mind Garden integration
const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
  'streaming',
  'user-read-email',
  'user-read-private',
].join(' ');

// Flow type to playlist mapping
const FLOW_PLAYLISTS: Record<string, { query: string; mood: string }> = {
  'pre-meeting-focus': { query: 'focus concentration instrumental', mood: 'focus' },
  'pre-presentation-power': { query: 'confidence uplifting instrumental', mood: 'confidence' },
  'difficult-conversation-prep': { query: 'calm peaceful ambient', mood: 'calm' },
  'quick-reset': { query: 'nature sounds ambient', mood: 'neutral' },
  'post-meeting-decompress': { query: 'relaxing instrumental chill', mood: 'release' },
  'end-of-day-transition': { query: 'evening wind down peaceful', mood: 'wind-down' },
  'morning-intention': { query: 'morning motivation instrumental', mood: 'energize' },
  'evening-wind-down': { query: 'sleep relaxation ambient', mood: 'sleep' },
  'weekend-wellness': { query: 'meditation spa ambient', mood: 'spa' },
  'deep-meditation': { query: 'meditation tibetan bowls ambient', mood: 'meditation' },
  'breathing': { query: 'breathing exercise ambient calm', mood: 'breathe' },
};

// Token encryption helpers (simplified - use proper encryption in production)
function encryptToken(token: string): string {
  // In production, use proper encryption (e.g., AES-256)
  return Buffer.from(token).toString('base64');
}

function decryptToken(encrypted: string): string {
  return Buffer.from(encrypted, 'base64').toString('utf-8');
}

// Common Spotify API response type
interface SpotifyErrorResponse {
  error?: { message?: string };
}

// ============================================
// OAUTH FLOW
// ============================================

/**
 * GET /api/spotify/auth
 * Initiate Spotify OAuth flow
 */
router.get(
  '/auth',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    // Generate random state for CSRF protection
    const state = Buffer.from(JSON.stringify({
      userId,
      nonce: Math.random().toString(36).substring(2),
    })).toString('base64');
    
    // Store state in memory (expires in 10 minutes)
    oauthStateStore.set(state, { userId, timestamp: Date.now() });
    
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.set('client_id', SPOTIFY_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', SPOTIFY_REDIRECT_URI);
    authUrl.searchParams.set('scope', SPOTIFY_SCOPES);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('show_dialog', 'true');
    
    logger.info('Spotify auth initiated', { userId });
    
    res.json({ authUrl: authUrl.toString() });
  })
);

/**
 * GET /api/spotify/callback
 * Handle Spotify OAuth callback
 */
router.get(
  '/callback',
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    if (error) {
      logger.error('Spotify auth error', { error });
      return res.redirect(`${frontendUrl}/settings?spotify_error=${error}`);
    }
    
    if (!code || !state) {
      return res.redirect(`${frontendUrl}/settings?spotify_error=missing_params`);
    }
    
    try {
      // Validate state from in-memory store
      const storedState = oauthStateStore.get(state as string);
      
      if (!storedState) {
        return res.redirect(`${frontendUrl}/settings?spotify_error=invalid_state`);
      }
      
      // Check state expiry (10 minutes)
      if (Date.now() - storedState.timestamp > 10 * 60 * 1000) {
        oauthStateStore.delete(state as string);
        return res.redirect(`${frontendUrl}/settings?spotify_error=state_expired`);
      }
      
      const userId = storedState.userId;
      oauthStateStore.delete(state as string); // Clean up used state
      
      // Exchange code for tokens
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: SPOTIFY_REDIRECT_URI,
        }),
      });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        logger.error('Spotify token exchange failed', { error: errorData });
        return res.redirect(`${process.env.FRONTEND_URL}/settings?spotify_error=token_exchange_failed`);
      }
      
      const tokens = await tokenResponse.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };
      
      // Get Spotify user profile
      const profileResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });
      
      const profile = await profileResponse.json() as {
        id: string;
        display_name?: string;
        product?: string;
      };
      
      // Store tokens in SpotifyAccount (upsert)
      await prisma.spotifyAccount.upsert({
        where: { userId },
        create: {
          userId,
          spotifyId: profile.id,
          displayName: profile.display_name,
          accessToken: encryptToken(tokens.access_token),
          refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
        update: {
          spotifyId: profile.id,
          displayName: profile.display_name,
          accessToken: encryptToken(tokens.access_token),
          refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
      
      logger.info('Spotify connected successfully', { userId, spotifyUserId: profile.id });
      
      res.redirect(`${frontendUrl}/settings?spotify_connected=true`);
    } catch (error) {
      logger.error('Spotify callback error', { error });
      res.redirect(`${frontendUrl}/settings?spotify_error=callback_failed`);
    }
  })
);

/**
 * POST /api/spotify/disconnect
 * Disconnect Spotify account
 */
router.post(
  '/disconnect',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    await prisma.spotifyAccount.delete({
      where: { userId },
    }).catch(() => {
      // Ignore if no account exists
    });
    
    logger.info('Spotify disconnected', { userId });
    
    res.json({ success: true, message: 'Spotify disconnected' });
  })
);

/**
 * GET /api/spotify/status
 * Get Spotify connection status
 */
router.get(
  '/status',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    const spotifyAccount = await prisma.spotifyAccount.findUnique({
      where: { userId },
      select: {
        spotifyId: true,
        displayName: true,
        expiresAt: true,
      },
    });
    
    const connected = !!(spotifyAccount?.spotifyId && spotifyAccount?.expiresAt && spotifyAccount.expiresAt > new Date());
    
    res.json({
      connected,
      spotifyId: connected ? spotifyAccount?.spotifyId : null,
      displayName: connected ? spotifyAccount?.displayName : null,
    });
  })
);

// ============================================
// TOKEN MANAGEMENT
// ============================================

/**
 * Helper to refresh access token if expired
 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const spotifyAccount = await prisma.spotifyAccount.findUnique({
    where: { userId },
    select: {
      accessToken: true,
      refreshToken: true,
      expiresAt: true,
    },
  });
  
  if (!spotifyAccount?.refreshToken) {
    return null;
  }
  
  // Check if token is still valid (with 5 minute buffer)
  if (spotifyAccount.expiresAt && spotifyAccount.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return decryptToken(spotifyAccount.accessToken);
  }
  
  // Refresh the token
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: decryptToken(spotifyAccount.refreshToken),
      }),
    });
    
    if (!response.ok) {
      logger.error('Failed to refresh Spotify token', { userId });
      return null;
    }
    
    const tokens = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
    
    // Update stored tokens
    await prisma.spotifyAccount.update({
      where: { userId },
      data: {
        accessToken: encryptToken(tokens.access_token),
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        // Spotify doesn't always return a new refresh token
        ...(tokens.refresh_token && { refreshToken: encryptToken(tokens.refresh_token) }),
      },
    });
    
    return tokens.access_token;
  } catch (error) {
    logger.error('Token refresh error', { userId, error });
    return null;
  }
}

/**
 * GET /api/spotify/token
 * Get a valid access token for Web Playback SDK
 */
router.get(
  '/token',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Spotify not connected or token expired' });
    }
    
    return res.json({ accessToken });
  })
);

// ============================================
// PLAYBACK CONTROL
// ============================================

/**
 * GET /api/spotify/player
 * Get current playback state
 */
router.get(
  '/player',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Spotify not connected' });
    }
    
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (response.status === 204) {
      return res.json({ isPlaying: false, device: null, track: null });
    }
    
    if (!response.ok) {
      const errorData = await response.json() as { error?: { message?: string } };
      return res.status(response.status).json({ error: errorData.error?.message || 'Playback error' });
    }
    
    const data = await response.json() as {
      is_playing: boolean;
      device?: { id: string; name: string; type: string; volume_percent: number };
      item?: {
        id: string;
        name: string;
        artists?: { name: string }[];
        album?: { name: string; images?: { url: string }[] };
        duration_ms: number;
      };
      progress_ms: number;
      shuffle_state: boolean;
      repeat_state: string;
    };
    
    return res.json({
      isPlaying: data.is_playing,
      device: data.device ? {
        id: data.device.id,
        name: data.device.name,
        type: data.device.type,
        volume: data.device.volume_percent,
      } : null,
      track: data.item ? {
        id: data.item.id,
        name: data.item.name,
        artist: data.item.artists?.map((a) => a.name).join(', '),
        album: data.item.album?.name,
        albumArt: data.item.album?.images?.[0]?.url,
        duration: data.item.duration_ms,
        progress: data.progress_ms,
      } : null,
      shuffle: data.shuffle_state,
      repeat: data.repeat_state,
    });
  })
);

/**
 * PUT /api/spotify/player/play
 * Start or resume playback
 */
router.put(
  '/player/play',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { uri, contextUri, deviceId, positionMs } = req.body;
    
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return res.status(401).json({ error: 'Spotify not connected' });
    }
    
    const url = new URL('https://api.spotify.com/v1/me/player/play');
    if (deviceId) {
      url.searchParams.set('device_id', deviceId);
    }
    
    const body: any = {};
    if (uri) body.uris = [uri];
    if (contextUri) body.context_uri = contextUri;
    if (positionMs) body.position_ms = positionMs;
    
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok && response.status !== 204) {
      const errData = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as SpotifyErrorResponse;
      return res.status(response.status).json({ error: errData.error?.message || 'Playback error' });
    }
    
    return res.json({ success: true });
  })
);

/**
 * PUT /api/spotify/player/pause
 * Pause playback
 */
router.put(
  '/player/pause',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Spotify not connected' });
    }
    
    const response = await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!response.ok && response.status !== 204) {
      const errData = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as SpotifyErrorResponse;
      return res.status(response.status).json({ error: errData.error?.message || 'Pause error' });
    }
    
    return res.json({ success: true });
  })
);

/**
 * POST /api/spotify/player/next
 * Skip to next track
 */
router.post(
  '/player/next',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Spotify not connected' });
    }
    
    const response = await fetch('https://api.spotify.com/v1/me/player/next', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!response.ok && response.status !== 204) {
      const errData = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as SpotifyErrorResponse;
      return res.status(response.status).json({ error: errData.error?.message || 'Skip error' });
    }
    
    return res.json({ success: true });
  })
);

/**
 * POST /api/spotify/player/previous
 * Skip to previous track
 */
router.post(
  '/player/previous',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Spotify not connected' });
    }
    
    const response = await fetch('https://api.spotify.com/v1/me/player/previous', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!response.ok && response.status !== 204) {
      const errData = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as SpotifyErrorResponse;
      return res.status(response.status).json({ error: errData.error?.message || 'Previous error' });
    }
    
    return res.json({ success: true });
  })
);

/**
 * PUT /api/spotify/player/volume
 * Set playback volume
 */
router.put(
  '/player/volume',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { volume } = req.body;
    
    if (volume === undefined || volume < 0 || volume > 100) {
      return res.status(400).json({ error: 'Volume must be between 0 and 100' });
    }
    
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return res.status(401).json({ error: 'Spotify not connected' });
    }
    
    const response = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.round(volume)}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!response.ok && response.status !== 204) {
      const errData = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as SpotifyErrorResponse;
      return res.status(response.status).json({ error: errData.error?.message || 'Volume error' });
    }
    
    return res.json({ success: true });
  })
);

/**
 * GET /api/spotify/devices
 * Get available playback devices
 */
router.get(
  '/devices',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Spotify not connected' });
    }
    
    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!response.ok) {
      const errData = await response.json() as SpotifyErrorResponse;
      return res.status(response.status).json({ error: errData.error?.message || 'Devices error' });
    }
    
    const data = await response.json() as {
      devices: Array<{ id: string; name: string; type: string; is_active: boolean; volume_percent: number }>;
    };
    
    return res.json({
      devices: data.devices.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        isActive: d.is_active,
        volume: d.volume_percent,
      })),
    });
  })
);

/**
 * PUT /api/spotify/player/transfer
 * Transfer playback to a different device
 */
router.put(
  '/player/transfer',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { deviceId, play } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID required' });
    }
    
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return res.status(401).json({ error: 'Spotify not connected' });
    }
    
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: play || false,
      }),
    });
    
    if (!response.ok && response.status !== 204) {
      const errData = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as SpotifyErrorResponse;
      return res.status(response.status).json({ error: errData.error?.message || 'Transfer error' });
    }
    
    return res.json({ success: true });
  })
);

// ============================================
// PLAYLIST & SEARCH
// ============================================

// Common Spotify search response types
interface SpotifyPlaylistItem {
  id: string;
  name: string;
  description: string;
  images?: { url: string }[];
  uri: string;
  tracks?: { total: number };
  owner?: { display_name: string };
}

interface SpotifyTrackItem {
  id: string;
  name: string;
  artists?: { name: string }[];
  album?: { name: string; images?: { url: string }[] };
  uri: string;
  duration_ms: number;
  preview_url?: string;
}

interface SpotifyAlbumItem {
  id: string;
  name: string;
  artists?: { name: string }[];
  images?: { url: string }[];
  uri: string;
  total_tracks: number;
}

/**
 * GET /api/spotify/playlists/flow/:flowType
 * Get recommended playlists for a flow type
 */
router.get(
  '/playlists/flow/:flowType',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { flowType } = req.params;
    
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return res.status(401).json({ error: 'Spotify not connected' });
    }
    
    const flowConfig = FLOW_PLAYLISTS[flowType] || FLOW_PLAYLISTS['quick-reset'];
    
    // Search for playlists matching the flow mood
    const searchQuery = encodeURIComponent(flowConfig.query);
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${searchQuery}&type=playlist&limit=10`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    
    if (!response.ok) {
      const errData = await response.json() as SpotifyErrorResponse;
      return res.status(response.status).json({ error: errData.error?.message || 'Search error' });
    }
    
    const data = await response.json() as {
      playlists: { items: SpotifyPlaylistItem[] };
    };
    
    return res.json({
      flowType,
      mood: flowConfig.mood,
      playlists: data.playlists.items.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        image: p.images?.[0]?.url,
        uri: p.uri,
        trackCount: p.tracks?.total,
        owner: p.owner?.display_name,
      })),
    });
  })
);

/**
 * GET /api/spotify/search
 * Search for tracks, playlists, or albums
 */
router.get(
  '/search',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { q, type = 'playlist', limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return res.status(401).json({ error: 'Spotify not connected' });
    }
    
    const searchQuery = encodeURIComponent(q as string);
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${searchQuery}&type=${type}&limit=${limit}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    
    if (!response.ok) {
      const errData = await response.json() as SpotifyErrorResponse;
      return res.status(response.status).json({ error: errData.error?.message || 'Search error' });
    }
    
    const data = await response.json() as {
      playlists?: { items: SpotifyPlaylistItem[] };
      tracks?: { items: SpotifyTrackItem[] };
      albums?: { items: SpotifyAlbumItem[] };
    };
    
    // Format based on type
    const results: {
      playlists?: any[];
      tracks?: any[];
      albums?: any[];
    } = {};
    
    if (data.playlists) {
      results.playlists = data.playlists.items.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        image: p.images?.[0]?.url,
        uri: p.uri,
        trackCount: p.tracks?.total,
      }));
    }
    
    if (data.tracks) {
      results.tracks = data.tracks.items.map((t) => ({
        id: t.id,
        name: t.name,
        artist: t.artists?.map((a) => a.name).join(', '),
        album: t.album?.name,
        image: t.album?.images?.[0]?.url,
        uri: t.uri,
        duration: t.duration_ms,
      }));
    }
    
    if (data.albums) {
      results.albums = data.albums.items.map((a) => ({
        id: a.id,
        name: a.name,
        artist: a.artists?.map((ar) => ar.name).join(', '),
        image: a.images?.[0]?.url,
        uri: a.uri,
        trackCount: a.total_tracks,
      }));
    }
    
    return res.json(results);
  })
);

/**
 * GET /api/spotify/recommendations
 * Get personalized recommendations based on mood/flow
 */
router.get(
  '/recommendations',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { mood = 'calm', limit = 20 } = req.query;
    
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return res.status(401).json({ error: 'Spotify not connected' });
    }
    
    // Map mood to Spotify audio features
    const moodParams: Record<string, Record<string, number>> = {
      focus: { target_energy: 0.4, target_valence: 0.5, target_instrumentalness: 0.8 },
      calm: { target_energy: 0.3, target_valence: 0.4, target_instrumentalness: 0.7 },
      energize: { target_energy: 0.8, target_valence: 0.7, target_instrumentalness: 0.5 },
      sleep: { target_energy: 0.1, target_valence: 0.3, target_instrumentalness: 0.9 },
      meditation: { target_energy: 0.2, target_valence: 0.5, target_instrumentalness: 0.95 },
    };
    
    const params = moodParams[mood as string] || moodParams.calm;
    
    // Get user's top tracks as seeds (if available)
    const topTracksRes = await fetch(
      'https://api.spotify.com/v1/me/top/tracks?limit=2&time_range=medium_term',
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    
    let seedTracks = '';
    if (topTracksRes.ok) {
      const topTracks = await topTracksRes.json() as { items?: { id: string }[] };
      seedTracks = topTracks.items?.map((t) => t.id).join(',') || '';
    }
    
    // Use genre seeds as fallback
    const seedGenres = 'ambient,chill,classical,jazz,new-age'.split(',').slice(0, seedTracks ? 3 : 5).join(',');
    
    const recUrl = new URL('https://api.spotify.com/v1/recommendations');
    recUrl.searchParams.set('limit', String(limit));
    if (seedTracks) recUrl.searchParams.set('seed_tracks', seedTracks);
    recUrl.searchParams.set('seed_genres', seedGenres);
    Object.entries(params).forEach(([key, val]) => {
      recUrl.searchParams.set(key, String(val));
    });
    
    const response = await fetch(recUrl.toString(), {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!response.ok) {
      const errData = await response.json() as SpotifyErrorResponse;
      return res.status(response.status).json({ error: errData.error?.message || 'Recommendations error' });
    }
    
    const data = await response.json() as { tracks: SpotifyTrackItem[] };
    
    return res.json({
      mood,
      tracks: data.tracks.map((t) => ({
        id: t.id,
        name: t.name,
        artist: t.artists?.map((a) => a.name).join(', '),
        album: t.album?.name,
        image: t.album?.images?.[0]?.url,
        uri: t.uri,
        duration: t.duration_ms,
        preview: t.preview_url,
      })),
    });
  })
);

export default router;
