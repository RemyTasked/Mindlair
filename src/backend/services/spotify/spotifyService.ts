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
      const payload: any = {
        device_ids: [deviceId],
      };
      
      // Only include play parameter if explicitly set (false means don't play, undefined means default behavior)
      if (play !== undefined) {
        payload.play = play;
      }

      await axios.put(
        'https://api.spotify.com/v1/me/player',
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('✅ Transferred Spotify playback to device', { deviceId, play: play !== undefined ? play : 'default' });
    } catch (error: any) {
      // 404 means no active device - that's okay for transfer
      if (error.response?.status === 404) {
        logger.info('ℹ️ No active device to transfer from (this is okay)', { deviceId });
        return; // Not an error - device will be activated when we play
      }
      
      logger.error('❌ Failed to transfer Spotify playback', {
        error: error.response?.data || error.message,
        status: error.response?.status,
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
    // ALL keywords MUST include "instrumental" or "no vocals" to ensure no lyrics
    // This is a CORE REQUIREMENT - all playlists must be instrumental lo-fi soundscapes
    const roomKeywords: Record<string, string[]> = {
      'deep-focus': [
        'lo-fi deep focus study instrumental no vocals',
        'lo-fi focus concentration instrumental only',
        'deep focus lofi beats instrumental',
        'study focus lo-fi instrumental no lyrics',
        'concentration music lo-fi soundscape instrumental',
        'lo-fi work focus background instrumental',
        'focus beats lo-fi ambient instrumental',
        'instrumental lo-fi study music no vocals',
      ],
      'soft-composure': [
        'lo-fi calm peaceful instrumental no vocals',
        'lo-fi meditation calm instrumental only',
        'peaceful lo-fi ambient soundscape instrumental',
        'calm lo-fi chill beats instrumental',
        'soft lo-fi relaxation instrumental no lyrics',
        'lo-fi composure peaceful ambient instrumental',
        'meditation lo-fi calm soundscape instrumental',
        'instrumental lo-fi zen music no vocals',
      ],
      'warm-connection': [
        'lo-fi chill vibes instrumental no vocals',
        'lo-fi warm cozy beats instrumental',
        'chill lo-fi beats instrumental only',
        'warm lo-fi jazz instrumental no lyrics',
        'cozy lo-fi vibes soundscape instrumental',
        'lo-fi connection chill ambient instrumental',
        'lo-fi friendly warm instrumental no vocals',
        'instrumental lo-fi chill music only',
      ],
      'pitch-pulse': [
        'lo-fi beats energy instrumental no vocals',
        'lo-fi upbeat motivation instrumental only',
        'energetic lo-fi beats instrumental',
        'lo-fi confidence boost instrumental no lyrics',
        'motivational lo-fi beats soundscape instrumental',
        'lo-fi pulse energy ambient instrumental',
        'upbeat lo-fi confidence instrumental only',
        'instrumental lo-fi energy music no vocals',
      ],
      'recovery-lounge': [
        'lo-fi ambient relaxation instrumental no vocals',
        'lo-fi recovery decompress instrumental only',
        'ambient lo-fi rest soundscape instrumental',
        'relaxation lo-fi sleep music instrumental',
        'lo-fi unwind chill instrumental no lyrics',
        'lo-fi lounge ambient beats instrumental',
        'decompress lo-fi ambient soundscape instrumental',
        'instrumental lo-fi relaxation music no vocals',
      ],
    };

    const keywords = roomKeywords[roomId] || ['lo-fi focus', 'lo-fi ambient', 'lo-fi chill'];
    
    logger.info('🔍 Trying keyword search with multiple keywords', { roomId, keywordCount: keywords.length, keywords });
    
    // Try each keyword in order until we find a good playlist
    for (const keyword of keywords) {
      logger.info('🔍 Searching with keyword', { roomId, keyword });
      try {
        // ENFORCE instrumental requirement in search query
        // Always append "instrumental" or "no vocals" to ensure we get instrumental playlists
        let searchQuery = keyword;
        if (!searchQuery.toLowerCase().includes('instrumental') && !searchQuery.toLowerCase().includes('no vocals') && !searchQuery.toLowerCase().includes('no lyrics')) {
          searchQuery = `${keyword} instrumental`;
        }
        
        const response = await axios.get('https://api.spotify.com/v1/search', {
          params: {
            q: searchQuery,
            type: 'playlist',
            limit: 20, // Get more results for better matching
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const playlists = response.data.playlists?.items || [];
        
        if (playlists.length > 0) {
          // Keywords that indicate lyrics/vocals (should be STRICTLY avoided)
          // CORE RULE: Any playlist with these keywords should be REJECTED
          const lyricsKeywords = [
            'vocal', 'vocals', 'singing', 'singer', 'song', 'songs',
            'lyrics', 'lyric', 'feat', 'ft.', 'featuring', 'with',
            'rap', 'hip hop', 'hip-hop', 'r&b', 'rnb', 'pop',
            'acoustic', 'cover', 'covers', 'remix', 'remixes',
            'karaoke', 'sing along', 'sing-along',
            // Artist names that typically have vocals (common in lo-fi playlists)
            'kendrick', 'lamar', 'drake', 'kanye', 'weeknd', 'post malone',
            'travis scott', 'j cole', 'eminem', 'snoop', 'tupac', 'biggie',
            'frank ocean', 'tyler the creator', 'childish gambino', 'anderson paak'
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
              
              // STRICT REJECTION for playlists with lyrics/vocals
              // CORE RULE: No lyrics allowed - this is a hard requirement
              const hasLyrics = lyricsKeywords.some(keyword => name.includes(keyword));
              if (hasLyrics) {
                score -= 1000; // Massive penalty - will be filtered out completely
                logger.warn('🚫 Rejecting playlist with lyrics/vocals', { playlistName: p.name, matchedKeyword: lyricsKeywords.find(k => name.includes(k)) });
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
            // STRICT FILTER: Reject any playlist with lyrics/vocals
            // CORE RULE: Only instrumental playlists are allowed
            .filter((p: any) => {
              if (p.hasLyrics) {
                logger.warn('🚫 Filtering out playlist with lyrics', { playlistName: p.name });
                return false; // Hard reject - no lyrics allowed
              }
              return p.score > -10; // Only keep playlists that aren't heavily penalized
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
              isInstrumental: bestMatch.isInstrumental,
              hasLyrics: bestMatch.hasLyrics,
            });
            return bestMatch.id;
          }

          // If scoring didn't help much, try to find any instrumental lo-fi playlist
          // STRICT: Must have "instrumental" or "no vocals" AND no lyrics keywords
          const anyInstrumentalLofi = playlists.find((p: any) => {
            const name = p.name.toLowerCase();
            const hasLofi = name.includes('lo-fi') || name.includes('lofi') || name.includes('lo fi');
            const isInstrumental = name.includes('instrumental') || name.includes('no vocals') || name.includes('no lyrics') || name.includes('soundscape') || name.includes('ambient');
            const noLyrics = !lyricsKeywords.some(keyword => name.includes(keyword));
            // Must be lo-fi AND explicitly instrumental AND no lyrics
            return hasLofi && isInstrumental && noLyrics;
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
          
          // Try to find any playlist without lyrics AND with instrumental indicator
          // CORE RULE: Must be explicitly instrumental
          const anyNoLyrics = playlists.find((p: any) => {
            const name = p.name.toLowerCase();
            const noLyrics = !lyricsKeywords.some(keyword => name.includes(keyword));
            const isInstrumental = name.includes('instrumental') || name.includes('no vocals') || name.includes('no lyrics') || name.includes('soundscape') || name.includes('ambient') || name.includes('beats');
            // Must have no lyrics AND be explicitly instrumental
            return noLyrics && isInstrumental;
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

