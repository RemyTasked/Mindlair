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
    
    // Check if we're in the morning or evening window (now using minutes for precision)
    const isMorningWindow = currentTimeInMinutes >= morningFlowTimeInMinutes && currentTimeInMinutes < eveningFlowTimeInMinutes;
    const isEveningWindow = currentTimeInMinutes >= eveningFlowTimeInMinutes;
    
    logger.info('🕐 Presley Flow time check (TIMEZONE-AWARE v3.0)', {
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
      isMorningWindow,
      isEveningWindow,
    });
    
    // Check if flows are enabled
    const morningFlowEnabled = (user as any).preferences?.enableMorningFlow !== false;
    const eveningFlowEnabled = (user as any).preferences?.enableEveningFlow !== false;
    
    // CRITICAL: Evening flow requires BOTH time window AND meetings to be done
    // Don't just check isEveningWindow - check the actual conditions
    let flowTypeAvailable: 'morning' | 'evening' | null = null;
    
    if (isMorningWindow && morningFlowEnabled) {
      flowTypeAvailable = 'morning';
    } else if (isEveningWindow && eveningFlowEnabled) {
      // FIXED: Only mark evening as available if we're ACTUALLY in the evening window
      // This prevents showing evening flow before the configured time
      flowTypeAvailable = 'evening';
    }
    
    if (!flowTypeAvailable) {
      return res.json({ available: false, reason: 'No flow type available at this time' });
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
    
    // CRITICAL: Lock morning flow 1 hour before first meeting starts
    if (isMorningWindow && relevantMeetings.length > 0) {
      const firstMeetingStart = new Date(relevantMeetings[0].startTime);
      const oneHourBeforeFirstMeeting = new Date(firstMeetingStart.getTime() - 60 * 60 * 1000);
      
      if (now >= oneHourBeforeFirstMeeting) {
        logger.info('Morning flow locked - within 1 hour of first meeting', {
          userId,
          firstMeetingStart: firstMeetingStart.toISOString(),
          lockTime: oneHourBeforeFirstMeeting.toISOString(),
          currentTime: now.toISOString(),
        });
        return res.json({ 
          available: false,
          reason: 'Morning flow locks 1 hour before your first meeting',
          locked: true,
          lockTime: oneHourBeforeFirstMeeting.toISOString(),
        });
      }
    }
    
    // CRITICAL: If no meetings today, lock morning flow when wellness reminders start
    if (isMorningWindow && relevantMeetings.length === 0) {
      const wellnessEnabled = (user as any).preferences?.enableWellnessReminders !== false;
      
      if (wellnessEnabled) {
        // Wellness reminders start at 9 AM by default
        const wellnessStartHour = 9;
        
        if (currentHour >= wellnessStartHour) {
          logger.info('Morning flow locked - no meetings today and wellness reminders active', {
            userId,
            currentHour,
            wellnessStartHour,
          });
          return res.json({ 
            available: false,
            reason: 'Morning flow is not available when you have no meetings scheduled',
            locked: true,
          });
        }
      }
    }
    
    // CRITICAL: Lock evening flow until BOTH conditions met:
    // 1. It's past the evening flow time (e.g., 6 PM)
    // 2. ALL today's meetings are done
    if (flowTypeAvailable === 'evening') {
      // First check: Is it actually evening time yet?
      if (!isEveningWindow) {
        logger.info('Evening flow locked - not evening time yet', {
          userId,
          currentHour,
          eveningFlowHour,
          hoursUntilEvening: eveningFlowHour - currentHour,
        });
        return res.json({ 
          available: false,
          reason: `Evening flow is only available after ${eveningFlowHour}:00 (${eveningFlowHour > 12 ? eveningFlowHour - 12 : eveningFlowHour} PM)`,
          locked: true,
          unlockTime: `${eveningFlowHour}:00`,
        });
      }
      
      // Second check: Are all meetings done?
      const todayMeetings = await prisma.meeting.findMany({
        where: {
          userId,
          startTime: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: {
          startTime: 'asc',
        },
      });
      
      if (todayMeetings.length > 0) {
        const lastMeeting = todayMeetings[todayMeetings.length - 1];
        const lastMeetingEnd = new Date(lastMeeting.endTime);
        
        if (now < lastMeetingEnd) {
          logger.info('Evening flow locked - meetings still in progress', {
            userId,
            lastMeetingEnd: lastMeetingEnd.toISOString(),
            currentTime: now.toISOString(),
            remainingMeetings: todayMeetings.filter(m => new Date(m.endTime) > now).length,
          });
          return res.json({ 
            available: false,
            reason: 'Evening flow is only available after all today\'s meetings are complete',
            locked: true,
            remainingMeetings: todayMeetings.filter(m => new Date(m.endTime) > now).length,
          });
        }
      }
    }
    
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

    // CRITICAL: Show flow only if there are relevant meetings
    // Morning: Show if today has meetings
    // Evening: Show if today had meetings (for wrap-up) OR tomorrow has meetings (for rehearsal)
    // Weekend check: If tomorrow is weekend with no meetings, don't show evening flow
    let hasRelevantMeetings = false;
    
    if (isMorningWindow) {
      // Morning: Only show if TODAY has meetings
      hasRelevantMeetings = relevantMeetings.length > 0;
    } else if (isEveningWindow) {
      // Evening: Show if today had meetings OR tomorrow has meetings
      // This allows wrap-up (today) and/or rehearsal (tomorrow)
      hasRelevantMeetings = todayMeetingCount > 0 || relevantMeetings.length > 0;
    }
    
    if (!hasRelevantMeetings) {
      logger.info('No relevant meetings for flow', {
        userId,
        isMorningWindow,
        isEveningWindow,
        todayMeetingCount,
        tomorrowMeetingCount: relevantMeetings.length,
      });
      return res.json({ 
        available: false,
        reason: isMorningWindow 
          ? 'No meetings scheduled for today'
          : 'No meetings today or tomorrow - enjoy your weekend!',
      });
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

