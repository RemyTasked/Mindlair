import express from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { PromptGenerator } from '../services/ai/promptGenerator';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

const router = express.Router();
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

/**
 * Check if Presley Flow is available
 * 
 * MORNING FLOW (6 AM - First Meeting Start):
 * - Available from user-configured morning time (default 6 AM)
 * - Shows TODAY's meetings only
 * - Locked after first meeting of the day starts
 * - Purpose: Morning prep/recap for today
 * 
 * EVENING FLOW (6 PM - Midnight):
 * - Available from user-configured evening time (default 6 PM)
 * - Shows:
 *   1. Daily Wrap-Up (summary of TODAY's meetings)
 *   2. Mental Rehearsal (preview of TOMORROW's meetings)
 * - Purpose: Close out today + prep for tomorrow
 * 
 * MUST come before /:userId/:date to avoid route matching conflicts
 */
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

    // CRITICAL: Use user's timezone, not server time!
    const userTimezone = user.timezone || 'America/New_York';
    const now = new Date();
    
    // Convert server time to user's timezone
    const userLocalTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    const currentHour = userLocalTime.getHours();
    const currentMinute = userLocalTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // Get user's configured flow times (format: "HH:mm")
    const morningFlowTime = (user as any).preferences?.morningFlowTime || '06:00';
    const eveningFlowTime = (user as any).preferences?.eveningFlowTime || '18:00';
    
    const [morningFlowHour, morningFlowMinute] = morningFlowTime.split(':').map(Number);
    const [eveningFlowHour, eveningFlowMinute] = eveningFlowTime.split(':').map(Number);
    
    const morningFlowTimeInMinutes = morningFlowHour * 60 + morningFlowMinute;
    const eveningFlowTimeInMinutes = eveningFlowHour * 60 + eveningFlowMinute;
    
    // Check if we're in the evening window (now using minutes for precision)
    // Evening window: from configured evening time (e.g., 6 PM) until midnight
    // After midnight, rehearsal flow is hidden - those meetings are now "today"
    const midnightInMinutes = 24 * 60; // 23:59
    const isMorningWindow = currentTimeInMinutes >= morningFlowTimeInMinutes && currentTimeInMinutes < eveningFlowTimeInMinutes;
    const isEveningWindow = currentTimeInMinutes >= eveningFlowTimeInMinutes && currentTimeInMinutes < midnightInMinutes;
    
    logger.info('🕐 Presley Flow time check (TIMEZONE-AWARE v4.0 - Midnight Cutoff)', {
      userId,
      userTimezone,
      serverTime: now.toISOString(),
      userLocalTime: userLocalTime.toISOString(),
      currentTime: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
      currentTimeInMinutes,
      morningFlowTime,
      morningFlowTimeInMinutes,
      eveningFlowTime,
      eveningFlowTimeInMinutes,
      midnightInMinutes,
      isMorningWindow,
      isEveningWindow,
      isAfterMidnight: currentTimeInMinutes < morningFlowTimeInMinutes,
    });
    
    // Check if flows are enabled
    const eveningFlowEnabled = (user as any).preferences?.enableEveningFlow !== false;
    
    // REHEARSAL FLOW AVAILABILITY:
    // - Only available in evening window (configured time until midnight)
    // - After midnight, flow disappears (meetings are now "today", use 5-min prep)
    // - Before evening time, flow is locked
    if (!isEveningWindow) {
      const isAfterMidnight = currentTimeInMinutes < morningFlowTimeInMinutes;
      return res.json({ 
        available: false, 
        reason: isAfterMidnight 
          ? 'Rehearsal flow is not available after midnight - those meetings are now today! Use the 5-minute prep instead.'
          : `Rehearsal flow unlocks at ${eveningFlowTime} (${eveningFlowHour > 12 ? eveningFlowHour - 12 : eveningFlowHour} PM)`,
        locked: true,
      });
    }
    
    if (!eveningFlowEnabled) {
      return res.json({ available: false, reason: 'Evening flow is disabled in your settings' });
    }

    // PRESLEY FLOW (Rehearsal) LOGIC:
    // - ALWAYS shows TOMORROW's meetings for evening rehearsal
    // - This is the "preview tomorrow" flow, not a morning prep
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

    // ALWAYS check tomorrow's meetings (this is a rehearsal/preview flow)
    const relevantMeetings = await prisma.meeting.findMany({
      where: {
        userId,
        startTime: { gte: startOfTomorrow, lte: endOfTomorrow },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
    
    // CRITICAL: Show rehearsal flow only if tomorrow has meetings
    if (relevantMeetings.length === 0) {
      logger.info('No meetings tomorrow for rehearsal flow', {
        userId,
        tomorrowMeetingCount: relevantMeetings.length,
      });
      return res.json({ 
        available: false,
        reason: 'No meetings scheduled for tomorrow',
      });
    }

    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const presleyFlowUrl = `${process.env.BASE_URL}/presley-flow/${userId}/${dateString}`;

    return res.json({
      available: true,
      meetingCount: relevantMeetings.length,
      presleyFlowUrl,
      date: dateString,
      flowType: 'evening', // Always evening rehearsal flow
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
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // Get user's configured flow times (format: "HH:mm")
    const morningFlowTime = (user as any).preferences?.morningFlowTime || '06:00';
    const eveningFlowTime = (user as any).preferences?.eveningFlowTime || '18:00';
    
    const [morningFlowHour, morningFlowMinute] = morningFlowTime.split(':').map(Number);
    const [eveningFlowHour, eveningFlowMinute] = eveningFlowTime.split(':').map(Number);
    
    const morningFlowTimeInMinutes = morningFlowHour * 60 + morningFlowMinute;
    const eveningFlowTimeInMinutes = eveningFlowHour * 60 + eveningFlowMinute;
    
    // Determine flow type based on current time (using minutes for precision)
    // Morning: from morningFlowTime until eveningFlowTime (default 6am-6:30pm)
    // Evening: from eveningFlowTime onwards (default 6:30pm+)
    const isMorning = currentTimeInMinutes >= morningFlowTimeInMinutes && currentTimeInMinutes < eveningFlowTimeInMinutes;
    
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

    // Check if it's a weekend (Friday evening or Saturday/Sunday)
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekendOrFridayEvening = dayOfWeek === 0 || dayOfWeek === 6 || (dayOfWeek === 5 && !isMorning);
    
    if (meetings.length === 0 && !dailyOutcomes) {
      // If it's a weekend with no meetings, create a special weekend flow
      if (isWeekendOrFridayEvening) {
        return res.json({
          flow: {
            openingScene: "The stage goes dark. The week's performance is over. This is your intermission—a chance to step away from the spotlight and simply be.",
            meetingPreviews: [],
            mindsetTheme: "This weekend is yours. No scripts, no scenes, no expectations. Just rest, recharge, and reconnect with what brings you joy.",
            visualizationScript: "See yourself letting go of the week's tension... Your shoulders drop, your breath deepens... You're free to do whatever feels good—whether that's adventure, rest, or simply being present...",
            closingMessage: "The curtain will rise again Monday morning. Until then, the stage is yours to enjoy however you wish. 🌅",
            date: targetDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            }),
            timeOfDay: isMorning ? 'morning' : 'evening',
            meetingDay: 'weekend',
            dailyOutcomes,
            isWeekendFlow: true,
          },
        });
      }
      
      // Weekday with no meetings - return null
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

    // Generate Presley Flow content with AI - pass flowType and timezone to ensure correct language and times
    const flowType = isMorning ? 'morning' : 'evening';
    const userTimezone = user.timezone || 'America/New_York';
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
      userId,
      flowType,
      userTimezone
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

