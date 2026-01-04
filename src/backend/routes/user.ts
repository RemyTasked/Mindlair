import express, { Request } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { getSoundInsights } from '../services/soundLearningService';

const router = express.Router();

// Save onboarding data
const onboardingSchema = z.object({
  workStart: z.string(),
  workEnd: z.string(),
  focusGoals: z.array(z.string()).optional(),
  customGoal: z.string().optional(),
  meetingComfort: z.number().min(1).max(5),
  meetingsPerDay: z.string(),
  directorsNote: z.string().optional(),
  completedAt: z.string().optional(),
});

router.post(
  '/onboarding',
  authenticate,
  asyncHandler(async (req: Request, res) => {
    console.log('📝 Onboarding save request:', {
      userId: req.userId,
      body: req.body,
    });

    // Validate input
    const validated = onboardingSchema.parse(req.body);

    const saveOnboarding = async () => {
      return prisma.user.update({
        where: { id: req.userId },
        data: {
          onboardingCompleted: true,
          onboardingData: validated as any,
        },
      });
    };

    try {
      const user = await saveOnboarding();
      console.log('✅ Onboarding saved successfully:', { userId: req.userId });
      res.json({ success: true, user });
    } catch (error: any) {
      console.error('❌ Failed to save onboarding data:', {
        userId: req.userId,
        errorName: error.name,
        errorCode: error.code,
        errorMessage: error.message,
        errorMeta: error.meta,
        stack: error.stack,
      });

      const message = error.message || '';
      const needsColumns = 
        message.includes('onboardingCompleted') || 
        message.includes('onboardingData') ||
        message.includes('column') ||
        error.code === 'P2010';

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
          console.log('✅ Onboarding saved after column creation:', { userId: req.userId });
          res.json({ success: true, user });
          return;
        } catch (migrationError: any) {
          console.error('❌ Failed to add onboarding columns automatically:', {
            userId: req.userId,
            error: migrationError.message,
            stack: migrationError.stack,
          });
          throw new AppError('Database migration failed. Please contact support.', 500);
        }
      }

      // If it's a validation error from Zod, return specific message
      if (error.name === 'ZodError') {
        throw new AppError(`Invalid onboarding data: ${error.message}`, 400);
      }

      // Generic error
      throw new AppError(
        `Failed to save onboarding data: ${error.message || 'Unknown error'}`,
        500
      );
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
  // Simplified notification preferences
  notificationPrimaryChannel: z.enum(['email', 'push']).optional(),
  notificationSecondaryChannels: z.string().nullable().optional(),
  notificationsMeetingMoments: z.boolean().optional(),
  notificationsDailyRhythm: z.boolean().optional(),
  notificationsWellness: z.boolean().optional(),
  quietHoursStart: z.string().nullable().optional(),
  quietHoursEnd: z.string().nullable().optional(),
  notificationPreset: z.enum(['minimal', 'balanced', 'full', 'custom']).optional(),
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
  pushInMeetingCues: z.boolean().optional(),
  pushPostMeetingCues: z.boolean().optional(),
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

// Get user behavioral metadata for personalized insights
router.get(
  '/metadata',
  authenticate,
  asyncHandler(async (req: Request, res) => {
    const userId = req.userId!;

    // Get total focus sessions
    const totalFocusSessions = await prisma.focusSession.count({
      where: { userId },
    });

    // Get preferred prep modes (from recent focus sessions)
    const recentSessions = await prisma.focusSession.findMany({
      where: { 
        userId,
        prepMode: { not: null },
      },
      select: { prepMode: true },
      orderBy: { startedAt: 'desc' },
      take: 50, // Last 50 sessions
    });

    const preferredPrepModes: Record<string, number> = {};
    recentSessions.forEach(session => {
      if (session.prepMode) {
        preferredPrepModes[session.prepMode] = (preferredPrepModes[session.prepMode] || 0) + 1;
      }
    });

    // Get recent prep choices (last 10 with meeting titles)
    const recentPrepChoices = await prisma.focusSession.findMany({
      where: { 
        userId,
        prepMode: { not: null },
      },
      select: {
        prepMode: true,
        startedAt: true,
        meeting: {
          select: { title: true },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    const formattedPrepChoices = recentPrepChoices.map(session => ({
      meetingTitle: session.meeting?.title || 'Unknown Meeting',
      prepMode: session.prepMode!,
      timestamp: session.startedAt.toISOString(),
    }));

    // Get meeting patterns
    const meetings = await prisma.meeting.findMany({
      where: { userId },
      select: {
        startTime: true,
        endTime: true,
        title: true,
      },
      orderBy: { startTime: 'desc' },
      take: 100, // Last 100 meetings for pattern analysis
    });

    let averageDuration = 0;
    let backToBackCount = 0;
    const meetingTypes: Record<string, number> = {};
    const timeOfDayCount = { morning: 0, afternoon: 0, evening: 0 };

    if (meetings.length > 0) {
      // Calculate average duration
      const durations = meetings.map(m => {
        const start = new Date(m.startTime);
        const end = new Date(m.endTime);
        return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
      });
      averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

      // Detect back-to-back meetings
      const sortedMeetings = [...meetings].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      for (let i = 0; i < sortedMeetings.length - 1; i++) {
        const currentEnd = new Date(sortedMeetings[i].endTime);
        const nextStart = new Date(sortedMeetings[i + 1].startTime);
        const gap = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60); // minutes
        if (gap <= 5) backToBackCount++;
      }

      // Detect meeting types from titles
      meetings.forEach(m => {
        const title = m.title.toLowerCase();
        if (title.includes('1:1') || title.includes('1-on-1') || title.includes('one on one')) {
          meetingTypes['1:1'] = (meetingTypes['1:1'] || 0) + 1;
        } else if (title.includes('team') || title.includes('standup') || title.includes('sync')) {
          meetingTypes['Team'] = (meetingTypes['Team'] || 0) + 1;
        } else if (title.includes('client') || title.includes('customer') || title.includes('demo')) {
          meetingTypes['Client'] = (meetingTypes['Client'] || 0) + 1;
        }

        // Time of day analysis
        const hour = new Date(m.startTime).getHours();
        if (hour < 12) timeOfDayCount.morning++;
        else if (hour < 17) timeOfDayCount.afternoon++;
        else timeOfDayCount.evening++;
      });
    }

    const backToBackFrequency = meetings.length > 1 
      ? (backToBackCount / (meetings.length - 1)) * 100 
      : 0;

    const mostCommonMeetingType = Object.entries(meetingTypes)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    const preferredMeetingTime = Object.entries(timeOfDayCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] as 'morning' | 'afternoon' | 'evening' | undefined;

    // Get sound preferences
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId },
      select: { focusSoundType: true },
    });

    const soundSessions = await prisma.focusSession.count({
      where: { 
        userId,
        // Assuming sessions with sound enabled
      },
    });

    // Note: In-meeting cue telemetry was removed in the Mind Garden pivot
    // These values are now derived from flow completions instead
    const cueTypeCount: Record<string, number> = {};
    const totalCuesReceived = 0;
    const cuesActedOn = 0;
    const cuesDismissed = 0;
    const mostCommonCueType = undefined;
    const cueEngagementRate = 0;
    const hasStressPattern = false;

    // Get sound learning insights
    const soundInsights = await getSoundInsights(userId);

    // Get Focus Room insights
    const { getFocusRoomInsights, getMeetingPrepInsights } = await import('../services/focusRoomInsightsService');
    const focusRoomInsights = await getFocusRoomInsights(userId);
    const meetingPrepInsights = await getMeetingPrepInsights(userId);

    res.json({
      metadata: {
        totalFocusSessions,
        preferredPrepModes,
        meetingPatterns: {
          averageDuration: Math.round(averageDuration),
          mostCommonMeetingType,
          backToBackFrequency: Math.round(backToBackFrequency),
          preferredMeetingTime,
        },
        recentPrepChoices: formattedPrepChoices,
        soundPreferences: {
          mostUsedSound: preferences?.focusSoundType || 'calm-ocean',
          totalSoundSessions: soundSessions,
          insights: soundInsights, // Learned sound preferences and patterns
        },
        audioInsights: {
          totalCuesReceived,
          mostCommonCueType,
          cueTypeBreakdown: cueTypeCount,
          cueEngagementRate,
          cuesActedOn,
          cuesDismissed,
          hasStressPattern,
        },
        focusRoomInsights: {
          totalSessions: focusRoomInsights.totalSessions,
          totalMinutes: focusRoomInsights.totalMinutes,
          preferredRooms: focusRoomInsights.preferredRooms,
          averageSessionDuration: focusRoomInsights.averageSessionDuration,
          completionRate: focusRoomInsights.completionRate,
          creditsEarned: focusRoomInsights.creditsEarned,
          roomEffectiveness: focusRoomInsights.roomEffectiveness,
          usagePatterns: focusRoomInsights.usagePatterns,
          insights: focusRoomInsights.insights,
          recommendations: focusRoomInsights.recommendations,
          meetingPrepInsights: meetingPrepInsights,
        },
      },
    });
  })
);

export default router;


