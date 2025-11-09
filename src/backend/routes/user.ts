import express, { Request } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

const router = express.Router();

// Save onboarding data
router.post(
  '/onboarding',
  authenticate,
  asyncHandler(async (req: Request, res) => {
    const {
      workStart,
      workEnd,
      focusGoals,
      customGoal,
      meetingComfort,
      meetingsPerDay,
      directorsNote,
      completedAt,
    } = req.body;

    const saveOnboarding = async () => {
      return prisma.user.update({
        where: { id: req.userId },
        data: {
          onboardingCompleted: true,
          onboardingData: {
            workStart,
            workEnd,
            focusGoals,
            customGoal,
            meetingComfort,
            meetingsPerDay,
            directorsNote,
            completedAt,
          } as any,
        },
      });
    };

    try {
      const user = await saveOnboarding();
      res.json({ success: true, user });
    } catch (error: any) {
      console.error('❌ Failed to save onboarding data:', {
        userId: req.userId,
        error: error.message,
        stack: error.stack,
      });

      const message = error.message || '';
      const needsColumns = message.includes('onboardingCompleted') || message.includes('onboardingData');

      if (needsColumns) {
        console.log('⚠️ Attempting to add missing onboarding columns on-the-fly...');
        try {
          await prisma.$executeRawUnsafe(
            'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false'
          );
          await prisma.$executeRawUnsafe(
            'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboardingData" JSONB'
          );
          console.log('✅ Onboarding columns ensured. Retrying save...');
          const user = await saveOnboarding();
          res.json({ success: true, user });
          return;
        } catch (migrationError: any) {
          console.error('❌ Failed to add onboarding columns automatically:', {
            userId: req.userId,
            error: migrationError.message,
            stack: migrationError.stack,
          });
          throw new AppError('Failed to save onboarding data. Please try again.', 500);
        }
      }

      throw new AppError('Failed to save onboarding data. Please try again.', 500);
    }
  })
);

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
              label: true,
              color: true,
              isPrimary: true,
              createdAt: true,
            },
          },
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // HOTFIX: Ensure preferences and delivery settings exist for old accounts
      let needsRefetch = false;
      
      if (!user.preferences) {
        console.log('⚠️ Creating missing preferences for user', req.userId);
        await prisma.userPreferences.create({
          data: { userId: user.id },
        });
        needsRefetch = true;
      }
      
      if (!user.deliverySettings) {
        console.log('⚠️ Creating missing delivery settings for user', req.userId);
        await prisma.deliverySettings.create({
          data: { 
            userId: user.id,
            emailEnabled: true,
          },
        });
        needsRefetch = true;
      }
      
      if (needsRefetch) {
        // Refetch user with all relations
        const updatedUser = await prisma.user.findUnique({
          where: { id: req.userId },
          include: {
            preferences: true,
            deliverySettings: true,
            calendarAccounts: { 
              select: { id: true, provider: true, email: true, createdAt: true } 
            },
          },
        });
        console.log('✅ Refetched user with created preferences/settings');
        res.json({ user: updatedUser });
        return;
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
  enableFocusSound: z.boolean().optional(),
  focusSoundType: z.enum(['calm-ocean', 'rain', 'forest', 'meditation-bell', 'white-noise', 'none']).optional(),
  enableVoiceNarration: z.boolean().optional(),
  enableAdaptiveTiming: z.boolean().optional(),
  morningFlowTime: z.string().optional(),
  eveningFlowTime: z.string().optional(),
  enableMorningFlow: z.boolean().optional(),
  enableEveningFlow: z.boolean().optional(),
  enableWindingDown: z.boolean().optional(),
  windingDownTime: z.string().optional(),
  enableWellnessReminders: z.boolean().optional(),
  wellnessReminderFrequency: z.number().optional(),
  enableReflections: z.boolean().optional(),
  privateReflectionMode: z.boolean().optional(),
  reflectionDataSharing: z.boolean().optional(),
  storeReflectionText: z.boolean().optional(),
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
  pushEnabled: z.boolean().optional(),
  pushPreMeetingCues: z.boolean().optional(),
  pushPresleyFlow: z.boolean().optional(),
  pushWellnessReminders: z.boolean().optional(),
  pushMeetingInsights: z.boolean().optional(),
  pushMorningRecap: z.boolean().optional(),
  pushDailyWrapUp: z.boolean().optional(),
  pushWindingDown: z.boolean().optional(),
  phoneNumber: z.string().nullable().optional(),
  slackWebhookUrl: z.string().nullable().optional(), // Allow null or valid URL
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

// Update user timezone
router.patch(
  '/timezone',
  authenticate,
  asyncHandler(async (req: Request, res) => {
    const timezoneSchema = z.object({
      timezone: z.string().min(1, 'Timezone is required'),
    });

    const { timezone } = timezoneSchema.parse(req.body);

    await prisma.user.update({
      where: { id: req.userId },
      data: { timezone },
    });

    res.json({ message: 'Timezone updated successfully', timezone });
  })
);

export default router;

