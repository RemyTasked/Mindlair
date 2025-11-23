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

    if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
      logger.error('❌ Invalid roomId in Spotify play request', { roomId, body: req.body });
      throw new AppError('roomId is required and must be a non-empty string', 400);
    }

    try {
      const accessToken = await getAccessToken(req.userId!);

      // Validate roomId is one of the known rooms
      const validRoomIds = ['deep-focus', 'soft-composure', 'warm-connection', 'pitch-pulse', 'recovery-lounge'];
      if (!validRoomIds.includes(roomId)) {
        logger.error('❌ Invalid roomId', { roomId, validRoomIds });
        throw new AppError(`Invalid roomId: ${roomId}. Must be one of: ${validRoomIds.join(', ')}`, 400);
      }

      // Automatically find appropriate lo-fi playlist for this room
      let playlistId: string;
      try {
        playlistId = await spotifyService.findPlaylistForRoom(accessToken, roomId);
        logger.info('✅ Found playlist for room', { roomId, playlistId });
      } catch (playlistError: any) {
        logger.error('❌ Failed to find playlist for room', { roomId, error: playlistError.message });
        throw new AppError(`Failed to find Spotify playlist for room "${roomId}". Please try again or use Meet-Cute audio instead.`, 400);
      }

      // Get available devices
      const devices = await spotifyService.getDevices(accessToken);
      logger.info('📱 Available Spotify devices', { count: devices.length, devices: devices.map(d => ({ id: d.id, name: d.name, type: d.type, is_active: d.is_active })) });
      
      // Detect if request is from mobile device
      const userAgent = req.headers['user-agent'] || '';
      const isMobileRequest = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      logger.info('📱 Device detection', { userAgent: userAgent.substring(0, 100), isMobileRequest });
      
      // Find active device first
      let targetDevice = devices.find((d) => d.is_active);
      
      if (!targetDevice) {
        // If request is from mobile, prioritize mobile devices
        if (isMobileRequest) {
          targetDevice = devices.find((d) => d.type === 'Smartphone' || d.type === 'Tablet' || d.type === 'Mobile');
          if (!targetDevice) {
            // Fall back to any mobile-like device
            targetDevice = devices.find((d) => d.name.toLowerCase().includes('phone') || d.name.toLowerCase().includes('mobile') || d.name.toLowerCase().includes('iphone') || d.name.toLowerCase().includes('android'));
          }
        }
        
        // If still no device, prefer web player for desktop requests, or any device
        if (!targetDevice) {
          if (!isMobileRequest) {
            // Prefer web player for desktop requests
            targetDevice = devices.find((d) => d.type === 'Computer' || d.type === 'WebPlayer');
          }
          if (!targetDevice) {
            // Fall back to any available device
            targetDevice = devices[0];
          }
        }
      }

      if (!targetDevice) {
        logger.warn('⚠️ No Spotify device found. User may need to open Spotify app.', { 
          deviceCount: devices.length,
          devices: devices.map(d => ({ id: d.id, name: d.name, type: d.type, is_active: d.is_active }))
        });
        throw new AppError(
          'No Spotify device found. This is a Spotify API requirement - you need Spotify open on at least one device to control playback.\n\n' +
          'Quick fix:\n' +
          '1. Open Spotify on any device (web player at open.spotify.com, desktop app, or mobile app)\n' +
          '2. Make sure it\'s actively playing or ready to play\n' +
          '3. Try again\n\n' +
          'Why? Spotify\'s API requires an active device to control playback - this is a security feature to prevent unauthorized remote control.',
          400
        );
      }
      
      // Validate playlist ID format
      if (!playlistId || playlistId.length < 10) {
        logger.error('❌ Invalid playlist ID', { playlistId, roomId });
        throw new AppError('Invalid playlist ID. Please try again or contact support.', 400);
      }

      // If device is not active, transfer playback to it first (without playing)
      if (!targetDevice.is_active) {
        logger.info('🔄 Transferring playback to device', { deviceId: targetDevice.id, deviceName: targetDevice.name, deviceType: targetDevice.type });
        try {
          // Transfer playback WITHOUT starting playback (play: false)
          // This ensures the device is active before we try to play
          await spotifyService.transferPlayback(accessToken, targetDevice.id, false);
          // Wait for transfer to complete and device to become active
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verify device is now active (optional check)
          const updatedDevices = await spotifyService.getDevices(accessToken);
          const updatedDevice = updatedDevices.find((d) => d.id === targetDevice.id);
          if (updatedDevice?.is_active) {
            logger.info('✅ Device is now active after transfer', { deviceId: targetDevice.id });
          } else {
            logger.warn('⚠️ Device may not be active yet, but continuing with play attempt', { deviceId: targetDevice.id });
          }
        } catch (transferError: any) {
          // If transfer fails, log but continue - we'll try to play anyway
          // Sometimes Spotify can play on a device even if transfer fails
          logger.warn('⚠️ Failed to transfer playback, trying direct play anyway', { 
            error: transferError.message,
            deviceId: targetDevice.id 
          });
          // Continue to try playing - device might still work
        }
      }

      // Now play the playlist (either device is already active, or transfer failed)
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
    try {
      const accessToken = await getAccessToken(req.userId!);
      const devices = await spotifyService.getDevices(accessToken);
      const activeDevice = devices.find((d) => d.is_active) || devices[0];

      // If no device found, try pausing without device ID (Spotify will use active device)
      await spotifyService.pausePlayback(accessToken, activeDevice?.id);

      return res.json({ success: true });
    } catch (error: any) {
      // If pause fails because nothing is playing, that's okay
      if (error.message?.includes('No active playback') || error.message?.includes('404')) {
        return res.json({ success: true, message: 'No active playback to pause' });
      }
      throw error;
    }
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
