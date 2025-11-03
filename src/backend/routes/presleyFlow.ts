import express from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { PromptGenerator } from '../services/ai/promptGenerator';
import { logger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();
const promptGenerator = new PromptGenerator();

// IMPORTANT: More specific routes must come BEFORE parameterized routes
// /check/:userId must come before /:userId/:date

type Meeting = {
  id: string;
  userId: string;
  calendarEventId: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location: string | null;
  meetingLink: string | null;
  meetingType: string | null;
  isBackToBack: boolean;
  cueScheduledFor: Date | null;
  cueSentAt: Date | null;
  cueDelivered: boolean;
  cueContent: string | null;
  focusSceneUrl: string | null;
  focusSceneOpened: boolean;
  postMeetingEmailSent: boolean;
  postMeetingEmailSentAt: Date | null;
  meetingRating: number | null;
  meetingFeedback: string | null;
  ratedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// Check if Presley Flow is available for today
// MUST come before /:userId/:date to avoid route matching conflicts
router.get(
  '/check/:userId',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const now = new Date();
    const currentHour = now.getHours();
    
    // Get user's configured flow times
    const morningFlowHour = parseInt((user as any).preferences?.morningFlowTime?.split(':')[0] || '6');
    const eveningFlowHour = parseInt((user as any).preferences?.eveningFlowTime?.split(':')[0] || '18');
    
    // Check if we're in the morning or evening window
    const isMorningWindow = currentHour >= morningFlowHour && currentHour < eveningFlowHour;
    const isEveningWindow = currentHour >= eveningFlowHour;
    
    // Check if flows are enabled
    const morningFlowEnabled = (user as any).preferences?.enableMorningFlow !== false;
    const eveningFlowEnabled = (user as any).preferences?.enableEveningFlow !== false;
    
    // Determine if flow is available based on time and preferences
    const isAvailable = (isMorningWindow && morningFlowEnabled) || (isEveningWindow && eveningFlowEnabled);
    
    if (!isAvailable) {
      return res.json({ available: false });
    }

    // For morning: Check today's meetings
    // For evening: Check tomorrow's meetings (or show wrap-up if today had meetings)
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfTomorrow = new Date(tomorrow);
    startOfTomorrow.setHours(0, 0, 0, 0);
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const relevantMeetings = await prisma.meeting.findMany({
      where: {
        userId,
        startTime: isMorningWindow
          ? { gte: startOfDay, lte: endOfDay }
          : { gte: startOfTomorrow, lte: endOfTomorrow },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
    
    // For evening, also check if today had meetings (for wrap-up)
    let todayMeetingCount = 0;
    if (isEveningWindow) {
      const todayMeetings = await prisma.meeting.findMany({
        where: {
          userId,
          startTime: { gte: startOfDay, lte: endOfDay },
        },
      });
      todayMeetingCount = todayMeetings.length;
    }

    // Show flow if: morning with today's meetings OR evening with today/tomorrow meetings
    const hasRelevantMeetings = relevantMeetings.length > 0 || (isEveningWindow && todayMeetingCount > 0);
    
    if (!hasRelevantMeetings) {
      return res.json({ available: false });
    }

    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const presleyFlowUrl = `${process.env.BASE_URL}/presley-flow/${userId}/${dateString}`;

    return res.json({
      available: true,
      meetingCount: relevantMeetings.length,
      presleyFlowUrl,
      date: dateString,
      flowType: isMorningWindow ? 'morning' : 'evening',
    });
  })
);

// Get Presley Flow session data
router.get(
  '/:userId/:date',
  asyncHandler(async (req, res) => {
    const { userId, date } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Parse date (format: YYYY-MM-DD)
    const targetDate = new Date(date + 'T00:00:00Z'); // Parse as UTC to avoid timezone issues
    const now = new Date();
    const currentHour = now.getHours();
    
    // Get user's configured flow times
    const morningFlowHour = parseInt((user as any).preferences?.morningFlowTime?.split(':')[0] || '6');
    const eveningFlowHour = parseInt((user as any).preferences?.eveningFlowTime?.split(':')[0] || '18');
    
    // Determine flow type based on current time
    // Morning: from morningFlowTime until eveningFlowTime (default 6am-6pm)
    // Evening: from eveningFlowTime onwards (default 6pm+)
    const isMorning = currentHour >= morningFlowHour && currentHour < eveningFlowHour;
    
    let startOfDay, endOfDay;
    if (isMorning) {
      // Morning: Get today's meetings
      startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
    } else {
      // Evening: Get tomorrow's meetings
      const tomorrow = new Date(targetDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      startOfDay = new Date(tomorrow);
      startOfDay.setHours(0, 0, 0, 0);
      endOfDay = new Date(tomorrow);
      endOfDay.setHours(23, 59, 59, 999);
    }

    // Fetch meetings for the appropriate day
    const meetings = await prisma.meeting.findMany({
      where: {
        userId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // For evening flow, also get today's completed meetings for wrap-up
    let dailyOutcomes = null;
    if (!isMorning) {
      const todayStart = new Date(targetDate);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(targetDate);
      todayEnd.setHours(23, 59, 59, 999);
      
      const todaysMeetings = await prisma.meeting.findMany({
        where: {
          userId,
          startTime: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        orderBy: { startTime: 'asc' },
      });
      
      // Generate AI summary of today's outcomes
      if (todaysMeetings.length > 0) {
        const ratedMeetings = todaysMeetings
          .filter((m: Meeting) => m.meetingRating !== null)
          .map((m: Meeting) => ({
            title: m.title,
            rating: m.meetingRating!,
            feedback: m.meetingFeedback || undefined,
          }));

        dailyOutcomes = await promptGenerator.generateDailyWrapUp({
          totalMeetings: todaysMeetings.length,
          scenesCompleted: todaysMeetings.filter((m: Meeting) => m.focusSceneOpened).length,
          focusSessionsOpened: todaysMeetings.filter((m: Meeting) => m.focusSceneOpened).length,
          ratedMeetings: ratedMeetings.length > 0 ? ratedMeetings : undefined,
        });
      }
    }

    if (meetings.length === 0 && !dailyOutcomes) {
      return res.json({ flow: null });
    }

    // Get historical insights
    const historicalMeetings = await prisma.meeting.findMany({
      where: {
        userId,
        meetingRating: { not: null },
      },
      orderBy: { ratedAt: 'desc' },
      take: 10,
    });

    const historicalInsights = historicalMeetings
      .filter((m: Meeting) => m.meetingRating !== null)
      .map((m: Meeting) => ({
        meetingType: m.meetingType || 'general',
        rating: m.meetingRating!,
        feedback: m.meetingFeedback || '',
        wasBackToBack: m.isBackToBack,
        focusSceneUsed: m.focusSceneOpened,
      }));

    // Generate Presley Flow content with AI
    const flowContent = await promptGenerator.generatePresleyFlowSession(
      meetings.map((m: Meeting) => ({
        title: m.title,
        startTime: m.startTime,
        endTime: m.endTime,
        attendees: m.attendees,
        description: m.description || undefined,
        meetingType: m.meetingType || undefined,
      })),
      (user as any).preferences?.tone as any,
      historicalInsights.length > 0 ? historicalInsights : undefined,
      userId
    );

    return res.json({
      flow: {
        ...flowContent,
        date: targetDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
        timeOfDay: isMorning ? 'morning' : 'evening',
        meetingDay: isMorning ? 'today' : 'tomorrow',
        dailyOutcomes, // Only populated for evening flow
      },
    });
  })
);

// Mark Presley Flow as completed
router.post(
  '/:userId/:date/complete',
  asyncHandler(async (req, res) => {
    const { userId, date } = req.params;
    const { journalNote, completedAt, performanceRating, improvementNotes } = req.body;

    const parsedDate = new Date(date);
    const currentHour = new Date().getHours();
    const flowType = currentHour < 18 ? 'morning' : 'evening';

    // Create or update Presley Flow session
    const session = await prisma.presleyFlowSession.upsert({
      where: {
        userId_date_flowType: {
          userId,
          date: parsedDate,
          flowType,
        },
      },
      create: {
        userId,
        date: parsedDate,
        flowType,
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        journalNote,
        performanceRating: performanceRating || undefined,
        improvementNotes: improvementNotes || undefined,
      },
      update: {
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        journalNote,
        performanceRating: performanceRating || undefined,
        improvementNotes: improvementNotes || undefined,
      },
    });

    logger.info('Presley Flow completed', {
      userId,
      date,
      flowType,
      hasPerformanceRating: !!performanceRating,
      hasImprovementNotes: !!improvementNotes,
    });

    return res.json({ 
      message: 'Presley Flow completed successfully',
      session,
    });
  })
);

export default router;

