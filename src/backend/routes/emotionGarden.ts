import express from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import * as emotionGardenService from '../services/games/emotionGardenService';

const router = express.Router();

/**
 * GET /api/emotion-garden/state
 * Get current garden state
 */
router.get('/state', authenticate, asyncHandler(async (req, res) => {
  const userId = req.userId!;
  const state = await emotionGardenService.getGardenState(userId);
  res.json({ state });
}));

/**
 * POST /api/emotion-garden/checkin
 * Record emotion check-in and update garden
 */
router.post('/checkin', authenticate, asyncHandler(async (req, res) => {
  const userId = req.userId!;
  const { emotion, intensity, notes } = req.body;

  if (!emotion) {
    throw new AppError('Missing required field: emotion', 400);
  }

  await emotionGardenService.recordEmotionCheckIn(
    userId,
    emotion,
    intensity || 5,
    notes
  );

  // Return updated garden state
  const state = await emotionGardenService.getGardenState(userId);
  res.json({ success: true, state });
}));

/**
 * POST /api/emotion-garden/update
 * Update garden based on activity (called after Focus Rooms, games, etc.)
 */
router.post('/update', authenticate, asyncHandler(async (req, res) => {
  const userId = req.userId!;
  const { emotion, intensity, activityType } = req.body;

  const state = await emotionGardenService.updateGardenState(
    userId,
    emotion || 'calm',
    intensity || 5,
    activityType
  );

  res.json({ success: true, state });
}));

/**
 * GET /api/emotion-garden/insights
 * Get garden insights and patterns
 */
router.get('/insights', authenticate, asyncHandler(async (req, res) => {
  const userId = req.userId!;
  const insights = await emotionGardenService.getGardenInsights(userId);
  res.json({ insights });
}));

export default router;

