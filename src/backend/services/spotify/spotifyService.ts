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

      const response = await axios.put(
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

      logger.info('✅ Started Spotify playlist playback', { playlistId, deviceId, status: response.status });
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.error?.message || error.message;
      const errorStatus = error.response?.status;
      
      logger.error('❌ Failed to play Spotify playlist', {
        error: errorMessage,
        errorData,
        status: errorStatus,
        playlistId,
        deviceId,
      });

      // Provide more specific error messages
      if (errorStatus === 404) {
        throw new Error('No active device found. Please open Spotify on one of your devices (web player, desktop app, or mobile app) and try again.');
      } else if (errorStatus === 403) {
        throw new Error('Playback is not available. Please check your Spotify Premium subscription.');
      } else if (errorStatus === 401) {
        throw new Error('Spotify authentication failed. Please reconnect your account.');
      } else if (errorStatus === 400) {
        // 400 can mean several things - provide more context
        if (errorMessage?.toLowerCase().includes('device')) {
          throw new Error('Device not found or not available. Please open Spotify on one of your devices and try again.');
        } else if (errorMessage?.toLowerCase().includes('playlist')) {
          throw new Error('Playlist not found or not accessible. Please try a different room.');
        } else {
          throw new Error(`Playback failed: ${errorMessage || 'Please make sure Spotify is open on one of your devices and try again.'}`);
        }
      } else {
        throw new Error(`Failed to play playlist: ${errorMessage || 'Unknown error. Please try again.'}`);
      }
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
      // Spotify returns 404 if no active playback, 403 if no premium, etc.
      // These are not critical errors - just means nothing is playing
      if (error.response?.status === 404) {
        logger.info('ℹ️ No active playback to pause');
        return; // Not an error - just nothing playing
      }
      
      if (error.response?.status === 403) {
        logger.warn('⚠️ Spotify Premium required for playback control');
        throw new Error('Spotify Premium required for playback control');
      }

      logger.error('❌ Failed to pause Spotify playback', {
        status: error.response?.status,
        error: error.response?.data || error.message,
      });
      throw new Error(`Failed to pause playback: ${error.response?.data?.error?.message || error.message || 'Unknown error'}`);
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

  async transferPlayback(accessToken: string, deviceId: string, play?: boolean): Promise<void> {
    try {
      await axios.put(
        'https://api.spotify.com/v1/me/player',
        {
          device_ids: [deviceId],
          play: play !== false, // Default to true if not specified
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('✅ Transferred Spotify playback to device', { deviceId, play });
    } catch (error: any) {
      logger.error('❌ Failed to transfer Spotify playback', {
        error: error.response?.data || error.message,
        deviceId,
      });
      throw new Error('Failed to transfer playback to device');
    }
  }

  /**
   * Search for lo-fi playlists matching room mood using keyword-based search
   * Always uses keyword search first, falls back to hardcoded playlists only if search fails
   */
  async findPlaylistForRoom(accessToken: string, roomId: string): Promise<string> {
    logger.info('🔍 Starting keyword search for room', { roomId });

    // Comprehensive keyword mapping for each room - multiple variations for reliability
    // All keywords prioritize instrumental, soundscape, and lo-fi music (no lyrics)
    const roomKeywords: Record<string, string[]> = {
      'deep-focus': [
        'lo-fi deep focus study instrumental',
        'lo-fi focus concentration no vocals',
        'deep focus lofi beats',
        'study focus lo-fi instrumental',
        'concentration music lo-fi soundscape',
        'lo-fi work focus background',
        'focus beats lo-fi ambient',
        'instrumental lo-fi study music',
      ],
      'soft-composure': [
        'lo-fi calm peaceful instrumental',
        'lo-fi meditation calm no vocals',
        'peaceful lo-fi ambient soundscape',
        'calm lo-fi chill beats',
        'soft lo-fi relaxation instrumental',
        'lo-fi composure peaceful ambient',
        'meditation lo-fi calm soundscape',
        'instrumental lo-fi zen music',
      ],
      'warm-connection': [
        'lo-fi chill vibes instrumental',
        'lo-fi warm cozy beats',
        'chill lo-fi beats no vocals',
        'warm lo-fi jazz instrumental',
        'cozy lo-fi vibes soundscape',
        'lo-fi connection chill ambient',
        'lo-fi friendly warm instrumental',
        'instrumental lo-fi chill music',
      ],
      'pitch-pulse': [
        'lo-fi beats energy instrumental',
        'lo-fi upbeat motivation no vocals',
        'energetic lo-fi beats',
        'lo-fi confidence boost instrumental',
        'motivational lo-fi beats soundscape',
        'lo-fi pulse energy ambient',
        'upbeat lo-fi confidence instrumental',
        'instrumental lo-fi energy music',
      ],
      'recovery-lounge': [
        'lo-fi ambient relaxation instrumental',
        'lo-fi recovery decompress no vocals',
        'ambient lo-fi rest soundscape',
        'relaxation lo-fi sleep music',
        'lo-fi unwind chill instrumental',
        'lo-fi lounge ambient beats',
        'decompress lo-fi ambient soundscape',
        'instrumental lo-fi relaxation music',
      ],
    };

    const keywords = roomKeywords[roomId] || ['lo-fi focus', 'lo-fi ambient', 'lo-fi chill'];
    
    logger.info('🔍 Trying keyword search with multiple keywords', { roomId, keywordCount: keywords.length, keywords });
    
    // Try each keyword in order until we find a good playlist
    for (const keyword of keywords) {
      logger.info('🔍 Searching with keyword', { roomId, keyword });
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
          // Keywords that indicate lyrics/vocals (should be avoided)
          const lyricsKeywords = [
            'vocal', 'vocals', 'singing', 'singer', 'song', 'songs',
            'lyrics', 'lyric', 'feat', 'ft.', 'featuring', 'with',
            'rap', 'hip hop', 'hip-hop', 'r&b', 'rnb', 'pop',
            'acoustic', 'cover', 'covers', 'remix', 'remixes',
            'karaoke', 'sing along', 'sing-along'
          ];
          
          // Keywords that indicate instrumental/no lyrics (preferred)
          const instrumentalKeywords = [
            'instrumental', 'no vocals', 'no vocal', 'beat', 'beats',
            'ambient', 'soundscape', 'soundscapes', 'nature sounds',
            'white noise', 'brown noise', 'pink noise', 'rain',
            'ocean', 'forest', 'meditation', 'zen', 'calm',
            'focus', 'study', 'concentration', 'background',
            'background music', 'bgm', 'atmospheric', 'atmosphere'
          ];

          // Score playlists based on relevance to room
          const scoredPlaylists = playlists
            .map((p: any) => {
              const name = p.name.toLowerCase();
              let score = 0;
              
              // HEAVY PENALTY for playlists with lyrics/vocals
              const hasLyrics = lyricsKeywords.some(keyword => name.includes(keyword));
              if (hasLyrics) {
                score -= 50; // Strong penalty - will likely be filtered out
              }
              
              // BONUS for instrumental/no-vocal indicators
              const isInstrumental = instrumentalKeywords.some(keyword => name.includes(keyword));
              if (isInstrumental) {
                score += 15; // Strong preference for instrumental
              }
              
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
              
              return { ...p, score, hasLyrics, isInstrumental };
            })
            // Filter out playlists with lyrics (negative score from penalty)
            .filter((p: any) => p.score > -10); // Only keep playlists that aren't heavily penalized

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
              isInstrumental: bestMatch.isInstrumental,
              hasLyrics: bestMatch.hasLyrics,
            });
            return bestMatch.id;
          }

          // If scoring didn't help much, try to find any instrumental lo-fi playlist
          const anyInstrumentalLofi = playlists.find((p: any) => {
            const name = p.name.toLowerCase();
            const hasLofi = name.includes('lo-fi') || name.includes('lofi') || name.includes('lo fi');
            const noLyrics = !lyricsKeywords.some(keyword => name.includes(keyword));
            return hasLofi && noLyrics;
          });

          if (anyInstrumentalLofi) {
            logger.info('✅ Found instrumental lo-fi playlist (fallback)', {
              roomId,
              keyword,
              playlistName: anyInstrumentalLofi.name,
              playlistId: anyInstrumentalLofi.id,
            });
            return anyInstrumentalLofi.id;
          }
          
          // Try to find any playlist without lyrics
          const anyNoLyrics = playlists.find((p: any) => {
            const name = p.name.toLowerCase();
            return !lyricsKeywords.some(keyword => name.includes(keyword));
          });

          if (anyNoLyrics) {
            logger.info('✅ Found playlist without lyrics (fallback)', {
              roomId,
              keyword,
              playlistName: anyNoLyrics.name,
              playlistId: anyNoLyrics.id,
            });
            return anyNoLyrics.id;
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
        const errorMessage = searchError.response?.data?.error?.message || searchError.message;
        logger.warn('⚠️ Search failed for keyword, trying next', {
          roomId,
          keyword,
          error: errorMessage,
          status: searchError.response?.status,
        });
        // Continue to next keyword - don't give up!
        continue;
      }
    }

    // If all keyword searches failed, try a generic search as fallback
    logger.warn('⚠️ All specific keyword searches failed, trying generic search as fallback', { roomId });
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

    // Ultimate fallback to hardcoded default (only if all keyword searches fail)
    logger.warn('⚠️ All keyword searches failed, using hardcoded default as last resort', { roomId });
    const hardcoded = FOCUS_ROOM_PLAYLISTS[roomId] || FOCUS_ROOM_PLAYLISTS['deep-focus'] || '37i9dQZF1DWZeKCadgRdKQ';
    logger.info('✅ Using hardcoded playlist as fallback', { roomId, playlistId: hardcoded });
    return hardcoded;
  }

  getPlaylistIdForRoom(roomId: string): string | undefined {
    return FOCUS_ROOM_PLAYLISTS[roomId];
  }
}

export const spotifyService = new SpotifyService();

