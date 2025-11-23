import express from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
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
  try {
    if (!req.userId) {
      throw new AppError('Authentication required', 401);
    }
    
    const userId = req.userId;
    const { kept, parked, released, actionItems } = req.body;

    // Validate input - arrays can be empty but must exist
    if (!Array.isArray(kept) || !Array.isArray(parked) || !Array.isArray(released)) {
      throw new AppError('Missing required fields: kept, parked, and released must be arrays', 400);
    }

    // Ensure at least one thought was sorted
    if (kept.length === 0 && parked.length === 0 && released.length === 0) {
      throw new AppError('Please sort at least one thought before completing', 400);
    }

    const result = await thoughtTidyService.recordThoughtTidySession(userId, {
      kept: kept || [],
      parked: parked || [],
      released: released || [],
      actionItems: actionItems || undefined,
    });

    res.json({
      success: true,
      credits: result.credits,
      badge: result.badge,
    });
  } catch (error: any) {
    logger.error('Error in Thought Tidy submit endpoint:', {
      error: error.message,
      stack: error.stack,
      userId: req.userId,
      body: req.body,
    });
    
    // Re-throw AppError as-is, otherwise wrap in AppError
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(error.message || 'Failed to submit Thought Tidy session', 500);
  }
}));

export default router;

