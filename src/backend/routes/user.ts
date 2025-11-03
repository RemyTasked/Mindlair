import express, { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Get user profile
router.get(
  '/profile',
  authenticate,
  asyncHandler(async (req: Request, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: {
          preferences: true,
          deliverySettings: true,
          calendarAccounts: {
            select: {
              id: true,
              provider: true,
              email: true,
              createdAt: true,
            },
          },
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({ user });
    } catch (error: any) {
      console.error('❌ Error fetching user profile:', {
        userId: req.userId,
        error: error.message,
        stack: error.stack,
      });
      
      // Re-throw to be handled by error handler
      throw error;
    }
  })
);

// Update preferences
const preferencesSchema = z.object({
  tone: z.enum(['executive', 'cinematic', 'balanced', 'calm']).optional(),
  alertMinutesBefore: z.number().min(1).max(30).optional(),
  mergeBackToBack: z.boolean().optional(),
  enableDailyWrapUp: z.boolean().optional(),
  enableFocusScene: z.boolean().optional(),
  enableAdaptiveTiming: z.boolean().optional(),
});

router.put(
  '/preferences',
  authenticate,
  asyncHandler(async (req: Request, res) => {
    const data = preferencesSchema.parse(req.body);

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: req.userId! },
      create: {
        userId: req.userId!,
        ...data,
      },
      update: data,
    });

    res.json({ preferences });
  })
);

// Update delivery settings
const deliverySchema = z.object({
  emailEnabled: z.boolean().optional(),
  slackEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  phoneNumber: z.string().nullable().optional(),
  slackWebhookUrl: z.string().url().nullable().optional(),
});

router.put(
  '/delivery',
  authenticate,
  asyncHandler(async (req: Request, res) => {
    const data = deliverySchema.parse(req.body);

    const settings = await prisma.deliverySettings.upsert({
      where: { userId: req.userId! },
      create: {
        userId: req.userId!,
        ...data,
      },
      update: data,
    });

    res.json({ settings });
  })
);

// Get stats
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req: Request, res) => {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const [meetings, focusSessions, reflections] = await Promise.all([
      prisma.meeting.count({
        where: {
          userId: req.userId,
          startTime: {
            gte: start,
            lte: end,
          },
        },
      }),
      prisma.focusSession.count({
        where: {
          userId: req.userId,
          startedAt: {
            gte: start,
            lte: end,
          },
        },
      }),
      prisma.dailyReflection.findMany({
        where: {
          userId: req.userId,
          date: {
            gte: start,
            lte: end,
          },
        },
        orderBy: {
          date: 'desc',
        },
      }),
    ]);

    res.json({
      stats: {
        totalMeetings: meetings,
        totalFocusSessions: focusSessions,
        reflections,
      },
    });
  })
);

// Disconnect calendar
router.delete(
  '/calendar/:provider',
  authenticate,
  asyncHandler(async (req: Request, res) => {
    const { provider } = req.params;

    await prisma.calendarAccount.deleteMany({
      where: {
        userId: req.userId,
        provider,
      },
    });

    res.json({ message: 'Calendar disconnected successfully' });
  })
);

export default router;

