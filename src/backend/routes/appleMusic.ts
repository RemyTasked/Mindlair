import express from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { appleMusicService } from '../services/appleMusic/appleMusicService';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

const router = express.Router();

// Helper to get user token
async function getUserToken(userId: string): Promise<string> {
  const appleMusicAccount = await prisma.appleMusicAccount.findUnique({
    where: { userId },
  });

  if (!appleMusicAccount) {
    throw new AppError('Apple Music account not connected', 401);
  }

  // Check if token is expired (MusicKit tokens typically last 6 months)
  if (appleMusicAccount.expiresAt && appleMusicAccount.expiresAt < new Date()) {
    throw new AppError('Apple Music token expired. Please reconnect.', 401);
  }

  return appleMusicAccount.userToken;
}

// Get Apple Music connection status
router.get(
  '/status',
  authenticate,
  asyncHandler(async (req, res) => {
    const appleMusicAccount = await prisma.appleMusicAccount.findUnique({
      where: { userId: req.userId },
    });

    res.json({
      connected: !!appleMusicAccount,
      displayName: appleMusicAccount?.displayName || null,
    });
  })
);

// Get developer token for MusicKit JS initialization
// Note: This requires Apple Developer account setup
router.get(
  '/developer-token',
  authenticate,
  asyncHandler(async (_req, res) => {
    // Generate developer token (JWT) for MusicKit JS
    // This requires Apple Developer credentials to be configured
    const developerToken = appleMusicService.generateDeveloperToken();
    
    res.json({
      developerToken: developerToken || '',
      configured: !!process.env.APPLE_MUSIC_TEAM_ID && !!process.env.APPLE_MUSIC_KEY_ID && !!process.env.APPLE_MUSIC_PRIVATE_KEY,
    });
  })
);

// Play a Focus Room playlist - automatically finds appropriate lo-fi playlist
router.post(
  '/play',
  authenticate,
  asyncHandler(async (req, res) => {
    const { roomId } = req.body;

    if (!roomId) {
      throw new AppError('roomId is required', 400);
    }

    const userToken = await getUserToken(req.userId!);

    // Automatically find appropriate lo-fi playlist for this room
    const playlistId = await appleMusicService.findPlaylistForRoom(userToken, roomId);

    // Note: Apple Music playback is controlled via MusicKit JS on the frontend
    // This endpoint just returns the playlist ID for the frontend to use
    res.json({ success: true, playlistId });
  })
);

// Disconnect Apple Music account
router.post(
  '/disconnect',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    const appleMusicAccount = await prisma.appleMusicAccount.findUnique({
      where: { userId },
    });

    if (!appleMusicAccount) {
      throw new AppError('Apple Music account not connected', 404);
    }

    await prisma.appleMusicAccount.delete({
      where: { userId },
    });

    logger.info('✅ Apple Music account disconnected', { userId });
    res.json({ success: true, message: 'Apple Music account disconnected' });
  })
);

export default router;

