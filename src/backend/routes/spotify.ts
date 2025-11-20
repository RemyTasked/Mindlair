import express from 'express';
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

// Play a Focus Room playlist
router.post(
  '/play',
  authenticate,
  asyncHandler(async (req, res) => {
    const { playlistId, roomId } = req.body;

    if (!playlistId && !roomId) {
      throw new AppError('playlistId or roomId is required', 400);
    }

    const spotifyAccount = await prisma.spotifyAccount.findUnique({
      where: { userId: req.userId },
    });

    if (!spotifyAccount) {
      throw new AppError('Spotify account not connected', 401);
    }

    // Check if token needs refresh
    let accessToken = spotifyAccount.accessToken;
    if (spotifyAccount.expiresAt && spotifyAccount.expiresAt < new Date()) {
      if (!spotifyAccount.refreshToken) {
        throw new AppError('Spotify token expired and no refresh token available', 401);
      }

      const refreshed = await spotifyService.refreshAccessToken(spotifyAccount.refreshToken);
      accessToken = refreshed.access_token;

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + refreshed.expires_in);

      await prisma.spotifyAccount.update({
        where: { userId: req.userId },
        data: {
          accessToken: refreshed.access_token,
          expiresAt,
        },
      });
    }

    // Get playlist ID
    const finalPlaylistId = playlistId || spotifyService.getPlaylistIdForRoom(roomId);
    if (!finalPlaylistId) {
      throw new AppError('Playlist not found for room', 404);
    }

    // Get active device or use default
    const devices = await spotifyService.getDevices(accessToken);
    const activeDevice = devices.find((d) => d.is_active) || devices[0];

    await spotifyService.playPlaylist(accessToken, finalPlaylistId, activeDevice?.id);

    res.json({ success: true, deviceId: activeDevice?.id });
  })
);

// Pause playback
router.post(
  '/pause',
  authenticate,
  asyncHandler(async (req, res) => {
    const spotifyAccount = await prisma.spotifyAccount.findUnique({
      where: { userId: req.userId },
    });

    if (!spotifyAccount) {
      throw new AppError('Spotify account not connected', 401);
    }

    // Check if token needs refresh
    let accessToken = spotifyAccount.accessToken;
    if (spotifyAccount.expiresAt && spotifyAccount.expiresAt < new Date()) {
      if (!spotifyAccount.refreshToken) {
        throw new AppError('Spotify token expired and no refresh token available', 401);
      }

      const refreshed = await spotifyService.refreshAccessToken(spotifyAccount.refreshToken);
      accessToken = refreshed.access_token;

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + refreshed.expires_in);

      await prisma.spotifyAccount.update({
        where: { userId: req.userId },
        data: {
          accessToken: refreshed.access_token,
          expiresAt,
        },
      });
    }

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

    const spotifyAccount = await prisma.spotifyAccount.findUnique({
      where: { userId: req.userId },
    });

    if (!spotifyAccount) {
      throw new AppError('Spotify account not connected', 401);
    }

    // Check if token needs refresh
    let accessToken = spotifyAccount.accessToken;
    if (spotifyAccount.expiresAt && spotifyAccount.expiresAt < new Date()) {
      if (!spotifyAccount.refreshToken) {
        throw new AppError('Spotify token expired and no refresh token available', 401);
      }

      const refreshed = await spotifyService.refreshAccessToken(spotifyAccount.refreshToken);
      accessToken = refreshed.access_token;

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + refreshed.expires_in);

      await prisma.spotifyAccount.update({
        where: { userId: req.userId },
        data: {
          accessToken: refreshed.access_token,
          expiresAt,
        },
      });
    }

    const devices = await spotifyService.getDevices(accessToken);
    const activeDevice = devices.find((d) => d.is_active) || devices[0];

    await spotifyService.setVolume(accessToken, volumePercent, activeDevice?.id);

    res.json({ success: true });
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

