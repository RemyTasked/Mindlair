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

  // Check if token needs refresh
  if (spotifyAccount.expiresAt && spotifyAccount.expiresAt < new Date()) {
    if (!spotifyAccount.refreshToken) {
      throw new AppError('Spotify token expired and no refresh token available', 401);
    }

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

    return refreshed.access_token;
  }

  return spotifyAccount.accessToken;
}

// Play a Focus Room playlist
router.post(
  '/play',
  authenticate,
  asyncHandler(async (req, res) => {
    const { playlistId, roomId } = req.body;

    if (!playlistId && !roomId) {
      throw new AppError('playlistId or roomId is required', 400);
    }

    const accessToken = await getAccessToken(req.userId!);

    // Get playlist ID
    const finalPlaylistId = playlistId || spotifyService.getPlaylistIdForRoom(roomId);
    if (!finalPlaylistId) {
      throw new AppError('Playlist not found for room', 404);
    }

    // Get active device or use default
    const devices = await spotifyService.getDevices(accessToken);
    const activeDevice = devices.find((d) => d.is_active) || devices[0];

    await spotifyService.playPlaylist(accessToken, finalPlaylistId, activeDevice?.id);

    res.json({ success: true, deviceId: activeDevice?.id, playlistId: finalPlaylistId });
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
