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
      'playlist-read-collaborative',
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

  /**
   * Search for lo-fi playlists matching room mood using keyword-based search
   * Falls back to multiple keyword strategies if initial search fails
   */
  async findPlaylistForRoom(accessToken: string, roomId: string): Promise<string> {
    // First check if we have a hardcoded playlist
    const hardcoded = FOCUS_ROOM_PLAYLISTS[roomId];
    if (hardcoded) {
      return hardcoded;
    }

    // Comprehensive keyword mapping for each room - multiple variations for reliability
    const roomKeywords: Record<string, string[]> = {
      'deep-focus': [
        'lo-fi deep focus study',
        'lo-fi focus concentration',
        'deep focus lofi',
        'study focus lo-fi',
        'concentration music lo-fi',
        'lo-fi work focus',
        'focus beats lo-fi',
      ],
      'soft-composure': [
        'lo-fi calm peaceful',
        'lo-fi meditation calm',
        'peaceful lo-fi ambient',
        'calm lo-fi chill',
        'soft lo-fi relaxation',
        'lo-fi composure peaceful',
        'meditation lo-fi calm',
      ],
      'warm-connection': [
        'lo-fi chill vibes',
        'lo-fi warm cozy',
        'chill lo-fi beats',
        'warm lo-fi jazz',
        'cozy lo-fi vibes',
        'lo-fi connection chill',
        'lo-fi friendly warm',
      ],
      'pitch-pulse': [
        'lo-fi beats energy',
        'lo-fi upbeat motivation',
        'energetic lo-fi',
        'lo-fi confidence boost',
        'motivational lo-fi beats',
        'lo-fi pulse energy',
        'upbeat lo-fi confidence',
      ],
      'recovery-lounge': [
        'lo-fi ambient relaxation',
        'lo-fi recovery decompress',
        'ambient lo-fi rest',
        'relaxation lo-fi sleep',
        'lo-fi unwind chill',
        'lo-fi lounge ambient',
        'decompress lo-fi ambient',
      ],
    };

    const keywords = roomKeywords[roomId] || ['lo-fi focus', 'lo-fi ambient', 'lo-fi chill'];
    
    // Try each keyword in order until we find a good playlist
    for (const keyword of keywords) {
      try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
          params: {
            q: keyword,
            type: 'playlist',
            limit: 20, // Get more results for better matching
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const playlists = response.data.playlists?.items || [];
        
        if (playlists.length > 0) {
          // Score playlists based on relevance to room
          const scoredPlaylists = playlists.map((p: any) => {
            const name = p.name.toLowerCase();
            let score = 0;
            
            // Higher score for playlists with "lo-fi" or "lofi" variants
            if (name.includes('lo-fi') || name.includes('lofi') || name.includes('lo fi')) {
              score += 10;
            }
            
            // Score based on room-specific keywords
            const roomSpecificTerms: Record<string, string[]> = {
              'deep-focus': ['focus', 'study', 'concentration', 'deep', 'work', 'productivity'],
              'soft-composure': ['calm', 'peaceful', 'meditation', 'soft', 'composure', 'zen', 'tranquil'],
              'warm-connection': ['chill', 'warm', 'cozy', 'vibes', 'connection', 'friendly', 'intimate'],
              'pitch-pulse': ['beats', 'energy', 'upbeat', 'motivation', 'pulse', 'confidence', 'power'],
              'recovery-lounge': ['ambient', 'relaxation', 'recovery', 'rest', 'unwind', 'decompress', 'lounge'],
            };
            
            const terms = roomSpecificTerms[roomId] || [];
            terms.forEach(term => {
              if (name.includes(term)) score += 5;
            });
            
            // Prefer playlists with more followers (popularity indicator)
            const followers = p.followers?.total || 0;
            if (followers > 0) {
              score += Math.min(Math.log10(followers + 1), 5);
            }
            
            return { ...p, score };
          });

          // Sort by score and get the best match
          scoredPlaylists.sort((a: any, b: any) => b.score - a.score);
          const bestMatch = scoredPlaylists[0];

          if (bestMatch && bestMatch.score > 5) { // Only use if score is meaningful
            logger.info('✅ Found playlist using keyword search', {
              roomId,
              keyword,
              playlistName: bestMatch.name,
              playlistId: bestMatch.id,
              score: bestMatch.score,
            });
            return bestMatch.id;
          }

          // If scoring didn't help much, try to find any lo-fi playlist
          const anyLofi = playlists.find((p: any) => {
            const name = p.name.toLowerCase();
            return name.includes('lo-fi') || name.includes('lofi') || name.includes('lo fi');
          });

          if (anyLofi) {
            logger.info('✅ Found lo-fi playlist (fallback)', {
              roomId,
              keyword,
              playlistName: anyLofi.name,
              playlistId: anyLofi.id,
            });
            return anyLofi.id;
          }

          // Last resort: use first result
          logger.info('✅ Using first search result', {
            roomId,
            keyword,
            playlistName: playlists[0].name,
            playlistId: playlists[0].id,
          });
          return playlists[0].id;
        }
      } catch (searchError: any) {
        logger.warn('⚠️ Search failed for keyword', {
          roomId,
          keyword,
          error: searchError.response?.data || searchError.message,
        });
        // Continue to next keyword
        continue;
      }
    }

    // If all keyword searches failed, try a generic search
    logger.warn('⚠️ All keyword searches failed, trying generic search', { roomId });
    try {
      const genericQuery = `lo-fi ${roomId.replace('-', ' ')}`;
      const response = await axios.get('https://api.spotify.com/v1/search', {
        params: {
          q: genericQuery,
          type: 'playlist',
          limit: 10,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const playlists = response.data.playlists?.items || [];
      if (playlists.length > 0) {
        logger.info('✅ Found playlist using generic search', {
          roomId,
          playlistName: playlists[0].name,
          playlistId: playlists[0].id,
        });
        return playlists[0].id;
      }
    } catch (genericError: any) {
      logger.warn('⚠️ Generic search also failed', {
        roomId,
        error: genericError.response?.data || genericError.message,
      });
    }

    // Ultimate fallback to hardcoded default
    logger.warn('⚠️ All searches failed, using hardcoded default', { roomId });
    return FOCUS_ROOM_PLAYLISTS[roomId] || FOCUS_ROOM_PLAYLISTS['deep-focus'] || '37i9dQZF1DWZeKCadgRdKQ';
  }

  getPlaylistIdForRoom(roomId: string): string | undefined {
    return FOCUS_ROOM_PLAYLISTS[roomId];
  }
}

export const spotifyService = new SpotifyService();

