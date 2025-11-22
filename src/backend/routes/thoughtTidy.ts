import express from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import * as thoughtTidyService from '../services/games/thoughtTidyService';

const router = express.Router();

/**
 * GET /api/thought-tidy/cards
 * Get thought cards for a new session
 */
router.get('/cards', authenticate, asyncHandler(async (_req, res) => {
  const cards = thoughtTidyService.generateThoughtCards();
  res.json({ cards });
}));

/**
 * GET /api/thought-tidy/today
 * Get today's session if it exists
 */
router.get('/today', authenticate, asyncHandler(async (req, res) => {
  const userId = req.userId!;
  const session = await thoughtTidyService.getTodayThoughtTidySession(userId);
  res.json({ session });
}));

/**
 * POST /api/thought-tidy/submit
 * Submit completed Thought Tidy session
 */
router.post('/submit', authenticate, asyncHandler(async (req, res) => {
  const userId = req.userId!;
  const { kept, parked, released, actionItems } = req.body;

  if (!kept || !parked || !released) {
    throw new AppError('Missing required fields: kept, parked, released', 400);
  }

  const result = await thoughtTidyService.recordThoughtTidySession(userId, {
    kept,
    parked,
    released,
    actionItems,
  });

  res.json({
    success: true,
    credits: result.credits,
    badge: result.badge,
  });
}));

export default router;

