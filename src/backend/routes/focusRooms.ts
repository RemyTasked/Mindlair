import express from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { z } from 'zod';

const router = express.Router();

// Calculate credits based on session duration and completion
function calculateCredits(durationSeconds: number, completed: boolean, timerOption: string): number {
  // Only award credits if session is completed AND lasted at least 5 minutes
  if (!completed || durationSeconds < 300) return 0;

  // Base credits: 1 credit per minute, minimum 5 credits (for 5+ minute sessions)
  const baseCredits = Math.max(5, Math.floor(durationSeconds / 60));

  // Bonus for longer sessions
  let bonus = 0;
  if (durationSeconds >= 20 * 60) {
    bonus = 5; // 5 bonus credits for 20+ minute sessions
  } else if (durationSeconds >= 10 * 60) {
    bonus = 2; // 2 bonus credits for 10+ minute sessions
  }

  // Bonus for infinite timer sessions
  if (timerOption === '∞' && durationSeconds >= 5 * 60) {
    bonus += 3; // Extra 3 credits for infinite sessions
  }

  return baseCredits + bonus;
}

// Start a Focus Room session
const startSessionSchema = z.object({
  roomId: z.string(),
  roomName: z.string(),
  timerOption: z.enum(['5', '10', '20', '∞']),
  audioSource: z.enum(['spotify', 'meetcute']),
});

router.post(
  '/sessions/start',
  authenticate,
  asyncHandler(async (req, res) => {
    if (!req.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const validated = startSessionSchema.parse(req.body);

    const session = await prisma.focusRoomSession.create({
      data: {
        userId: req.userId,
        roomId: validated.roomId,
        roomName: validated.roomName,
        timerOption: validated.timerOption,
        audioSource: validated.audioSource,
        duration: 0,
        completed: false,
        creditsEarned: 0,
      },
    });

    logger.info('🎵 Focus Room session started', {
      userId: req.userId,
      sessionId: session.id,
      roomId: validated.roomId,
    });

    res.json({ sessionId: session.id, startedAt: session.startedAt });
  })
);

// Complete a Focus Room session
const completeSessionSchema = z.object({
  sessionId: z.string(),
  duration: z.number().min(0),
  completed: z.boolean(),
});

router.post(
  '/sessions/complete',
  authenticate,
  asyncHandler(async (req, res) => {
    const validated = completeSessionSchema.parse(req.body);

    const session = await prisma.focusRoomSession.findUnique({
      where: { id: validated.sessionId },
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.userId !== req.userId) {
      throw new AppError('Unauthorized', 403);
    }

    // Only mark as completed if user listened for at least 5 minutes (300 seconds)
    // This ensures AI only counts meaningful sessions for insights
    const actuallyCompleted = validated.completed && validated.duration >= 300; // 5 minutes minimum
    
    // Calculate credits (only if actually completed)
    const creditsEarned = calculateCredits(
      validated.duration,
      actuallyCompleted,
      session.timerOption
    );

    await prisma.focusRoomSession.update({
      where: { id: validated.sessionId },
      data: {
        duration: validated.duration,
        completed: actuallyCompleted, // Only true if duration >= 5 minutes
        creditsEarned,
        completedAt: actuallyCompleted ? new Date() : null,
      },
    });

    logger.info('✅ Focus Room session completed', {
      userId: req.userId,
      sessionId: validated.sessionId,
      duration: validated.duration,
      actuallyCompleted,
      creditsEarned,
      note: actuallyCompleted !== validated.completed ? 'Session marked incomplete - duration < 5 minutes' : undefined,
    });

    res.json({
      success: true,
      creditsEarned,
      totalCredits: await getTotalCredits(req.userId),
    });
  })
);

// Get user's total credits
async function getTotalCredits(userId: string): Promise<number> {
  const result = await prisma.focusRoomSession.aggregate({
    where: {
      userId,
      completed: true,
    },
    _sum: {
      creditsEarned: true,
    },
  });

  return result._sum.creditsEarned || 0;
}

// Get user's Focus Room stats
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    if (!req.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const totalSessions = await prisma.focusRoomSession.count({
      where: { userId: req.userId },
    });

    const completedSessions = await prisma.focusRoomSession.count({
      where: {
        userId: req.userId,
        completed: true,
      },
    });

    const totalCredits = await getTotalCredits(req.userId);

    const totalDuration = await prisma.focusRoomSession.aggregate({
      where: {
        userId: req.userId,
        completed: true,
      },
      _sum: {
        duration: true,
      },
    });

    const roomStats = await prisma.focusRoomSession.groupBy({
      by: ['roomId'],
      where: {
        userId: req.userId,
        completed: true,
      },
      _count: {
        id: true,
      },
      _sum: {
        duration: true,
        creditsEarned: true,
      },
    });

    res.json({
      totalSessions,
      completedSessions,
      totalCredits,
      totalDurationMinutes: Math.floor((totalDuration._sum.duration || 0) / 60),
      roomStats: roomStats.map((stat) => ({
        roomId: stat.roomId,
        sessions: stat._count.id,
        totalDurationMinutes: Math.floor((stat._sum.duration || 0) / 60),
        creditsEarned: stat._sum.creditsEarned || 0,
      })),
    });
  })
);

// Get recent sessions
router.get(
  '/sessions',
  authenticate,
  asyncHandler(async (req, res) => {
    if (!req.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const sessions = await prisma.focusRoomSession.findMany({
      where: { userId: req.userId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    res.json({ sessions });
  })
);

export default router;

