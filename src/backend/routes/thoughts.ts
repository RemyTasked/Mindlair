import express from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import * as sharedThoughtService from '../services/games/sharedThoughtService';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /api/thoughts/pool
 * Get a mixed pool of thoughts for games
 */
router.get(
  '/pool',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { count, category, forGame } = req.query;

    const thoughts = await sharedThoughtService.getThoughtPool(userId, {
      count: count ? parseInt(count as string) : 15,
      category: category as string | undefined,
      forGame: forGame as 'popper' | 'sorter' | 'reframer' | undefined,
      includePersonal: true,
    });

    res.json({ thoughts });
  })
);

/**
 * GET /api/thoughts/popper
 * Get negative thoughts specifically for Thought Popper game
 */
router.get(
  '/popper',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { count } = req.query;

    const thoughts = await sharedThoughtService.getPopperThoughts(
      userId,
      count ? parseInt(count as string) : 20
    );

    res.json({ thoughts });
  })
);

/**
 * GET /api/thoughts/sorter
 * Get thoughts with bucket metadata for Thought Sorter
 */
router.get(
  '/sorter',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { count } = req.query;

    const thoughts = await sharedThoughtService.getSorterThoughts(
      userId,
      count ? parseInt(count as string) : 12
    );

    res.json({ thoughts });
  })
);

/**
 * GET /api/thoughts/reframer
 * Get distorted thoughts for Thought Reframing Lab
 */
router.get(
  '/reframer',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { count } = req.query;

    const thoughts = await sharedThoughtService.getReframerThoughts(
      userId,
      count ? parseInt(count as string) : 8
    );

    res.json({ thoughts });
  })
);

/**
 * POST /api/thoughts/share
 * Anonymously share a thought to the community pool
 */
router.post(
  '/share',
  authenticate,
  asyncHandler(async (req, res) => {
    const { text, category, suggestedBucket, distortionType, exampleReframe } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    await sharedThoughtService.shareThought(text, {
      category,
      suggestedBucket,
      distortionType,
      exampleReframe,
    });

    logger.info('Thought shared to community pool');
    res.json({ success: true, message: 'Thank you for contributing!' });
  })
);

/**
 * POST /api/thoughts/seed
 * Seed system thoughts (admin/dev only)
 */
router.post(
  '/seed',
  authenticate,
  asyncHandler(async (req, res) => {
    await sharedThoughtService.seedSystemThoughts();
    res.json({ success: true, message: 'System thoughts seeded' });
  })
);

export default router;

