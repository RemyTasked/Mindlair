import axios from 'axios';
import { logger } from '../../utils/logger';

const APPLE_MUSIC_TEAM_ID = process.env.APPLE_MUSIC_TEAM_ID;
const APPLE_MUSIC_KEY_ID = process.env.APPLE_MUSIC_KEY_ID;
const APPLE_MUSIC_PRIVATE_KEY = process.env.APPLE_MUSIC_PRIVATE_KEY;
const APPLE_MUSIC_REDIRECT_URI = process.env.APPLE_MUSIC_REDIRECT_URI || `${process.env.FRONTEND_URL}/auth/apple-music/callback`;

// Apple Music catalog IDs for each Focus Room (lo-fi playlists)
const FOCUS_ROOM_CATALOG_IDS: Record<string, string> = {
  'deep-focus': process.env.APPLE_MUSIC_DEEP_FOCUS_ID || 'pl.u-8aAV4WtL1YjX6m', // Deep Focus default
  'soft-composure': process.env.APPLE_MUSIC_SOFT_COMPOSURE_ID || 'pl.u-8aAV4WtL1YjX6m', // Peaceful default
  'warm-connection': process.env.APPLE_MUSIC_WARM_CONNECTION_ID || 'pl.u-8aAV4WtL1YjX6m', // Chill default
  'pitch-pulse': process.env.APPLE_MUSIC_PITCH_PULSE_ID || 'pl.u-8aAV4WtL1YjX6m', // Lo-Fi Beats default
  'recovery-lounge': process.env.APPLE_MUSIC_RECOVERY_LOUNGE_ID || 'pl.u-8aAV4WtL1YjX6m', // Ambient default
};

export class AppleMusicService {
  /**
   * Generate developer token (JWT) for Apple Music API
   * This is required for all Apple Music API calls
   */
  generateDeveloperToken(): string {
    if (!APPLE_MUSIC_TEAM_ID || !APPLE_MUSIC_KEY_ID || !APPLE_MUSIC_PRIVATE_KEY) {
      throw new Error('Apple Music credentials not configured');
    }

    // Note: In production, you'd use a JWT library like 'jsonwebtoken'
    // For now, this is a placeholder - you'll need to implement JWT signing
    // with the private key from Apple Developer account
    
    logger.warn('⚠️ Apple Music developer token generation not fully implemented');
    return 'developer-token-placeholder';
  }

  /**
   * Get MusicKit authorization URL
   * Apple Music uses MusicKit JS on the frontend, but we can provide the redirect
   */
  getAuthUrl(userId?: string): string {
    // Apple Music uses MusicKit JS which handles auth client-side
    // We just need to provide the callback URL
    const state = userId ? Buffer.from(JSON.stringify({ userId })).toString('base64') : undefined;
    
    // For web, Apple Music auth happens via MusicKit JS
    // This URL is just for redirect purposes
    const params = new URLSearchParams({
      redirect_uri: APPLE_MUSIC_REDIRECT_URI,
      ...(state && { state }),
    });

    return `${APPLE_MUSIC_REDIRECT_URI}?${params.toString()}`;
  }

  /**
   * Search for lo-fi playlists matching room mood
   */
  async findPlaylistForRoom(userToken: string, roomId: string): Promise<string> {
    // First check if we have a hardcoded catalog ID
    const hardcoded = FOCUS_ROOM_CATALOG_IDS[roomId];
    if (hardcoded) {
      return hardcoded;
    }

    // Search queries for each room
    const searchQueries: Record<string, string> = {
      'deep-focus': 'lo-fi deep focus study',
      'soft-composure': 'lo-fi calm peaceful',
      'warm-connection': 'lo-fi chill vibes',
      'pitch-pulse': 'lo-fi beats energy',
      'recovery-lounge': 'lo-fi ambient relaxation',
    };

    const query = searchQueries[roomId] || 'lo-fi focus';
    const developerToken = this.generateDeveloperToken();

    try {
      const response = await axios.get('https://api.music.apple.com/v1/catalog/us/search', {
        params: {
          term: query,
          types: 'playlists',
          limit: 10,
        },
        headers: {
          Authorization: `Bearer ${developerToken}`,
          'Music-User-Token': userToken,
        },
      });

      const playlists = response.data.results?.playlists?.data || [];
      
      // Prefer playlists with "lo-fi" or "lofi" in the name
      const lofiPlaylist = playlists.find((p: any) => 
        p.attributes.name.toLowerCase().includes('lo-fi') || 
        p.attributes.name.toLowerCase().includes('lofi') ||
        p.attributes.name.toLowerCase().includes('lo fi')
      );

      if (lofiPlaylist) {
        logger.info(`✅ Found lo-fi playlist for ${roomId}`, { 
          playlistId: lofiPlaylist.id, 
          name: lofiPlaylist.attributes.name 
        });
        return lofiPlaylist.id;
      }

      // Fallback to first result
      if (playlists.length > 0) {
        logger.info(`✅ Using first search result for ${roomId}`, { 
          playlistId: playlists[0].id, 
          name: playlists[0].attributes.name 
        });
        return playlists[0].id;
      }

      // Ultimate fallback
      logger.warn(`⚠️ No playlist found for ${roomId}, using default`);
      return FOCUS_ROOM_CATALOG_IDS['deep-focus'] || 'pl.u-8aAV4WtL1YjX6m';
    } catch (error: any) {
      logger.error('❌ Failed to search for Apple Music playlist', {
        error: error.response?.data || error.message,
        roomId,
      });
      // Fallback to hardcoded
      return FOCUS_ROOM_CATALOG_IDS[roomId] || FOCUS_ROOM_CATALOG_IDS['deep-focus'] || 'pl.u-8aAV4WtL1YjX6m';
    }
  }

  getCatalogIdForRoom(roomId: string): string | undefined {
    return FOCUS_ROOM_CATALOG_IDS[roomId];
  }
}

export const appleMusicService = new AppleMusicService();

