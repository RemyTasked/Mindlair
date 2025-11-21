import express from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { spotifyService } from '../services/spotify/spotifyService';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

const router = express.Router();

// Get Spotify connection status
router.get(
  '/status',
  authenticate,
  asyncHandler(async (req, res) => {
    const spotifyAccount = await prisma.spotifyAccount.findUnique({
      where: { userId: req.userId },
    });

    res.json({
      connected: !!spotifyAccount,
      displayName: spotifyAccount?.displayName || null,
    });
  })
);

// Helper to get and refresh access token
async function getAccessToken(userId: string): Promise<string> {
  const spotifyAccount = await prisma.spotifyAccount.findUnique({
    where: { userId },
  });

  if (!spotifyAccount) {
    throw new AppError('Spotify account not connected', 401);
  }

  // Check if token needs refresh (refresh 5 minutes before expiration)
  const refreshThreshold = new Date();
  refreshThreshold.setMinutes(refreshThreshold.getMinutes() + 5);
  
  if (spotifyAccount.expiresAt && spotifyAccount.expiresAt < refreshThreshold) {
    if (!spotifyAccount.refreshToken) {
      logger.error('❌ Spotify token expired and no refresh token available', { userId });
      // Delete the account so user can reconnect
      await prisma.spotifyAccount.delete({ where: { userId } }).catch(() => {});
      throw new AppError('Spotify token expired. Please reconnect your account.', 401);
    }

    try {
      const refreshed = await spotifyService.refreshAccessToken(spotifyAccount.refreshToken);
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + refreshed.expires_in);

      await prisma.spotifyAccount.update({
        where: { userId },
        data: {
          accessToken: refreshed.access_token,
          expiresAt,
        },
      });

      logger.info('✅ Spotify token refreshed', { userId });
      return refreshed.access_token;
    } catch (error: any) {
      logger.error('❌ Failed to refresh Spotify token', { 
        userId, 
        error: error.message,
        errorResponse: error.response?.data 
      });
      // If refresh fails, delete the account so user can reconnect
      await prisma.spotifyAccount.delete({ where: { userId } }).catch(() => {});
      throw new AppError('Spotify token refresh failed. Please reconnect your account.', 401);
    }
  }

  return spotifyAccount.accessToken;
}

// Play a Focus Room playlist - automatically finds appropriate lo-fi playlist
router.post(
  '/play',
  authenticate,
  asyncHandler(async (req, res) => {
    const { roomId } = req.body;

    if (!roomId) {
      throw new AppError('roomId is required', 400);
    }

    try {
      const accessToken = await getAccessToken(req.userId!);

      // Automatically find appropriate lo-fi playlist for this room
      const playlistId = await spotifyService.findPlaylistForRoom(accessToken, roomId);
      logger.info('✅ Found playlist for room', { roomId, playlistId });

      // Get available devices
      const devices = await spotifyService.getDevices(accessToken);
      logger.info('📱 Available Spotify devices', { count: devices.length, devices: devices.map(d => ({ id: d.id, name: d.name, type: d.type, is_active: d.is_active })) });
      
      // Find active device or prefer web player, then desktop, then mobile
      let targetDevice = devices.find((d) => d.is_active);
      
      if (!targetDevice) {
        // Prefer web player if available
        targetDevice = devices.find((d) => d.type === 'Computer' || d.type === 'WebPlayer');
        if (!targetDevice) {
          // Fall back to any available device
          targetDevice = devices[0];
        }
      }

      if (!targetDevice) {
        logger.warn('⚠️ No Spotify device found. User may need to open Spotify app.', { 
          deviceCount: devices.length,
          devices: devices.map(d => ({ id: d.id, name: d.name, type: d.type, is_active: d.is_active }))
        });
        throw new AppError('No Spotify device found. Please open Spotify on one of your devices (web player at open.spotify.com, desktop app, or mobile app) and try again. Make sure Spotify is actively running on at least one device.', 400);
      }
      
      // Validate playlist ID format
      if (!playlistId || playlistId.length < 10) {
        logger.error('❌ Invalid playlist ID', { playlistId, roomId });
        throw new AppError('Invalid playlist ID. Please try again or contact support.', 400);
      }

      // If device is not active, transfer playback to it first
      if (!targetDevice.is_active) {
        logger.info('🔄 Transferring playback to device', { deviceId: targetDevice.id, deviceName: targetDevice.name, deviceType: targetDevice.type });
        try {
          await spotifyService.transferPlayback(accessToken, targetDevice.id, false); // Transfer but don't play yet
          // Wait a moment for transfer to complete
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (transferError: any) {
          logger.warn('⚠️ Failed to transfer playback, trying to play anyway', { error: transferError.message });
          // Continue anyway - sometimes playback works without explicit transfer
        }
      }

      // Now play the playlist
      try {
        await spotifyService.playPlaylist(accessToken, playlistId, targetDevice.id);
        logger.info('✅ Started Spotify playback', { playlistId, deviceId: targetDevice.id, deviceName: targetDevice.name, deviceType: targetDevice.type });
        res.json({ success: true, deviceId: targetDevice.id, playlistId, deviceName: targetDevice.name, deviceType: targetDevice.type });
      } catch (playError: any) {
        logger.error('❌ Failed to play playlist on device', {
          error: playError.message,
          errorResponse: playError.response?.data,
          statusCode: playError.response?.status,
          deviceId: targetDevice.id,
          playlistId,
        });
        
        // Provide specific error messages based on status code
        if (playError.response?.status === 403) {
          throw new AppError('Spotify Premium is required for playback. Please upgrade your account or use Meet-Cute audio instead.', 403);
        } else if (playError.response?.status === 404) {
          throw new AppError('Playlist not found. Please try again or use Meet-Cute audio instead.', 404);
        } else if (playError.response?.status === 401) {
          await prisma.spotifyAccount.delete({ where: { userId: req.userId! } }).catch(() => {});
          throw new AppError('Spotify authentication failed. Please reconnect your account.', 401);
        } else {
          throw new AppError(`Spotify playback failed: ${playError.response?.data?.error?.message || playError.message || 'Unknown error'}. Please try again or use Meet-Cute audio instead.`, playError.response?.status || 500);
        }
      }
    } catch (error: any) {
      logger.error('❌ Failed to play Spotify playlist', {
        error: error.message,
        errorResponse: error.response?.data,
        statusCode: error.statusCode || error.response?.status,
        roomId,
        userId: req.userId,
      });
      
      // If it's an auth error, delete the account so user can reconnect
      if (error.statusCode === 401 || error.response?.status === 401 || error.message?.includes('token') || error.message?.includes('expired')) {
        await prisma.spotifyAccount.delete({ where: { userId: req.userId! } }).catch(() => {});
        throw new AppError('Spotify authentication failed. Please reconnect your account.', 401);
      }
      
      // Re-throw AppError as-is, otherwise wrap in AppError
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(error.message || 'Failed to start Spotify playback. Please try again or use Meet-Cute audio instead.', error.statusCode || error.response?.status || 500);
    }
  })
);

// Pause playback
router.post(
  '/pause',
  authenticate,
  asyncHandler(async (req, res) => {
    const accessToken = await getAccessToken(req.userId!);
    const devices = await spotifyService.getDevices(accessToken);
    const activeDevice = devices.find((d) => d.is_active) || devices[0];

    await spotifyService.pausePlayback(accessToken, activeDevice?.id);

    res.json({ success: true });
  })
);

// Set volume
router.post(
  '/volume',
  authenticate,
  asyncHandler(async (req, res) => {
    const { volumePercent } = req.body;

    if (typeof volumePercent !== 'number' || volumePercent < 0 || volumePercent > 100) {
      throw new AppError('volumePercent must be a number between 0 and 100', 400);
    }

    const accessToken = await getAccessToken(req.userId!);
    const devices = await spotifyService.getDevices(accessToken);
    const activeDevice = devices.find((d) => d.is_active) || devices[0];

    await spotifyService.setVolume(accessToken, volumePercent, activeDevice?.id);

    res.json({ success: true });
  })
);

// Skip to next track
router.post(
  '/next',
  authenticate,
  asyncHandler(async (req, res) => {
    const accessToken = await getAccessToken(req.userId!);
    const devices = await spotifyService.getDevices(accessToken);
    const activeDevice = devices.find((d) => d.is_active) || devices[0];

    try {
      const nextUrl = activeDevice?.id
        ? `https://api.spotify.com/v1/me/player/next?device_id=${activeDevice.id}`
        : 'https://api.spotify.com/v1/me/player/next';

      await axios.post(
        nextUrl,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      logger.info('✅ Skipped to next track');
      res.json({ success: true });
    } catch (error: any) {
      logger.error('❌ Failed to skip track', {
        error: error.response?.data || error.message,
      });
      throw new AppError('Failed to skip track', 500);
    }
  })
);

// Disconnect Spotify account
router.post(
  '/disconnect',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    const spotifyAccount = await prisma.spotifyAccount.findUnique({
      where: { userId },
    });

    if (!spotifyAccount) {
      throw new AppError('Spotify account not connected', 404);
    }

    await prisma.spotifyAccount.delete({
      where: { userId },
    });

    logger.info('✅ Spotify account disconnected', { userId });
    res.json({ success: true, message: 'Spotify account disconnected' });
  })
);

// Get currently playing track
router.get(
  '/currently-playing',
  authenticate,
  asyncHandler(async (req, res) => {
    const accessToken = await getAccessToken(req.userId!);

    try {
      const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 204) {
        // No track currently playing
        res.json({ isPlaying: false });
      } else {
        res.json({
          isPlaying: true,
          track: {
            name: response.data.item?.name,
            artist: response.data.item?.artists?.[0]?.name,
            album: response.data.item?.album?.name,
            image: response.data.item?.album?.images?.[0]?.url,
          },
          progress: response.data.progress_ms,
          duration: response.data.item?.duration_ms,
        });
      }
    } catch (error: any) {
      logger.error('❌ Failed to get currently playing', {
        error: error.response?.data || error.message,
      });
      res.json({ isPlaying: false });
    }
  })
);

// Disconnect Spotify
router.delete(
  '/disconnect',
  authenticate,
  asyncHandler(async (req, res) => {
    await prisma.spotifyAccount.deleteMany({
      where: { userId: req.userId },
    });

    logger.info('📝 Disconnected Spotify account', { userId: req.userId });

    res.json({ success: true });
  })
);

export default router;
