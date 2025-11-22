import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import * as gameService from '../services/games/gameService';

const router = Router();

/**
 * GET /api/games/daily
 * Get today's game type and initial data
 */
router.get('/daily', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.userId;
    const gameType = gameService.getDailyGameType();
    
    // Get user progress
    const progress = await gameService.getUserGameProgress(userId);

    return res.json({
      gameType,
      progress: {
        totalCredits: progress.totalCredits,
        currentStreak: progress.currentStreak,
        longestStreak: progress.longestStreak,
        badges: progress.badges as string[],
      },
    });
  } catch (error: any) {
    logger.error('Error getting daily game:', error);
    return res.status(500).json({ error: error.message || 'Failed to get daily game' });
  }
});

/**
 * GET /api/games/scene-sense/questions
 * Get questions for Scene Sense game
 */
router.get('/scene-sense/questions', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.userId;
    const count = parseInt(req.query.count as string) || 5;
    const sceneMatch = req.query.sceneMatch as string | undefined;

    const questions = await gameService.getSceneSenseQuestions(userId, count, sceneMatch);

    return res.json({ questions });
  } catch (error: any) {
    logger.error('Error getting Scene Sense questions:', error);
    return res.status(500).json({ error: error.message || 'Failed to get questions' });
  }
});

/**
 * GET /api/games/mind-match/pairs
 * Get pairs for Mind Match game
 */
router.get('/mind-match/pairs', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.userId;
    const sceneMatch = req.query.sceneMatch as string | undefined;

    const pairs = await gameService.getMindMatchPairs(userId, sceneMatch);

    return res.json({ pairs });
  } catch (error: any) {
    logger.error('Error getting Mind Match pairs:', error);
    return res.status(500).json({ error: error.message || 'Failed to get pairs' });
  }
});

/**
 * POST /api/games/scene-sense/submit
 * Submit answer for Scene Sense question
 */
router.post('/scene-sense/submit', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.userId;
    const { questionId, userAnswer, isCorrect, perfectScore } = req.body;

    if (!questionId || userAnswer === undefined || isCorrect === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await gameService.recordGameSession(userId, 'scene-sense', {
      questionId,
      userAnswer,
      isCorrect,
      perfectScore,
    });

    return res.json({
      success: true,
      credits: result.credits,
      streak: result.streak,
      badge: result.badge,
    });
  } catch (error: any) {
    logger.error('Error submitting Scene Sense answer:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit answer' });
  }
});

/**
 * POST /api/games/mind-match/submit
 * Submit results for Mind Match game
 */
router.post('/mind-match/submit', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.userId;
    const { pairId, matchedPairs, totalPairs, perfectScore } = req.body;

    if (!pairId || matchedPairs === undefined || totalPairs === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await gameService.recordGameSession(userId, 'mind-match', {
      pairId,
      matchedPairs,
      totalPairs,
      perfectScore,
    });

    return res.json({
      success: true,
      credits: result.credits,
      streak: result.streak,
      badge: result.badge,
    });
  } catch (error: any) {
    logger.error('Error submitting Mind Match results:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit results' });
  }
});

/**
 * GET /api/games/seed-status
 * Check if games database is seeded
 */
router.get('/seed-status', authenticate, async (req: Request, res: Response) => {
  try {
    // Verify userId is available
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      // Check if tables exist first
      const tablesExist = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('game_questions', 'game_pairs')
        )
      `;
      
      if (!tablesExist || (Array.isArray(tablesExist) && !tablesExist[0]?.exists)) {
        await prisma.$disconnect();
        return res.json({ 
          seeded: false,
          questionCount: 0,
          pairCount: 0,
          error: 'Tables do not exist. Migrations may not have completed.'
        });
      }
      
      const questionCount = await prisma.gameQuestion.count().catch(() => 0);
      const pairCount = await prisma.gamePair.count().catch(() => 0);
      await prisma.$disconnect();
      
      return res.json({ 
        seeded: questionCount > 0 && pairCount > 0,
        questionCount,
        pairCount
      });
    } catch (dbError: any) {
      logger.error('Database error checking seed status:', dbError);
      return res.json({ 
        seeded: false,
        questionCount: 0,
        pairCount: 0,
        error: dbError.message || 'Database connection error'
      });
    }
  } catch (error: any) {
    logger.error('Error checking seed status:', error);
    return res.status(500).json({ error: error.message || 'Failed to check seed status' });
  }
});

/**
 * POST /api/games/seed
 * Manually seed games database
 */
router.post('/seed', authenticate, async (req: Request, res: Response) => {
  try {
    // Verify userId is available
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Import and run seed function directly
    const { seedGames } = require('../scripts/seedGames');
    await seedGames();
    
    // Check results using shared Prisma instance
    const { prisma } = require('../utils/prisma');
    const questionCount = await prisma.gameQuestion.count();
    const pairCount = await prisma.gamePair.count();
    
    logger.info(`✅ Games seeded successfully: ${questionCount} questions, ${pairCount} pairs`);
    
    return res.json({ 
      success: true, 
      message: `Games seeded successfully (${questionCount} questions, ${pairCount} pairs)`,
      questionCount,
      pairCount
    });
  } catch (error: any) {
    logger.error('Error seeding games:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to seed games',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/games/progress
 * Get user's game progress
 */
router.get('/progress', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const progress = await gameService.getUserGameProgress(userId);

    res.json({
      totalCredits: progress.totalCredits,
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      badges: progress.badges as string[],
      categoryMastery: progress.categoryMastery,
      levelUnlocks: {
        level1: progress.level1Unlocked,
        level2: progress.level2Unlocked,
        level3: progress.level3Unlocked,
        level4: progress.level4Unlocked,
        level5: progress.level5Unlocked,
      },
    });
  } catch (error: any) {
    logger.error('Error getting game progress:', error);
    res.status(500).json({ error: error.message || 'Failed to get progress' });
  }
});

export default router;

