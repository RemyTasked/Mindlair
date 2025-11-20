import axios from 'axios';
import { logger } from '../../utils/logger';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || `${process.env.BACKEND_URL}/api/auth/spotify/callback`;

// Spotify playlist IDs for each Focus Room
const FOCUS_ROOM_PLAYLISTS: Record<string, string> = {
  'deep-focus': process.env.SPOTIFY_DEEP_FOCUS_PLAYLIST_ID || '37i9dQZF1DWZeKCadgRdKQ', // Deep Focus default
  'soft-composure': process.env.SPOTIFY_SOFT_COMPOSURE_PLAYLIST_ID || '37i9dQZF1DX4sWSpwq3LiO', // Peaceful Piano default
  'warm-connection': process.env.SPOTIFY_WARM_CONNECTION_PLAYLIST_ID || '37i9dQZF1DX4sWSpwq3LiO', // Chill Vibes default
  'pitch-pulse': process.env.SPOTIFY_PITCH_PULSE_PLAYLIST_ID || '37i9dQZF1DX76t638V6CA8', // Lo-Fi Beats default
  'recovery-lounge': process.env.SPOTIFY_RECOVERY_LOUNGE_PLAYLIST_ID || '37i9dQZF1DX4sWSpwq3LiO', // Ambient default
};

export class SpotifyService {
  getAuthUrl(userId?: string): string {
    const scopes = [
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'streaming',
      'playlist-read-private',
    ].join(' ');

    const state = userId ? Buffer.from(JSON.stringify({ userId })).toString('base64') : undefined;

    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: SPOTIFY_REDIRECT_URI,
      scope: scopes,
      ...(state && { state }),
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async getTokensFromCode(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: SPOTIFY_REDIRECT_URI,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
          },
        }
      );

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
      };
    } catch (error: any) {
      logger.error('❌ Failed to exchange Spotify code for tokens', {
        error: error.response?.data || error.message,
      });
      throw new Error('Failed to exchange code for tokens');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
          },
        }
      );

      return {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in,
      };
    } catch (error: any) {
      logger.error('❌ Failed to refresh Spotify token', {
        error: error.response?.data || error.message,
      });
      throw new Error('Failed to refresh access token');
    }
  }

  async getUserInfo(accessToken: string): Promise<{
    id: string;
    email: string;
    display_name: string;
  }> {
    try {
      const response = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        id: response.data.id,
        email: response.data.email,
        display_name: response.data.display_name || response.data.email,
      };
    } catch (error: any) {
      logger.error('❌ Failed to get Spotify user info', {
        error: error.response?.data || error.message,
      });
      throw new Error('Failed to get user info');
    }
  }

  async playPlaylist(accessToken: string, playlistId: string, deviceId?: string): Promise<void> {
    try {
      const playUrl = deviceId
        ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
        : 'https://api.spotify.com/v1/me/player/play';

      await axios.put(
        playUrl,
        {
          context_uri: `spotify:playlist:${playlistId}`,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('✅ Started Spotify playlist playback', { playlistId });
    } catch (error: any) {
      logger.error('❌ Failed to play Spotify playlist', {
        error: error.response?.data || error.message,
        playlistId,
      });
      throw new Error('Failed to play playlist');
    }
  }

  async pausePlayback(accessToken: string, deviceId?: string): Promise<void> {
    try {
      const pauseUrl = deviceId
        ? `https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`
        : 'https://api.spotify.com/v1/me/player/pause';

      await axios.put(
        pauseUrl,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      logger.info('✅ Paused Spotify playback');
    } catch (error: any) {
      logger.error('❌ Failed to pause Spotify playback', {
        error: error.response?.data || error.message,
      });
      throw new Error('Failed to pause playback');
    }
  }

  async setVolume(accessToken: string, volumePercent: number, deviceId?: string): Promise<void> {
    try {
      const volumeUrl = deviceId
        ? `https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}&device_id=${deviceId}`
        : `https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}`;

      await axios.put(
        volumeUrl,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      logger.info('✅ Set Spotify volume', { volumePercent });
    } catch (error: any) {
      logger.error('❌ Failed to set Spotify volume', {
        error: error.response?.data || error.message,
      });
      throw new Error('Failed to set volume');
    }
  }

  async getDevices(accessToken: string): Promise<Array<{ id: string; name: string; type: string; is_active: boolean }>> {
    try {
      const response = await axios.get('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.devices || [];
    } catch (error: any) {
      logger.error('❌ Failed to get Spotify devices', {
        error: error.response?.data || error.message,
      });
      return [];
    }
  }

  getPlaylistIdForRoom(roomId: string): string | undefined {
    return FOCUS_ROOM_PLAYLISTS[roomId];
  }
}

export const spotifyService = new SpotifyService();

