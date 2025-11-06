import express, { Request } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { googleCalendarService } from '../services/calendar/googleCalendar';
import { outlookCalendarService } from '../services/calendar/outlookCalendar';
import { promptGenerator } from '../services/ai/promptGenerator';
import { logger } from '../utils/logger';

const router = express.Router();

// Check calendar account status
router.get(
  '/calendar-status',
  authenticate,
  asyncHandler(async (req: Request, res) => {
    const userId = req.userId;
    
    const accounts = await prisma.calendarAccount.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        email: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const now = new Date();
    const accountsWithStatus = accounts.map(account => ({
      ...account,
      tokenExpired: account.expiresAt ? new Date(account.expiresAt) < now : null,
      expiresIn: account.expiresAt 
        ? Math.round((new Date(account.expiresAt).getTime() - now.getTime()) / 1000 / 60) + ' minutes'
        : 'no expiry set',
    }));

    logger.info('📊 Calendar account status check', {
      userId,
      accountCount: accounts.length,
      accounts: accountsWithStatus,
    });

    return res.json({
      accounts: accountsWithStatus,
      hasAccounts: accounts.length > 0,
    });
  })
);

// Get upcoming meetings
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res) => {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate ? new Date(endDate as string) : undefined;

    const meetings = await prisma.meeting.findMany({
      where: {
        userId: req.userId,
        startTime: {
          gte: start,
          ...(end && { lte: end }),
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      include: {
        focusSession: true,
      },
    });

    res.json({ meetings });
  })
);

// Sync meetings from calendar NOW (manual refresh)
router.post(
  '/sync',
  authenticate,
  asyncHandler(async (req: Request, res) => {
    const userId = req.userId!; // authenticate middleware ensures this exists

    try {
      logger.info('📲 Manual meeting sync requested', { userId });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          calendarAccounts: true,
          preferences: true,
        },
      });

      if (!user || !user.calendarAccounts.length) {
        return res.status(400).json({ error: 'No calendar connected' });
      }

      const now = new Date();
      const startTime = now;
      const endTime = new Date(now.getTime() + 48 * 60 * 60 * 1000); // Next 2 days

      let syncedCount = 0;
      const allEvents: any[] = [];

      // Fetch events from all connected calendars
      for (const account of user.calendarAccounts) {
        try {
          let events: any[] = [];

          if (account.provider === 'google') {
            // Refresh token if needed
            if (account.expiresAt && new Date(account.expiresAt) < now) {
              const tokens = await googleCalendarService.refreshAccessToken(
                account.refreshToken!
              );
              
              // Google returns expiry_date as absolute timestamp (ms)
              let expiresAt = new Date();
              if (tokens.expiry_date) {
                const expiryTimestamp = Number(tokens.expiry_date);
                const maxExpiry = Date.now() + 86400 * 1000; // 24 hours from now
                const minExpiry = Date.now() + 60 * 1000; // 1 minute from now
                
                if (expiryTimestamp > minExpiry && expiryTimestamp < maxExpiry) {
                  expiresAt = new Date(expiryTimestamp);
                } else {
                  // If invalid, default to 1 hour from now
                  expiresAt = new Date(Date.now() + 3600 * 1000);
                }
              } else {
                // Default to 1 hour
                expiresAt = new Date(Date.now() + 3600 * 1000);
              }
              
              if (tokens.access_token) {
                await prisma.calendarAccount.update({
                  where: { id: account.id },
                  data: {
                    accessToken: tokens.access_token,
                    expiresAt,
                  },
                });
                account.accessToken = tokens.access_token;
              }
            }

            events = await googleCalendarService.getUpcomingEvents(
              account.accessToken,
              account.refreshToken || undefined,
              startTime,
              endTime,
              account.email
            );
          } else if (account.provider === 'microsoft') {
            // Refresh token if needed
            if (account.expiresAt && new Date(account.expiresAt) < now) {
              const tokens = await outlookCalendarService.refreshAccessToken(
                account.refreshToken!
              );
              const expiresInSeconds = Math.min(
                Math.max(Number(tokens.expires_in) || 3600, 60),
                86400
              );
              await prisma.calendarAccount.update({
                where: { id: account.id },
                data: {
                  accessToken: tokens.access_token,
                  expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
                },
              });
              account.accessToken = tokens.access_token;
            }

            events = await outlookCalendarService.getUpcomingEvents(
              account.accessToken,
              startTime,
              endTime
            );
          }

          if (events) {
            allEvents.push(...events);
          }
        } catch (error: any) {
          logger.error('❌ Error fetching calendar events during manual sync', {
            userId,
            provider: account.provider,
            accountEmail: account.email,
            error: error.message,
            errorStack: error.stack,
            errorResponse: error.response?.data,
            tokenExpired: account.expiresAt ? new Date(account.expiresAt) < now : 'no expiry set',
          });
          // Don't throw - continue with other accounts
        }
      }

      logger.info('📅 Manual sync found events', {
        userId,
        eventCount: allEvents.length,
      });

      // Sync each event to database (skip single-attendee meetings)
      for (const event of allEvents) {
        // Skip if only 1 or 0 attendees
        if (!event.attendees || event.attendees.length <= 1) {
          logger.info('⏭️ Skipping single-attendee event', {
            userId,
            event: event.summary,
            attendeeCount: event.attendees?.length || 0,
          });
          continue;
        }

        // Infer meeting type
        const meetingType = await promptGenerator.inferMeetingType(
          event.summary,
          event.attendees
        );

        // Check if this is back-to-back
        const previousMeetings = await prisma.meeting.findMany({
          where: {
            userId,
            endTime: {
              gte: new Date(event.start.getTime() - 5 * 60 * 1000),
              lte: event.start,
            },
          },
        });
        const isBackToBack = previousMeetings.length > 0;

        // Calculate attendee count
        const attendeeCount = event.attendees?.length || 0;

        // Upsert meeting to database
        await prisma.meeting.upsert({
          where: {
            userId_calendarEventId: {
              userId,
              calendarEventId: event.id,
            },
          },
          create: {
            userId,
            calendarEventId: event.id,
            title: event.summary,
            description: event.description || null,
            startTime: event.start,
            endTime: event.end,
            attendees: event.attendees || [],
            attendeeCount,
            location: event.location || null,
            meetingLink: event.hangoutLink || null,
            meetingType: meetingType || null,
            isOrganizer: event.isOrganizer || false,
            isBackToBack,
            cueDelivered: false,
          },
          update: {
            title: event.summary,
            description: event.description || null,
            startTime: event.start,
            endTime: event.end,
            attendees: event.attendees || [],
            attendeeCount,
            location: event.location || null,
            meetingLink: event.hangoutLink || null,
            meetingType: meetingType || null,
            isOrganizer: event.isOrganizer || false,
            isBackToBack,
          },
        });

        syncedCount++;
      }

      // Delete meetings that no longer exist in the calendar
      // Get all calendar event IDs from the fetched events
      const calendarEventIds = allEvents.map(event => event.id);
      
      // Find meetings in our database that are in the time range but NOT in the calendar anymore
      const meetingsToDelete = await prisma.meeting.findMany({
        where: {
          userId,
          startTime: { gte: startTime, lte: endTime },
          calendarEventId: {
            notIn: calendarEventIds.length > 0 ? calendarEventIds : ['__no_events__'], // Avoid empty array issue
          },
        },
      });

      let deletedCount = 0;
      if (meetingsToDelete.length > 0) {
        logger.info('🗑️ Deleting meetings removed from calendar', {
          userId,
          deleteCount: meetingsToDelete.length,
          deletedMeetings: meetingsToDelete.map(m => ({ id: m.id, title: m.title })),
        });

        await prisma.meeting.deleteMany({
          where: {
            id: {
              in: meetingsToDelete.map(m => m.id),
            },
          },
        });
        deletedCount = meetingsToDelete.length;
      }

      logger.info('✅ Manual meeting sync completed', {
        userId,
        syncedCount,
        deletedCount,
      });

      return res.json({
        success: true,
        syncedCount,
        deletedCount,
        message: `Synced ${syncedCount} meetings${deletedCount > 0 ? `, removed ${deletedCount} deleted meetings` : ''} from your calendar`,
      });
    } catch (error: any) {
      logger.error('❌ Manual meeting sync failed', {
        userId,
        error: error.message,
        errorStack: error.stack,
        errorDetails: error.response?.data || error.toString(),
      });
      return res.status(500).json({
        error: 'Failed to sync meetings',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  })
);

// Get meeting by ID
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res) => {
    const { id } = req.params;

    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        userId: req.userId,
      },
      include: {
        focusSession: true,
      },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    return res.json({ meeting });
  })
);

export default router;

